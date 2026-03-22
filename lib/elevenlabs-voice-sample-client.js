/**
 * Client-side ElevenLabs voice sample playback.
 * - Prefers GET /api/elevenlabs/voice-sample (Firebase Storage cache; one TTS per voice on server).
 * - Falls back to POST /api/elevenlabs/text-to-speech when sample route is unavailable.
 * - Optional in-memory URL cache so repeat plays skip the JSON round-trip (audio still loads from CDN).
 */
import { getElevenlabsSamplePhraseForVoiceId } from "@/lib/elevenlabs-voices";

const sampleUrlByVoiceId = new Map();

export function clearElevenlabsVoiceSampleUrlCache() {
  sampleUrlByVoiceId.clear();
}

function playAudioElement(audio, signal) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      try {
        audio.pause();
      } catch {
        /* ignore */
      }
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
    audio.onended = () => {
      cleanup();
      resolve();
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error("Audio playback failed"));
    };
    audio.play().catch((e) => {
      cleanup();
      reject(e);
    });
  });
}

/**
 * @param {Error} error
 * @returns {void}
 */
export function alertElevenlabsVoiceSampleError(error) {
  const msg = error?.message || "Could not play sample";
  if (msg.includes("ELEVENLABS_API_KEY") || msg.includes("not configured")) {
    window.alert(
      "Voice samples are not available. Add ELEVENLABS_API_KEY to .env.local to enable them.",
    );
  } else if (error?.name === "AbortError") {
    /* user switched sample — no alert */
  } else {
    window.alert(msg);
  }
}

/**
 * @param {object} opts
 * @param {string} opts.voiceId
 * @param {() => Promise<string | null | undefined>} [opts.getIdToken] - Firebase user.getIdToken (required in production for API routes)
 * @param {AbortSignal} [opts.signal]
 */
export async function playElevenlabsVoiceSample(opts) {
  const { voiceId, getIdToken, signal } = opts;
  const id = String(voiceId ?? "").trim();
  if (!id) return;

  const headers = {};
  if (getIdToken) {
    const token = await getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let audioUrl = sampleUrlByVoiceId.get(id);
  if (!audioUrl) {
    const sampleRes = await fetch(
      `/api/elevenlabs/voice-sample?voice_id=${encodeURIComponent(id)}`,
      { headers, signal },
    );
    if (sampleRes.ok) {
      const data = await sampleRes.json();
      if (data?.url) {
        audioUrl = data.url;
        sampleUrlByVoiceId.set(id, audioUrl);
      }
    }
  }

  if (audioUrl) {
    const audio = new Audio(audioUrl);
    await playAudioElement(audio, signal);
    return;
  }

  const res = await fetch("/api/elevenlabs/text-to-speech", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      text: getElevenlabsSamplePhraseForVoiceId(id),
      voice_id: id,
    }),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText || "Sample failed");
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const audio = new Audio(objectUrl);
    await playAudioElement(audio, signal);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
