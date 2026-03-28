import { NextResponse } from "next/server";
import { fetchAppStoreListings } from "@/lib/appstore-connect-listings";
import { fetchGooglePlayListings } from "@/lib/google-play-listings";
import { requireAdmin } from "@/lib/require-admin-auth";

/**
 * GET /api/aso/integrations
 * Returns status of ASO integrations: App Store Connect, Google Play, Perplexity, DataForSEO, Claude (Anthropic).
 * For store APIs we do a lightweight live check; for others we only check env.
 */
export async function GET(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const result = {
    appStoreConnect: false,
    appStoreConnectError: null,
    googlePlay: false,
    googlePlayError: null,
    perplexity: !!process.env.PERPLEXITY_API_KEY?.trim(),
    dataforseo: !!(process.env.DATAFORSEO_LOGIN?.trim() && process.env.DATAFORSEO_PASSWORD?.trim()),
    anthropic: !!process.env.ANTHROPIC_API_KEY?.trim(),
  };

  const issuerId = process.env.APPSTORE_CONNECT_ISSUER_ID?.trim();
  const keyId = process.env.APPSTORE_CONNECT_KEY_ID?.trim();
  const privateKeyRaw = process.env.APPSTORE_CONNECT_PRIVATE_KEY?.trim();
  const hasAppStoreEnv = !!(issuerId && keyId && privateKeyRaw);
  console.log("[api/aso/integrations] App Store Connect env:", {
    hasIssuerId: !!issuerId,
    issuerIdLength: (issuerId || "").length,
    hasKeyId: !!keyId,
    keyIdPreview: keyId ? `${keyId.slice(0, 4)}…` : "(empty)",
    hasPrivateKey: !!privateKeyRaw,
    privateKeyLength: (privateKeyRaw || "").length,
    privateKeyStartsWithBEGIN: (privateKeyRaw || "").includes("BEGIN PRIVATE KEY"),
    hasAppId: !!process.env.APPSTORE_APP_ID?.trim(),
    hasBundleId: !!process.env.APPSTORE_BUNDLE_ID?.trim(),
    hasAppStoreEnv,
  });

  if (hasAppStoreEnv) {
    try {
      const res = await fetchAppStoreListings(
        process.env.APPSTORE_APP_ID?.trim(),
        process.env.APPSTORE_BUNDLE_ID?.trim()
      );
      result.appStoreConnect = res.ok;
      if (!res.ok) result.appStoreConnectError = res.error || "Request failed";
      console.log("[api/aso/integrations] App Store Connect check:", { ok: res.ok, error: result.appStoreConnectError });
    } catch (e) {
      result.appStoreConnectError = e.message || "App Store Connect check failed";
      console.error("[api/aso/integrations] App Store Connect exception:", e.message, e.stack);
    }
  } else {
    result.appStoreConnectError = "Set APPSTORE_CONNECT_ISSUER_ID, KEY_ID, PRIVATE_KEY (and APPSTORE_APP_ID or BUNDLE_ID)";
    console.log("[api/aso/integrations] App Store Connect skipped: env not set");
  }

  const hasGoogleJson = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  const hasGoogleCredsPath = !!process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const hasAndroidPackage = !!process.env.ANDROID_PACKAGE_NAME?.trim();
  const hasGooglePlayEnv = (hasGoogleJson || hasGoogleCredsPath) && hasAndroidPackage;
  console.log("[api/aso/integrations] Google Play env:", {
    hasGoogleJson,
    hasGoogleCredsPath,
    hasAndroidPackage,
    androidPackagePreview: process.env.ANDROID_PACKAGE_NAME?.trim()?.slice(0, 20) || "(empty)",
    hasGooglePlayEnv,
  });

  if (hasGooglePlayEnv) {
    try {
      const res = await fetchGooglePlayListings(process.env.ANDROID_PACKAGE_NAME.trim());
      result.googlePlay = res.ok;
      if (!res.ok) result.googlePlayError = res.error || "Request failed";
      console.log("[api/aso/integrations] Google Play check:", { ok: res.ok, error: result.googlePlayError });
    } catch (e) {
      result.googlePlayError = e.message || "Google Play check failed";
      console.error("[api/aso/integrations] Google Play exception:", e.message, e.stack);
    }
  } else {
    if (!hasGoogleJson && !hasGoogleCredsPath) {
      result.googlePlayError = "Set GOOGLE_SERVICE_ACCOUNT_JSON (or GOOGLE_APPLICATION_CREDENTIALS)";
    } else if (!hasAndroidPackage) {
      result.googlePlayError = "Set ANDROID_PACKAGE_NAME";
    } else {
      result.googlePlayError = "Google Play credentials or package name missing";
    }
    console.log("[api/aso/integrations] Google Play skipped:", result.googlePlayError);
  }

  console.log("[api/aso/integrations] result:", JSON.stringify({ ...result, appStoreConnectError: result.appStoreConnectError, googlePlayError: result.googlePlayError }));
  return NextResponse.json(result);
}
