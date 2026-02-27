/**
 * Server-only RevenueCat helpers for production entitlement checks.
 * Uses RevenueCat REST API v1 with secret key (Bearer).
 * See: https://www.revenuecat.com/docs/projects/authentication
 */

import { isVip } from "@/lib/vip-server";

const REVENUECAT_API_BASE = "https://api.revenuecat.com/v1";
const DEFAULT_ENTITLEMENT_ID = "pro";

/**
 * Check if a user (by app_user_id / Firebase uid) has the given entitlement.
 * Returns false if secret key is not set, API fails, or user has no entitlement.
 * @param {string} appUserId - Firebase uid (same as RevenueCat app_user_id)
 * @param {string} [entitlementId] - Entitlement identifier (default "pro")
 * @returns {Promise<boolean>}
 */
export async function isEntitledTo(appUserId, entitlementId = DEFAULT_ENTITLEMENT_ID) {
  const secretKey = process.env.REVENUECAT_SECRET_KEY?.trim();
  if (!secretKey || !appUserId) return false;

  try {
    const res = await fetch(`${REVENUECAT_API_BASE}/subscribers/${encodeURIComponent(appUserId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 404) return false; // No subscriber
      console.warn("[revenuecat-server] Subscriber fetch failed", res.status, await res.text());
      return false;
    }

    const data = await res.json();
    const entitlements = data?.subscriber?.entitlements ?? {};
    // RevenueCat keys can be e.g. "pro" or "Pro" depending on dashboard
    const has =
      Object.prototype.hasOwnProperty.call(entitlements, entitlementId) ||
      Object.keys(entitlements).some(
        (k) => k.toLowerCase() === entitlementId.toLowerCase()
      );
    return !!has;
  } catch (err) {
    console.warn("[revenuecat-server] Error checking entitlement", err?.message);
    return false;
  }
}

/**
 * True if the user has Pro via subscription (RevenueCat) or is a VIP (Firestore vip collection).
 * Use this for server-side gating of Pro features (AI, TTS, etc.).
 * @param {string} appUserId - Firebase uid
 * @param {string} [entitlementId] - Entitlement id (default "pro")
 * @returns {Promise<boolean>}
 */
export async function isProOrVip(appUserId, entitlementId = DEFAULT_ENTITLEMENT_ID) {
  if (!appUserId) return false;
  const vip = await isVip(appUserId);
  if (vip) return true;
  return isEntitledTo(appUserId, entitlementId);
}

/** Whether production AI gating is enabled (subscription required for AI in production). */
export const REQUIRE_SUBSCRIPTION_FOR_AI_IN_PRODUCTION = true;
