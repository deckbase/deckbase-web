/**
 * One-time script to pre-populate Firebase Storage with voice samples.
 * Run from project root with env loaded (e.g. from .env.prod):
 *
 *   node --env-file=.env.prod scripts/seed-voice-samples.js
 *   # or: export $(cat .env.prod | xargs) && node scripts/seed-voice-samples.js
 *
 * Requires: FIREBASE_STORAGE_BUCKET (or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
 *           FIREBASE_ADMIN_* and ELEVENLABS_API_KEY.
 * Seeds every curated voice id from lib/elevenlabs-voices.js (same paths as GET /api/elevenlabs/voice-sample).
 * After running, the voice-sample API will hit Storage first and skip ElevenLabs for those voices.
 */

const path = require("path");
const { pathToFileURL } = require("url");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.prod") });

async function main() {
  const {
    ELEVENLABS_VOICES,
    getElevenlabsSamplePhraseForVoiceId,
    ELEVENLABS_VOICE_SAMPLE_STORAGE_PREFIX,
    ELEVENLABS_VOICE_SAMPLE_MODEL_ID,
  } = await import(pathToFileURL(path.join(__dirname, "../lib/elevenlabs-voices.js")).href);
  const VOICE_IDS = ELEVENLABS_VOICES.map((v) => v.id);
  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!bucketName || !projectId || !clientEmail || !privateKey) {
    console.error("Missing env: FIREBASE_STORAGE_BUCKET and FIREBASE_ADMIN_* required.");
    process.exit(1);
  }
  if (!apiKey) {
    console.error("Missing ELEVENLABS_API_KEY.");
    process.exit(1);
  }

  const { getApps, initializeApp, cert } = require("firebase-admin/app");
  const { getStorage } = require("firebase-admin/storage");

  if (!getApps().length) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      storageBucket: bucketName,
    });
  }
  const bucket = getStorage().bucket(bucketName);
  console.log("Bucket:", bucket.name);

  for (const voiceId of VOICE_IDS) {
    const filePath = `${ELEVENLABS_VOICE_SAMPLE_STORAGE_PREFIX}/${voiceId}.mp3`;
    const file = bucket.file(filePath);
    try {
      const [exists] = await file.exists();
      if (exists) {
        console.log("Skip (exists):", filePath);
        continue;
      }
    } catch (e) {
      console.warn("Exists check failed:", filePath, e?.message);
    }

    console.log("Generate + upload:", filePath);
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: getElevenlabsSamplePhraseForVoiceId(voiceId),
        model_id: ELEVENLABS_VOICE_SAMPLE_MODEL_ID,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) {
      console.error("ElevenLabs failed:", res.status, await res.text());
      process.exit(1);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    await file.save(buffer, { metadata: { contentType: "audio/mpeg" } });
    try {
      await file.makePublic();
    } catch (e) {
      console.warn("makePublic failed (URLs may still work if bucket allows public read):", e?.message);
    }
    console.log("Saved:", filePath);
  }

  console.log(
    "Done. Check Firebase Console → Storage →",
    bucketName,
    "→",
    ELEVENLABS_VOICE_SAMPLE_STORAGE_PREFIX,
  );
}

main().catch((err) => {
  console.error(err);
  if (err?.code === 403 || /permission|insufficient/i.test(String(err?.message))) {
    console.error(
      "\n→ Grant the Firebase Admin service account 'Storage Object Admin' on the bucket:\n" +
        "  Google Cloud Console → Storage → bucket '" +
        (process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) +
        "' → Permissions → Add principal →\n" +
        "  Principal: firebase-adminsdk-xxx@" +
        (process.env.FIREBASE_ADMIN_PROJECT_ID || "YOUR_PROJECT") +
        ".iam.gserviceaccount.com\n" +
        "  Role: Storage Object Admin"
    );
  }
  process.exit(1);
});
