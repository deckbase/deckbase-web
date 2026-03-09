/**
 * Shared SEO pipeline logic. Used by POST /api/seo/pipeline and /api/seo/pipeline/stream.
 * @param {Object} body - Request body (keywords, domain, auditUrl, use_perplexity_seeds, etc.)
 * @param {(step: string, status: 'running'|'done'|'skip', message: string) => void} [onProgress]
 * @returns {Promise<{ ok, steps, analysis, message }>}
 */
import { fetchGA4Overview } from "@/lib/ga4";
import { fetchSearchConsoleOverview } from "@/lib/search-console";
import { fetchSearchVolume, fetchKeywordRankings, fetchKeywordSuggestions } from "@/lib/dataforseo";
import { saveSeoSnapshot, getKeywordUrlMapping } from "@/lib/seo-firestore";
import { scrapeUrl } from "@/lib/firecrawl";
import { researchQuery } from "@/lib/perplexity";

const DEFAULT_KEYWORDS = [
  "flashcards",
  "AI flashcards",
  "spaced repetition",
  "flashcard app",
];

const PERPLEXITY_SEED_PROMPT = `You are an SEO researcher. For a flashcard and spaced repetition app (Deckbase) that competes with Anki, Quizlet, etc., list 5–10 high-intent search phrases that users might type in Google. Include:
- Head-to-head comparisons (e.g. "Deckbase vs Anki", "best flashcard app 2024")
- Use cases (e.g. "AI flashcards for medical students", "spaced repetition for law school")
- Problem/solution (e.g. "alternative to Anki", "flashcard app with AI")

Return ONLY a JSON array of strings, one keyword phrase per element. No markdown, no explanation. Example: ["Deckbase vs Anki", "AI flashcards for medical board exams"]`;

function parseKeywordListFromContent(content) {
  if (!content || typeof content !== "string") return [];
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/\[[\s\S]*?\]/);
  if (jsonMatch) {
    try {
      const arr = JSON.parse(jsonMatch[0]);
      if (Array.isArray(arr)) {
        return arr.map((x) => String(x).trim()).filter(Boolean).slice(0, 15);
      }
    } catch (_) {}
  }
  const lines = trimmed.split(/\n/).map((l) => l.replace(/^[-*]\s*|\d+\.\s*|^"\s*|"\s*$/g, "").trim()).filter((s) => s.length > 2 && s.length < 80);
  return lines.slice(0, 15);
}

function classifyIntent(keyword) {
  const k = (keyword || "").toLowerCase();
  const commercial = /\b(vs|versus|compare|comparison|alternative|alternatives|best|price|pricing|buy|review|reviews|cheap|deal)\b/;
  const informational = /\b(how to|what is|what are|guide|tutorial|learn|examples?|definition|meaning)\b/;
  if (commercial.test(k)) return "commercial";
  if (informational.test(k)) return "informational";
  return "informational";
}

function competitionLevel(competition) {
  if (competition == null) return "medium";
  const c = String(competition).toLowerCase();
  if (c === "low" || c === "0" || (typeof competition === "number" && competition < 0.4)) return "low";
  if (c === "high" || (typeof competition === "number" && competition > 0.6)) return "high";
  return "medium";
}

export async function runSeoPipeline(body, onProgress) {
  const out = { overview: null, perplexity: null, keywords: null, rankings: null, audit: null };
  let volData = null;
  let rankData = null;
  const emit = (step, status, message) => onProgress?.(step, status, message);

  let keywords = Array.isArray(body.keywords)
    ? body.keywords
    : (body.keywords || "")
        .toString()
        .split(/[\n,]+/)
        .map((k) => k.trim())
        .filter(Boolean);

  const usePerplexity = body.use_perplexity_seeds === true || (body.perplexity_query && String(body.perplexity_query).trim());
  if (usePerplexity) {
    emit("perplexity", "running", "Asking Perplexity for keyword ideas…");
    try {
      const query = (body.perplexity_query || PERPLEXITY_SEED_PROMPT).toString().trim();
      const res = await researchQuery(query, { maxTokens: 1024 });
      if (res.ok && res.content) {
        const discovered = parseKeywordListFromContent(res.content);
        if (discovered.length) {
          const merged = [...new Map([...discovered.map((k) => [k.toLowerCase(), k]), ...keywords.map((k) => [k.toLowerCase(), k])]).values()];
          keywords = merged.slice(0, 15);
          out.perplexity = { ok: true, query: query.slice(0, 100), discovered: discovered.length, keywords: discovered };
          emit("perplexity", "done", `Discovered ${discovered.length} keywords`);
        } else {
          out.perplexity = { ok: true, query: query.slice(0, 100), discovered: 0, message: "No keywords parsed" };
          emit("perplexity", "done", "No keywords parsed from response");
        }
      } else {
        out.perplexity = { ok: false, error: res.error || "Perplexity request failed" };
        emit("perplexity", "done", out.perplexity.error);
      }
    } catch (e) {
      out.perplexity = { ok: false, error: e.message };
      emit("perplexity", "done", e.message);
    }
  } else {
    emit("perplexity", "skip", "Skipped (not enabled)");
  }

  const useDataForSeoSuggestions = body.use_dataforseo_suggestions !== false;
  if (useDataForSeoSuggestions && keywords.length > 0) {
    emit("dataforseo_suggestions", "running", "Expanding seeds with DataForSEO keyword suggestions…");
    const seeds = keywords.slice(0, 5);
    const suggestedByKey = new Map();
    for (const seed of seeds) {
      try {
        const res = await fetchKeywordSuggestions({
          keyword: seed,
          locationCode: body.location_code ?? 2840,
          languageCode: body.language_code ?? "en",
          limit: 50,
        });
        if (res.ok && res.data?.items?.length) {
          for (const item of res.data.items) {
            const k = (item.keyword || "").trim();
            if (!k) continue;
            const key = k.toLowerCase();
            const existing = suggestedByKey.get(key);
            const vol = item.search_volume ?? 0;
            if (!existing || (existing.search_volume ?? 0) < vol) {
              suggestedByKey.set(key, { keyword: k, search_volume: vol });
            }
          }
        }
      } catch (_) {}
    }
    if (suggestedByKey.size > 0) {
      const suggestedList = [...suggestedByKey.values()]
        .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0))
        .map((x) => x.keyword)
        .slice(0, 30);
      const merged = [...new Map([...keywords.map((k) => [k.toLowerCase(), k]), ...suggestedList.map((k) => [k.toLowerCase(), k])]).values()];
      keywords = merged.slice(0, 20);
      out.dataforseo_suggestions = { ok: true, seeds: seeds.length, added: suggestedByKey.size, totalKeywords: keywords.length };
      emit("dataforseo_suggestions", "done", `Added ${suggestedByKey.size} suggestions, ${keywords.length} keywords total`);
    } else {
      out.dataforseo_suggestions = { ok: true, seeds: seeds.length, added: 0, message: "No new suggestions" };
      emit("dataforseo_suggestions", "done", "No new suggestions");
    }
  } else {
    out.dataforseo_suggestions = { skip: true };
    emit("dataforseo_suggestions", "skip", "Skipped (no seeds or disabled)");
  }

  const list = keywords.length ? keywords : DEFAULT_KEYWORDS;
  const domain = (body.domain || "deckbase.co").toString().trim();
  const auditUrl = (body.auditUrl || body.audit_url || `https://${domain}`).toString().trim();

  emit("overview", "running", "Fetching GA4 & Search Console…");
  try {
    const ga4 = await fetchGA4Overview(process.env.GA4_PROPERTY_ID);
    const gsc = await fetchSearchConsoleOverview(process.env.GSC_SITE_URL);
    out.overview = {
      ok: ga4.ok || gsc.ok,
      ga4: ga4.ok ? ga4.data : { error: ga4.error },
      searchConsole: gsc.ok ? gsc.data : { error: gsc.error },
    };
    emit("overview", "done", out.overview.ok ? "GA4 & GSC loaded" : (out.overview.ga4?.error || out.overview.searchConsole?.error || "Failed"));
  } catch (e) {
    out.overview = { ok: false, error: e.message };
    emit("overview", "done", e.message);
  }

  emit("keywords", "running", "Fetching keyword search volume (DataForSEO)…");
  try {
    const vol = await fetchSearchVolume({
      keywords: list,
      locationCode: body.location_code ?? 2840,
      languageCode: body.language_code ?? "en",
    });
    if (vol.ok) {
      volData = vol.data;
      await saveSeoSnapshot("search_volume", { keywords: list, result: vol.data }).catch(() => {});
      out.keywords = { ok: true, count: (vol.data?.result || []).length };
      emit("keywords", "done", `${out.keywords.count} keywords`);
    } else {
      out.keywords = { ok: false, error: vol.error };
      emit("keywords", "done", vol.error);
    }
  } catch (e) {
    out.keywords = { ok: false, error: e.message };
    emit("keywords", "done", e.message);
  }

  emit("rankings", "running", "Checking rankings (DataForSEO)…");
  try {
    const rank = await fetchKeywordRankings({
      domain,
      keywords: list,
      locationCode: body.location_code ?? 2840,
      languageCode: body.language_code ?? "en",
    });
    if (rank.ok) {
      rankData = rank.data;
      await saveSeoSnapshot("rankings", { domain, keywords: list, result: rank.data }, null).catch(() => {});
      out.rankings = { ok: true, domain, count: (rank.data?.results || []).length };
      emit("rankings", "done", `${out.rankings.count} rankings`);
    } else {
      out.rankings = { ok: false, error: rank.error };
      emit("rankings", "done", rank.error);
    }
  } catch (e) {
    out.rankings = { ok: false, error: e.message };
    emit("rankings", "done", e.message);
  }

  emit("audit", "running", "Loading keyword→URL mapping & running technical audit…");
  let keywordUrlMap = {};
  try {
    keywordUrlMap = await getKeywordUrlMapping();
  } catch (_) {}

  const auditUrls = [auditUrl];
  if (volData?.result && rankData?.results) {
    const rankByKeyword = {};
    (rankData.results || []).forEach((r) => {
      const k = (r.keyword || "").toLowerCase().trim();
      if (k) rankByKeyword[k] = r.position;
    });
    for (const row of volData.result || []) {
      const kw = (row.keyword ?? "").trim();
      const key = kw.toLowerCase();
      const position = rankByKeyword[key] ?? null;
      const isOpportunity = position == null || position > 10;
      const mappedUrl = keywordUrlMap[key] || keywordUrlMap[kw];
      if (isOpportunity && mappedUrl && typeof mappedUrl === "string" && mappedUrl.trim() && !auditUrls.includes(mappedUrl.trim())) {
        auditUrls.push(mappedUrl.trim());
      }
    }
  }
  const uniqueAuditUrls = [...new Set(auditUrls)].slice(0, 5);

  async function runOneAudit(url) {
    const scrape = await scrapeUrl(url, { onlyMainContent: false });
    if (!scrape.ok) return { url, ok: false, error: scrape.error };
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
    else if (title.length < 30) issues.push({ type: "title", message: "Title is short (< 30 chars).", severity: "warning" });
    else if (title.length > 60) issues.push({ type: "title", message: "Title may be too long (> 60 chars).", severity: "warning" });
    if (!description) issues.push({ type: "description", message: "No meta description found", severity: "error" });
    else if (description.length < 120) issues.push({ type: "description", message: "Meta description is short (< 120 chars).", severity: "warning" });
    else if (description.length > 160) issues.push({ type: "description", message: "Meta description may be too long (> 160 chars).", severity: "warning" });
    if (h1Count === 0) issues.push({ type: "headings", message: "No H1 heading found.", severity: "error" });
    else if (h1Count > 1) issues.push({ type: "headings", message: "Multiple H1s found.", severity: "warning" });
    if (wordCount < 300) issues.push({ type: "content", message: "Low word count (< 300).", severity: "warning" });
    return { url, ok: issues.filter((i) => i.severity === "error").length === 0, title: title || "(none)", description: description || "(none)", wordCount, h1Count, h2Count, issues };
  }

  const auditResults = [];
  for (const u of uniqueAuditUrls) {
    try {
      auditResults.push(await runOneAudit(u));
    } catch (e) {
      auditResults.push({ url: u, ok: false, error: e.message });
    }
  }
  const primaryAudit = auditResults[0] || {};
  out.audit = primaryAudit.url
    ? { ok: primaryAudit.ok, url: primaryAudit.url, title: primaryAudit.title, description: primaryAudit.description, wordCount: primaryAudit.wordCount, h1Count: primaryAudit.h1Count, h2Count: primaryAudit.h2Count, issues: primaryAudit.issues || [] }
    : { ok: false, error: "No audit run" };
  if (auditResults.length > 1) out.audits = auditResults;
  emit("audit", "done", primaryAudit.url ? `${auditResults.length} URL(s) audited` : "No audit run");

  let analysis = null;
  if (volData?.result && rankData?.results) {
    const rankByKeyword = {};
    (rankData.results || []).forEach((r) => {
      const k = (r.keyword || "").toLowerCase().trim();
      if (k) rankByKeyword[k] = r.position;
    });
    const opportunities = (volData.result || [])
      .map((row) => {
        const kw = (row.keyword ?? "").trim();
        const key = kw.toLowerCase();
        const position = rankByKeyword[key] ?? null;
        const isOpportunity = position == null || position > 10;
        const searchVolume = row.search_volume ?? 0;
        const comp = competitionLevel(row.competition);
        const intent = classifyIntent(kw);
        const quick_win = isOpportunity && searchVolume >= 500 && comp === "low";
        const strategic_build = isOpportunity && searchVolume >= 500 && !quick_win;
        return {
          keyword: kw,
          search_volume: searchVolume,
          position,
          isOpportunity,
          opportunity_flag: isOpportunity ? "Yes" : "No",
          competition: row.competition,
          cpc: row.cpc,
          intent,
          quick_win,
          strategic_build,
        };
      })
      .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0));
    const opportunityCount = opportunities.filter((o) => o.isOpportunity).length;
    const topOpportunities = opportunities.filter((o) => o.isOpportunity).slice(0, 10);
    analysis = { totalKeywords: opportunities.length, opportunityCount, topOpportunities, opportunities };
  }
  if (out.audit && typeof out.audit.issues !== "undefined") {
    const issues = out.audit.issues || [];
    const errorCount = issues.filter((i) => i.severity === "error").length;
    const warningCount = issues.filter((i) => i.severity === "warning").length;
    if (!analysis) analysis = {};
    analysis.auditSummary = {
      url: out.audit.url,
      errorCount,
      warningCount,
      issues,
      wordCount: out.audit.wordCount,
      h1Count: out.audit.h1Count,
      h2Count: out.audit.h2Count,
    };
  }

  if (analysis?.opportunities?.length) {
    await saveSeoSnapshot("serp_opportunity_mapping", {
      domain,
      opportunities: analysis.opportunities,
      opportunityCount: analysis.opportunityCount ?? 0,
      auditSummary: analysis.auditSummary ?? null,
      run_at: new Date().toISOString(),
    }).catch(() => {});
  }

  const allOk =
    out.overview?.ok !== false &&
    out.keywords?.ok === true &&
    out.rankings?.ok === true &&
    out.audit?.ok === true;
  return {
    ok: allOk,
    steps: out,
    analysis,
    message: allOk
      ? "Pipeline completed. Check Overview, SERP opportunities, and Technical audit below."
      : "Pipeline finished with some failures. Review each step above.",
  };
}
