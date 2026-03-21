/**
 * Fetch one card doc from Firestore (Admin SDK).
 *
 * Usage:
 *   node --env-file=.env.prod scripts/fetch-card-doc.js <uid> <cardId>
 *
 * Requires FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY
 * (same as other scripts).
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.prod") });

async function main() {
  const uid = process.argv[2];
  const cardId = process.argv[3];
  if (!uid || !cardId) {
    console.error("Usage: node scripts/fetch-card-doc.js <uid> <cardId>");
    process.exit(1);
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const databaseId = process.env.FIRESTORE_DATABASE_ID || "(default)";

  if (!projectId || !clientEmail || !privateKey) {
    console.error("Missing FIREBASE_ADMIN_* env.");
    process.exit(1);
  }

  const { getApps, initializeApp, cert } = require("firebase-admin/app");
  const { getFirestore } = require("firebase-admin/firestore");

  if (!getApps().length) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }

  const app = getApps()[0];
  const db =
    databaseId === "(default)" ? getFirestore(app) : getFirestore(app, databaseId);

  const ref = db.collection("users").doc(uid).collection("cards").doc(cardId);
  const snap = await ref.get();

  if (!snap.exists) {
    console.log(JSON.stringify({ exists: false, path: ref.path }, null, 2));
    process.exit(0);
  }

  const data = snap.data();
  // Summarize media_ids from values without dumping huge blobs
  let valuesSummary = [];
  try {
    const raw = data.values_json || (data.values ? JSON.stringify(data.values) : null);
    if (raw) {
      const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
      valuesSummary = (arr || []).map((v) => ({
        block_id: v.block_id ?? v.blockId,
        type: v.type,
        media_ids: v.media_ids ?? v.mediaIds,
        textLen: v.text?.length ?? 0,
      }));
    }
  } catch (e) {
    valuesSummary = { parseError: e.message };
  }

  const out = {
    path: ref.path,
    exists: true,
    card_id: data.card_id,
    deck_id: data.deck_id,
    is_deleted: data.is_deleted,
    updated_at: data.updated_at,
    valuesSummary,
    blocks_snapshot_json_length:
      typeof data.blocks_snapshot_json === "string"
        ? data.blocks_snapshot_json.length
        : null,
    values_json_length:
      typeof data.values_json === "string" ? data.values_json.length : null,
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
