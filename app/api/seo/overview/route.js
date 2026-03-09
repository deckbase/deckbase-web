import { NextResponse } from "next/server";
import { fetchGA4Overview } from "@/lib/ga4";
import { fetchSearchConsoleOverview } from "@/lib/search-console";

/**
 * GET /api/seo/overview
 * Returns GA4 and Search Console overview (last 30 days).
 * Requires: GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS,
 *           GA4_PROPERTY_ID, GSC_SITE_URL.
 */
export async function GET() {
  try {
    const hasJson = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
    const jsonLen = (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "").length;
    const hasCredsPath = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const ga4Id = process.env.GA4_PROPERTY_ID?.trim() || "";
    const gscUrl = process.env.GSC_SITE_URL?.trim() || "";
    console.log("[api/seo/overview] env check:", {
      hasGoogleJson: hasJson,
      googleJsonLength: jsonLen,
      hasGoogleCredsPath: hasCredsPath,
      GA4_PROPERTY_ID: ga4Id ? `${ga4Id.slice(0, 3)}...` : "(empty)",
      GSC_SITE_URL: gscUrl ? `${gscUrl.slice(0, 20)}...` : "(empty)",
    });

    const ga4 = await fetchGA4Overview(process.env.GA4_PROPERTY_ID);
    const gsc = await fetchSearchConsoleOverview(process.env.GSC_SITE_URL);

    const hasCredentials =
      (process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() || process.env.GOOGLE_APPLICATION_CREDENTIALS) &&
      (process.env.GA4_PROPERTY_ID?.trim() || process.env.GSC_SITE_URL?.trim());
    const hasData = ga4.ok || gsc.ok;
    const configured = hasCredentials || hasData;

    return NextResponse.json({
      configured: !!configured,
      ga4: ga4.ok ? ga4.data : { error: ga4.error },
      searchConsole: gsc.ok ? gsc.data : { error: gsc.error },
    });
  } catch (err) {
    console.error("[api/seo/overview]", err);
    return NextResponse.json(
      { error: err.message || "Overview request failed" },
      { status: 500 }
    );
  }
}
