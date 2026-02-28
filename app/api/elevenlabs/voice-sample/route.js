import { NextResponse } from "next/server";
import { getAdminBucket, isAdminConfigured } from "@/utils/firebase-admin";
import { requireElevenLabsAuth } from "@/lib/elevenlabs-auth";

const SAMPLE_PHRASE = "Hello, this is a sample of this voice.";
const STORAGE_PATH_PREFIX = "tts-samples";

/** Public URL for an object (no expiry). We make the object public, no getSignedUrl. */
function publicUrl(bucketName, objectPath) {
  const encoded = objectPath.split("/").map((s) => encodeURIComponent(s)).join("/");
  return `https://storage.googleapis.com/${bucketName}/${encoded}`;
}

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
 *
 * 1. Check Storage first (tts-samples/{voiceId}.mp3).
 * 2. If file exists → return its public URL (do NOT call ElevenLabs).
 * 3. If file missing → call ElevenLabs once, save buffer to Storage, make public, return URL.
 * Subsequent requests for same voice_id will hit step 2 and never call ElevenLabs again.
 * In production: X-API-Key or Bearer + Pro.
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

  const storageBucketName =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!storageBucketName || !isAdminConfigured()) {
    return NextResponse.json(
      {
        error: "Voice sample cache not configured",
        hint: "Set FIREBASE_STORAGE_BUCKET in your hosting env (e.g. Vercel → Settings → Environment Variables), not only in .env.prod. Same bucket as NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET (e.g. deckbase-prod.firebasestorage.app).",
      },
      { status: 503 }
    );
  }
  const bucket = getAdminBucket(storageBucketName);
  if (!bucket) {
    return NextResponse.json(
      { error: "Voice sample cache not configured (Firebase Admin required)" },
      { status: 503 }
    );
  }

  try {
    const path = `${STORAGE_PATH_PREFIX}/${voiceId}.mp3`;
    const file = bucket.file(path);

    // 1) Always check Storage first — if file exists we never call ElevenLabs
    let fileExists = false;
    try {
      await file.getMetadata();
      fileExists = true;
    } catch (e) {
      const isNotFound =
        e?.code === 404 ||
        e?.code === "NOT_FOUND" ||
        /not found|404/i.test(String(e?.message ?? ""));
      if (!isNotFound) throw e;
    }

    // 2) Only when file is missing: fetch from ElevenLabs and save to Storage (one-time per voice)
    if (!fileExists) {
      console.log("voice-sample: Storage miss, calling ElevenLabs once then saving", { voiceId, path });
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
      console.log("voice-sample: saving to Storage", { bucket: bucket.name, path, voiceId });
      try {
        await file.save(buffer, {
          metadata: { contentType: "audio/mpeg" },
        });
      } catch (saveErr) {
        const statusCode = saveErr?.code ?? saveErr?.response?.statusCode;
        console.error("voice-sample: save failed", { bucket: bucket.name, path, voiceId, err: saveErr?.message });
        return NextResponse.json(
          {
            error: "Failed to cache voice sample in Storage",
            message: saveErr?.message,
            statusCode: statusCode ?? undefined,
            hint:
              statusCode === 403 || /permission|403|insufficient/i.test(String(saveErr?.message ?? ""))
                ? `Grant the Firebase Admin service account Storage Object Admin on bucket "${bucket.name}" in Google Cloud Console → Storage → bucket → Permissions.`
                : "Ensure the Firebase Admin service account has Storage Object Admin (or Storage Admin) on the bucket. Bucket: " + bucket.name,
          },
          { status: 500 }
        );
      }
      console.log("voice-sample: saved to Storage; future requests will use this file", { voiceId, path, bucket: bucket.name });
    } else {
      console.log("voice-sample: Storage hit — serving from Storage, not calling ElevenLabs", { voiceId });
    }

    // Ensure object is public so the returned URL works
    try {
      await file.makePublic();
    } catch (makePublicErr) {
      console.error("voice-sample: makePublic failed", { voiceId, err: makePublicErr?.message });
      return NextResponse.json(
        {
          error: "Failed to make sample public",
          message: makePublicErr?.message,
          hint: `Allow public read on the bucket so samples can be served by URL. Google Cloud Console → Storage → bucket "${bucket.name}" → Permissions → Grant access → principal allUsers → Role Storage Object Viewer. See docs/VOICE_SAMPLE_STORAGE_SETUP.md.`,
        },
        { status: 500 }
      );
    }
    const url = publicUrl(bucket.name, path);

    return NextResponse.json(
      { url },
      {
        headers: {
          // Storage is source of truth; URL is stable so safe to cache response
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
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
