/**
 * Purge soft-deleted Firestore docs after retention.
 * Keep in sync with scripts/purge-soft-deleted-data.js (same rules).
 *
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {import("@google-cloud/storage").Bucket} bucket
 * @param {{ retentionDays?: number, dryRun?: boolean, targetUid?: string | null }} options
 */
import { FieldPath } from "firebase-admin/firestore";

const BATCH_SIZE = 400;

function toMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value === "number") return value;
  return null;
}

function isPastCutoff(deletedAt, cutoffMs) {
  const ms = toMillis(deletedAt);
  return ms != null && ms <= cutoffMs;
}

async function listUsers(db, targetUid) {
  if (targetUid) return [targetUid];
  const usersSnap = await db.collection("users").select(FieldPath.documentId()).get();
  return usersSnap.docs.map((d) => d.id);
}

function toMediaIdsFromCard(cardData) {
  const values = Array.isArray(cardData?.values) ? cardData.values : [];
  const ids = [];
  for (const v of values) {
    if (Array.isArray(v?.media_ids)) ids.push(...v.media_ids);
    if (Array.isArray(v?.original_media_ids)) ids.push(...v.original_media_ids);
  }
  return [...new Set(ids.filter(Boolean))];
}

async function safeDeleteStorageObject(bucket, storagePath, dryRun, stats) {
  if (!storagePath) return;
  if (dryRun) {
    stats.storageDryRun += 1;
    return;
  }
  try {
    await bucket.file(storagePath).delete({ ignoreNotFound: true });
    stats.storageDeleted += 1;
  } catch (e) {
    stats.storageErrors += 1;
    console.warn("[purge] storage delete failed:", storagePath, e?.message || e);
  }
}

async function commitDeleteRefs(db, refs, dryRun, stats, bucket, storageDeletePaths = []) {
  for (const storagePath of storageDeletePaths) {
    await safeDeleteStorageObject(bucket, storagePath, dryRun, stats);
  }
  if (refs.length === 0) return;
  if (dryRun) {
    stats.docsDryRun += refs.length;
    return;
  }
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = refs.slice(i, i + BATCH_SIZE);
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
    stats.docsDeleted += chunk.length;
  }
}

async function purgeUser(db, bucket, uid, cutoffMs, dryRun, stats) {
  const userRef = db.collection("users").doc(uid);
  const decksCol = userRef.collection("decks");
  const cardsCol = userRef.collection("cards");
  const templatesCol = userRef.collection("templates");
  const mediaCol = userRef.collection("media");

  const mediaSnap = await mediaCol.get();

  const refsToDelete = [];
  const storagePathsToDelete = [];
  const mediaIdsRequestedByCascade = new Set();

  const decksSnap = await decksCol.get();
  const purgeDeckIds = new Set();
  decksSnap.docs.forEach((d) => {
    const data = d.data() || {};
    if (data.is_deleted === true && isPastCutoff(data.deleted_at, cutoffMs)) {
      purgeDeckIds.add(d.id);
      refsToDelete.push(d.ref);
    }
  });

  const cardsSnap = await cardsCol.get();
  cardsSnap.docs.forEach((d) => {
    const data = d.data() || {};
    const belongsToPurgedDeck = data.deck_id && purgeDeckIds.has(data.deck_id);
    const cardExpiredSoftDelete =
      data.is_deleted === true && isPastCutoff(data.deleted_at, cutoffMs);
    if (belongsToPurgedDeck || cardExpiredSoftDelete) {
      refsToDelete.push(d.ref);
      toMediaIdsFromCard(data).forEach((id) => mediaIdsRequestedByCascade.add(id));
    }
  });

  const templatesSnap = await templatesCol.get();
  templatesSnap.docs.forEach((d) => {
    const data = d.data() || {};
    if (data.is_deleted === true && isPastCutoff(data.deleted_at, cutoffMs)) {
      refsToDelete.push(d.ref);
    }
  });

  mediaSnap.docs.forEach((d) => {
    const data = d.data() || {};
    const mediaExpiredSoftDelete =
      data.is_deleted === true && isPastCutoff(data.deleted_at, cutoffMs);
    const requestedFromCascade = mediaIdsRequestedByCascade.has(d.id);
    if (mediaExpiredSoftDelete || requestedFromCascade) {
      refsToDelete.push(d.ref);
      if (data.storage_path) storagePathsToDelete.push(data.storage_path);
    }
  });

  await commitDeleteRefs(db, refsToDelete, dryRun, stats, bucket, storagePathsToDelete);

  stats.usersProcessed += 1;
}

/**
 * @returns {Promise<{
 *   usersProcessed: number,
 *   docsDryRun: number,
 *   docsDeleted: number,
 *   storageDryRun: number,
 *   storageDeleted: number,
 *   storageErrors: number,
 *   retentionDays: number,
 *   cutoffMs: number,
 *   dryRun: boolean,
 * }>}
 */
export async function runPurgeSoftDeleted(db, bucket, options = {}) {
  const retentionDays = Number(options.retentionDays ?? 30);
  const dryRun = Boolean(options.dryRun);
  const targetUid = options.targetUid?.trim() || null;
  const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  const stats = {
    usersProcessed: 0,
    docsDryRun: 0,
    docsDeleted: 0,
    storageDryRun: 0,
    storageDeleted: 0,
    storageErrors: 0,
    retentionDays,
    cutoffMs,
    dryRun,
  };

  const uids = await listUsers(db, targetUid);
  for (const uid of uids) {
    await purgeUser(db, bucket, uid, cutoffMs, dryRun, stats);
  }

  return stats;
}
