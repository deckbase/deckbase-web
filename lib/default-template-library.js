/**
 * Canonical built-in template catalog (synced from mobile `assets/templates/default_template_library.json`).
 * See docs in deckbase-mobile: docs/features/DEFAULT_TEMPLATE_LIBRARY_WEB.md
 */

import { v4 as uuidv4 } from "uuid";
import defaultTemplateLibraryJson from "@/data/default_template_library.json";

/** @typedef {'general' | 'language'} LibrarySection */

/**
 * Block type names in the JSON → numeric BlockType (must match utils/firestore BlockType).
 */
export const BLOCK_TYPE_BY_NAME = {
  header1: 0,
  header2: 1,
  header3: 2,
  text: 3,
  quote: 4,
  hiddenText: 5,
  image: 6,
  audio: 7,
  quizMultiSelect: 8,
  quizSingleSelect: 9,
  quizTextAnswer: 10,
  divider: 11,
  space: 12,
};

/**
 * Semantic preview media keys in configJson → public URLs (or null to show a non-media placeholder).
 * @type {Record<string, string | null>}
 */
export const PREVIEW_SAMPLE_MEDIA_URLS = {
  image_chem: "/media/sample_image_chem.png",
  /** ElevenLabs TTS (English) — run `npm run generate:preview-audio` to regenerate; phrase matches Listening Practice template. */
  audio_male: "/media/preview-audio-en-male.mp3",
  audio_female: "/media/preview-audio-en-female.mp3",
};

/** @returns {import('@/data/default_template_library.json')} */
export function getDefaultTemplateLibrary() {
  return defaultTemplateLibraryJson;
}

export function getTemplateIdMap() {
  return defaultTemplateLibraryJson.templateIdMap || {};
}

/**
 * @param {string} key
 * @returns {string | null | undefined}
 */
export function getPreviewMediaUrlForKey(key) {
  if (key == null || key === "") return undefined;
  return Object.prototype.hasOwnProperty.call(PREVIEW_SAMPLE_MEDIA_URLS, key)
    ? PREVIEW_SAMPLE_MEDIA_URLS[key]
    : undefined;
}

/**
 * @param {string | number} type
 */
export function blockTypeStringToIndex(type) {
  if (typeof type === "number" && Number.isFinite(type)) return type;
  if (typeof type === "string" && /^\d+$/.test(type)) return Number(type);
  const n = BLOCK_TYPE_BY_NAME[type];
  if (n === undefined) {
    throw new Error(`Unknown block type: ${type}`);
  }
  return n;
}

/**
 * @param {string | Record<string, unknown> | null | undefined} configJson
 * @returns {Record<string, unknown> | null}
 */
export function parseBlockConfig(configJson) {
  if (configJson == null) return null;
  if (typeof configJson === "object" && !Array.isArray(configJson)) {
    return { ...configJson };
  }
  if (typeof configJson === "string") {
    try {
      const o = JSON.parse(configJson);
      return typeof o === "object" && o !== null && !Array.isArray(o) ? o : {};
    } catch {
      return {};
    }
  }
  return null;
}

/**
 * Remove library-only preview keys (mobile: configJsonWithoutPreviewSampleKeys).
 * @param {Record<string, unknown> | null} config
 */
export function stripPreviewSampleKeysFromConfig(config) {
  if (config == null || typeof config !== "object") return config;
  const out = { ...config };
  for (const k of Object.keys(out)) {
    if (k.startsWith("previewSample")) delete out[k];
  }
  return out;
}

/**
 * Prepare config for persisting to Firestore via template editor helpers.
 * @param {string | Record<string, unknown> | null | undefined} configJson
 * @param {number} typeIndex
 */
export function configJsonForUserTemplateAfterStrip(configJson, typeIndex) {
  const stripped = stripPreviewSampleKeysFromConfig(parseBlockConfig(configJson));
  if (stripped == null || Object.keys(stripped).length === 0) {
    return typeIndex === BLOCK_TYPE_BY_NAME.divider ? null : stripped;
  }
  return stripped;
}

/**
 * Blocks for a new user-owned copy: new block IDs, preview keys stripped.
 * @param {object[]} libraryBlocks
 */
export function cloneLibraryBlocksForSaveCopy(libraryBlocks) {
  return (libraryBlocks || []).map((b) => {
    const typeIndex = blockTypeStringToIndex(b.type);
    const cfg = configJsonForUserTemplateAfterStrip(b.configJson, typeIndex);
    const empty =
      cfg == null ||
      (typeof cfg === "object" && cfg !== null && Object.keys(cfg).length === 0);
    const configJson = empty
      ? typeIndex === BLOCK_TYPE_BY_NAME.image
        ? { cropAspect: 1 }
        : null
      : cfg;
    return {
      blockId: uuidv4(),
      type: typeIndex,
      label: b.label,
      required: !!b.required,
      side: b.side === "back" ? "back" : "front",
      configJson,
    };
  });
}

/**
 * Initial seed blocks: same block IDs as the catalog (mobile insertOrIgnore parity), preview keys stripped.
 * @param {object[]} libraryBlocks
 */
export function libraryBlocksToInitialSeedBlocks(libraryBlocks) {
  return (libraryBlocks || []).map((b) => {
    const typeIndex = blockTypeStringToIndex(b.type);
    const raw = parseBlockConfig(b.configJson);
    let configJson = stripPreviewSampleKeysFromConfig(raw);
    if (
      typeIndex === BLOCK_TYPE_BY_NAME.image &&
      (configJson == null ||
        (typeof configJson === "object" && Object.keys(configJson).length === 0))
    ) {
      configJson = { cropAspect: 1 };
    }
    if (
      configJson != null &&
      typeof configJson === "object" &&
      Object.keys(configJson).length === 0
    ) {
      configJson = typeIndex === BLOCK_TYPE_BY_NAME.divider ? null : configJson;
    }
    return {
      blockId: b.blockId,
      type: typeIndex,
      label: b.label,
      required: !!b.required,
      side: b.side === "back" ? "back" : "front",
      configJson,
    };
  });
}

/**
 * @param {string} templateId
 */
export function getLibraryTemplateById(templateId) {
  const id = String(templateId || "").trim().toLowerCase();
  const list = defaultTemplateLibraryJson.templates || [];
  return list.find((t) => String(t.templateId).toLowerCase() === id) || null;
}

export function listLibraryTemplatesBySection(section) {
  const list = defaultTemplateLibraryJson.templates || [];
  if (section === "general") return list.filter((t) => t.librarySection === "general");
  if (section === "language") return list.filter((t) => t.librarySection === "language");
  return list;
}

/**
 * @param {import('@/data/default_template_library.json')['templates'][0]} template
 */
export function getPreviewSampleTextForBlock(block) {
  const cfg = parseBlockConfig(block.configJson);
  const v = cfg?.previewSampleText;
  return typeof v === "string" ? v : "";
}

/**
 * @param {import('@/data/default_template_library.json')['templates'][0]['blocks'][0]} block
 */
export function getPreviewSampleMediaKey(block) {
  const cfg = parseBlockConfig(block.configJson);
  const v = cfg?.previewSampleMediaKey;
  return typeof v === "string" ? v : null;
}
