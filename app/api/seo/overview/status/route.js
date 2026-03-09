import { NextResponse } from "next/server";

/**
 * GET /api/seo/overview/status
 * Returns whether GA4 & Search Console env vars are set (no secrets, no API calls).
 * Use this to verify .env.local is loaded.
 */
export async function GET() {
  const hasGoogleJson = !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
  const hasGa4Id = !!process.env.GA4_PROPERTY_ID?.trim();
  const hasGscUrl = !!process.env.GSC_SITE_URL?.trim();
  const configured = hasGoogleJson && (hasGa4Id || hasGscUrl);

  let jsonParseOk = false;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()) {
    try {
      const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON.trim());
      jsonParseOk = !!(key?.client_email && key?.private_key);
    } catch (_) {
      jsonParseOk = false;
    }
  }

  return NextResponse.json({
    configured,
    hasGoogleJson,
    hasGa4Id,
    hasGscUrl,
    jsonParseOk,
    message: !hasGoogleJson
      ? "Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS"
      : !jsonParseOk
        ? "GOOGLE_SERVICE_ACCOUNT_JSON is set but invalid JSON (check quoting in .env)"
        : !hasGa4Id && !hasGscUrl
          ? "Set GA4_PROPERTY_ID and/or GSC_SITE_URL"
          : "Env looks good",
  });
}
