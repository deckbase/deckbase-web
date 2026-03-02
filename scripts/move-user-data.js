/**
 * One-time script: copy all data from users/{fromUid} to users/{toUid}.
 * Copies the user doc and subcollections: decks, cards, templates, media, wizard_deck, inAppNotifications.
 * Does not delete the source user; run delete-users-except or manually remove old user after verification.
 *
 * Run:
 *   FROM_UID=fOPAq9OrjAZ9KFRFnBM0MqOaeJh2 TO_UID=fmGzHIdPlBWghR1jpzrfJb658Hk2 node --env-file=.env.prod scripts/move-user-data.js
 *
 * Requires: FIREBASE_ADMIN_*, FROM_UID, TO_UID.
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

async function copyCollection(db, fromUid, toUid, collName) {
  const fromRef = db.collection("users").doc(fromUid).collection(collName);
  const toRef = db.collection("users").doc(toUid).collection(collName);
  let total = 0;
  let lastDoc = null;
  while (true) {
    let query = fromRef.orderBy(FieldPath.documentId()).limit(BATCH_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);
    const snapshot = await query.get();
    if (snapshot.empty) break;
    const batch = db.batch();
    snapshot.docs.forEach((d) => {
      batch.set(toRef.doc(d.id), d.data());
    });
    await batch.commit();
    total += snapshot.size;
    if (snapshot.size < BATCH_SIZE) break;
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }
  return total;
}

async function main() {
  const fromUid = process.env.FROM_UID?.trim();
  const toUid = process.env.TO_UID?.trim();
  if (!fromUid || !toUid) {
    console.error("Set FROM_UID and TO_UID. Example:");
    console.error("  FROM_UID=fOPAq9OrjAZ9KFRFnBM0MqOaeJh2 TO_UID=fmGzHIdPlBWghR1jpzrfJb658Hk2 node --env-file=.env.prod scripts/move-user-data.js");
    process.exit(1);
  }
  if (fromUid === toUid) {
    console.error("FROM_UID and TO_UID must be different.");
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
  console.log("Copying users/" + fromUid + " → users/" + toUid);
  console.log("");

  const { getApps, initializeApp, cert } = require("firebase-admin/app");
  const { getFirestore } = require("firebase-admin/firestore");

  if (!getApps().length) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }

  const app = getApps()[0];
  const db = databaseId === "(default)" ? getFirestore(app) : getFirestore(app, databaseId);

  const fromUserRef = db.collection("users").doc(fromUid);
  const fromUserSnap = await fromUserRef.get();
  if (!fromUserSnap.exists) {
    console.error("Source user does not exist: " + fromUid);
    process.exit(1);
  }

  const toUserRef = db.collection("users").doc(toUid);
  const toUserSnap = await toUserRef.get();
  if (toUserSnap.exists) {
    console.warn("Target user doc already exists; it will be overwritten with source user doc.");
  }

  await toUserRef.set(fromUserSnap.data());
  console.log("  Copied user document: users/" + toUid);

  for (const collName of SUBCOLLECTIONS) {
    const count = await copyCollection(db, fromUid, toUid, collName);
    if (count > 0) console.log("  " + collName + ":", count, "docs");
  }

  console.log("");
  console.log("Done. Data copied to users/" + toUid + ". Source users/" + fromUid + " unchanged.");
  console.log("Sign in with the account that has uid " + toUid + " to see the data.");
  console.log("To remove the old user doc later: KEEP_UID=" + toUid + " node scripts/delete-users-except.js");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
