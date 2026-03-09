/**
 * Firecrawl API — scrape URLs to clean markdown for LLM analysis.
 * Set FIRECRAWL_API_KEY in env.
 * @see https://docs.firecrawl.dev/api-reference/endpoint/scrape
 */
const FIRECRAWL_BASE = "https://api.firecrawl.dev/v2";

/**
 * Scrape a single URL and return markdown (and optional metadata).
 * @param {string} url - Full URL to scrape
 * @param {{ onlyMainContent?: boolean }} [options]
 * @returns {Promise<{ ok: boolean, markdown?: string, title?: string, description?: string, error?: string }>}
 */
export async function scrapeUrl(url, options = {}) {
  const key = process.env.FIRECRAWL_API_KEY?.trim();
  if (!key) {
    return { ok: false, error: "FIRECRAWL_API_KEY is not set" };
  }
  const u = (url || "").toString().trim();
  if (!u) {
    return { ok: false, error: "url is required" };
  }
  try {
    const res = await fetch(`${FIRECRAWL_BASE}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: u,
        formats: ["markdown"],
        onlyMainContent: options.onlyMainContent ?? true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error || data.message || `Firecrawl ${res.status}`;
      return { ok: false, error: msg };
    }
    const markdown = data.data?.markdown ?? data.markdown ?? "";
    return {
      ok: true,
      markdown,
      title: data.data?.metadata?.title ?? data.metadata?.title,
      description: data.data?.metadata?.description ?? data.metadata?.description,
    };
  } catch (err) {
    return { ok: false, error: err.message || "Firecrawl request failed" };
  }
}
