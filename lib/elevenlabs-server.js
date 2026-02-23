/**
 * Server-side ElevenLabs TTS. Returns audio buffer or null on failure.
 * @param {{ text: string, voiceId?: string }} opts
 * @returns {Promise<Buffer|null>}
 */
export async function generateTTS(opts) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const defaultVoiceId =
    process.env.ELEVENLABS_DEFAULT_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
  if (!apiKey || !opts?.text?.trim()) return null;
  const voiceId = opts.voiceId || defaultVoiceId;
  const text = String(opts.text).trim();
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
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );
  if (!res.ok) return null;
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}
