/**
 * Server-only Firestore/Storage helpers using Firebase Admin.
 * Used by API routes (e.g. mobile add-cards-with-AI).
 */
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";
import {
  getAdminFirestore,
  getAdminBucket,
  isAdminConfigured,
} from "@/utils/firebase-admin";
import {
  expandBlockTypesToTemplateBlocks,
  getMcpBlockCategory,
  resolveMcpBlockTypeKey,
} from "@/lib/mcp-template-blocks";
import {
  applyElevenLabsTtsForMcpCard,
  runElevenLabsTtsForSingleAudioBlock,
  isAudioBlockType,
  templateNeedsExplicitVoiceForMcpTts,
} from "@/lib/mcp-audio-tts";
import { resolveVoiceIdForMcpTts } from "@/lib/elevenlabs-voices";

function getDb() {
  return getAdminFirestore();
}

function normalizeDeckIconEmoji(raw) {
  if (raw == null) return null;
  const t = String(raw).trim();
  return t === "" ? null : t;
}

/** When `side` is omitted, first block = front, rest = back (MCP block_types / explicit blocks without side). */
function inferTemplateBlockSide(block, index) {
  if (block?.side === "back") return "back";
  if (block?.side === "front") return "front";
  return index === 0 ? "front" : "back";
}

/**
 * Ensure each block has `side: "front" | "back"` for Firestore.
 * Unknown/null side → `"front"` (legacy templates; do not infer by index here — also used when reading).
 */
function normalizeTemplateBlocksForWriteAdmin(blocks) {
  return (blocks || []).map((b) => ({
    ...b,
    side: b.side === "back" ? "back" : "front",
  }));
}

export function isAvailable() {
  return isAdminConfigured() && !!getDb();
}

/** Get deck by id (raw Firestore shape: deck_id, title, description, etc.) — path: users/{uid}/decks/{deckId} */
export async function getDeckAdmin(uid, deckId) {
  const db = getDb();
  if (!db) return null;
  const ref = db.collection("users").doc(uid).collection("decks").doc(deckId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const d = snap.data();
  const rawIcon = d.icon_emoji ?? d.iconEmoji;
  return {
    deckId: d.deck_id ?? d.deckId,
    title: d.title || "",
    description: d.description || "",
    defaultTemplateId: d.default_template_id ?? d.defaultTemplateId ?? null,
    iconEmoji: normalizeDeckIconEmoji(rawIcon),
  };
}

/** List decks for a user (non-deleted). Returns array of { deckId, title, description, defaultTemplateId }. */
export async function getDecksAdmin(uid) {
  const db = getDb();
  if (!db) return [];
  const ref = db.collection("users").doc(uid).collection("decks");
  const snap = await ref.where("is_deleted", "==", false).get();
  return snap.docs.map((d) => {
    const data = d.data();
    const rawIcon = data.icon_emoji ?? data.iconEmoji;
    return {
      deckId: data.deck_id ?? d.id,
      title: data.title || "",
      description: data.description || "",
      defaultTemplateId:
        data.default_template_id ?? data.defaultTemplateId ?? null,
      iconEmoji: normalizeDeckIconEmoji(rawIcon),
    };
  });
}

/** Create a deck. Returns { deckId }. */
export async function createDeckAdmin(uid, title, description = "", iconEmoji = null) {
  const db = getDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const deckId = uuidv4();
  const now = Timestamp.now();
  const normalizedIcon = normalizeDeckIconEmoji(iconEmoji);
  await db
    .collection("users")
    .doc(uid)
    .collection("decks")
    .doc(deckId)
    .set({
      deck_id: deckId,
      title: title || "Untitled",
      description: description || "",
      created_at: now,
      updated_at: now,
      is_deleted: false,
      ...(normalizedIcon ? { icon_emoji: normalizedIcon } : {}),
    });
  return { deckId };
}

/**
 * Update deck title, description, and/or default template id.
 */
export async function updateDeckAdmin(uid, deckId, opts = {}) {
  const deck = await getDeckAdmin(uid, deckId);
  if (!deck) throw new Error("Deck not found");
  const db = getDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const now = Timestamp.now();
  const payload = { updated_at: now };
  if (opts.title !== undefined) payload.title = String(opts.title).trim() || "Untitled";
  if (opts.description !== undefined) payload.description = String(opts.description ?? "").trim();
  if (opts.default_template_id !== undefined || opts.defaultTemplateId !== undefined) {
    const tid = opts.default_template_id ?? opts.defaultTemplateId;
    payload.default_template_id = tid == null || tid === "" ? null : String(tid).trim();
  }
  if (opts.icon_emoji !== undefined || opts.iconEmoji !== undefined) {
    const raw = opts.icon_emoji ?? opts.iconEmoji;
    const n = normalizeDeckIconEmoji(raw);
    if (n) payload.icon_emoji = n;
    else payload.icon_emoji = FieldValue.delete();
  }
  const hasField =
    opts.title !== undefined ||
    opts.description !== undefined ||
    opts.default_template_id !== undefined ||
    opts.defaultTemplateId !== undefined ||
    opts.icon_emoji !== undefined ||
    opts.iconEmoji !== undefined;
  if (!hasField) {
    return {
      deckId,
      title: deck.title,
      description: deck.description,
      defaultTemplateId: deck.defaultTemplateId,
      iconEmoji: deck.iconEmoji ?? null,
    };
  }
  await db
    .collection("users")
    .doc(uid)
    .collection("decks")
    .doc(deckId)
    .set(payload, { merge: true });
  return {
    deckId,
    title: payload.title !== undefined ? payload.title : deck.title,
    description: payload.description !== undefined ? payload.description : deck.description,
    defaultTemplateId:
      payload.default_template_id !== undefined
        ? payload.default_template_id
        : deck.defaultTemplateId,
    iconEmoji:
      opts.icon_emoji !== undefined || opts.iconEmoji !== undefined
        ? normalizeDeckIconEmoji(opts.icon_emoji ?? opts.iconEmoji)
        : deck.iconEmoji ?? null,
  };
}

/** Get template by id (raw shape with blocks, main_block_id, etc.) — path: users/{uid}/templates/{templateId} */
export async function getTemplateAdmin(uid, templateId) {
  const db = getDb();
  if (!db) return null;
  const ref = db
    .collection("users")
    .doc(uid)
    .collection("templates")
    .doc(templateId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const d = snap.data();
  if (d.is_deleted) return null;

  // Blocks may be in blocks, blocks_snapshot, or blocks_snapshot_json (mobile / alternate sync)
  let rawBlocks = d.blocks ?? d.blocks_snapshot;
  // Firestore can store arrays as JSON strings if written that way; normalize to array
  if (typeof rawBlocks === "string") {
    try {
      const parsed = JSON.parse(rawBlocks);
      rawBlocks = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object"
          ? Object.values(parsed)
          : null;
    } catch {
      rawBlocks = null;
    }
  }
  if (rawBlocks == null && d.blocks_snapshot_json) {
    try {
      const parsed =
        typeof d.blocks_snapshot_json === "string"
          ? JSON.parse(d.blocks_snapshot_json)
          : d.blocks_snapshot_json;
      rawBlocks = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object"
          ? Object.values(parsed)
          : null;
    } catch {
      rawBlocks = null;
    }
  }
  // Fallback: if still empty, look for any array field that has block-like items (web may use different key)
  if (
    (rawBlocks == null ||
      (Array.isArray(rawBlocks) && rawBlocks.length === 0)) &&
    typeof d === "object"
  ) {
    for (const [, value] of Object.entries(d)) {
      const arr = Array.isArray(value)
        ? value
        : value && typeof value === "object" && !value?.toMillis
          ? Object.values(value)
          : null;
      if (
        arr?.length > 0 &&
        arr.some(
          (item) => item && (item.block_id != null || item.blockId != null),
        )
      ) {
        rawBlocks = arr;
        break;
      }
    }
  }
  const blocksArray = Array.isArray(rawBlocks)
    ? rawBlocks
    : rawBlocks && typeof rawBlocks === "object" && !Array.isArray(rawBlocks)
      ? Object.values(rawBlocks)
      : [];

  if (blocksArray.length === 0) {
    const topLevelKeys = Object.keys(d || {}).filter(
      (k) => k !== "created_at" && k !== "updated_at",
    );
    console.warn(
      "[getTemplateAdmin] Template has no blocks; doc keys:",
      topLevelKeys.join(", "),
      {
        path: `users/${uid}/templates/${templateId}`,
        hasBlocks: "blocks" in (d || {}),
        blocksType:
          d?.blocks == null
            ? "null/undefined"
            : Array.isArray(d.blocks)
              ? "array"
              : typeof d.blocks,
      },
    );
  }

  let mappedBlocks = blocksArray.map((b) => ({
    blockId: (b.block_id ?? b.blockId) || uuidv4(),
    type: b.type,
    label: b.label || "",
    required: b.required || false,
    configJson: b.config_json ?? b.configJson,
    side:
      b.side === "back"
        ? "back"
        : b.side === "front"
          ? "front"
          : null,
  }));

  mappedBlocks = normalizeTemplateBlocksForWriteAdmin(mappedBlocks);

  const storedMain = d.main_block_id ?? d.mainBlockId;
  const storedSub = d.sub_block_id ?? d.subBlockId;
  const mainBlockId =
    (storedMain && mappedBlocks.some((b) => b.blockId === storedMain))
      ? storedMain
      : mappedBlocks[0]?.blockId ?? null;
  const subBlockId =
    (storedSub && mappedBlocks.some((b) => b.blockId === storedSub))
      ? storedSub
      : mappedBlocks[1]?.blockId ?? null;

  return {
    templateId: d.template_id ?? d.templateId,
    name: d.name || "",
    description: d.description != null ? String(d.description) : "",
    blocks: mappedBlocks,
    mainBlockId,
    subBlockId,
    version: typeof d.version === "number" ? d.version : 1,
  };
}

/** List non-deleted templates for MCP / admin. Newest first. */
export async function getTemplatesAdmin(uid) {
  const db = getDb();
  if (!db) return [];
  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("templates")
    .where("is_deleted", "==", false)
    .get();
  const rows = snap.docs.map((docSnap) => {
    const d = docSnap.data();
    const sortMs =
      d.updated_at?.toMillis?.() ?? d.created_at?.toMillis?.() ?? 0;
    return {
      templateId: d.template_id ?? docSnap.id,
      name: d.name || "",
      description: d.description || "",
      _sortMs: sortMs,
    };
  });
  rows.sort((a, b) => b._sortMs - a._sortMs);
  return rows.map(({ _sortMs, ...r }) => r);
}

function isImageBlockTypeValue(t) {
  return t === "image" || t === 6;
}

function isAudioBlockTypeValue(t) {
  return t === "audio" || t === 7;
}

/** Default card values for each template block (empty content). */
export function buildEmptyValuesForCardBlocks(blocks) {
  return (blocks || []).map((block) => {
    const v = {
      blockId: block.blockId,
      type: block.type,
      text: "",
    };
    if (isImageBlockTypeValue(block.type) || isAudioBlockTypeValue(block.type)) {
      v.mediaIds = [];
    }
    return v;
  });
}

/**
 * Validates MCP create_card / create_cards payload: unknown block_text keys, required text blocks,
 * and at least one non-empty text field when the template has text blocks.
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateMcpCreateCardPayload(template, options = {}) {
  if (!template?.blocks?.length) {
    return { ok: false, message: "Template has no blocks" };
  }
  const validIds = new Set(template.blocks.map((b) => b.blockId));
  const blockText = options.block_text ?? options.blockText;
  if (blockText != null) {
    if (typeof blockText !== "object" || Array.isArray(blockText)) {
      return {
        ok: false,
        message: "block_text must be a plain object mapping blockId to string (not an array)",
      };
    }
    for (const key of Object.keys(blockText)) {
      if (!validIds.has(key)) {
        const hint = [...validIds].join(", ");
        return {
          ok: false,
          message: `Unknown blockId in block_text: "${key}". Valid blockIds for this template: ${hint || "(none)"}`,
        };
      }
    }
  }

  const values = buildEmptyValuesForCardBlocks(template.blocks);
  if (blockText && typeof blockText === "object" && !Array.isArray(blockText)) {
    for (const v of values) {
      const t = blockText[v.blockId];
      if (t != null) v.text = String(t);
    }
  }

  const front = options.front;
  if (front != null && String(front).trim() && template.mainBlockId) {
    const mainV = values.find((x) => x.blockId === template.mainBlockId);
    if (mainV && String(mainV.text).trim() === "") {
      mainV.text = String(front).trim();
    }
  }

  for (const b of template.blocks) {
    if (!b.required) continue;
    const typeKey = resolveMcpBlockTypeKey(b.type);
    const cat = getMcpBlockCategory(typeKey);
    if (cat !== "text") continue;
    const vv = values.find((v) => v.blockId === b.blockId);
    if (!vv || String(vv.text).trim() === "") {
      const label = b.label ? ` (${b.label})` : "";
      return {
        ok: false,
        message: `Required text block is empty: blockId ${b.blockId}${label}. Use front or block_text.`,
      };
    }
  }

  const textBlocks = template.blocks.filter((b) => {
    const typeKey = resolveMcpBlockTypeKey(b.type);
    return getMcpBlockCategory(typeKey) === "text";
  });
  if (textBlocks.length > 0) {
    let any = false;
    for (const b of textBlocks) {
      const vv = values.find((v) => v.blockId === b.blockId);
      if (vv && String(vv.text).trim() !== "") {
        any = true;
        break;
      }
    }
    if (!any) {
      return {
        ok: false,
        message:
          "Card has no text content. Provide non-empty front or at least one block_text entry for a text block (see get_template_schema for blockIds).",
      };
    }
  }

  return { ok: true };
}

function cloneTemplateBlockForCard(block) {
  let configJson = block.configJson;
  if (typeof configJson === "string") {
    try {
      configJson = JSON.parse(configJson);
    } catch {
      /* keep as-is for blockToFirestore */
    }
  }
  const out = {
    blockId: block.blockId,
    type: block.type,
    label: block.label || "",
    required: !!block.required,
    side: block.side === "back" ? "back" : "front",
  };
  if (configJson !== undefined && configJson !== null) out.configJson = configJson;
  return out;
}

/**
 * Create a new card using a template’s block layout and empty values.
 * @param {object} [options]
 * @param {Record<string, string>} [options.block_text] - Optional map blockId → text for text fields
 * @param {string} [options.front] - Optional: if set, fills the template main block’s text when empty
 * @param {boolean} [options.generate_audio] - If false, skip ElevenLabs TTS for audio blocks (default: generate when API key + source text exist)
 * @param {string} [options.voice_id] - ElevenLabs voice id from list_elevenlabs_voices when generating audio.
 * @param {string} [options.audio_language] - ISO 639 code (e.g. en, uk). With audio_gender, selects the curated voice when voice_id is omitted.
 * @param {string} [options.audio_gender] - female | male. With audio_language, selects the curated voice when voice_id is omitted.
 */
export async function createCardFromTemplateAdmin(
  uid,
  deckId,
  templateId,
  options = {},
) {
  const deck = await getDeckAdmin(uid, deckId);
  if (!deck) throw new Error("Deck not found");

  const template = await getTemplateAdmin(uid, templateId);
  if (!template?.blocks?.length) {
    throw new Error("Template not found or has no blocks");
  }

  const validation = validateMcpCreateCardPayload(template, options);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const blocksSnapshot = template.blocks.map(cloneTemplateBlockForCard);
  const values = buildEmptyValuesForCardBlocks(blocksSnapshot);

  const blockText = options.block_text ?? options.blockText;
  if (blockText && typeof blockText === "object") {
    for (const v of values) {
      const t = blockText[v.blockId];
      if (t != null) v.text = String(t);
    }
  }

  const front = options.front;
  if (
    front != null &&
    String(front).trim() &&
    template.mainBlockId
  ) {
    const mainV = values.find((x) => x.blockId === template.mainBlockId);
    if (mainV && String(mainV.text).trim() === "") {
      mainV.text = String(front).trim();
    }
  }

  const genAudio =
    options.generate_audio !== false && options.generateAudio !== false;
  const hasAudioBlock = blocksSnapshot.some((b) => isAudioBlockType(b));

  let voiceIdForTts = "";
  if (genAudio && hasAudioBlock) {
    const resolved = resolveVoiceIdForMcpTts({
      voice_id: options.voice_id ?? options.voiceId,
      audio_language: options.audio_language ?? options.audioLanguage,
      audio_gender: options.audio_gender ?? options.audioGender,
    });
    if (!resolved.ok) {
      throw new Error(resolved.message);
    }
    voiceIdForTts = resolved.voiceId;
  }

  await applyElevenLabsTtsForMcpCard(
    uid,
    blocksSnapshot,
    values,
    template.mainBlockId,
    uploadAudioBufferAdmin,
    {
      generate_audio: genAudio,
      voiceIdOverride: voiceIdForTts || undefined,
    },
  );

  return createCardAdmin(
    uid,
    deckId,
    templateId,
    blocksSnapshot,
    values,
    template.mainBlockId,
    template.subBlockId,
  );
}

/**
 * Exact block/value JSON shape for MCP clients after the user picks a template.
 * @returns {Promise<object|null>} null if template missing or has no blocks
 */
export async function buildMcpTemplateCardSchema(uid, templateId) {
  const template = await getTemplateAdmin(uid, templateId);
  if (!template?.blocks?.length) return null;

  const blocks = template.blocks.map((b) => {
    const typeKey = resolveMcpBlockTypeKey(b.type) ?? String(b.type);
    return {
      blockId: b.blockId,
      type: b.type,
      typeKey,
      category: getMcpBlockCategory(typeKey) ?? "unknown",
      label: b.label || "",
      required: !!b.required,
      configJson: b.configJson ?? null,
      side: b.side === "back" ? "back" : "front",
    };
  });

  const valuesExample = buildEmptyValuesForCardBlocks(template.blocks);

  const textBlockIds = blocks
    .filter((b) => b.category === "text")
    .map((b) => b.blockId);

  const needsExplicitVoiceForTts = templateNeedsExplicitVoiceForMcpTts(
    template.blocks,
    template.mainBlockId,
  );

  return {
    templateId: template.templateId,
    name: template.name,
    mainBlockId: template.mainBlockId,
    subBlockId: template.subBlockId,
    blocks,
    valuesExample,
    create_card: {
      templateId: template.templateId,
      block_text: "Object mapping blockId → string. For this template, text blocks use these keys:",
      block_text_suggested_keys: textBlockIds,
      block_text_all_block_ids: blocks.map((b) => b.blockId),
      front: `Optional string; if set, fills main block (${template.mainBlockId ?? "none"}) when that value is still empty`,
      generate_audio:
        "Optional boolean; default true. ElevenLabs TTS for audio blocks when server has ELEVENLABS_API_KEY and source text resolves; false skips.",
      voice_id_required_for_tts: needsExplicitVoiceForTts,
      voice_id:
        "When generate_audio is true and the template has an audio block: pass voice_id from list_elevenlabs_voices after the user picks a voice, OR pass audio_language (ISO 639) and audio_gender (female|male) after asking the user. Same pair as list_elevenlabs_voices filters.",
      audio_language:
        "ISO 639 code (e.g. en, uk, fil). Use with audio_gender when voice_id is omitted and generate_audio is true.",
      audio_gender: "female | male. Use with audio_language when voice_id is omitted.",
      note: "Pass this templateId to create_card (or omit if deck default is this template). Each block in `blocks` has `side`: \"front\" (shown first in study) or \"back\" (after flip). Fill values for all blockIds; back-face content belongs in keys whose blocks have side \"back\". Image blocks still need uploads in-app. Audio: when ELEVENLABS_API_KEY is set, create_card runs ElevenLabs TTS from non-empty text (audio block text, or defaultSourceBlockId / main / first text block) and sets mediaIds; use generate_audio: false to skip. Same TTS/storage limits as the web API.",
    },
  };
}

/** Get up to limit cards for a deck (for example cards). Path: users/{uid}/cards */
export async function getCardsForExamplesAdmin(uid, deckId, limitCount = 5) {
  const db = getDb();
  if (!db) return [];
  const cardsRef = db.collection("users").doc(uid).collection("cards");
  const snap = await cardsRef
    .where("deck_id", "==", deckId)
    .where("is_deleted", "==", false)
    .limit(limitCount)
    .get();
  const examples = [];
  snap.docs.forEach((docSnap) => {
    const d = docSnap.data();
    let values = d.values;
    if ((!values || values.length === 0) && d.values_json) {
      try {
        const parsed =
          typeof d.values_json === "string"
            ? JSON.parse(d.values_json)
            : d.values_json;
        values = Array.isArray(parsed) ? parsed : [];
      } catch {
        values = [];
      }
    }
    const o = {};
    (values || []).forEach((v) => {
      const blockId = v.block_id ?? v.blockId;
      const text = v.text != null ? String(v.text).trim() : "";
      if (blockId && text) o[blockId] = text;
    });
    let blocks = d.blocks_snapshot;
    if ((!blocks || blocks.length === 0) && d.blocks_snapshot_json) {
      try {
        const parsed =
          typeof d.blocks_snapshot_json === "string"
            ? JSON.parse(d.blocks_snapshot_json)
            : d.blocks_snapshot_json;
        blocks = Array.isArray(parsed) ? parsed : [];
      } catch {
        blocks = [];
      }
    }
    (blocks || []).forEach((b) => {
      const bid = b.block_id ?? b.blockId;
      const typ = b.type;
      const isQuiz =
        typ === "quizSingleSelect" ||
        typ === "quizMultiSelect" ||
        typ === "quizTextAnswer" ||
        typ === 8 ||
        typ === 9 ||
        typ === 10;
      if (!bid || !isQuiz) return;
      let cfg = b.config_json ?? b.configJson;
      if (typeof cfg === "string") {
        try {
          cfg = JSON.parse(cfg);
        } catch {
          cfg = {};
        }
      }
      const q = cfg?.question != null ? String(cfg.question).trim() : "";
      if (q) o[bid] = q;
    });
    if (Object.keys(o).length > 0) examples.push(o);
  });
  return examples;
}

/** Transform block to Firestore shape (snake_case). */
function blockToFirestore(block) {
  const result = {
    block_id: block.blockId,
    type: block.type,
    label: block.label || "",
    required: block.required || false,
    side: block.side === "back" ? "back" : "front",
  };
  if (block.configJson !== undefined) result.config_json = block.configJson;
  return result;
}

/** Transform value to Firestore shape. */
function valueToFirestore(value) {
  const result = { block_id: value.blockId, type: value.type };
  if (value.text !== undefined) result.text = value.text;
  if (value.items !== undefined) result.items = value.items;
  if (value.mediaIds !== undefined) result.media_ids = value.mediaIds;
  if (value.correctAnswers !== undefined)
    result.correct_answers = value.correctAnswers;
  return result;
}

/** Create a single card. Returns { cardId }. */
export async function createCardAdmin(
  uid,
  deckId,
  templateId,
  blocksSnapshot,
  values,
  mainBlockId = null,
  subBlockId = null,
) {
  const db = getDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const cardId = uuidv4();
  const now = Timestamp.now();
  const blocksSnapshotData = (blocksSnapshot || []).map(blockToFirestore);
  const valuesData = (values || []).map(valueToFirestore);
  const card = {
    card_id: cardId,
    deck_id: deckId,
    template_id: templateId,
    blocks_snapshot: blocksSnapshotData,
    values: valuesData,
    blocks_snapshot_json: JSON.stringify(blocksSnapshotData),
    values_json: JSON.stringify(valuesData),
    main_block_id: mainBlockId ?? null,
    sub_block_id: subBlockId ?? null,
    created_at: now,
    updated_at: now,
    is_deleted: false,
    srs_state: 1,
    srs_step: 0,
    srs_due: Date.now(),
    srs_last_review: null,
    review_count: 0,
  };
  const cardRef = db
    .collection("users")
    .doc(uid)
    .collection("cards")
    .doc(cardId);
  await cardRef.set(card);
  // Touch deck updated_at
  const deckRef = db
    .collection("users")
    .doc(uid)
    .collection("decks")
    .doc(deckId);
  await deckRef.set({ updated_at: now }, { merge: true });
  return { cardId };
}

/** Remove undefined values for Firestore writes; preserve Timestamp-like objects. */
function removeUndefined(obj) {
  if (obj === undefined) return undefined;
  if (obj === null || typeof obj !== "object") return obj;
  if (obj != null && typeof obj.toMillis === "function") return obj;
  if (Array.isArray(obj))
    return obj.map(removeUndefined).filter((v) => v !== undefined);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const cleaned = removeUndefined(v);
    if (cleaned !== undefined) out[k] = cleaned;
  }
  return out;
}

/**
 * Create a flashcard template (users/{uid}/templates/{templateId}).
 * @param {string} uid
 * @param {object} opts
 * @param {string} opts.name
 * @param {string} [opts.description]
 * @param {Array<object>} [opts.blocks] - Block defs with blockId, type, label, optional configJson. Omit or [] for default Question (header1) + Answer (hiddenText).
 * @param {Array<string|number>} [opts.block_types] - Ordered type keys (e.g. header1, hiddenText) or numeric ids 0–12; mutually exclusive with a non-empty blocks array.
 * @param {string|null} [opts.mainBlockId]
 * @param {string|null} [opts.subBlockId]
 * @param {string} [opts.voice_id] - When the template includes an audio block, required unless every audio block already has defaultVoiceId in configJson. Applied to all audio blocks as configJson.defaultVoiceId. Use list_elevenlabs_voices after the user picks.
 * @param {string} [opts.audio_language] - ISO 639 code with audio_gender when voice_id is omitted (same as create_card).
 * @param {string} [opts.audio_gender] - female | male with audio_language when voice_id is omitted.
 * @returns {Promise<{ templateId: string, name: string, description: string, mainBlockId: string|null, subBlockId: string|null }>}
 */
export async function createTemplateAdmin(uid, opts = {}) {
  const name = opts.name != null ? String(opts.name).trim() : "";
  if (!name) throw new Error("name is required");

  const db = getDb();
  if (!db) throw new Error("Firebase Admin not configured");

  let blocksInput = opts.blocks;
  if (typeof blocksInput === "string") {
    try {
      blocksInput = JSON.parse(blocksInput);
    } catch {
      throw new Error("blocks must be valid JSON array");
    }
  }

  let blockTypesInput = opts.block_types ?? opts.blockTypes;
  if (typeof blockTypesInput === "string") {
    try {
      blockTypesInput = JSON.parse(blockTypesInput);
    } catch {
      throw new Error("block_types must be valid JSON array");
    }
  }
  if (Array.isArray(blockTypesInput) && blockTypesInput.length > 0) {
    if (Array.isArray(blocksInput) && blocksInput.length > 0) {
      throw new Error("Provide either blocks or block_types, not both");
    }
    blocksInput = expandBlockTypesToTemplateBlocks(blockTypesInput);
  }

  let mainBlockId =
    opts.mainBlockId ?? opts.main_block_id ?? null;
  let subBlockId = opts.subBlockId ?? opts.sub_block_id ?? null;

  let blocks;
  if (!Array.isArray(blocksInput) || blocksInput.length === 0) {
    const promptBlockId = uuidv4();
    const answerBlockId = uuidv4();
    blocks = [
      {
        blockId: promptBlockId,
        type: "header1",
        label: "Question",
        required: false,
        side: "front",
      },
      {
        blockId: answerBlockId,
        type: "hiddenText",
        label: "Answer",
        required: false,
        side: "back",
      },
    ];
    mainBlockId = mainBlockId ?? promptBlockId;
    subBlockId = subBlockId ?? answerBlockId;
  } else {
    blocks = blocksInput.map((b, i) => {
      if (!b || typeof b !== "object") return null;
      return {
        blockId: b.blockId || b.block_id || uuidv4(),
        type: b.type,
        label: b.label || "",
        required: !!b.required,
        configJson: b.configJson ?? b.config_json,
        side: inferTemplateBlockSide(b, i),
      };
    }).filter(Boolean);
    if (blocks.length === 0) throw new Error("blocks array has no valid block objects");
    mainBlockId = mainBlockId ?? blocks[0]?.blockId ?? null;
    subBlockId = subBlockId ?? blocks[1]?.blockId ?? null;
  }

  let voiceIdOpt = String(opts.voice_id ?? opts.voiceId ?? "").trim();

  if (templateNeedsExplicitVoiceForMcpTts(blocks, mainBlockId)) {
    const resolved = resolveVoiceIdForMcpTts({
      voice_id: voiceIdOpt,
      audio_language: opts.audio_language ?? opts.audioLanguage,
      audio_gender: opts.audio_gender ?? opts.audioGender,
    });
    if (!resolved.ok) {
      throw new Error(resolved.message);
    }
    voiceIdOpt = resolved.voiceId;
  }

  if (voiceIdOpt) {
    blocks = blocks.map((b) => {
      if (!isAudioBlockType(b)) return b;
      let cfg = b.configJson;
      if (typeof cfg === "string") {
        try {
          cfg = JSON.parse(cfg || "{}");
        } catch {
          cfg = {};
        }
      } else if (cfg && typeof cfg === "object") {
        cfg = { ...cfg };
      } else {
        cfg = {};
      }
      cfg.defaultVoiceId = voiceIdOpt;
      return { ...b, configJson: cfg };
    });
  }

  if (templateNeedsExplicitVoiceForMcpTts(blocks, mainBlockId)) {
    throw new Error(
      'voice_id is required when the template includes an audio block without defaultVoiceId. Call list_elevenlabs_voices, ask the user which voice to use, then pass voice_id, or pass audio_language (ISO 639) and audio_gender (female|male), or set defaultVoiceId in each audio block\'s configJson in blocks.',
    );
  }

  const blocksNormalized = normalizeTemplateBlocksForWriteAdmin(blocks);

  const description =
    opts.description != null ? String(opts.description).trim() : "";

  const templateId = uuidv4();
  const now = Timestamp.now();

  const template = {
    template_id: templateId,
    name,
    description,
    version: 1,
    blocks: blocksNormalized.map(blockToFirestore),
    main_block_id: mainBlockId,
    sub_block_id: subBlockId,
    created_at: now,
    updated_at: now,
    is_deleted: false,
  };

  const cleaned = removeUndefined(template);
  await db
    .collection("users")
    .doc(uid)
    .collection("templates")
    .doc(templateId)
    .set(cleaned);

  return {
    templateId,
    name,
    description,
    mainBlockId,
    subBlockId,
  };
}

/**
 * Update an existing template (metadata and/or block layout). Increments version.
 * Omit blocks and block_types to keep the current layout; pass voice_id or audio_language + audio_gender to set defaultVoiceId on audio blocks (same resolution as create_template).
 */
export async function updateTemplateAdmin(uid, templateId, opts = {}) {
  const tid = String(templateId ?? "").trim();
  if (!tid) throw new Error("templateId is required");

  const db = getDb();
  if (!db) throw new Error("Firebase Admin not configured");

  const ref = db.collection("users").doc(uid).collection("templates").doc(tid);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Template not found");
  if (snap.data()?.is_deleted) throw new Error("Template not found");

  const existing = await getTemplateAdmin(uid, tid);
  if (!existing) throw new Error("Template not found");

  const prevVersion = typeof existing.version === "number" ? existing.version : 1;

  let blocksInput = opts.blocks;
  if (typeof blocksInput === "string") {
    try {
      blocksInput = JSON.parse(blocksInput);
    } catch {
      throw new Error("blocks must be valid JSON array");
    }
  }

  let blockTypesInput = opts.block_types ?? opts.blockTypes;
  if (typeof blockTypesInput === "string") {
    try {
      blockTypesInput = JSON.parse(blockTypesInput);
    } catch {
      throw new Error("block_types must be valid JSON array");
    }
  }

  const replaceBlocks =
    (Array.isArray(blockTypesInput) && blockTypesInput.length > 0) ||
    (Array.isArray(blocksInput) && blocksInput.length > 0);

  let mainBlockId =
    opts.mainBlockId !== undefined || opts.main_block_id !== undefined
      ? opts.mainBlockId ?? opts.main_block_id
      : undefined;
  let subBlockId =
    opts.subBlockId !== undefined || opts.sub_block_id !== undefined
      ? opts.subBlockId ?? opts.sub_block_id
      : undefined;

  let blocks;
  if (replaceBlocks) {
    if (Array.isArray(blockTypesInput) && blockTypesInput.length > 0) {
      if (Array.isArray(blocksInput) && blocksInput.length > 0) {
        throw new Error("Provide either blocks or block_types, not both");
      }
      blocksInput = expandBlockTypesToTemplateBlocks(blockTypesInput);
    }
    if (!Array.isArray(blocksInput) || blocksInput.length === 0) {
      throw new Error("blocks or block_types must yield a non-empty layout");
    }
    blocks = blocksInput
      .map((b, i) => {
        if (!b || typeof b !== "object") return null;
        return {
          blockId: b.blockId || b.block_id || uuidv4(),
          type: b.type,
          label: b.label || "",
          required: !!b.required,
          configJson: b.configJson ?? b.config_json,
          side: inferTemplateBlockSide(b, i),
        };
      })
      .filter(Boolean);
    if (blocks.length === 0) throw new Error("blocks array has no valid block objects");
    mainBlockId = mainBlockId ?? blocks[0]?.blockId ?? null;
    subBlockId = subBlockId ?? blocks[1]?.blockId ?? null;
  } else {
    blocks = existing.blocks;
    mainBlockId = mainBlockId ?? existing.mainBlockId;
    subBlockId = subBlockId ?? existing.subBlockId;
  }

  let voiceIdOpt = String(opts.voice_id ?? opts.voiceId ?? "").trim();

  if (templateNeedsExplicitVoiceForMcpTts(blocks, mainBlockId)) {
    const resolved = resolveVoiceIdForMcpTts({
      voice_id: voiceIdOpt,
      audio_language: opts.audio_language ?? opts.audioLanguage,
      audio_gender: opts.audio_gender ?? opts.audioGender,
    });
    if (!resolved.ok) {
      throw new Error(resolved.message);
    }
    voiceIdOpt = resolved.voiceId;
  }

  if (voiceIdOpt) {
    blocks = blocks.map((b) => {
      if (!isAudioBlockType(b)) return b;
      let cfg = b.configJson;
      if (typeof cfg === "string") {
        try {
          cfg = JSON.parse(cfg || "{}");
        } catch {
          cfg = {};
        }
      } else if (cfg && typeof cfg === "object") {
        cfg = { ...cfg };
      } else {
        cfg = {};
      }
      cfg.defaultVoiceId = voiceIdOpt;
      return { ...b, configJson: cfg };
    });
  }

  if (templateNeedsExplicitVoiceForMcpTts(blocks, mainBlockId)) {
    throw new Error(
      'voice_id is required when the template includes an audio block without defaultVoiceId. Call list_elevenlabs_voices, ask the user which voice to use, then pass voice_id, or pass audio_language (ISO 639) and audio_gender (female|male), or set defaultVoiceId in each audio block\'s configJson in blocks.',
    );
  }

  if (replaceBlocks) {
    blocks = normalizeTemplateBlocksForWriteAdmin(blocks);
  }

  const name =
    opts.name !== undefined ? String(opts.name).trim() : existing.name;
  if (!name) throw new Error("name cannot be empty");

  const description =
    opts.description !== undefined
      ? String(opts.description ?? "").trim()
      : existing.description;

  const hasMetaOrLayout =
    opts.name !== undefined ||
    opts.description !== undefined ||
    replaceBlocks ||
    voiceIdOpt ||
    opts.mainBlockId !== undefined ||
    opts.main_block_id !== undefined ||
    opts.subBlockId !== undefined ||
    opts.sub_block_id !== undefined;

  if (!hasMetaOrLayout) {
    return {
      templateId: tid,
      name,
      description,
      mainBlockId,
      subBlockId,
      version: prevVersion,
    };
  }

  const now = Timestamp.now();
  const nextVersion = prevVersion + 1;

  const template = {
    template_id: tid,
    name,
    description,
    version: nextVersion,
    blocks: blocks.map(blockToFirestore),
    main_block_id: mainBlockId,
    sub_block_id: subBlockId,
    updated_at: now,
  };

  const cleaned = removeUndefined(template);
  await ref.set(cleaned, { merge: true });

  return {
    templateId: tid,
    name,
    description,
    mainBlockId,
    subBlockId,
    version: nextVersion,
  };
}

/** Upload audio buffer to Storage and create media doc. Returns { mediaId }. */
export async function uploadAudioBufferAdmin(
  uid,
  buffer,
  mimeType = "audio/mpeg",
) {
  const db = getDb();
  const bucket = getAdminBucket();
  if (!db || !bucket) throw new Error("Firebase Admin Storage not configured");
  const mediaId = uuidv4();
  const ext =
    mimeType.includes("mpeg") || mimeType.includes("mp3") ? "mp3" : "bin";
  const storagePath = `users/${uid}/media/${mediaId}.${ext}`;
  const file = bucket.file(storagePath);
  await file.save(buffer, {
    contentType: mimeType,
    metadata: { contentType: mimeType },
  });
  const [signedUrl] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
  });
  const downloadUrl =
    signedUrl || `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  const now = Timestamp.now();
  const media = {
    media_id: mediaId,
    storage_path: storagePath,
    download_url: downloadUrl,
    type: "audio",
    file_size: buffer.length,
    mime_type: mimeType,
    created_at: now,
    updated_at: now,
    is_deleted: false,
  };
  const mediaRef = db
    .collection("users")
    .doc(uid)
    .collection("media")
    .doc(mediaId);
  await mediaRef.set(media);
  return { mediaId };
}

/** Map a Firestore block/value to camelCase export shape (aligned with client card model). */
function blockToExportShape(b) {
  const data = b?.block_id != null ? b : { ...b, block_id: b?.blockId };
  let configJson = data.config_json ?? data.configJson;
  if (configJson != null && typeof configJson === "string") {
    try {
      configJson = JSON.parse(configJson);
    } catch {
      configJson = undefined;
    }
  }
  const out = {
    blockId: data.block_id ?? data.blockId,
    type: data.type,
    label: data.label || "",
    required: data.required || false,
    side: data.side === "back" ? "back" : "front",
  };
  if (configJson !== undefined) out.configJson = configJson;
  return out;
}

function valueToExportShape(v) {
  const d = v?.block_id != null ? v : { ...v, block_id: v?.blockId };
  const out = {
    blockId: d.block_id ?? d.blockId,
    type: d.type,
  };
  if (d.text !== undefined) out.text = d.text;
  if (d.items !== undefined) out.items = d.items;
  const mediaIds = d.media_ids ?? d.mediaIds;
  if (mediaIds !== undefined) out.mediaIds = mediaIds;
  const originalMediaIds = d.original_media_ids ?? d.originalMediaIds;
  if (originalMediaIds !== undefined) out.originalMediaIds = originalMediaIds;
  const correctAnswers = d.correct_answers ?? d.correctAnswers;
  if (correctAnswers !== undefined) out.correctAnswers = correctAnswers;
  return out;
}

/**
 * @param {object} d - Raw Firestore card doc
 * @param {{ valuesOnly?: boolean }} [opts] - If true, omit blocksSnapshot (smaller payload; use get_template_schema for layout)
 */
function cardDocToExportShape(d, opts = {}) {
  const valuesOnly = !!opts.valuesOnly;
  let blocks = [];
  if (d.blocks_snapshot_json) {
    try {
      const parsed = JSON.parse(d.blocks_snapshot_json);
      blocks = Array.isArray(parsed) ? parsed : [];
    } catch {
      blocks = Array.isArray(d.blocks_snapshot) ? d.blocks_snapshot : [];
    }
  } else {
    blocks = Array.isArray(d.blocks_snapshot) ? d.blocks_snapshot : [];
  }
  let values = [];
  if (d.values_json) {
    try {
      const parsed = JSON.parse(d.values_json);
      values = Array.isArray(parsed) ? parsed : [];
    } catch {
      values = Array.isArray(d.values) ? d.values : [];
    }
  } else {
    values = Array.isArray(d.values) ? d.values : [];
  }
  const out = {
    cardId: d.card_id ?? d.cardId,
    deckId: d.deck_id ?? d.deckId,
    templateId: d.template_id ?? d.templateId ?? null,
    mainBlockId: d.main_block_id ?? d.mainBlockId ?? null,
    subBlockId: d.sub_block_id ?? d.subBlockId ?? null,
    values: values.map(valueToExportShape),
  };
  if (!valuesOnly) {
    out.blocksSnapshot = blocks.map(blockToExportShape);
  }
  return out;
}

/** Load one card for MCP (blocksSnapshot + values). Path: users/{uid}/cards/{cardId} */
export async function getCardAdmin(uid, cardId) {
  const db = getDb();
  if (!db) return null;
  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("cards")
    .doc(cardId)
    .get();
  if (!snap.exists) return null;
  const d = snap.data();
  if (d.is_deleted) return null;
  return cardDocToExportShape(d, { valuesOnly: false });
}

/**
 * Soft-delete a card (same as dashboard: is_deleted, deleted_at). Verifies the card belongs to the deck.
 * Touches the deck's updated_at.
 */
export async function deleteCardAdmin(uid, cardId, deckId) {
  const db = getDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const did = String(deckId ?? "").trim();
  const cid = String(cardId ?? "").trim();
  if (!did || !cid) throw new Error("deckId and cardId are required");

  const cardRef = db.collection("users").doc(uid).collection("cards").doc(cid);
  const snap = await cardRef.get();
  if (!snap.exists) throw new Error("Card not found");
  const raw = snap.data();
  if (raw.is_deleted) throw new Error("Card not found");
  const cardDeckId = raw.deck_id ?? raw.deckId;
  if (cardDeckId !== did) throw new Error("Card does not belong to this deck");

  const now = Timestamp.now();
  await cardRef.set(
    {
      is_deleted: true,
      deleted_at: now,
      updated_at: now,
    },
    { merge: true },
  );

  await db
    .collection("users")
    .doc(uid)
    .collection("decks")
    .doc(did)
    .set({ updated_at: now }, { merge: true });

  return { cardId: cid, deckId: did, deleted: true };
}

/** Update card values only (preserves blocksSnapshot). Touches deck updated_at. */
export async function updateCardValuesAdmin(uid, cardId, deckId, values) {
  const db = getDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const cardRef = db.collection("users").doc(uid).collection("cards").doc(cardId);
  const snap = await cardRef.get();
  if (!snap.exists) throw new Error("Card not found");
  const d = snap.data();
  if (d.is_deleted) throw new Error("Card not found");
  const cardDeckId = d.deck_id ?? d.deckId;
  if (cardDeckId !== deckId) throw new Error("Card does not belong to this deck");
  const now = Timestamp.now();
  const valuesData = (values || []).map(valueToFirestore);
  await cardRef.set(
    {
      values: valuesData,
      values_json: JSON.stringify(valuesData),
      updated_at: now,
    },
    { merge: true },
  );
  await db
    .collection("users")
    .doc(uid)
    .collection("decks")
    .doc(deckId)
    .set({ updated_at: now }, { merge: true });
}

function normalizeCardBlocksSnapshotInput(raw) {
  let arr = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      throw new Error("blocks_snapshot must be valid JSON array");
    }
  }
  if (!Array.isArray(arr)) throw new Error("blocks_snapshot must be an array");
  return arr.map((b) => {
    if (!b || typeof b !== "object") {
      throw new Error("blocks_snapshot entries must be objects");
    }
    return {
      blockId: b.blockId || b.block_id || uuidv4(),
      type: b.type,
      label: b.label || "",
      required: !!b.required,
      configJson: b.configJson ?? b.config_json,
    };
  });
}

/**
 * Update card content: replace values and/or blocks_snapshot, or merge front / block_text into existing values.
 * When blocks_snapshot changes without explicit values, values are rebuilt empty then block_text/front are applied.
 */
export async function updateCardContentAdmin(uid, deckId, cardId, opts = {}) {
  const did = String(deckId ?? "").trim();
  const cid = String(cardId ?? "").trim();
  if (!did || !cid) throw new Error("deckId and cardId are required");

  const db = getDb();
  if (!db) throw new Error("Firebase Admin not configured");

  const cardRef = db.collection("users").doc(uid).collection("cards").doc(cid);
  const snap = await cardRef.get();
  if (!snap.exists) throw new Error("Card not found");
  const rawDoc = snap.data();
  if (rawDoc.is_deleted) throw new Error("Card not found");
  const cardDeckId = rawDoc.deck_id ?? rawDoc.deckId;
  if (cardDeckId !== did) throw new Error("Card does not belong to this deck");

  const card = await getCardAdmin(uid, cid);
  if (!card) throw new Error("Card not found");

  const hasValues = Array.isArray(opts.values);
  const hasBlocks =
    opts.blocks_snapshot != null || opts.blocksSnapshot != null;
  const hasFront = opts.front !== undefined;
  const blockText = opts.block_text ?? opts.blockText;

  if (
    !hasValues &&
    !hasBlocks &&
    !hasFront &&
    (blockText == null || typeof blockText !== "object" || Array.isArray(blockText))
  ) {
    throw new Error(
      "Provide at least one of: values, blocks_snapshot, front, block_text",
    );
  }

  let blocksSnapshot = card.blocksSnapshot || [];

  if (hasBlocks) {
    const rawBs = opts.blocks_snapshot ?? opts.blocksSnapshot;
    blocksSnapshot = normalizeCardBlocksSnapshotInput(rawBs);
  }

  let values;
  if (hasValues) {
    values = (opts.values || []).map((v) => ({
      blockId: v.blockId ?? v.block_id,
      type: v.type,
      text: v.text,
      items: v.items,
      mediaIds: v.mediaIds ?? v.media_ids,
      correctAnswers: v.correctAnswers ?? v.correct_answers,
    }));
    for (const v of values) {
      if (!v.blockId) throw new Error("Each value must include blockId");
    }
  } else {
    values = JSON.parse(JSON.stringify(card.values || []));
    if (hasBlocks) {
      values = buildEmptyValuesForCardBlocks(blocksSnapshot);
    }
    const mainForFront = blocksSnapshot.some((b) => b.blockId === card.mainBlockId)
      ? card.mainBlockId
      : blocksSnapshot[0]?.blockId ?? null;
    if (hasFront) {
      if (mainForFront) {
        const vi = values.findIndex((v) => v.blockId === mainForFront);
        if (vi >= 0) {
          values[vi] = { ...values[vi], text: String(opts.front ?? "") };
        }
      }
    }
    if (blockText && typeof blockText === "object" && !Array.isArray(blockText)) {
      const validIds = new Set(blocksSnapshot.map((b) => b.blockId));
      for (const key of Object.keys(blockText)) {
        if (!validIds.has(key)) {
          throw new Error(
            `block_text key "${key}" is not a blockId in the card layout`,
          );
        }
      }
      for (const [bid, text] of Object.entries(blockText)) {
        const vi = values.findIndex((v) => v.blockId === bid);
        if (vi >= 0) {
          values[vi] = { ...values[vi], text: String(text ?? "") };
        }
      }
    }
  }

  if (hasValues && hasBlocks) {
    const vIds = new Set(values.map((v) => v.blockId));
    for (const b of blocksSnapshot) {
      if (!vIds.has(b.blockId)) {
        throw new Error(`values missing entry for blockId ${b.blockId}`);
      }
    }
  }

  const blocksData = blocksSnapshot.map(blockToFirestore);
  const valuesData = values.map(valueToFirestore);

  let mainBlockId = card.mainBlockId;
  let subBlockId = card.subBlockId;
  if (hasBlocks) {
    const eff = (b) => (b.side === "back" ? "back" : "front");
    const mainFromSide = blocksSnapshot.find((b) => eff(b) === "front")?.blockId;
    const subFromSide = blocksSnapshot.find((b) => eff(b) === "back")?.blockId;
    mainBlockId = blocksSnapshot.some((b) => b.blockId === card.mainBlockId)
      ? card.mainBlockId
      : mainFromSide ?? blocksSnapshot[0]?.blockId ?? null;
    subBlockId = blocksSnapshot.some((b) => b.blockId === card.subBlockId)
      ? card.subBlockId
      : subFromSide ?? blocksSnapshot[1]?.blockId ?? null;
  }

  const now = Timestamp.now();
  const payload = {
    values: valuesData,
    values_json: JSON.stringify(valuesData),
    updated_at: now,
  };
  if (hasBlocks) {
    payload.blocks_snapshot = blocksData;
    payload.blocks_snapshot_json = JSON.stringify(blocksData);
    payload.main_block_id = mainBlockId;
    payload.sub_block_id = subBlockId;
  }

  await cardRef.set(payload, { merge: true });
  await db
    .collection("users")
    .doc(uid)
    .collection("decks")
    .doc(did)
    .set({ updated_at: now }, { merge: true });

  return { cardId: cid, deckId: did };
}

/**
 * ElevenLabs TTS for an existing card’s audio block; writes new mediaIds on success.
 * @param {object} toolOptions - voice_id OR (audio_language + audio_gender); block_id?, text?, replace_existing?, generate_audio?
 */
export async function attachAudioToExistingCardAdmin(uid, deckId, cardId, toolOptions = {}) {
  const resolvedVoice = resolveVoiceIdForMcpTts({
    voice_id: toolOptions.voice_id ?? toolOptions.voiceId,
    audio_language: toolOptions.audio_language ?? toolOptions.audioLanguage,
    audio_gender: toolOptions.audio_gender ?? toolOptions.audioGender,
  });
  if (!resolvedVoice.ok) {
    throw new Error(resolvedVoice.message);
  }
  const voiceIdRequired = resolvedVoice.voiceId;

  const card = await getCardAdmin(uid, cardId);
  if (!card) throw new Error("Card not found");
  if (card.deckId !== deckId) throw new Error("Card does not belong to this deck");

  const blocksSnapshot = card.blocksSnapshot || [];
  const audioBlocks = blocksSnapshot.filter((b) => isAudioBlockType(b));
  if (audioBlocks.length === 0) {
    throw new Error("Card has no audio block in blocksSnapshot");
  }

  const blockIdHint =
    toolOptions.block_id ?? toolOptions.blockId ?? toolOptions.audio_block_id;
  let targetBlock;
  if (blockIdHint) {
    targetBlock = audioBlocks.find((b) => b.blockId === blockIdHint);
    if (!targetBlock) {
      throw new Error(
        `No audio block with block_id "${blockIdHint}". Audio blockIds: ${audioBlocks.map((b) => b.blockId).join(", ")}`,
      );
    }
  } else if (audioBlocks.length > 1) {
    throw new Error(
      `Card has multiple audio blocks; pass block_id. Available: ${audioBlocks.map((b) => b.blockId).join(", ")}`,
    );
  } else {
    targetBlock = audioBlocks[0];
  }

  const values = JSON.parse(JSON.stringify(card.values || []));
  const audioIdx = values.findIndex((v) => v.blockId === targetBlock.blockId);
  if (audioIdx < 0) {
    throw new Error("Card values are missing an entry for this audio block");
  }

  const result = await runElevenLabsTtsForSingleAudioBlock({
    uid,
    audioBlock: targetBlock,
    blocksSnapshot,
    values,
    mainBlockId: card.mainBlockId,
    audioIdx,
    uploadAudioBufferAdmin,
    options: {
      replaceExisting:
        toolOptions.replace_existing === true || toolOptions.replaceExisting === true,
      explicitText: toolOptions.text ?? toolOptions.tts_text ?? null,
      voiceIdOverride: voiceIdRequired,
      generate_audio:
        toolOptions.generate_audio !== false && toolOptions.generateAudio !== false,
    },
  });

  if (!result.ok) {
    if (result.reason === "already_has_media") {
      throw new Error(
        "Audio block already has media. Pass replace_existing: true to regenerate and replace.",
      );
    }
    if (result.reason === "no_api_key") {
      throw new Error("ELEVENLABS_API_KEY is not configured on the server");
    }
    if (result.reason === "no_source_text") {
      throw new Error(
        "No text to speak. Pass text, or ensure the card has source text (audio block text, default source block, or main text).",
      );
    }
    if (result.reason === "disabled") {
      throw new Error("Audio generation was disabled (generate_audio: false)");
    }
    throw new Error(result.message || result.reason || "TTS failed");
  }

  await updateCardValuesAdmin(uid, cardId, deckId, values);
  return {
    cardId,
    deckId,
    mediaId: result.mediaId,
    charsUsed: result.charsUsed,
    blockId: targetBlock.blockId,
  };
}

const DEFAULT_MAX_EXPORT_CARDS = 2000;
const ABSOLUTE_MAX_EXPORT_CARDS = 5000;

/**
 * Export full deck metadata and cards as JSON-friendly objects (blocksSnapshot + values).
 * @param {object} [options]
 * @param {number} [options.maxCards]
 * @param {"full"|"values_only"} [options.exportType] - `full` (default): each card includes `blocksSnapshot` + `values`. `values_only`: omits `blocksSnapshot` per card for a smaller response (values still hold text, media ids, quiz fields).
 * @returns {Promise<{ deck: object, cards: object[], truncated: boolean, maxCards: number, exportType: string } | null>}
 */
export async function getDeckExportAdmin(uid, deckId, options = {}) {
  const rawMax =
    options.maxCards != null ? Number(options.maxCards) : DEFAULT_MAX_EXPORT_CARDS;
  const maxCards = Math.min(
    Math.max(1, Number.isFinite(rawMax) ? rawMax : DEFAULT_MAX_EXPORT_CARDS),
    ABSOLUTE_MAX_EXPORT_CARDS,
  );

  const rawExportType = String(
    options.exportType ?? options.export_type ?? "full",
  ).trim();
  const t = rawExportType.toLowerCase().replace(/-/g, "_");
  if (t !== "full" && t !== "values_only") {
    throw new Error('export_type must be "full" or "values_only"');
  }
  const exportType = t;
  const valuesOnly = exportType === "values_only";

  const deck = await getDeckAdmin(uid, deckId);
  if (!deck) return null;

  const db = getDb();
  if (!db) throw new Error("Firebase Admin not configured");

  const cardsRef = db.collection("users").doc(uid).collection("cards");
  const snap = await cardsRef
    .where("deck_id", "==", deckId)
    .where("is_deleted", "==", false)
    .limit(maxCards + 1)
    .get();

  const truncated = snap.docs.length > maxCards;
  const docs = truncated ? snap.docs.slice(0, maxCards) : snap.docs;
  const cards = docs.map((docSnap) =>
    cardDocToExportShape(docSnap.data(), { valuesOnly }),
  );

  return {
    deck: {
      deckId: deck.deckId,
      title: deck.title,
      description: deck.description,
    },
    cards,
    truncated,
    maxCards,
    exportType,
  };
}
