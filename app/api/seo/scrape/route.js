import { NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/firecrawl";
import { requireAdmin } from "@/lib/require-admin-auth";

/**
 * POST /api/seo/scrape
 * Body: { url: string, onlyMainContent?: boolean }
 * Returns { markdown, title, description } from Firecrawl.
 */
export async function POST(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json().catch(() => ({}));
    const url = body.url;
    const result = await scrapeUrl(url, { onlyMainContent: body.onlyMainContent !== false });
    if (!result.ok) {
      const status = result.error?.includes("not set") ? 503 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json({
      markdown: result.markdown,
      title: result.title,
      description: result.description,
    });
  } catch (err) {
    console.error("[api/seo/scrape]", err);
    return NextResponse.json({ error: err.message || "Scrape failed" }, { status: 500 });
  }
}
