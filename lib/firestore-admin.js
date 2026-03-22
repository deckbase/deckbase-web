/**
 * Server-only Firestore/Storage helpers using Firebase Admin.
 * Used by API routes (e.g. mobile add-cards-with-AI).
 */
import { Timestamp } from "firebase-admin/firestore";
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

function getDb() {
  return getAdminFirestore();
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
  return {
    deckId: d.deck_id ?? d.deckId,
    title: d.title || "",
    description: d.description || "",
    defaultTemplateId: d.default_template_id ?? d.defaultTemplateId ?? null,
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
    return {
      deckId: data.deck_id ?? d.id,
      title: data.title || "",
      description: data.description || "",
      defaultTemplateId:
        data.default_template_id ?? data.defaultTemplateId ?? null,
    };
  });
}

/** Create a deck. Returns { deckId }. */
export async function createDeckAdmin(uid, title, description = "") {
  const db = getDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const deckId = uuidv4();
  const now = Timestamp.now();
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
    });
  return { deckId };
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

  const mappedBlocks = blocksArray.map((b) => ({
    blockId: (b.block_id ?? b.blockId) || uuidv4(),
    type: b.type,
    label: b.label || "",
    required: b.required || false,
    configJson: b.config_json ?? b.configJson,
  }));

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
    blocks: mappedBlocks,
    mainBlockId,
    subBlockId,
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

function isImageBlockType(t) {
  return t === "image" || t === 6;
}

function isAudioBlockType(t) {
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
    if (isImageBlockType(block.type) || isAudioBlockType(block.type)) {
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
  };
  if (configJson !== undefined && configJson !== null) out.configJson = configJson;
  return out;
}

/**
 * Create a new card using a template’s block layout and empty values.
 * @param {object} [options]
 * @param {Record<string, string>} [options.block_text] - Optional map blockId → text for text fields
 * @param {string} [options.front] - Optional: if set, fills the template main block’s text when empty
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
    };
  });

  const valuesExample = buildEmptyValuesForCardBlocks(template.blocks);

  const textBlockIds = blocks
    .filter((b) => b.category === "text")
    .map((b) => b.blockId);

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
      note: "Pass this templateId to create_card (or omit if deck default is this template). Image/audio blocks need mediaIds in the app unless you use an extended API.",
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
 * @param {{ frontBlockIds?: string[], backBlockIds?: string[] }} [opts.rendering]
 * @param {string|null} [opts.mainBlockId]
 * @param {string|null} [opts.subBlockId]
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
      { blockId: promptBlockId, type: "header1", label: "Question", required: false },
      { blockId: answerBlockId, type: "hiddenText", label: "Answer", required: false },
    ];
    mainBlockId = mainBlockId ?? promptBlockId;
    subBlockId = subBlockId ?? answerBlockId;
  } else {
    blocks = blocksInput.map((b) => {
      if (!b || typeof b !== "object") return null;
      return {
        blockId: b.blockId || b.block_id || uuidv4(),
        type: b.type,
        label: b.label || "",
        required: !!b.required,
        configJson: b.configJson ?? b.config_json,
      };
    }).filter(Boolean);
    if (blocks.length === 0) throw new Error("blocks array has no valid block objects");
    mainBlockId = mainBlockId ?? blocks[0]?.blockId ?? null;
    subBlockId = subBlockId ?? blocks[1]?.blockId ?? null;
  }

  const renderingIn = opts.rendering;
  const rendering =
    renderingIn && typeof renderingIn === "object"
      ? {
          front_block_ids:
            renderingIn.frontBlockIds ??
            renderingIn.front_block_ids ??
            [],
          back_block_ids:
            renderingIn.backBlockIds ?? renderingIn.back_block_ids ?? [],
        }
      : null;

  const description =
    opts.description != null ? String(opts.description).trim() : "";

  const templateId = uuidv4();
  const now = Timestamp.now();

  const template = {
    template_id: templateId,
    name,
    description,
    version: 1,
    blocks: blocks.map(blockToFirestore),
    rendering,
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
