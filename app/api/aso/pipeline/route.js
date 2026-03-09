import { NextResponse } from "next/server";
import { runAsoPipeline } from "@/lib/aso-pipeline-runner";

/**
 * POST /api/aso/pipeline
 * Body: { keywords?, use_perplexity_seeds?, use_dataforseo_suggestions?, use_claude_filter?, location_code?, language_code? }
 * For streaming progress, use POST /api/aso/pipeline/stream instead.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await runAsoPipeline(body);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/aso/pipeline]", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Pipeline failed", steps: {} },
      { status: 500 }
    );
  }
}
