/**
 * Debug: list Firestore project and top-level structure.
 * Run: node --env-file=.env.prod scripts/debug-firestore-structure.js
 * Optional: set FIRESTORE_DATABASE_ID if you use a named Firestore database.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.prod") });

async function main() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const databaseId = process.env.FIRESTORE_DATABASE_ID || "(default)";

  if (!projectId || !clientEmail || !privateKey) {
    console.error("Missing FIREBASE_ADMIN_* env.");
    process.exit(1);
  }

  console.log("Project ID:", projectId);
  console.log("Firestore database:", databaseId);
  console.log("");

  const { getApps, initializeApp, cert } = require("firebase-admin/app");
  const { getFirestore } = require("firebase-admin/firestore");

  if (!getApps().length) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }

  const app = getApps()[0];
  const db = databaseId === "(default)" ? getFirestore(app) : getFirestore(app, databaseId);

  // List root collections (Admin SDK: listCollections() on a doc ref; for root we use the db)
  const rootColls = await db.listCollections();
  const names = rootColls.map((c) => c.id);
  console.log("Root collections:", names.join(", ") || "(none)");
  console.log("");

  // Sample flashcards: list doc IDs (user IDs)
  const flashcardsRef = db.collection("flashcards");
  const flashSnap = await flashcardsRef.limit(20).get();
  console.log("flashcards/ document count (first 20):", flashSnap.size);
  if (!flashSnap.empty) {
    console.log("  Doc IDs (user IDs):", flashSnap.docs.map((d) => d.id).join(", "));
    // Peek first user: does data/main exist?
    const firstUid = flashSnap.docs[0].id;
    const mainRef = flashcardsRef.doc(firstUid).collection("data").doc("main");
    const subColls = await mainRef.listCollections();
    console.log("  First user subcollections under data/main:", subColls.map((c) => c.id).join(", "));
  } else {
    // If no top-level docs, try reading flashcards/{uid}/data/main/cards for each known user
    const usersRef = db.collection("users");
    const usersSnap = await usersRef.limit(5).get();
    console.log("Checking flashcards/uid/data/main for known users:");
    for (const u of usersSnap.docs) {
      const uid = u.id;
      const cardsRef = flashcardsRef.doc(uid).collection("data").doc("main").collection("cards");
      const cardsSnap = await cardsRef.limit(1).get();
      const decksRef = flashcardsRef.doc(uid).collection("data").doc("main").collection("decks");
      const decksSnap = await decksRef.limit(1).get();
      console.log(`  ${uid}: cards=${cardsSnap.size}, decks=${decksSnap.size}`);
    }
  }

  // Sample users: do they have decks/cards/templates already?
  const usersRef = db.collection("users");
  const usersSnap = await usersRef.limit(5).get();
  console.log("");
  console.log("users/ document count (first 5):", usersSnap.size);
  if (!usersSnap.empty) {
    for (const u of usersSnap.docs) {
      const uid = u.id;
      const decks = await usersRef.doc(uid).collection("decks").limit(1).get();
      const cards = await usersRef.doc(uid).collection("cards").limit(1).get();
      console.log(`  ${uid}: decks=${decks.size > 0 ? "yes" : "no"}, cards=${cards.size > 0 ? "yes" : "no"}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
