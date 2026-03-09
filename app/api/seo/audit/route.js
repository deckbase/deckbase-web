import { NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/firecrawl";

/**
 * POST /api/seo/audit
 * Body: { url: string }
 * Scrapes URL via Firecrawl and returns a simple technical audit (title, description, word count, headings, issues).
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const url = (body.url || "").toString().trim();
    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const scrape = await scrapeUrl(url, { onlyMainContent: false });
    if (!scrape.ok) {
      const status = scrape.error?.includes("not set") ? 503 : 400;
      return NextResponse.json({ error: scrape.error }, { status });
    }

    const markdown = scrape.markdown || "";
    const title = (scrape.title || "").trim();
    const description = (scrape.description || "").trim();

    const wordCount = markdown.split(/\s+/).filter(Boolean).length;
    const h1Matches = markdown.match(/^#\s+.+$/gm);
    const h2Matches = markdown.match(/^##\s+.+$/gm);
    const h1Count = h1Matches ? h1Matches.length : 0;
    const h2Count = h2Matches ? h2Matches.length : 0;

    const issues = [];
    if (!title) issues.push({ type: "title", message: "No title found", severity: "error" });
    else if (title.length < 30) issues.push({ type: "title", message: "Title is short (< 30 chars). Consider 50–60 for SEO.", severity: "warning" });
    else if (title.length > 60) issues.push({ type: "title", message: "Title may be too long (> 60 chars). Risk of truncation in search.", severity: "warning" });

    if (!description) issues.push({ type: "description", message: "No meta description found", severity: "error" });
    else if (description.length < 120) issues.push({ type: "description", message: "Meta description is short (< 120 chars). Consider 150–160.", severity: "warning" });
    else if (description.length > 160) issues.push({ type: "description", message: "Meta description may be too long (> 160 chars). Risk of truncation.", severity: "warning" });

    if (h1Count === 0) issues.push({ type: "headings", message: "No H1 heading found. Pages should have one main H1.", severity: "error" });
    else if (h1Count > 1) issues.push({ type: "headings", message: "Multiple H1s found. Prefer a single H1 per page.", severity: "warning" });

    if (wordCount < 300) issues.push({ type: "content", message: "Low word count (< 300). Thin content may rank poorly.", severity: "warning" });

    return NextResponse.json({
      url,
      title: title || "(none)",
      description: description || "(none)",
      wordCount,
      h1Count,
      h2Count,
      issues,
      ok: issues.filter((i) => i.severity === "error").length === 0,
    });
  } catch (err) {
    console.error("[api/seo/audit]", err);
    return NextResponse.json({ error: err.message || "Audit failed" }, { status: 500 });
  }
}
