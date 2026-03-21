/**
 * Purge soft-deleted Firestore docs after retention.
 *
 * Scope (users/{uid}/*):
 * - decks (hard-delete after retention; cascades cards in that deck)
 * - cards (hard-delete after retention)
 * - templates (hard-delete after retention)
 * - media (hard-delete after retention; tries to delete Storage object first)
 *
 * Safety:
 * - DRY_RUN defaults to true. Set DRY_RUN=false to execute deletes.
 *
 * Run:
 *   npm run purge:soft-deleted
 *   node --env-file=.env.local scripts/purge-soft-deleted-data.js
 *   node --env-file=.env.prod scripts/purge-soft-deleted-data.js
 *
 * Without --env-file, dotenv loads (in order): .env, .env.prod, then .env.local
 * (`.env.local` overrides — same idea as Next.js). Set ENV_FILE to load only one file.
 *
 * Optional env:
 * - ENV_FILE=.env                # if you prefer a single env file only
 * - FIRESTORE_DATABASE_ID=(default)
 * - RETENTION_DAYS=30
 * - DRY_RUN=true|false           # default true
 * - TARGET_UID=<uid>             # limit purge to one user
 */

const path = require("path");
const root = path.join(__dirname, "..");
if (process.env.ENV_FILE) {
  require("dotenv").config({ path: path.join(root, process.env.ENV_FILE) });
} else {
  require("dotenv").config({ path: path.join(root, ".env") });
  require("dotenv").config({ path: path.join(root, ".env.prod") });
  // Next.js convention: local secrets; wins over .env / .env.prod for duplicate keys
  require("dotenv").config({
    path: path.join(root, ".env.local"),
    override: true,
  });
}

const { getApps, initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldPath } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

const BATCH_SIZE = 400;

function envBool(value, fallback) {
  if (value == null) return fallback;
  return String(value).toLowerCase() === "true";
}

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

  const mediaStoragePathById = new Map();
  const mediaSnap = await mediaCol.get();
  mediaSnap.docs.forEach((d) => {
    const data = d.data() || {};
    mediaStoragePathById.set(d.id, data.storage_path || null);
  });

  const refsToDelete = [];
  const storagePathsToDelete = [];
  const mediaIdsRequestedByCascade = new Set();

  // 1) Purge old soft-deleted decks + cascade cards/media linked to those decks.
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

  // 2) Purge old soft-deleted templates.
  const templatesSnap = await templatesCol.get();
  templatesSnap.docs.forEach((d) => {
    const data = d.data() || {};
    if (data.is_deleted === true && isPastCutoff(data.deleted_at, cutoffMs)) {
      refsToDelete.push(d.ref);
    }
  });

  // 3) Purge old soft-deleted media docs; include media referenced by purged cards.
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

  await commitDeleteRefs(
    db,
    refsToDelete,
    dryRun,
    stats,
    bucket,
    storagePathsToDelete
  );

  stats.usersProcessed += 1;
}

async function main() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const databaseId = process.env.FIRESTORE_DATABASE_ID || "(default)";
  const retentionDays = Number(process.env.RETENTION_DAYS || 30);
  const dryRun = envBool(process.env.DRY_RUN, true);
  const targetUid = process.env.TARGET_UID?.trim() || null;
  const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  if (!projectId || !clientEmail || !privateKey) {
    console.error("Missing FIREBASE_ADMIN_* env.");
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }

  const app = getApps()[0];
  const db = databaseId === "(default)" ? getFirestore(app) : getFirestore(app, databaseId);
  const bucket = getStorage(app).bucket();

  const stats = {
    usersProcessed: 0,
    docsDryRun: 0,
    docsDeleted: 0,
    storageDryRun: 0,
    storageDeleted: 0,
    storageErrors: 0,
  };

  console.log("Firestore database:", databaseId);
  console.log("Retention days:", retentionDays);
  console.log("Cutoff:", new Date(cutoffMs).toISOString());
  console.log("Mode:", dryRun ? "DRY RUN" : "EXECUTE");
  if (targetUid) console.log("Target user:", targetUid);
  console.log("");

  const uids = await listUsers(db, targetUid);
  for (const uid of uids) {
    await purgeUser(db, bucket, uid, cutoffMs, dryRun, stats);
  }

  console.log("Done.");
  console.log("Users processed:", stats.usersProcessed);
  console.log("Docs deleted:", stats.docsDeleted);
  console.log("Docs planned (dry-run):", stats.docsDryRun);
  console.log("Storage deleted:", stats.storageDeleted);
  console.log("Storage planned (dry-run):", stats.storageDryRun);
  console.log("Storage errors:", stats.storageErrors);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
