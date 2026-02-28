/**
 * Permanently delete the entire flashcards collection and all nested data.
 * Deletes: flashcards/{uid}/data/main/{decks,cards,templates,wizard_deck} and parent docs.
 *
 * Run (prod):
 *   node --env-file=.env.prod scripts/delete-flashcards-collection.js
 *
 * Run (dev):
 *   ENV_FILE=.env node scripts/delete-flashcards-collection.js
 *
 * Optional: ENV_FILE to load only that env file (e.g. .env for dev). FIRESTORE_DATABASE_ID if using a named database.
 * Requires: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY.
 */

const path = require("path");
const root = path.join(__dirname, "..");
if (process.env.ENV_FILE) {
  require("dotenv").config({ path: path.join(root, process.env.ENV_FILE) });
} else {
  require("dotenv").config({ path: path.join(root, ".env") });
  require("dotenv").config({ path: path.join(root, ".env.prod") });
}

const COLLECTIONS = ["decks", "cards", "templates", "wizard_deck"];
const BATCH_SIZE = 500;

async function deleteCollection(ref, db) {
  let total = 0;
  let snapshot = await ref.limit(BATCH_SIZE).get();
  while (!snapshot.empty) {
    const batch = db.batch();
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    total += snapshot.size;
    if (snapshot.size === BATCH_SIZE) {
      snapshot = await ref.limit(BATCH_SIZE).get();
    } else {
      break;
    }
  }
  return total;
}

async function main() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const databaseId = process.env.FIRESTORE_DATABASE_ID || "(default)";

  if (!projectId || !clientEmail || !privateKey) {
    console.error("Missing FIREBASE_ADMIN_* env.");
    process.exit(1);
  }

  console.log("Firebase project:", projectId);
  console.log("Firestore database:", databaseId);
  console.log("Deleting entire flashcards/ collection...");
  console.log("");

  const { getApps, initializeApp, cert } = require("firebase-admin/app");
  const { getFirestore } = require("firebase-admin/firestore");

  if (!getApps().length) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }

  const app = getApps()[0];
  const db = databaseId === "(default)" ? getFirestore(app) : getFirestore(app, databaseId);
  const flashcardsRef = db.collection("flashcards");

  let snapshot = await flashcardsRef.get();
  let userIds = snapshot.docs.map((d) => d.id);
  if (userIds.length === 0) {
    const usersSnap = await db.collection("users").get();
    userIds = usersSnap.docs.map((d) => d.id);
    console.log("No top-level docs in flashcards/; using user IDs from users/:", userIds.length);
  } else {
    console.log("Found", userIds.length, "user(s) under flashcards/");
  }

  if (userIds.length === 0) {
    console.log("Nothing to delete.");
    process.exit(0);
  }

  let totalDeleted = 0;
  for (const uid of userIds) {
    const mainRef = flashcardsRef.doc(uid).collection("data").doc("main");
    for (const collName of COLLECTIONS) {
      const collRef = mainRef.collection(collName);
      const n = await deleteCollection(collRef, db);
      if (n > 0) {
        console.log("  ", uid, collName + ":", n, "docs");
        totalDeleted += n;
      }
    }
    const mainSnap = await mainRef.get();
    if (mainSnap.exists) {
      await mainRef.delete();
      totalDeleted += 1;
      console.log("  ", uid, "data/main doc deleted");
    }
    const uidDocSnap = await flashcardsRef.doc(uid).get();
    if (uidDocSnap.exists) {
      await flashcardsRef.doc(uid).delete();
      totalDeleted += 1;
      console.log("  ", uid, "flashcards/uid doc deleted");
    }
  }

  console.log("");
  console.log("Done. Deleted", totalDeleted, "document(s). flashcards/ collection removed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
