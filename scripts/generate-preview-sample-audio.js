/**
 * Generate static MP3s for the default template library preview (Listening Practice, vocabulary audio blocks).
 * Uses ElevenLabs TTS — same phrase as the Listening Practice template quiz + transcript.
 *
 * Output (committed to repo so library preview works without API calls at runtime):
 *   public/media/preview-audio-en-male.mp3
 *   public/media/preview-audio-en-female.mp3
 *
 * Usage:
 *   npm run generate:preview-audio
 *
 * Requires: ELEVENLABS_API_KEY in .env or .env.local
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
require("dotenv").config({ path: path.join(root, ".env") });
if (fs.existsSync(path.join(root, ".env.local"))) {
  require("dotenv").config({ path: path.join(root, ".env.local"), override: true });
}

/** Matches `data/default_template_library.json` Listening Practice quiz + hidden transcript. */
const LISTENING_PREVIEW_TEXT = "The train leaves at seven fifteen.";

/** Curated English voices — same as lib/elevenlabs-voices.js (en row). */
const ENGLISH_FEMALE_VOICE_ID = "owHnXhz2H7U5Cv31srDU";
const ENGLISH_MALE_VOICE_ID = "GrVxA7Ub86nJH91Viyiv";

const MODEL_ID = "eleven_multilingual_v2";

const OUT = {
  male: path.join(root, "public/media/preview-audio-en-male.mp3"),
  female: path.join(root, "public/media/preview-audio-en-female.mp3"),
};

async function ttsToBuffer(voiceId, text) {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not set (.env or .env.local)");
  }
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${errText.slice(0, 300)}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function main() {
  fs.mkdirSync(path.dirname(OUT.male), { recursive: true });

  console.log("Generating preview audio with ElevenLabs…");
  console.log(`Text: "${LISTENING_PREVIEW_TEXT}"\n`);

  const maleBuf = await ttsToBuffer(ENGLISH_MALE_VOICE_ID, LISTENING_PREVIEW_TEXT);
  fs.writeFileSync(OUT.male, maleBuf);
  console.log(`Wrote ${OUT.male} (${maleBuf.length} bytes)`);

  const femaleBuf = await ttsToBuffer(ENGLISH_FEMALE_VOICE_ID, LISTENING_PREVIEW_TEXT);
  fs.writeFileSync(OUT.female, femaleBuf);
  console.log(`Wrote ${OUT.female} (${femaleBuf.length} bytes)`);

  console.log("\nDone. Commit the MP3s under public/media/.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
