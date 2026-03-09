import { NextResponse } from "next/server";
import { fetchGooglePlayListings } from "@/lib/google-play-listings";
import { fetchAppStoreListings } from "@/lib/appstore-connect-listings";

/**
 * GET /api/aso/store-listings
 * Returns current store listing data for Google Play and App Store (for display on ASO dashboard).
 */
export async function GET() {
  const androidPkg = process.env.ANDROID_PACKAGE_NAME?.trim();
  const iosAppId = process.env.APPSTORE_APP_ID?.trim();
  const iosBundleId = process.env.APPSTORE_BUNDLE_ID?.trim();

  const [googlePlayRes, appStoreRes] = await Promise.all([
    androidPkg ? fetchGooglePlayListings(androidPkg) : Promise.resolve({ ok: false, error: "ANDROID_PACKAGE_NAME not set" }),
    iosAppId || iosBundleId ? fetchAppStoreListings(iosAppId, iosBundleId) : Promise.resolve({ ok: false, error: "APPSTORE_APP_ID or APPSTORE_BUNDLE_ID not set" }),
  ]);

  return NextResponse.json({
    googlePlay: googlePlayRes.ok ? { ok: true, data: googlePlayRes.data } : { ok: false, error: googlePlayRes.error },
    appStore: appStoreRes.ok ? { ok: true, data: appStoreRes.data } : { ok: false, error: appStoreRes.error },
  });
}
