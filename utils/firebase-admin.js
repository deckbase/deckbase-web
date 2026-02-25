/**
 * Firebase Admin SDK for server-side only (API routes).
 * Requires FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL,
 * FIREBASE_ADMIN_PRIVATE_KEY, and optionally FIREBASE_STORAGE_BUCKET.
 */
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let adminApp = null;

function getAdminApp() {
  if (adminApp) return adminApp;
  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0];
    return adminApp;
  }
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  const key = privateKey.replace(/\\n/g, "\n");
  adminApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: key,
    }),
    ...(storageBucket && { storageBucket }),
  });
  return adminApp;
}

/**
 * @param {string} [bucketName] - If provided, return this bucket (ensures same bucket for read/write). Required for voice-sample cache.
 */
export function getAdminBucket(bucketName) {
  const app = getAdminApp();
  if (!app) return null;
  return getStorage(app).bucket(bucketName || undefined);
}

export function getAdminAuth() {
  const app = getAdminApp();
  if (!app) return null;
  return getAuth(app);
}

export function getAdminFirestore() {
  const app = getAdminApp();
  if (!app) return null;
  return getFirestore(app);
}

export function isAdminConfigured() {
  return !!(
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  );
}
