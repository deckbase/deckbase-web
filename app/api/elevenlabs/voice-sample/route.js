import { NextResponse } from "next/server";
import { getAdminBucket, isAdminConfigured } from "@/utils/firebase-admin";
import { requireElevenLabsAuth } from "@/lib/elevenlabs-auth";

const SAMPLE_PHRASE = "Hello, this is a sample of this voice.";
const STORAGE_PATH_PREFIX = "tts-samples";
const SIGNED_URL_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

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

  const path = `${STORAGE_PATH_PREFIX}/${voiceId}.mp3`;
  const file = bucket.file(path);

  try {
    const [exists] = await file.exists();
    if (!exists) {
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
    }

    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: new Date(Date.now() + SIGNED_URL_EXPIRY_MS),
    });
    return NextResponse.json({ url });
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
