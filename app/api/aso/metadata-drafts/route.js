import { NextResponse } from "next/server";
import { runMetadataDraftsPipeline } from "@/lib/aso-metadata-drafts";

/**
 * POST /api/aso/metadata-drafts
 * Uses latest opportunity_mapping from Firestore + current store listing, calls Claude to generate
 * title/shortDescription (Android) and subtitle/keywords (iOS), saves to Firestore, returns drafts.
 */
export async function POST() {
  try {
    const result = await runMetadataDraftsPipeline();
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/aso/metadata-drafts]", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate metadata drafts" },
      { status: 500 }
    );
  }
}
