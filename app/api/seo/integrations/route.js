import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin-auth";

/**
 * GET /api/seo/integrations
 * Returns which SEO integrations have API keys set (no secrets).
 */
export async function GET(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  const firecrawl = !!firecrawlKey?.trim();
  const perplexity = !!perplexityKey?.trim();

  console.log("[api/seo/integrations]", {
    hasFirecrawlKey: !!firecrawlKey,
    firecrawlKeyLength: (firecrawlKey || "").length,
    firecrawlKeyFirstChars: firecrawlKey ? `${firecrawlKey.trim().slice(0, 4)}...` : "(empty)",
    hasPerplexityKey: !!perplexityKey,
    perplexityKeyLength: (perplexityKey || "").length,
    perplexityKeyFirstChars: perplexityKey ? `${perplexityKey.trim().slice(0, 4)}...` : "(empty)",
    result: { firecrawl, perplexity },
  });

  return NextResponse.json({ firecrawl, perplexity });
}
