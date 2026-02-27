/**
 * One-time script to pre-populate Firebase Storage with voice samples.
 * Run from project root with env loaded (e.g. from .env.prod):
 *
 *   node --env-file=.env.prod scripts/seed-voice-samples.js
 *   # or: export $(cat .env.prod | xargs) && node scripts/seed-voice-samples.js
 *
 * Requires: FIREBASE_STORAGE_BUCKET (or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
 *           FIREBASE_ADMIN_* and ELEVENLABS_API_KEY.
 * After running, the voice-sample API will find files in Storage and stop calling ElevenLabs.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.prod") });

const SAMPLE_PHRASE = "Hello, this is a sample of this voice.";
const STORAGE_PREFIX = "tts-samples";
const VOICE_IDS = [
  "dtSEyYGNJqjrtBArPCVZ",
  "XW70ikSsadUbinwLMZ5w",
  "goT3UYdM9bhm0n2lmKQx",
  "S9EGwlCtMF7VXtENq79v",
  "ouFAjcjtdrVBT9bRFhFQ",
  "w9rPM8AIZle60Nbpw7nl",
];

async function main() {
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
    const filePath = `${STORAGE_PREFIX}/${voiceId}.mp3`;
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
        text: SAMPLE_PHRASE,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) {
      console.error("ElevenLabs failed:", res.status, await res.text());
      process.exit(1);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    await file.save(buffer, { metadata: { contentType: "audio/mpeg" } });
    console.log("Saved:", filePath);
  }

  console.log("Done. Check Firebase Console → Storage →", bucketName, "→ tts-samples/");
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
