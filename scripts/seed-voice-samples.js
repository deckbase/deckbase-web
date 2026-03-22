/**
 * Download (ElevenLabs TTS) each curated voice sample and upload to Firebase Storage
 * at `{ELEVENLABS_VOICE_SAMPLE_STORAGE_PREFIX}/{voiceId}.mp3` — same as GET /api/elevenlabs/voice-sample.
 *
 * Skips objects that already exist unless --force. Continues on per-voice errors unless --fail-fast.
 *
 * Usage:
 *   npm run seed:voice-samples:dev   → .env then .env.local (dev Firebase Storage)
 *   npm run seed:voice-samples:prod  → .env then .env.prod (prod Firebase Storage)
 *   npm run seed:voice-samples       → same as :prod (backward compatible)
 *   node scripts/seed-voice-samples.js [--dev|--prod] [--force] [--fail-fast]
 *
 * Requires: FIREBASE_STORAGE_BUCKET (or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
 *           FIREBASE_ADMIN_*, ELEVENLABS_API_KEY.
 */

const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

const argv = process.argv.slice(2);
const useDev = argv.includes("--dev");
const useProd = argv.includes("--prod");
const envMode =
  useDev && !useProd
    ? "dev"
    : useProd && !useDev
      ? "prod"
      : useDev && useProd
        ? "prod"
        : "prod";

const root = path.join(__dirname, "..");
function loadEnvFile(name) {
  const p = path.join(root, name);
  if (!fs.existsSync(p)) return;
  require("dotenv").config({ path: p, override: true });
}

require("dotenv").config({ path: path.join(root, ".env") });
if (envMode === "dev") {
  loadEnvFile(".env.local");
  console.log("[env] dev — loaded .env + .env.local (not .env.prod)\n");
} else {
  loadEnvFile(".env.prod");
  console.log("[env] prod — loaded .env + .env.prod\n");
}

const force = argv.includes("--force");
const failFast = argv.includes("--fail-fast");

async function main() {
  const {
    ELEVENLABS_VOICES,
    getElevenlabsSamplePhraseForVoiceId,
    ELEVENLABS_VOICE_SAMPLE_STORAGE_PREFIX,
    ELEVENLABS_VOICE_SAMPLE_MODEL_ID,
  } = await import(
    pathToFileURL(path.join(__dirname, "../lib/elevenlabs-voices.js")).href
  );

  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );

  if (!bucketName || !projectId || !clientEmail || !privateKey) {
    console.error(
      "Missing env: FIREBASE_STORAGE_BUCKET and FIREBASE_ADMIN_* required.",
    );
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
  console.log(
    "Prefix:",
    ELEVENLABS_VOICE_SAMPLE_STORAGE_PREFIX,
    "| voices:",
    ELEVENLABS_VOICES.length,
  );
  if (force) console.log("Mode: --force (overwrite existing objects)\n");
  else console.log("Mode: skip if object already exists\n");

  let skipped = 0;
  let uploaded = 0;
  const failures = [];

  for (const row of ELEVENLABS_VOICES) {
    const voiceId = row.id;
    const filePath = `${ELEVENLABS_VOICE_SAMPLE_STORAGE_PREFIX}/${voiceId}.mp3`;
    const file = bucket.file(filePath);

    if (!force) {
      try {
        const [exists] = await file.exists();
        if (exists) {
          console.log("Skip (exists):", filePath);
          skipped += 1;
          continue;
        }
      } catch (e) {
        console.warn("Exists check failed:", filePath, e?.message);
      }
    }

    console.log("Generate + upload:", filePath, `(${row.label})`);
    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
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
        },
      );
      if (!res.ok) {
        const errText = await res.text();
        const msg = `ElevenLabs ${res.status} for ${voiceId}: ${errText.slice(0, 200)}`;
        // Subscription voice-add limit → skip gracefully; on-demand API will generate on first play.
        if (res.status === 400 && errText.includes("voice add/edit operations")) {
          console.warn(`Skip (monthly voice-add limit reached): ${filePath} — will be generated on-demand.`);
          skipped += 1;
          continue;
        }
        console.error(msg);
        failures.push({ voiceId, filePath, message: msg });
        if (failFast) process.exit(1);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      await file.save(buffer, { metadata: { contentType: "audio/mpeg" } });
      try {
        await file.makePublic();
      } catch (e) {
        console.warn("makePublic failed:", filePath, e?.message);
      }
      console.log("Saved:", filePath);
      uploaded += 1;
    } catch (e) {
      const msg = e?.message || String(e);
      console.error("Failed:", filePath, msg);
      failures.push({ voiceId, filePath, message: msg });
      if (failFast) process.exit(1);
    }
  }

  console.log("\n--- Summary ---");
  console.log("Uploaded:", uploaded);
  console.log("Skipped (already in Storage):", skipped);
  console.log("Failed:", failures.length);
  if (failures.length) {
    for (const f of failures) {
      console.error(`  ${f.voiceId}: ${f.message}`);
    }
    process.exit(1);
  }

  console.log(
    "\nDone. Firebase Console → Storage →",
    bucketName,
    "→",
    ELEVENLABS_VOICE_SAMPLE_STORAGE_PREFIX,
  );
}

main().catch((err) => {
  console.error(err);
  if (
    err?.code === 403 ||
    /permission|insufficient/i.test(String(err?.message))
  ) {
    console.error(
      "\n→ Grant the Firebase Admin service account 'Storage Object Admin' on the bucket:\n" +
        "  Google Cloud Console → Storage → bucket '" +
        (process.env.FIREBASE_STORAGE_BUCKET ||
          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) +
        "' → Permissions → Add principal →\n" +
        "  Principal: firebase-adminsdk-xxx@" +
        (process.env.FIREBASE_ADMIN_PROJECT_ID || "YOUR_PROJECT") +
        ".iam.gserviceaccount.com\n" +
        "  Role: Storage Object Admin",
    );
  }
  process.exit(1);
});
