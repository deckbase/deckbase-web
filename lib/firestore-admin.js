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
