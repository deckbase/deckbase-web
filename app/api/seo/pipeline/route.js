import { NextResponse } from "next/server";
import { runSeoPipeline } from "@/lib/seo-pipeline-runner";
import { requireAdmin } from "@/lib/require-admin-auth";

/**
 * POST /api/seo/pipeline
 * Runs the full SEO refresh. Body: { keywords?, domain?, auditUrl?, use_perplexity_seeds? }
 * For streaming progress from the UI, use POST /api/seo/pipeline/stream instead.
 */
export async function POST(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json().catch(() => ({}));
    const result = await runSeoPipeline(body);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/seo/pipeline]", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Pipeline failed", steps: {} },
      { status: 500 }
    );
  }
}
