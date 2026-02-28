/**
 * Delete all user documents in Firestore except one.
 * Subcollections (decks, cards, templates, media, etc.) under deleted users become orphaned;
 * this script only deletes the top-level users/{uid} document.
 *
 * Run:
 *   KEEP_UID=fOPAq9OrjAZ9KFRFnBM0MqOaeJh2 node --env-file=.env.prod scripts/delete-users-except.js
 *
 * Requires: FIREBASE_ADMIN_*, and KEEP_UID (the user id to keep).
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.prod") });

const KEEP_UID = process.env.KEEP_UID?.trim();

async function main() {
  if (!KEEP_UID) {
    console.error("Set KEEP_UID to the user id to keep. Example:");
    console.error("  KEEP_UID=fOPAq9OrjAZ9KFRFnBM0MqOaeJh2 node --env-file=.env.prod scripts/delete-users-except.js");
    process.exit(1);
  }

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
  console.log("Keeping user:", KEEP_UID);
  console.log("");

  const { getApps, initializeApp, cert } = require("firebase-admin/app");
  const { getFirestore } = require("firebase-admin/firestore");

  if (!getApps().length) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }

  const app = getApps()[0];
  const db = databaseId === "(default)" ? getFirestore(app) : getFirestore(app, databaseId);
  const usersRef = db.collection("users");
  const snapshot = await usersRef.get();

  const toDelete = snapshot.docs.filter((d) => d.id !== KEEP_UID);
  if (toDelete.length === 0) {
    console.log("No user documents to delete (only the kept user exists or collection is empty).");
    process.exit(0);
  }

  console.log("Deleting", toDelete.length, "user document(s). Keeping:", KEEP_UID);
  const BATCH_SIZE = 500;
  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = toDelete.slice(i, i + BATCH_SIZE);
    for (const doc of chunk) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    console.log("  Deleted", chunk.length, "doc(s)");
  }
  console.log("Done. Kept user:", KEEP_UID);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
