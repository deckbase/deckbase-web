/**
 * Permanently delete one user's Firestore data: user doc + all subcollections
 * (decks, cards, templates, media, wizard_deck, inAppNotifications).
 *
 * Run:
 *   DELETE_UID=fOPAq9OrjAZ9KFRFnBM0MqOaeJh2 node --env-file=.env.prod scripts/delete-one-user.js
 *
 * Requires: FIREBASE_ADMIN_*, DELETE_UID.
 * Optional: ENV_FILE, FIRESTORE_DATABASE_ID.
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

const SUBCOLLECTIONS = ["decks", "cards", "templates", "media", "wizard_deck", "inAppNotifications"];
const BATCH_SIZE = 500;

async function deleteCollection(ref, db) {
  let total = 0;
  let lastDoc = null;
  while (true) {
    let query = ref.orderBy(FieldPath.documentId()).limit(BATCH_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);
    const snapshot = await query.get();
    if (snapshot.empty) break;
    const batch = db.batch();
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    total += snapshot.size;
    if (snapshot.size < BATCH_SIZE) break;
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }
  return total;
}

async function main() {
  const deleteUid = process.env.DELETE_UID?.trim();
  if (!deleteUid) {
    console.error("Set DELETE_UID. Example:");
    console.error("  DELETE_UID=fOPAq9OrjAZ9KFRFnBM0MqOaeJh2 node --env-file=.env.prod scripts/delete-one-user.js");
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

  console.log("Firebase project:", projectId);
  console.log("Firestore database:", databaseId);
  console.log("Deleting users/" + deleteUid + " (doc + all subcollections)");
  console.log("");

  const { getApps, initializeApp, cert } = require("firebase-admin/app");
  const { getFirestore } = require("firebase-admin/firestore");

  if (!getApps().length) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }

  const app = getApps()[0];
  const db = databaseId === "(default)" ? getFirestore(app) : getFirestore(app, databaseId);
  const userRef = db.collection("users").doc(deleteUid);

  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    console.log("User doc does not exist; deleting any subcollections then exiting.");
  }

  for (const collName of SUBCOLLECTIONS) {
    const ref = userRef.collection(collName);
    const count = await deleteCollection(ref, db);
    if (count > 0) console.log("  Deleted " + collName + ":", count, "docs");
  }

  await userRef.delete();
  console.log("  Deleted user document: users/" + deleteUid);
  console.log("");
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
