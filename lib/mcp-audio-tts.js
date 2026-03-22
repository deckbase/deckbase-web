/**
 * ElevenLabs TTS for MCP: new cards (create_card) and existing cards (attach_audio_to_card).
 * Mirrors app/api/mobile/cards/add-with-ai/route.js (limits, storage, voice from block config).
 */

import { generateTTS } from "@/lib/elevenlabs-server";
import { ELEVENLABS_SERVER_FALLBACK_VOICE_ID } from "@/lib/elevenlabs-voices";
import { parseAudioBlockConfig } from "@/lib/audio-block-config";
import {
  checkTTSLimit,
  checkStorageLimit,
  incrementTTSChars,
} from "@/lib/usage-limits";

function parseBlockConfigJson(configJson) {
  if (configJson == null || configJson === "") return {};
  if (typeof configJson === "string") {
    try {
      const o = JSON.parse(configJson);
      return o && typeof o === "object" ? o : {};
    } catch {
      return {};
    }
  }
  return typeof configJson === "object" ? configJson : {};
}

function isQuizBlockType(type) {
  return (
    type === "quizSingleSelect" ||
    type === "quizMultiSelect" ||
    type === "quizTextAnswer" ||
    type === 8 ||
    type === 9 ||
    type === 10
  );
}

function getTtsSourceTextForBlock(blockMeta, values) {
  if (!blockMeta) return "";
  if (isQuizBlockType(blockMeta.type)) {
    return String(parseBlockConfigJson(blockMeta.configJson).question || "").trim();
  }
  const v = values.find((x) => x.blockId === blockMeta.blockId);
  return (v?.text != null ? String(v.text) : "").trim();
}

export function isAudioBlockType(block) {
  return block.type === "audio" || block.type === 7 || block.type === "7";
}

/**
 * True when MCP must receive an explicit `voice_id` for TTS (no per-block defaultVoiceId on all audio blocks).
 */
export function templateNeedsExplicitVoiceForMcpTts(blocks, mainBlockId) {
  const audioBlocks = (blocks || []).filter(isAudioBlockType);
  if (audioBlocks.length === 0) return false;
  for (const b of audioBlocks) {
    const { defaultVoiceId } = parseAudioBlockConfig(b.configJson, {
      mainBlockId: mainBlockId ?? undefined,
    });
    if (!defaultVoiceId || !String(defaultVoiceId).trim()) return true;
  }
  return false;
}

/**
 * Resolve spoken text for an audio block (same rules as create_card TTS).
 */
export function resolveTtsTextForAudioBlock(audioBlock, blocksSnapshot, values, mainBlockId) {
  const audioVal = values.find((v) => v.blockId === audioBlock.blockId);
  if (String(audioVal?.text || "").trim()) {
    return String(audioVal.text).trim();
  }
  const cfg = parseAudioBlockConfig(audioBlock.configJson, {
    mainBlockId: mainBlockId ?? undefined,
  });
  if (cfg.defaultSourceBlockId) {
    const src = blocksSnapshot.find((b) => b.blockId === cfg.defaultSourceBlockId);
    const t = getTtsSourceTextForBlock(src, values);
    if (t) return t;
  }
  if (mainBlockId) {
    const mainMeta = blocksSnapshot.find((b) => b.blockId === mainBlockId);
    const t = getTtsSourceTextForBlock(mainMeta, values);
    if (t) return t;
  }
  const first = values.find((v) => String(v?.text || "").trim());
  return first ? String(first.text).trim() : "";
}

/**
 * Generate one MP3, upload, set values[audioIdx].mediaIds. Mutates values on success.
 * @returns {Promise<{ ok: true, mediaId: string, charsUsed: number } | { ok: false, reason: string, message?: string }>}
 */
export async function runElevenLabsTtsForSingleAudioBlock({
  uid,
  audioBlock,
  blocksSnapshot,
  values,
  mainBlockId,
  audioIdx,
  uploadAudioBufferAdmin,
  options = {},
}) {
  const {
    replaceExisting = false,
    explicitText = null,
    voiceIdOverride = null,
  } = options;

  if (options.generate_audio === false) {
    return { ok: false, reason: "disabled" };
  }
  if (!process.env.ELEVENLABS_API_KEY?.trim()) {
    return { ok: false, reason: "no_api_key" };
  }

  const audioVal = values[audioIdx];
  if (audioVal.mediaIds?.length && !replaceExisting) {
    return { ok: false, reason: "already_has_media" };
  }

  let ttsText =
    explicitText != null && String(explicitText).trim()
      ? String(explicitText).trim()
      : "";
  if (!ttsText) {
    ttsText = resolveTtsTextForAudioBlock(
      audioBlock,
      blocksSnapshot,
      values,
      mainBlockId,
    );
  }
  if (!ttsText) {
    return { ok: false, reason: "no_source_text" };
  }

  const parsedVoice = parseAudioBlockConfig(audioBlock.configJson, {
    mainBlockId: mainBlockId ?? undefined,
  });
  const voiceId =
    (voiceIdOverride && String(voiceIdOverride).trim()) ||
    parsedVoice.defaultVoiceId ||
    process.env.ELEVENLABS_DEFAULT_VOICE_ID ||
    ELEVENLABS_SERVER_FALLBACK_VOICE_ID;

  try {
    if (process.env.NODE_ENV === "production") {
      const ttsCheck = await checkTTSLimit(uid, ttsText.length);
      if (!ttsCheck.allowed) {
        return {
          ok: false,
          reason: "tts_limit",
          message: ttsCheck.message || "Monthly TTS limit reached",
        };
      }
      const buffer = await generateTTS({ text: ttsText, voiceId });
      if (!buffer) return { ok: false, reason: "generate_failed" };
      const storageCheck = await checkStorageLimit(uid, buffer.length);
      if (!storageCheck.allowed) {
        return {
          ok: false,
          reason: "storage_limit",
          message: storageCheck.message || "Storage limit reached",
        };
      }
      incrementTTSChars(uid, ttsText.length).catch((e) =>
        console.warn("[mcp TTS] usage increment failed", e?.message),
      );
      const { mediaId } = await uploadAudioBufferAdmin(uid, buffer, "audio/mpeg");
      values[audioIdx] = { ...audioVal, mediaIds: [mediaId] };
      return { ok: true, mediaId, charsUsed: ttsText.length };
    }
    const buffer = await generateTTS({ text: ttsText, voiceId });
    if (!buffer) return { ok: false, reason: "generate_failed" };
    const { mediaId } = await uploadAudioBufferAdmin(uid, buffer, "audio/mpeg");
    values[audioIdx] = { ...audioVal, mediaIds: [mediaId] };
    return { ok: true, mediaId, charsUsed: ttsText.length };
  } catch (err) {
    console.warn("[mcp TTS] failed:", err?.message);
    return {
      ok: false,
      reason: "error",
      message: err?.message || String(err),
    };
  }
}

/**
 * For create_card: fill empty audio blocks when source text exists.
 */
export async function applyElevenLabsTtsForMcpCard(
  uid,
  blocksSnapshot,
  values,
  mainBlockId,
  uploadAudioBufferAdmin,
  options = {},
) {
  if (options.generate_audio === false) return;
  const voiceIdOverride = options.voiceIdOverride ?? options.voice_id;
  const blocks = blocksSnapshot || [];
  for (const audioBlock of blocks) {
    if (!isAudioBlockType(audioBlock)) continue;
    const audioIdx = values.findIndex((v) => v.blockId === audioBlock.blockId);
    if (audioIdx < 0) continue;
    const audioVal = values[audioIdx];
    if (audioVal.mediaIds?.length) continue;
    await runElevenLabsTtsForSingleAudioBlock({
      uid,
      audioBlock,
      blocksSnapshot,
      values,
      mainBlockId,
      audioIdx,
      uploadAudioBufferAdmin,
      options: {
        replaceExisting: false,
        generate_audio: true,
        voiceIdOverride: voiceIdOverride || null,
      },
    });
  }
}
