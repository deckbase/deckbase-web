import { NextResponse } from "next/server";
import { getLatestSeoSnapshots } from "@/lib/seo-firestore";

/**
 * GET /api/seo/report
 * Returns the latest Step 4 output (serp_opportunity_mapping) for the interactive report page.
 */
export async function GET() {
  try {
    const snapshots = await getLatestSeoSnapshots("serp_opportunity_mapping", 1);
    const latest = Array.isArray(snapshots) ? snapshots[0] : null;
    if (!latest) {
      return NextResponse.json({ report: null, message: "No pipeline run yet. Run the full pipeline from the SEO page." });
    }
    return NextResponse.json({
      report: {
        id: latest.id,
        domain: latest.domain,
        opportunities: latest.opportunities || [],
        opportunityCount: latest.opportunityCount ?? 0,
        auditSummary: latest.auditSummary ?? null,
        created_at: latest.created_at,
      },
    });
  } catch (err) {
    console.error("[api/seo/report]", err);
    return NextResponse.json(
      { error: err.message || "Failed to load report" },
      { status: 500 }
    );
  }
}
