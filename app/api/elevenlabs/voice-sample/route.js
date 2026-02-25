import { NextResponse } from "next/server";
import { getAdminBucket, isAdminConfigured } from "@/utils/firebase-admin";
import { requireElevenLabsAuth } from "@/lib/elevenlabs-auth";

const SAMPLE_PHRASE = "Hello, this is a sample of this voice.";
const STORAGE_PATH_PREFIX = "tts-samples";
const SIGNED_URL_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000; // 1 year
const URL_CACHE_TTL_MS = 23 * 60 * 60 * 1000; // 23h – refresh before signed URL expires

// In-memory cache: voiceId -> { url, expiresAt } to avoid Storage round trips on every request
const signedUrlCache = new Map();

// Allowed voice IDs (whitelist so we only cache known voices)
const ALLOWED_VOICE_IDS = new Set([
  "dtSEyYGNJqjrtBArPCVZ",
  "XW70ikSsadUbinwLMZ5w",
  "goT3UYdM9bhm0n2lmKQx",
  "S9EGwlCtMF7VXtENq79v",
  "ouFAjcjtdrVBT9bRFhFQ",
  "w9rPM8AIZle60Nbpw7nl",
]);

/**
 * GET /api/elevenlabs/voice-sample?voice_id=xxx
 * Returns { url: string } for cached (or newly generated) sample in Firebase Storage.
 * In production: X-API-Key or Authorization: Bearer <Firebase ID token> + Pro.
 */
export async function GET(request) {
  const authResult = await requireElevenLabsAuth(request);
  if (!authResult.ok) return authResult.response;

  const { searchParams } = new URL(request.url);
  const voiceId = searchParams.get("voice_id")?.trim();

  if (!voiceId || !ALLOWED_VOICE_IDS.has(voiceId)) {
    return NextResponse.json(
      { error: "Missing or invalid voice_id" },
      { status: 400 }
    );
  }

  const bucket = getAdminBucket();
  if (!bucket || !isAdminConfigured()) {
    return NextResponse.json(
      { error: "Voice sample cache not configured (Firebase Admin required)" },
      { status: 503 }
    );
  }

  try {
    const cached = signedUrlCache.get(voiceId);
    if (cached && cached.expiresAt > Date.now()) {
      console.log("voice-sample: in-memory cache hit", { voiceId });
      return NextResponse.json(
        { url: cached.url },
        {
          headers: {
            "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
            "X-Voice-Sample-Source": "cache",
          },
        }
      );
    }

    const path = `${STORAGE_PATH_PREFIX}/${voiceId}.mp3`;
    const file = bucket.file(path);

    // Use getMetadata() for existence; more reliable than exists() in some environments
    let fileExists = false;
    try {
      await file.getMetadata();
      fileExists = true;
    } catch (e) {
      if (e?.code !== 404) throw e;
    }

    let source = "storage";
    if (!fileExists) {
      source = "elevenlabs";
      console.log("voice-sample: Storage miss, calling ElevenLabs", { voiceId, path });
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "ELEVENLABS_API_KEY required to generate sample" },
          { status: 503 }
        );
      }
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: SAMPLE_PHRASE,
            model_id: "eleven_multilingual_v2",
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        }
      );
      if (!response.ok) {
        const errText = await response.text();
        console.error("ElevenLabs sample generation failed:", response.status, errText);
        return NextResponse.json(
          { error: "Failed to generate voice sample" },
          { status: 502 }
        );
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      await file.save(buffer, {
        metadata: { contentType: "audio/mpeg" },
      });
    } else {
      console.log("voice-sample: Storage hit (file exists), not calling ElevenLabs", { voiceId });
    }

    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: new Date(Date.now() + SIGNED_URL_EXPIRY_MS),
    });

    signedUrlCache.set(voiceId, {
      url,
      expiresAt: Date.now() + URL_CACHE_TTL_MS,
    });

    return NextResponse.json(
      { url },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
          "X-Voice-Sample-Source": source,
        },
      }
    );
  } catch (error) {
    console.error("Voice sample route error:", error);
    const message = error?.message || String(error);
    const isPermission = /permission|PERMISSION_DENIED|403|insufficient/i.test(message);
    return NextResponse.json(
      {
        error: "Failed to get voice sample",
        message,
        hint: isPermission
          ? "Ensure the Firebase Admin service account has Storage Object Admin (or Storage Admin) in IAM."
          : undefined,
      },
      { status: 500 }
    );
  }
}
