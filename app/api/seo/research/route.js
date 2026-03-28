import { NextResponse } from "next/server";
import { researchQuery } from "@/lib/perplexity";
import { requireAdmin } from "@/lib/require-admin-auth";

/**
 * POST /api/seo/research
 * Body: { query: string, model?: string, max_tokens?: number }
 * Returns { content, citations } from Perplexity Sonar.
 */
export async function POST(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json().catch(() => ({}));
    const query = body.query;
    const result = await researchQuery(query, {
      model: body.model,
      maxTokens: body.max_tokens,
    });
    if (!result.ok) {
      const status = result.error?.includes("not set") ? 503 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json({
      content: result.content,
      citations: result.citations ?? [],
    });
  } catch (err) {
    console.error("[api/seo/research]", err);
    return NextResponse.json({ error: err.message || "Research failed" }, { status: 500 });
  }
}
