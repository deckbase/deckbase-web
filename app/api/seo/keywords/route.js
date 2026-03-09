import { NextResponse } from "next/server";
import { fetchSearchVolume } from "@/lib/dataforseo";
import { saveSeoSnapshot } from "@/lib/seo-firestore";

/**
 * GET /api/seo/keywords — Check if DataForSEO credentials are set (no API call).
 */
export async function GET() {
  const login = process.env.DATAFORSEO_LOGIN?.trim();
  const password = process.env.DATAFORSEO_PASSWORD?.trim();
  const configured = !!(login && password);
  return NextResponse.json({
    configured,
    message: configured ? "DataForSEO credentials are set" : "Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in .env.local",
  });
}

/**
 * POST /api/seo/keywords
 * Body: { keywords: string[], location_code?: number, language_code?: string, date_from?: string }
 * Returns search volume data from DataForSEO (Google Ads).
 * Credentials: DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD in env.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const keywords = body.keywords;
    const locationCode = body.location_code ?? 2840;
    const languageCode = body.language_code ?? "en";
    const dateFrom = body.date_from || undefined;

    const result = await fetchSearchVolume({
      keywords: Array.isArray(keywords) ? keywords : [].concat(keywords || []),
      locationCode,
      languageCode,
      dateFrom,
    });

    if (!result.ok) {
      const status = result.error?.includes("not configured") ? 503 : 400;
      return NextResponse.json(
        { error: result.error || "DataForSEO request failed" },
        { status }
      );
    }

    const list = Array.isArray(keywords) ? keywords : [].concat(keywords || []);
    await saveSeoSnapshot("search_volume", {
      keywords: list,
      result: result.data,
    }).catch((err) => console.error("[api/seo/keywords] save snapshot:", err));

    return NextResponse.json(result.data);
  } catch (err) {
    console.error("[api/seo/keywords]", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
