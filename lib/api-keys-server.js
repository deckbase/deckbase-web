/**
 * Server-only API key storage and lookup.
 * Collection: api_keys, doc id = SHA-256 hash of the raw key (hex).
 * Fields: uid, label (display name), created_at, last_used_at
 */

import { createHash, randomBytes } from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/utils/firebase-admin";

const COLLECTION = "api_keys";

function getDb() {
  return getAdminFirestore();
}

function hashKey(rawKey) {
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

/**
 * Generate a new API key, store its hash, return the raw key (show once).
 * @param {string} uid - User id
 * @param {string} [label] - Optional label
 * @returns {{ key: string, id: string, label: string, createdAt: string }} - Raw key and metadata (`label` is the user-visible name)
 */
export async function createApiKey(uid, label = "") {
  const db = getDb();
  if (!db) throw new Error("Firestore not configured");

  const rawKey = `db_${randomBytes(32).toString("hex")}`;
  const keyHash = hashKey(rawKey);
  const now = Timestamp.now();

  await db.collection(COLLECTION).doc(keyHash).set({
    uid,
    label: (label || "").trim().slice(0, 100) || "API key",
    created_at: now,
    last_used_at: null,
  });

  return {
    key: rawKey,
    id: keyHash,
    label: (label || "").trim().slice(0, 100) || "API key",
    createdAt: now.toDate().toISOString(),
  };
}

/**
 * List API keys for a user (no raw keys).
 * @param {string} uid
 * @returns {Promise<Array<{ id: string, label: string, name: string, createdAt: string, lastUsedAt: string | null }>>}
 */
export async function listApiKeysByUser(uid) {
  const db = getDb();
  if (!db) return [];

  const snap = await db.collection(COLLECTION).where("uid", "==", uid).get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    const display = d.label || "API key";
    return {
      id: doc.id,
      label: display,
      name: display,
      createdAt: d.created_at?.toDate?.()?.toISOString?.() ?? "",
      lastUsedAt: d.last_used_at?.toDate?.()?.toISOString?.() ?? null,
    };
  });
}

/**
 * Revoke an API key. Caller must ensure the key belongs to uid.
 * @param {string} uid - User id (for authorization)
 * @param {string} keyId - Doc id (hash of the key)
 */
export async function revokeApiKey(uid, keyId) {
  const db = getDb();
  if (!db) throw new Error("Firestore not configured");

  const ref = db.collection(COLLECTION).doc(keyId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.uid !== uid) {
    throw new Error("API key not found or access denied");
  }
  await ref.delete();
}

/**
 * Resolve raw API key to uid. Updates last_used_at.
 * @param {string} rawKey
 * @returns {Promise<string | null>} - User id or null
 */
export async function resolveUidByApiKey(rawKey) {
  const db = getDb();
  if (!db) return null;

  const keyHash = hashKey(rawKey);
  const ref = db.collection(COLLECTION).doc(keyHash);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const d = snap.data();
  const uid = d?.uid;
  if (!uid) return null;

  // Touch last_used_at (fire-and-forget)
  ref.update({ last_used_at: Timestamp.now() }).catch(() => {});

  return uid;
}
