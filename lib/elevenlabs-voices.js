/**
 * Shared ElevenLabs TTS voice options for web and mobile API.
 * Used by: card editor UI, GET /api/elevenlabs/voices, voice-sample cache whitelist.
 */
export const ELEVENLABS_VOICES = [
  { group: "American", label: "American Male", id: "dtSEyYGNJqjrtBArPCVZ" },
  { group: "American", label: "American Female", id: "XW70ikSsadUbinwLMZ5w" },
  { group: "British", label: "British Male", id: "goT3UYdM9bhm0n2lmKQx" },
  { group: "British", label: "British Female", id: "S9EGwlCtMF7VXtENq79v" },
  { group: "Australian", label: "Australian Male", id: "ouFAjcjtdrVBT9bRFhFQ" },
  { group: "Australian", label: "Australian Female", id: "w9rPM8AIZle60Nbpw7nl" },
];

export const ELEVENLABS_SAMPLE_PHRASE = "Hello, this is a sample of this voice.";

/** Default voice when env is unset (matches lib/elevenlabs-server.js / text-to-speech route). */
export const ELEVENLABS_SERVER_FALLBACK_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

/**
 * Payload for MCP `list_elevenlabs_voices` and assistants that need voice ids.
 * @returns {{ voices: typeof ELEVENLABS_VOICES, defaultVoiceIdFromEnv: string | null, serverFallbackVoiceId: string, hint: string }}
 */
export function getElevenlabsVoicesMcpPayload() {
  return {
    voices: ELEVENLABS_VOICES,
    defaultVoiceIdFromEnv: process.env.ELEVENLABS_DEFAULT_VOICE_ID?.trim() || null,
    serverFallbackVoiceId: ELEVENLABS_SERVER_FALLBACK_VOICE_ID,
    hint: "Use each voice's id as voice_id on attach_audio_to_card, or defaultVoiceId in template audio block configJson.",
  };
}
