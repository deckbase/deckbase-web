/**
 * Server-only RevenueCat helpers for production entitlement checks.
 * Uses RevenueCat REST API v1 with secret key (Bearer).
 * Supports Free / Basic / Pro tiers per PRICING.md.
 */

import { isVip } from "@/lib/vip-server";

const REVENUECAT_API_BASE = "https://api.revenuecat.com/v1";
const DEFAULT_ENTITLEMENT_ID = "pro";

/** @typedef {'free'|'basic'|'pro'} SubscriptionTier */

/**
 * Fetch subscriber entitlements from RevenueCat (one API call).
 * @param {string} appUserId - Firebase uid
 * @returns {Promise<Record<string, unknown>>} entitlements object (keyed by entitlement id)
 */
async function getSubscriberEntitlements(appUserId) {
  const secretKey = process.env.REVENUECAT_SECRET_KEY?.trim();
  if (!secretKey || !appUserId) return {};
  try {
    const res = await fetch(`${REVENUECAT_API_BASE}/subscribers/${encodeURIComponent(appUserId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      if (res.status === 404) return {};
      console.warn("[revenuecat-server] Subscriber fetch failed", res.status, await res.text());
      return {};
    }
    const data = await res.json();
    return data?.subscriber?.entitlements ?? {};
  } catch (err) {
    console.warn("[revenuecat-server] Error fetching subscriber", err?.message);
    return {};
  }
}

function hasEntitlement(entitlements, id) {
  const key = (id || "").toLowerCase();
  return (
    Object.prototype.hasOwnProperty.call(entitlements, key) ||
    Object.keys(entitlements).some((k) => k.toLowerCase() === key)
  );
}

/**
 * Get subscription tier for the user: 'free' | 'basic' | 'pro'.
 * VIP is treated as Pro. Then Pro entitlement, then Basic.
 * @param {string} appUserId - Firebase uid
 * @returns {Promise<SubscriptionTier>}
 */
export async function getSubscriptionTier(appUserId) {
  if (!appUserId) return "free";
  const vip = await isVip(appUserId);
  if (vip) return "pro";
  const entitlements = await getSubscriberEntitlements(appUserId);
  if (hasEntitlement(entitlements, "pro")) return "pro";
  if (hasEntitlement(entitlements, "basic")) return "basic";
  return "free";
}

/**
 * True if the user has Basic or Pro (or VIP). Use for gating any paid feature (AI, TTS, MCP, API keys, Excel/Anki import/export).
 * @param {string} appUserId - Firebase uid
 * @returns {Promise<boolean>}
 */
export async function isBasicOrProOrVip(appUserId) {
  const tier = await getSubscriptionTier(appUserId);
  return tier === "basic" || tier === "pro";
}

/**
 * Check if a user has the given entitlement.
 * @param {string} appUserId - Firebase uid
 * @param {string} [entitlementId] - Entitlement identifier (default "pro")
 * @returns {Promise<boolean>}
 */
export async function isEntitledTo(appUserId, entitlementId = DEFAULT_ENTITLEMENT_ID) {
  if (!appUserId) return false;
  const entitlements = await getSubscriberEntitlements(appUserId);
  return hasEntitlement(entitlements, entitlementId);
}

/**
 * True if the user has Pro (or VIP). Use when you need Pro-only behavior.
 * For "any paid" access use isBasicOrProOrVip instead.
 * @param {string} appUserId - Firebase uid
 * @returns {Promise<boolean>}
 */
export async function isProOrVip(appUserId) {
  const tier = await getSubscriptionTier(appUserId);
  return tier === "pro";
}

/** Whether production AI gating is enabled (subscription required for AI in production). */
export const REQUIRE_SUBSCRIPTION_FOR_AI_IN_PRODUCTION = true;
