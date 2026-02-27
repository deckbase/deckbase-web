/**
 * Server-only: check if a user is VIP (Firestore vip collection).
 * VIP users get Pro features without a subscription; do not show them subscription UI.
 */

import { getAdminFirestore } from "@/utils/firebase-admin";

const VIP_COLLECTION = "vip";

/**
 * Returns true if the user has a document in the vip collection (e.g. vip/{uid}).
 * Document can have optional field active: true; if present we require it to be true.
 * @param {string} uid - Firebase user id
 * @returns {Promise<boolean>}
 */
export async function isVip(uid) {
  if (!uid?.trim()) return false;
  const db = getAdminFirestore();
  if (!db) return false;
  try {
    const ref = db.collection(VIP_COLLECTION).doc(uid.trim());
    const snap = await ref.get();
    if (!snap.exists) return false;
    const data = snap.data();
    if (data && data.active === false) return false;
    return true;
  } catch (err) {
    console.warn("[vip-server] Error checking VIP", err?.message);
    return false;
  }
}
