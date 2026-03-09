import { NextResponse } from "next/server";
import { getLatestAsoSnapshots } from "@/lib/aso-firestore";

/**
 * GET /api/aso/snapshots
 * Returns the latest opportunity_mapping, keyword_shortlist, metadata_drafts.
 * Query: list=1 to also return past_runs (last 10 opportunity_mapping snapshots).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeList = searchParams.get("list") === "1" || searchParams.get("history") === "1";

    const [keywordShortlist] = await getLatestAsoSnapshots("keyword_shortlist", 1);
    const [opportunityMapping] = await getLatestAsoSnapshots("opportunity_mapping", 1);
    const [metadataDrafts] = await getLatestAsoSnapshots("metadata_drafts", 1);

    const payload = {
      keyword_shortlist: keywordShortlist || null,
      opportunity_mapping: opportunityMapping || null,
      metadata_drafts: metadataDrafts || null,
    };

    if (includeList) {
      const pastRunsList = await getLatestAsoSnapshots("opportunity_mapping", 20);
      payload.past_runs = Array.isArray(pastRunsList) ? pastRunsList : [];
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[api/aso/snapshots]", err);
    return NextResponse.json(
      { error: err.message || "Failed to load snapshots" },
      { status: 500 }
    );
  }
}
