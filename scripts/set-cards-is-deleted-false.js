/**
 * One-time script: set is_deleted = false on all cards in users/{uid}/cards.
 * Iterates over all users, then over each user's cards in batches.
 *
 * Run (prod):
 *   node --env-file=.env.prod scripts/set-cards-is-deleted-false.js
 *
 * Run (dev):
 *   ENV_FILE=.env node scripts/set-cards-is-deleted-false.js
 *
 * Requires: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY
 * Optional: ENV_FILE, FIRESTORE_DATABASE_ID
 */

const path = require("path");
const root = path.join(__dirname, "..");
if (process.env.ENV_FILE) {
  require("dotenv").config({ path: path.join(root, process.env.ENV_FILE) });
} else {
  require("dotenv").config({ path: path.join(root, ".env") });
  require("dotenv").config({ path: path.join(root, ".env.prod") });
}

const { FieldPath } = require("firebase-admin/firestore");
const BATCH_SIZE = 500;

async function main() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const databaseId = process.env.FIRESTORE_DATABASE_ID || "(default)";

  if (!projectId || !clientEmail || !privateKey) {
    console.error("Missing FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, or FIREBASE_ADMIN_PRIVATE_KEY.");
    process.exit(1);
  }

  console.log("Firebase project:", projectId);
  console.log("Firestore database:", databaseId);
  console.log("Setting is_deleted = false on all cards...");
  console.log("");

  const { getApps, initializeApp, cert } = require("firebase-admin/app");
  const { getFirestore } = require("firebase-admin/firestore");

  if (!getApps().length) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }

  const app = getApps()[0];
  const db = databaseId === "(default)" ? getFirestore(app) : getFirestore(app, databaseId);

  const usersSnap = await db.collection("users").get();
  let totalUpdated = 0;

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const cardsRef = db.collection("users").doc(uid).collection("cards");
    let lastDoc = null;
    let userCount = 0;

    while (true) {
      let query = cardsRef.orderBy(FieldPath.documentId()).limit(BATCH_SIZE);
      if (lastDoc) query = query.startAfter(lastDoc);

      const snapshot = await query.get();
      if (snapshot.empty) break;

      const batch = db.batch();
      snapshot.docs.forEach((d) => {
        batch.update(d.ref, { is_deleted: false });
      });
      await batch.commit();
      userCount += snapshot.size;
      totalUpdated += snapshot.size;

      if (snapshot.size < BATCH_SIZE) break;
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }

    if (userCount > 0) {
      console.log("  users/" + uid + "/cards:", userCount, "cards");
    }
  }

  console.log("");
  console.log("Done. Set is_deleted = false on", totalUpdated, "cards.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
