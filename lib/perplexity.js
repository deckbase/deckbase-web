/**
 * Perplexity Sonar API — web-grounded research for keyword ideas and strategy.
 * Set PERPLEXITY_API_KEY in env.
 * @see https://docs.perplexity.ai/api-reference/chat-completions-post
 */
const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";

/**
 * Run a research query (e.g. keyword ideas) with Perplexity Sonar.
 * @param {string} query - Natural-language question or prompt
 * @param {{ model?: string, maxTokens?: number }} [options]
 * @returns {Promise<{ ok: boolean, content?: string, citations?: string[], error?: string }>}
 */
export async function researchQuery(query, options = {}) {
  const key = process.env.PERPLEXITY_API_KEY?.trim();
  if (!key) {
    return { ok: false, error: "PERPLEXITY_API_KEY is not set" };
  }
  const q = (query || "").toString().trim();
  if (!q) {
    return { ok: false, error: "query is required" };
  }
  const model = options.model || "sonar";
  const maxTokens = options.maxTokens ?? 1024;
  try {
    const res = await fetch(PERPLEXITY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: q }],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error?.message || data.error || `Perplexity ${res.status}`;
      return { ok: false, error: msg };
    }
    const content = data.choices?.[0]?.message?.content ?? "";
    const citations = data.citations ?? [];
    return { ok: true, content, citations };
  } catch (err) {
    return { ok: false, error: err.message || "Perplexity request failed" };
  }
}
