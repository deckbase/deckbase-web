/**
 * Public App Store / Play Store identifiers. Override via NEXT_PUBLIC_* in `.env`.
 * Defaults match the production Deckbase listings.
 */
const trim = (v) => (typeof v === "string" ? v.trim() : "");

export const iosAppId =
  trim(process.env.NEXT_PUBLIC_IOS_APP_ID) || "6755723338";

export const androidPackageName =
  trim(process.env.NEXT_PUBLIC_ANDROID_PACKAGE_NAME) || "com.tkg.deckbase";

export function googlePlayStoreUrl() {
  return `https://play.google.com/store/apps/details?id=${androidPackageName}`;
}

export function appStoreUrl() {
  return `https://apps.apple.com/app/id${iosAppId}`;
}
