/**
 * One-time (or repeatable) backfill: set `deleted_at` on docs that are soft-deleted
 * (`is_deleted === true`) but are missing `deleted_at`.
 *
 * Uses: deleted_at := updated_at || created_at || now (server Timestamp)
 *
 * Collections under each users/{uid}: decks, cards, templates, media
 *
 * Run:
 *   npm run backfill:deleted-at
 *   DRY_RUN=false npm run backfill:deleted-at
 *
 * Same env loading as purge-soft-deleted-data.js (.env, .env.prod, .env.local).
 *
 * Optional env:
 * - ENV_FILE=.env
 * - FIRESTORE_DATABASE_ID=(default)
 * - DRY_RUN=true|false   (default true)
 * - TARGET_UID=<uid>     limit to one user
 */

const path = require("path");
const root = path.join(__dirname, "..");
if (process.env.ENV_FILE) {
  require("dotenv").config({ path: path.join(root, process.env.ENV_FILE) });
} else {
  require("dotenv").config({ path: path.join(root, ".env") });
  require("dotenv").config({ path: path.join(root, ".env.prod") });
  require("dotenv").config({
    path: path.join(root, ".env.local"),
    override: true,
  });
}

const { getApps, initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldPath, Timestamp } = require("firebase-admin/firestore");

const BATCH_SIZE = 400;
const SUBCOLLECTIONS = ["decks", "cards", "templates", "media"];

function envBool(value, fallback) {
  if (value == null) return fallback;
  return String(value).toLowerCase() === "true";
}

function hasMeaningfulDeletedAt(data) {
  const da = data?.deleted_at;
  if (da == null) return false;
  if (typeof da.toMillis === "function") return true;
  return false;
}

function pickDeletedAtTimestamp(data) {
  const u = data?.updated_at;
  const c = data?.created_at;
  if (u != null && typeof u.toMillis === "function") return u;
  if (c != null && typeof c.toMillis === "function") return c;
  return Timestamp.now();
}

async function listUsers(db, targetUid) {
  if (targetUid) return [targetUid];
  const usersSnap = await db.collection("users").select(FieldPath.documentId()).get();
  return usersSnap.docs.map((d) => d.id);
}

/**
 * @param {FirebaseFirestore.CollectionReference} colRef
 * @returns {Promise<FirebaseFirestore.QueryDocumentSnapshot[]>}
 */
async function getSoftDeletedDocs(colRef) {
  const q = colRef.where("is_deleted", "==", true);
  const snap = await q.get();
  return snap.docs;
}

async function backfillUser(db, uid, dryRun, stats) {
  const userRef = db.collection("users").doc(uid);

  for (const name of SUBCOLLECTIONS) {
    const colRef = userRef.collection(name);
    const docs = await getSoftDeletedDocs(colRef);
    const toWrite = [];
    for (const d of docs) {
      const data = d.data() || {};
      if (hasMeaningfulDeletedAt(data)) continue;
      toWrite.push({
        ref: d.ref,
        deletedAt: pickDeletedAtTimestamp(data),
      });
    }
    stats.byCollection[name] = (stats.byCollection[name] || 0) + toWrite.length;
    if (toWrite.length === 0) continue;

    if (dryRun) {
      stats.planned += toWrite.length;
      continue;
    }

    for (let i = 0; i < toWrite.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = toWrite.slice(i, i + BATCH_SIZE);
      chunk.forEach(({ ref, deletedAt }) =>
        batch.update(ref, { deleted_at: deletedAt }),
      );
      await batch.commit();
      stats.updated += chunk.length;
    }
  }

  stats.usersProcessed += 1;
}

async function main() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const databaseId = process.env.FIRESTORE_DATABASE_ID || "(default)";
  const dryRun = envBool(process.env.DRY_RUN, true);
  const targetUid = process.env.TARGET_UID?.trim() || null;

  if (!projectId || !clientEmail || !privateKey) {
    console.error("Missing FIREBASE_ADMIN_* env.");
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }

  const app = getApps()[0];
  const db = databaseId === "(default)" ? getFirestore(app) : getFirestore(app, databaseId);

  const stats = {
    usersProcessed: 0,
    planned: 0,
    updated: 0,
    byCollection: {},
  };

  console.log("Firestore database:", databaseId);
  console.log("Mode:", dryRun ? "DRY RUN" : "WRITE");
  if (targetUid) console.log("Target user:", targetUid);
  console.log("");

  const uids = await listUsers(db, targetUid);
  for (const uid of uids) {
    await backfillUser(db, uid, dryRun, stats);
  }

  console.log("Done.");
  console.log("Users processed:", stats.usersProcessed);
  if (dryRun) {
    console.log("Docs that would get deleted_at:", stats.planned);
  } else {
    console.log("Docs updated:", stats.updated);
  }
  console.log("Per collection (missing deleted_at, soft-deleted):");
  SUBCOLLECTIONS.forEach((n) => {
    const c = stats.byCollection[n] || 0;
    if (c > 0) console.log(`  ${n}: ${c}`);
  });
  if (Object.values(stats.byCollection).every((v) => !v)) {
    console.log("  (none)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
