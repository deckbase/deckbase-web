/**
 * Build props for CardPreviewContent from a catalog template (sample text + preview media keys).
 */

import {
  blockTypeStringToIndex,
  parseBlockConfig,
  getPreviewMediaUrlForKey,
  stripPreviewSampleKeysFromConfig,
  BLOCK_TYPE_BY_NAME,
} from "@/lib/default-template-library";

const PREVIEW_IMAGE_FALLBACK = "/mock/mock2.webp";

/** Short CC0 sample — loads in browser audio element (same-origin not required for src if CORS allows). */
const PREVIEW_AUDIO_DEMO_URL =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3";

/**
 * @param {{ blocks?: object[] }} template — catalog template entry
 */
export function buildLibraryTemplatePreviewModel(template) {
  const mediaCache = {};
  /** @type {Record<string, object>} */
  const valueMap = {};

  const blocksSnapshot = (template.blocks || []).map((b) => {
    const typeNum = blockTypeStringToIndex(b.type);
    const rawCfg = parseBlockConfig(b.configJson);
    const cfg = stripPreviewSampleKeysFromConfig(rawCfg) || {};
    return {
      blockId: b.blockId,
      type: typeNum,
      label: b.label,
      required: !!b.required,
      side: b.side === "back" ? "back" : "front",
      configJson:
        cfg && typeof cfg === "object" && Object.keys(cfg).length > 0
          ? cfg
          : null,
    };
  });

  for (const b of template.blocks) {
    const typeNum = blockTypeStringToIndex(b.type);
    const rawCfg = parseBlockConfig(b.configJson) || {};
    const previewText =
      typeof rawCfg.previewSampleText === "string" ? rawCfg.previewSampleText : "";

    if (typeNum === BLOCK_TYPE_BY_NAME.image) {
      const key = rawCfg.previewSampleMediaKey;
      let url = key ? getPreviewMediaUrlForKey(key) : null;
      if (!url) url = PREVIEW_IMAGE_FALLBACK;
      const mid = `lib-preview-img-${b.blockId}`;
      mediaCache[mid] = { downloadUrl: url };
      valueMap[b.blockId] = {
        blockId: b.blockId,
        type: typeNum,
        mediaIds: [mid],
      };
    } else if (typeNum === BLOCK_TYPE_BY_NAME.audio) {
      const mid = `lib-preview-audio-${b.blockId}`;
      const key = rawCfg.previewSampleMediaKey;
      let url = key ? getPreviewMediaUrlForKey(key) : null;
      if (url == null || url === "") {
        url = PREVIEW_AUDIO_DEMO_URL;
      }
      mediaCache[mid] = { downloadUrl: url };
      valueMap[b.blockId] = {
        blockId: b.blockId,
        type: typeNum,
        mediaIds: [mid],
      };
    } else if (
      typeNum === BLOCK_TYPE_BY_NAME.quizMultiSelect ||
      typeNum === BLOCK_TYPE_BY_NAME.quizSingleSelect ||
      typeNum === BLOCK_TYPE_BY_NAME.quizTextAnswer
    ) {
      valueMap[b.blockId] = {
        blockId: b.blockId,
        type: typeNum,
        text: "",
      };
    } else if (typeNum === BLOCK_TYPE_BY_NAME.divider || typeNum === BLOCK_TYPE_BY_NAME.space) {
      valueMap[b.blockId] = { blockId: b.blockId, type: typeNum };
    } else {
      valueMap[b.blockId] = {
        blockId: b.blockId,
        type: typeNum,
        text: previewText,
      };
    }
  }

  const getValue = (blockId) => valueMap[blockId];

  return { blocksSnapshot, getValue, mediaCache };
}
