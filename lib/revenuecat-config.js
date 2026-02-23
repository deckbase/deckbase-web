/**
 * RevenueCat configuration used across the app.
 * Dashboard setup: see docs/CONFIGURE_REVENUECAT.md
 */

/** Entitlement identifier created in RevenueCat dashboard (e.g. "pro", "premium") */
export const REVENUECAT_ENTITLEMENT_ID = "pro";

/** Public API key – set in env; safe for client. Leave empty to disable subscriptions. */
export const REVENUECAT_WEB_API_KEY =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY?.trim()) || "";

export const REVENUECAT_ENABLED = !!REVENUECAT_WEB_API_KEY;
