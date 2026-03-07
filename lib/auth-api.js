/**
 * Auth helpers for API routes.
 *
 * - resolveAuth: For dashboard/internal routes. Accepts Firebase ID token (JWT) or API key (Bearer).
 * - resolveAuthApiKeyOnly: For external/mobile API. Accepts only API key (Bearer). Do not use Firebase tokens.
 */

import { getAdminAuth } from "@/utils/firebase-admin";
import { resolveUidByApiKey } from "@/lib/api-keys-server";

const JWT_REGEX = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/**
 * Resolve Bearer token to user id. Accepts Firebase ID token (JWT) or API key.
 * Use for dashboard-originated requests (e.g. /api/api-keys) where the user may be logged in with Firebase.
 * @param {string} bearerToken - Raw value after "Bearer "
 * @returns {Promise<{ uid: string } | null>}
 */
export async function resolveAuth(bearerToken) {
  const token = (bearerToken || "").trim();
  if (!token) return null;

  const auth = getAdminAuth();
  if (!auth) return null;

  if (JWT_REGEX.test(token)) {
    try {
      const decoded = await auth.verifyIdToken(token);
      return { uid: decoded.uid };
    } catch {
      return null;
    }
  }

  const uid = await resolveUidByApiKey(token);
  return uid != null ? { uid } : null;
}

/**
 * Resolve Bearer token as API key only. Use for MCP (dashboard API key in Bearer). Mobile app uses X-API-Key: DECKBASE_API_KEY instead.
 * Does not accept Firebase ID tokens — API key only.
 * @param {string} bearerToken - Raw value after "Bearer "
 * @returns {Promise<{ uid: string } | null>}
 */
export async function resolveAuthApiKeyOnly(bearerToken) {
  const token = (bearerToken || "").trim();
  if (!token) return null;
  const uid = await resolveUidByApiKey(token);
  return uid != null ? { uid } : null;
}
