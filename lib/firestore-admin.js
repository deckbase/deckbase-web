/**
 * Server-only Firestore/Storage helpers using Firebase Admin.
 * Used by API routes (e.g. mobile add-cards-with-AI).
 */
import { Timestamp } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";
import { getAdminFirestore, getAdminBucket, isAdminConfigured } from "@/utils/firebase-admin";

const getUserDataPath = (uid) => `flashcards/${uid}/data/main`;

function getDb() {
  return getAdminFirestore();
}

export function isAvailable() {
  return isAdminConfigured() && !!getDb();
}

/** Get deck by id (raw Firestore shape: deck_id, title, description, etc.) */
export async function getDeckAdmin(uid, deckId) {
  const db = getDb();
  if (!db) return null;
  const ref = db.collection("flashcards").doc(uid).collection("data").doc("main").collection("decks").doc(deckId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const d = snap.data();
  return {
    deckId: d.deck_id,
    title: d.title || "",
    description: d.description || "",
    defaultTemplateId: d.default_template_id || null,
  };
}

/** Get template by id (raw shape with blocks, main_block_id, etc.) */
export async function getTemplateAdmin(uid, templateId) {
  const db = getDb();
  if (!db) return null;
  const ref = db.collection("flashcards").doc(uid).collection("data").doc("main").collection("templates").doc(templateId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const d = snap.data();
  return {
    templateId: d.template_id,
    name: d.name || "",
    blocks: (d.blocks || []).map((b) => ({
      blockId: b.block_id,
      type: b.type,
      label: b.label || "",
      required: b.required || false,
      configJson: b.config_json,
    })),
    mainBlockId: d.main_block_id || null,
    subBlockId: d.sub_block_id || null,
  };
}

/** Get up to limit cards for a deck (for example cards). Returns array of { values } with blockId -> text. */
export async function getCardsForExamplesAdmin(uid, deckId, limitCount = 5) {
  const db = getDb();
  if (!db) return [];
  const cardsRef = db.collection("flashcards").doc(uid).collection("data").doc("main").collection("cards");
  const snap = await cardsRef.where("deck_id", "==", deckId).where("is_deleted", "==", false).limit(limitCount).get();
  const examples = [];
  snap.docs.forEach((docSnap) => {
    const d = docSnap.data();
    const o = {};
    (d.values || []).forEach((v) => {
      if (v.text != null && String(v.text).trim()) o[v.block_id] = String(v.text).trim();
    });
    if (Object.keys(o).length > 0) examples.push(o);
  });
  return examples;
}

/** Transform block to Firestore shape (snake_case). */
function blockToFirestore(block) {
  const result = { block_id: block.blockId, type: block.type, label: block.label || "", required: block.required || false };
  if (block.configJson !== undefined) result.config_json = block.configJson;
  return result;
}

/** Transform value to Firestore shape. */
function valueToFirestore(value) {
  const result = { block_id: value.blockId, type: value.type };
  if (value.text !== undefined) result.text = value.text;
  if (value.items !== undefined) result.items = value.items;
  if (value.mediaIds !== undefined) result.media_ids = value.mediaIds;
  if (value.correctAnswers !== undefined) result.correct_answers = value.correctAnswers;
  return result;
}

/** Create a single card. Returns { cardId }. */
export async function createCardAdmin(uid, deckId, templateId, blocksSnapshot, values) {
  const db = getDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const cardId = uuidv4();
  const now = Timestamp.now();
  const card = {
    card_id: cardId,
    deck_id: deckId,
    template_id: templateId,
    blocks_snapshot: (blocksSnapshot || []).map(blockToFirestore),
    values: (values || []).map(valueToFirestore),
    created_at: now,
    updated_at: now,
    is_deleted: false,
    srs_state: 1,
    srs_step: 0,
    srs_due: Date.now(),
    srs_last_review: null,
    review_count: 0,
  };
  const cardRef = db.collection("flashcards").doc(uid).collection("data").doc("main").collection("cards").doc(cardId);
  await cardRef.set(card);
  // Touch deck updated_at
  const deckRef = db.collection("flashcards").doc(uid).collection("data").doc("main").collection("decks").doc(deckId);
  await deckRef.set({ updated_at: now }, { merge: true });
  return { cardId };
}

/** Upload audio buffer to Storage and create media doc. Returns { mediaId }. */
export async function uploadAudioBufferAdmin(uid, buffer, mimeType = "audio/mpeg") {
  const db = getDb();
  const bucket = getAdminBucket();
  if (!db || !bucket) throw new Error("Firebase Admin Storage not configured");
  const mediaId = uuidv4();
  const ext = mimeType.includes("mpeg") || mimeType.includes("mp3") ? "mp3" : "bin";
  const storagePath = `users/${uid}/media/${mediaId}.${ext}`;
  const file = bucket.file(storagePath);
  await file.save(buffer, { contentType: mimeType, metadata: { contentType: mimeType } });
  const [signedUrl] = await file.getSignedUrl({ action: "read", expires: "03-01-2500" });
  const downloadUrl = signedUrl || `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
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
  const mediaRef = db.collection("users").doc(uid).collection("media").doc(mediaId);
  await mediaRef.set(media);
  return { mediaId };
}
