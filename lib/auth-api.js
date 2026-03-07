/**
 * Resolve Bearer token to user id for API routes.
 * Accepts either:
 * - Firebase ID token (JWT) → verify with Firebase Admin
 * - API key → look up in api_keys collection by hash
 */

import { getAdminAuth } from "@/utils/firebase-admin";
import { resolveUidByApiKey } from "@/lib/api-keys-server";

const JWT_REGEX = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/**
 * @param {string} bearerToken - Raw value after "Bearer "
 * @returns {Promise<{ uid: string } | null>} - Resolved user id or null if invalid
 */
export async function resolveAuth(bearerToken) {
  const token = (bearerToken || "").trim();
  if (!token) return null;

  const auth = getAdminAuth();
  if (!auth) return null;

  // If it looks like a JWT, verify as Firebase ID token
  if (JWT_REGEX.test(token)) {
    try {
      const decoded = await auth.verifyIdToken(token);
      return { uid: decoded.uid };
    } catch {
      return null;
    }
  }

  // Otherwise treat as API key
  const uid = await resolveUidByApiKey(token);
  return uid != null ? { uid } : null;
}
