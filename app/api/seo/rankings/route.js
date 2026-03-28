import { NextResponse } from "next/server";
import { fetchKeywordRankings } from "@/lib/dataforseo";
import { saveSeoSnapshot } from "@/lib/seo-firestore";
import { requireAdmin } from "@/lib/require-admin-auth";

/**
 * POST /api/seo/rankings
 * Body: { domain: string, keywords: string[], location_code?: number, language_code?: string }
 * Returns where the domain ranks in Google (US) for each keyword (SERP API).
 * Credentials: DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD in env.
 */
export async function POST(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json().catch(() => ({}));
    const domain = (body.domain || "deckbase.co").toString().trim();
    const keywords = body.keywords;
    const locationCode = body.location_code ?? 2840;
    const languageCode = body.language_code ?? "en";

    const list = Array.isArray(keywords) ? keywords : [].concat(keywords || []);
    const result = await fetchKeywordRankings({
      domain,
      keywords: list,
      locationCode,
      languageCode,
    });

    if (!result.ok) {
      const status = result.error?.includes("not configured") ? 503 : 400;
      return NextResponse.json(
        { error: result.error || "Rankings check failed" },
        { status }
      );
    }

    await saveSeoSnapshot(
      "rankings",
      { domain, keywords: list, result: result.data },
      null
    ).catch((err) => console.error("[api/seo/rankings] save snapshot:", err));

    return NextResponse.json(result.data);
  } catch (err) {
    console.error("[api/seo/rankings]", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
