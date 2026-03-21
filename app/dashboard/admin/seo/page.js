"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart2,
  Search,
  FileText,
  TrendingDown,
  Target,
  Wrench,
  ExternalLink,
  Loader2,
  Play,
  Info,
  X,
} from "lucide-react";

/** Minimal markdown to HTML for the flow doc modal */
function mdToHtml(md) {
  if (!md || typeof md !== "string") return "";
  let html = md
    .replace(/```([\s\S]*?)```/g, "<pre class='bg-black/30 p-3 rounded text-sm overflow-x-auto text-white/80 whitespace-pre-wrap'>$1</pre>")
    .replace(/^### (.+)$/gm, "<h3 class='text-sm font-semibold text-white mt-4 mb-2'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 class='text-base font-semibold text-white mt-5 mb-2'>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 class='text-lg font-bold text-white mb-3'>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong class='text-white/90'>$1</strong>")
    .replace(/`([^`]+)`/g, "<code class='bg-white/10 px-1 rounded text-accent'>$1</code>")
    .replace(/^---$/gm, "<hr class='border-white/10 my-4' />")
    .replace(/^- (.+)$/gm, "<li class='ml-4 text-white/70 text-sm'>$1</li>")
    .replace(/\n\n/g, "</p><p class='text-white/60 text-sm mb-2'>")
    .replace(/\n/g, "<br/>");
  const tableRegex = /\|(.+)\|\n\|[^\n]+\|\n((?:\|.+\|\n?)+)/g;
  html = html.replace(tableRegex, (_, header, body) => {
    const headers = header.split("|").filter(Boolean).map((c) => c.trim());
    const rows = body.trim().split("\n").map((row) => row.split("|").filter(Boolean).map((c) => c.trim()));
    let t = "<div class='overflow-x-auto my-3'><table class='w-full text-sm border border-white/10 rounded'><thead><tr class='bg-white/5'>";
    headers.forEach((h) => { t += `<th class='px-3 py-2 text-left text-white/80 border-b border-white/10'>${h}</th>`; });
    t += "</tr></thead><tbody>";
    rows.forEach((row) => {
      t += "<tr class='border-b border-white/5'>";
      row.forEach((cell) => { t += `<td class='px-3 py-2 text-white/70'>${cell}</td>`; });
      t += "</tr>";
    });
    t += "</tbody></table></div>";
    return t;
  });
  return "<p class='text-white/60 text-sm mb-2'>" + html + "</p>";
}

export default function SEOCommandCenterPage() {
  const [keywordsInput, setKeywordsInput] = useState("flashcards\nAI flashcards\nspaced repetition\nflashcard app");
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [keywordsError, setKeywordsError] = useState(null);
  const [keywordsResult, setKeywordsResult] = useState(null);
  const [credentialsOk, setCredentialsOk] = useState(null);

  const [rankingsDomain, setRankingsDomain] = useState("deckbase.co");
  const [rankingsInput, setRankingsInput] = useState("flashcards\nAI flashcards\nspaced repetition\nflashcard app");
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [rankingsError, setRankingsError] = useState(null);
  const [rankingsResult, setRankingsResult] = useState(null);

  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState(null);
  const [overviewData, setOverviewData] = useState(null);

  const [scrapeUrlInput, setScrapeUrlInput] = useState("https://www.deckbase.co");
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeError, setScrapeError] = useState(null);
  const [scrapeResult, setScrapeResult] = useState(null);

  const [researchQueryInput, setResearchQueryInput] = useState("Keyword ideas and seed keywords for a flashcard and spaced repetition app targeting students and professionals.");
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState(null);
  const [researchResult, setResearchResult] = useState(null);

  const [firecrawlOk, setFirecrawlOk] = useState(null);
  const [perplexityOk, setPerplexityOk] = useState(null);

  const [auditUrlInput, setAuditUrlInput] = useState("https://www.deckbase.co");
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState(null);
  const [auditResult, setAuditResult] = useState(null);

  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineError, setPipelineError] = useState(null);
  const [pipelineResult, setPipelineResult] = useState(null);
  const [pipelineProgress, setPipelineProgress] = useState([]);
  const [usePerplexitySeeds, setUsePerplexitySeeds] = useState(true);
  const [useDataForSeoSuggestions, setUseDataForSeoSuggestions] = useState(true);

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docContent, setDocContent] = useState("");
  const [docLoading, setDocLoading] = useState(false);

  const [keywordUrlMapping, setKeywordUrlMapping] = useState({});
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingSaving, setMappingSaving] = useState(false);
  const [mappingError, setMappingError] = useState(null);
  const [newMappingKeyword, setNewMappingKeyword] = useState("");
  const [newMappingUrl, setNewMappingUrl] = useState("");

  useEffect(() => {
    fetch("/api/seo/keywords")
      .then((r) => r.json())
      .then((d) => setCredentialsOk(d.configured === true))
      .catch(() => setCredentialsOk(false));
  }, []);

  useEffect(() => {
    fetch("/api/seo/snapshots")
      .then((r) => r.json())
      .then((d) => {
        if (d.search_volume?.result?.length) setKeywordsResult(d.search_volume);
        if (d.rankings?.results?.length) {
          setRankingsResult(d.rankings);
          if (d.rankings.domain) setRankingsDomain(d.rankings.domain);
        }
      })
      .catch(() => {});
  }, []);

  const fetchOverview = () => {
    setOverviewError(null);
    setOverviewLoading(true);
    fetch("/api/seo/overview")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setOverviewError(d.error);
        else if (d.configured) setOverviewData(d);
        else setOverviewError(d.ga4?.error || d.searchConsole?.error || "Configure GA4 & Search Console");
      })
      .catch((e) => setOverviewError(e.message))
      .finally(() => setOverviewLoading(false));
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    setMappingLoading(true);
    fetch("/api/seo/keyword-url-mapping")
      .then((r) => r.json())
      .then((d) => { if (d.mappings && typeof d.mappings === "object") setKeywordUrlMapping(d.mappings); })
      .catch(() => setKeywordUrlMapping({}))
      .finally(() => setMappingLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/seo/integrations")
      .then((r) => r.json())
      .then((d) => {
        console.log("[SEO page] integrations response:", d);
        setFirecrawlOk(d.firecrawl === true);
        setPerplexityOk(d.perplexity === true);
      })
      .catch((err) => {
        console.warn("[SEO page] integrations fetch failed:", err);
        setFirecrawlOk(false);
        setPerplexityOk(false);
      });
  }, []);

  const handleFetchKeywords = async () => {
    const list = keywordsInput
      .split(/[\n,]+/)
      .map((k) => k.trim())
      .filter(Boolean);
    if (!list.length) {
      setKeywordsError("Enter at least one keyword.");
      return;
    }
    setKeywordsError(null);
    setKeywordsResult(null);
    setKeywordsLoading(true);
    try {
      const res = await fetch("/api/seo/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: list, location_code: 2840 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || data?.status_message || `Error ${res.status}`;
        setKeywordsError(msg);
        return;
      }
      setKeywordsResult(data);
    } catch (err) {
      setKeywordsError(err.message || "Request failed");
    } finally {
      setKeywordsLoading(false);
    }
  };

  const handleFetchRankings = async () => {
    const list = rankingsInput
      .split(/[\n,]+/)
      .map((k) => k.trim())
      .filter(Boolean);
    if (!list.length) {
      setRankingsError("Enter at least one keyword.");
      return;
    }
    if (list.length > 10) {
      setRankingsError("Max 10 keywords per check (each uses one SERP API call).");
      return;
    }
    setRankingsError(null);
    setRankingsResult(null);
    setRankingsLoading(true);
    try {
      const res = await fetch("/api/seo/rankings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: rankingsDomain.trim() || "deckbase.co",
          keywords: list,
          location_code: 2840,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRankingsError(data?.error || `Error ${res.status}`);
        return;
      }
      setRankingsResult(data);
    } catch (err) {
      setRankingsError(err.message || "Request failed");
    } finally {
      setRankingsLoading(false);
    }
  };

  const handleScrape = async () => {
    const url = scrapeUrlInput.trim();
    if (!url) {
      setScrapeError("Enter a URL");
      return;
    }
    setScrapeError(null);
    setScrapeResult(null);
    setScrapeLoading(true);
    try {
      const res = await fetch("/api/seo/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setScrapeError(data.error || `Error ${res.status}`);
        return;
      }
      setScrapeResult(data);
    } catch (err) {
      setScrapeError(err.message || "Scrape failed");
    } finally {
      setScrapeLoading(false);
    }
  };

  const handleResearch = async () => {
    const query = researchQueryInput.trim();
    if (!query) {
      setResearchError("Enter a research query");
      return;
    }
    setResearchError(null);
    setResearchResult(null);
    setResearchLoading(true);
    try {
      const res = await fetch("/api/seo/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResearchError(data.error || `Error ${res.status}`);
        return;
      }
      setResearchResult(data);
    } catch (err) {
      setResearchError(err.message || "Research failed");
    } finally {
      setResearchLoading(false);
    }
  };

  const handleRunAudit = async () => {
    const url = auditUrlInput.trim();
    if (!url) {
      setAuditError("Enter a URL");
      return;
    }
    setAuditError(null);
    setAuditResult(null);
    setAuditLoading(true);
    try {
      const res = await fetch("/api/seo/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuditError(data.error || `Error ${res.status}`);
        return;
      }
      setAuditResult(data);
    } catch (err) {
      setAuditError(err.message || "Audit failed");
    } finally {
      setAuditLoading(false);
    }
  };

  const handleAddMapping = () => {
    const kw = newMappingKeyword.trim().toLowerCase();
    const url = newMappingUrl.trim();
    if (!kw || !url) return;
    setKeywordUrlMapping((prev) => ({ ...prev, [kw]: url }));
    setNewMappingKeyword("");
    setNewMappingUrl("");
  };

  const handleRemoveMapping = (keyword) => {
    setKeywordUrlMapping((prev) => {
      const next = { ...prev };
      delete next[keyword];
      return next;
    });
  };

  const handleSaveMapping = async () => {
    setMappingError(null);
    setMappingSaving(true);
    try {
      const res = await fetch("/api/seo/keyword-url-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings: keywordUrlMapping }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMappingError(data?.error || `Error ${res.status}`);
    } catch (e) {
      setMappingError(e.message || "Save failed");
    } finally {
      setMappingSaving(false);
    }
  };

  const handleRunPipeline = async () => {
    setPipelineError(null);
    setPipelineResult(null);
    setPipelineProgress([]);
    setPipelineLoading(true);
    const list = keywordsInput
      .split(/[\n,]+/)
      .map((k) => k.trim())
      .filter(Boolean);
    const payload = {
      keywords: list.length ? list : ["flashcards", "AI flashcards", "spaced repetition", "flashcard app"],
      domain: rankingsDomain.trim() || "deckbase.co",
      auditUrl: auditUrlInput.trim() || `https://${rankingsDomain.trim() || "deckbase.co"}`,
      use_perplexity_seeds: usePerplexitySeeds,
      use_dataforseo_suggestions: useDataForSeoSuggestions,
    };

    try {
      const res = await fetch("/api/seo/pipeline/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPipelineError(data?.error || `Error ${res.status}`);
        setPipelineLoading(false);
        return;
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      if (!reader) {
        setPipelineError("Stream not supported");
        setPipelineLoading(false);
        return;
      }
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "progress") {
              setPipelineProgress((prev) => [...prev, { step: event.step, status: event.status, message: event.message }]);
            } else if (event.type === "result" && event.data) {
              setPipelineResult(event.data);
              const data = event.data;
              if (data.steps?.overview && (data.steps.overview.ga4 || data.steps.overview.searchConsole)) {
                setOverviewData({
                  ga4: data.steps.overview.ga4,
                  searchConsole: data.steps.overview.searchConsole,
                });
                setOverviewError(null);
              }
              if (data.steps?.audit && typeof data.steps.audit.url === "string") {
                setAuditResult({
                  url: data.steps.audit.url,
                  title: data.steps.audit.title,
                  description: data.steps.audit.description,
                  wordCount: data.steps.audit.wordCount,
                  h1Count: data.steps.audit.h1Count,
                  h2Count: data.steps.audit.h2Count,
                  issues: data.steps.audit.issues || [],
                  ok: data.steps.audit.ok,
                });
                setAuditError(null);
              }
              fetch("/api/seo/snapshots")
                .then((r) => r.json())
                .then((d) => {
                  if (d.search_volume?.result?.length) setKeywordsResult(d.search_volume);
                  if (d.rankings?.results?.length) {
                    setRankingsResult(d.rankings);
                    if (d.rankings.domain) setRankingsDomain(d.rankings.domain);
                  }
                })
                .catch(() => {});
            } else if (event.type === "error") {
              setPipelineError(event.error || "Pipeline failed");
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      setPipelineError(err.message || "Pipeline failed");
    } finally {
      setPipelineLoading(false);
    }
  };

  const serpMerged = useMemo(() => {
    const volumeList = keywordsResult?.result ?? [];
    const rankList = rankingsResult?.results ?? [];
    const rankByKeyword = {};
    rankList.forEach((r) => {
      const k = (r.keyword || "").toLowerCase().trim();
      if (k) rankByKeyword[k] = r.position;
    });
    return volumeList.map((row) => {
      const kw = (row.keyword ?? "").trim();
      const key = kw.toLowerCase();
      const position = rankByKeyword[key] ?? null;
      const isOpportunity = position == null || position > 10;
      return { keyword: kw, search_volume: row.search_volume, competition: row.competition, cpc: row.cpc, position, isOpportunity };
    }).sort((a, b) => {
      const volA = a.search_volume ?? 0;
      const volB = b.search_volume ?? 0;
      if (volB !== volA) return volB - volA;
      const posA = a.position == null ? 999 : a.position;
      const posB = b.position == null ? 999 : b.position;
      return posA - posB;
    });
  }, [keywordsResult?.result, rankingsResult?.results]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        href="/dashboard/admin"
        className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Admin
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
          <BarChart2 className="w-6 h-6 text-accent" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">SEO Command Center</h1>
          <p className="text-white/50 text-sm">
            Live SEO data, content health, and programmatic strategy in one place
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDocModalOpen(true);
            if (!docContent && !docLoading) {
              setDocLoading(true);
              fetch("/api/seo/docs/flow")
                .then((r) => r.json())
                .then((d) => { if (d.content) setDocContent(d.content); })
                .catch(() => setDocContent("# Error\nCould not load the doc."))
                .finally(() => setDocLoading(false));
            }
          }}
          className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          title="How the tools work together"
          aria-label="Open flow documentation"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>

      {/* Flow doc modal */}
      {docModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setDocModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="flow-doc-title"
        >
          <div
            className="bg-gray-900 border border-white/10 rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h2 id="flow-doc-title" className="text-lg font-semibold text-white">
                How the SEO tools work together
              </h2>
              <button
                type="button"
                onClick={() => setDocModalOpen(false)}
                className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {docLoading ? (
                <div className="flex items-center gap-2 text-white/60">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading…
                </div>
              ) : (
                <div
                  className="prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: mdToHtml(docContent) }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 p-4 rounded-xl bg-white/5 border border-white/10">
        <p className="text-white/70 text-sm">
          Connect data sources (GA4, Search Console, DataForSEO, Firecrawl, Perplexity) to
          power rankings, traffic, and opportunity reports.
        </p>
        <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-3">
          <a
            href="https://analytics.google.com/analytics/web/#/a384872829p525143280/reports/intelligenthome?params=_u..nav%3Dmaui"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            GA4
          </a>
          <a
            href="https://search.google.com/search-console?resource_id=sc-domain%3Adeckbase.co"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Search Console
          </a>
          <a
            href="https://app.dataforseo.com/api-dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            DataForSEO
          </a>
          <a
            href="https://www.firecrawl.dev/app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Firecrawl
          </a>
          <a
            href="https://www.perplexity.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Perplexity
          </a>
        </div>
      </div>

      {/* Run full pipeline — one-click refresh for semi-autonomous SEO */}
      <div className="mb-8 p-5 rounded-xl bg-accent/10 border border-accent/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <Play className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Run full pipeline</h2>
            <p className="text-white/60 text-sm">
              Refresh Overview → Keyword volume → Rankings → Technical audit in one go. Run weekly to keep data fresh.
            </p>
          </div>
        </div>
        <p className="text-white/50 text-xs mb-4">
          Uses your current keyword list and domain below. Results update the Overview, SERP opportunities, and Technical audit sections. You can also call <code className="text-white/70 bg-black/30 px-1 rounded">POST /api/seo/pipeline</code> (e.g. from a cron) to run this periodically.
        </p>
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={usePerplexitySeeds}
            onChange={(e) => setUsePerplexitySeeds(e.target.checked)}
            className="rounded border-white/30 bg-black/30 text-accent focus:ring-accent/50"
          />
          <span className="text-white/70 text-sm">
            <strong className="text-white">Discover keywords with Perplexity first</strong> — essential for autonomous SEO: finds new opportunities (e.g. &quot;Deckbase vs Anki&quot;, use cases) then DataForSEO validates volume &amp; rank. Uncheck only to re-run on a fixed list.
          </span>
        </label>
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={useDataForSeoSuggestions}
            onChange={(e) => setUseDataForSeoSuggestions(e.target.checked)}
            className="rounded border-white/30 bg-black/30 text-accent focus:ring-accent/50"
          />
          <span className="text-white/70 text-sm">
            <strong className="text-white">Expand with DataForSEO suggestions</strong> — uses DataForSEO Labs to get long-tail keyword ideas from your seeds (search-based discovery). Complements Perplexity for autonomous improvement.
          </span>
        </label>
        {pipelineError && (
          <p className="text-amber-400/90 text-sm mb-3">{pipelineError}</p>
        )}
        {pipelineLoading && pipelineProgress.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-black/20 border border-white/10 text-sm">
            <p className="text-white/70 font-medium mb-2">Pipeline progress</p>
            <ul className="space-y-1.5">
              {pipelineProgress.map((p, i) => (
                <li key={i} className="flex items-center gap-2 text-white/80">
                  {p.status === "running" && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0 text-accent" />}
                  {p.status === "done" && <span className="text-emerald-400 flex-shrink-0">✓</span>}
                  {p.status === "skip" && <span className="text-white/40 flex-shrink-0">−</span>}
                  <span className="capitalize">{p.step === "dataforseo_suggestions" ? "DataForSEO suggestions" : p.step.replace(/_/g, " ")}</span>
                  <span className="text-white/50">—</span>
                  <span className="text-white/60">{p.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {pipelineResult && (
          <div className="mb-4 space-y-4">
            <div className="p-3 rounded-lg bg-black/20 border border-white/10 text-sm">
              <p className="text-white/80 mb-2">{pipelineResult.message}</p>
              <ul className="text-white/60 space-y-1">
                {pipelineResult.steps?.perplexity != null && (
                  <li>Perplexity seeds: {pipelineResult.steps.perplexity.ok ? `✓ (${pipelineResult.steps.perplexity.discovered ?? 0} keywords)` : `✗ ${pipelineResult.steps.perplexity.error || ""}`}</li>
                )}
                {pipelineResult.steps?.dataforseo_suggestions != null && !pipelineResult.steps.dataforseo_suggestions.skip && (
                  <li>DataForSEO suggestions: {pipelineResult.steps.dataforseo_suggestions.ok ? `✓ (+${pipelineResult.steps.dataforseo_suggestions.added ?? 0} suggestions, ${pipelineResult.steps.dataforseo_suggestions.totalKeywords ?? 0} total)` : "−"}</li>
                )}
                <li>Overview: {pipelineResult.steps?.overview?.ok ? "✓" : "✗"}</li>
                <li>Keyword volume: {pipelineResult.steps?.keywords?.ok ? "✓" : "✗"}</li>
                <li>Rankings: {pipelineResult.steps?.rankings?.ok ? "✓" : "✗"}</li>
                <li>Technical audit: {pipelineResult.steps?.audit?.ok ? "✓" : "✗"}</li>
              </ul>
              {pipelineResult.steps?.perplexity?.keywords?.length > 0 && (
                <p className="text-white/50 text-xs mt-2">Seeds: {pipelineResult.steps.perplexity.keywords.join(", ")}</p>
              )}
            </div>
            {pipelineResult.analysis && (
              <div className="p-4 rounded-lg bg-black/20 border border-white/10 text-sm">
                <h3 className="text-white font-medium mb-3">Run analysis</h3>
                {pipelineResult.analysis.opportunityCount != null && (
                  <div className="mb-3">
                    <p className="text-white/70">
                      <strong className="text-white">{pipelineResult.analysis.opportunityCount}</strong> SERP opportunities
                      (high volume, not in top 10) out of {pipelineResult.analysis.totalKeywords} keywords.
                    </p>
                    {pipelineResult.analysis.topOpportunities?.length > 0 && (
                      <div className="mt-2 overflow-x-auto rounded border border-white/10">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                              <th className="px-2 py-1.5 text-left text-white/70">Keyword</th>
                              <th className="px-2 py-1.5 text-left text-white/70">Volume</th>
                              <th className="px-2 py-1.5 text-left text-white/70">Position</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pipelineResult.analysis.topOpportunities.map((o, i) => (
                              <tr key={i} className="border-b border-white/5">
                                <td className="px-2 py-1.5 text-white/90">{o.keyword}</td>
                                <td className="px-2 py-1.5 text-white/80">{o.search_volume != null ? o.search_volume.toLocaleString() : "—"}</td>
                                <td className="px-2 py-1.5 text-white/80">{o.position != null ? o.position : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
                {pipelineResult.analysis.auditSummary && (
                  <div>
                    <p className="text-white/70 mb-1">
                      Technical audit ({pipelineResult.analysis.auditSummary.url}):{" "}
                      <strong className="text-white">{pipelineResult.analysis.auditSummary.errorCount}</strong> errors,{" "}
                      <strong className="text-white">{pipelineResult.analysis.auditSummary.warningCount}</strong> warnings
                      {pipelineResult.analysis.auditSummary.wordCount != null && (
                        <> · {pipelineResult.analysis.auditSummary.wordCount} words, H1×{pipelineResult.analysis.auditSummary.h1Count} H2×{pipelineResult.analysis.auditSummary.h2Count}</>
                      )}.
                    </p>
                    {pipelineResult.analysis.auditSummary.issues?.length > 0 && (
                      <ul className="mt-1 text-white/60 space-y-0.5 list-disc list-inside">
                        {pipelineResult.analysis.auditSummary.issues.map((issue, i) => (
                          <li key={i} className={issue.severity === "error" ? "text-red-400/90" : ""}>
                            [{issue.severity}] {issue.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={handleRunPipeline}
          disabled={pipelineLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pipelineLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running pipeline…
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run full pipeline
            </>
          )}
        </button>
        <Link
          href="/dashboard/admin/seo/report"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/15 ml-3"
        >
          <BarChart2 className="w-4 h-4" />
          View Step 4 report
        </Link>
      </div>

      {/* Keyword → URL mapping (Step 4 → Step 5 hand-off) */}
      <div className="mb-8 p-5 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Keyword → URL mapping</h2>
            <p className="text-white/50 text-sm">
              Map opportunity keywords to pages to audit. The pipeline will run a technical audit on these URLs when they’re flagged as opportunities.
            </p>
          </div>
        </div>
        <p className="text-white/50 text-xs mb-4">
          Add keyword (lowercase) and full URL. Example: <code className="text-white/70 bg-black/30 px-1 rounded">deckbase vs anki</code> → <code className="text-white/70 bg-black/30 px-1 rounded">https://deckbase.co/compare/anki</code>. Click Save to persist to Firebase.
        </p>
        {mappingError && <p className="text-amber-400/90 text-sm mb-3">{mappingError}</p>}
        {mappingLoading ? (
          <div className="flex items-center gap-2 text-white/60 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading mapping…</div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-2 mb-4">
              <input
                type="text"
                value={newMappingKeyword}
                onChange={(e) => setNewMappingKeyword(e.target.value)}
                placeholder="Keyword (e.g. deckbase vs anki)"
                className="rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white placeholder:text-white/40 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <input
                type="url"
                value={newMappingUrl}
                onChange={(e) => setNewMappingUrl(e.target.value)}
                placeholder="https://..."
                className="rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white placeholder:text-white/40 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <button
                type="button"
                onClick={handleAddMapping}
                className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/15"
              >
                Add
              </button>
            </div>
            {Object.keys(keywordUrlMapping).length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-white/10 mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="px-3 py-2 text-left text-white/70">Keyword</th>
                      <th className="px-3 py-2 text-left text-white/70">URL</th>
                      <th className="px-3 py-2 w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(keywordUrlMapping).map(([kw, url]) => (
                      <tr key={kw} className="border-b border-white/5">
                        <td className="px-3 py-2 text-white/90">{kw}</td>
                        <td className="px-3 py-2 text-white/80 truncate max-w-[280px]" title={url}>{url}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveMapping(kw)}
                            className="text-red-400/80 hover:text-red-400 text-xs"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-white/50 text-sm mb-4">No mappings yet. Add a keyword and URL above.</p>
            )}
            <button
              type="button"
              onClick={handleSaveMapping}
              disabled={mappingSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50"
            >
              {mappingSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save mapping
            </button>
          </>
        )}
      </div>

      {/* GA4 & Search Console — Overview */}
      <div className="mb-8 p-5 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Overview</h2>
              <p className="text-white/50 text-sm">GA4 & Search Console · last 30 days</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchOverview}
            disabled={overviewLoading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm hover:bg-white/15 disabled:opacity-50"
          >
            {overviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Refresh
          </button>
        </div>
        {overviewError && (
          <p className="text-amber-400/90 text-sm mb-3">{overviewError}</p>
        )}
        {overviewData?.ga4?.error && (
          <p className="text-white/50 text-sm mb-2">GA4: {overviewData.ga4.error}</p>
        )}
        {overviewData?.searchConsole?.error && (
          <p className="text-white/50 text-sm mb-2">Search Console: {overviewData.searchConsole.error}</p>
        )}
        {((overviewData?.ga4 && !overviewData.ga4.error) || (overviewData?.searchConsole && !overviewData.searchConsole.error)) && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {overviewData?.ga4 && !overviewData.ga4.error && (
                <>
                  <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                    <p className="text-white/50 text-xs">Active users</p>
                    <p className="text-white font-semibold">{Number(overviewData.ga4.activeUsers).toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                    <p className="text-white/50 text-xs">Sessions</p>
                    <p className="text-white font-semibold">{Number(overviewData.ga4.sessions).toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                    <p className="text-white/50 text-xs">Page views</p>
                    <p className="text-white font-semibold">{Number(overviewData.ga4.screenPageViews).toLocaleString()}</p>
                  </div>
                </>
              )}
              {overviewData?.searchConsole && !overviewData.searchConsole.error && (
                <>
                  <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                    <p className="text-white/50 text-xs">Search clicks</p>
                    <p className="text-white font-semibold">{Number(overviewData.searchConsole.clicks).toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                    <p className="text-white/50 text-xs">Impressions</p>
                    <p className="text-white font-semibold">{Number(overviewData.searchConsole.impressions).toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                    <p className="text-white/50 text-xs">Avg position</p>
                    <p className="text-white font-semibold">{Number(overviewData.searchConsole.position).toFixed(1)}</p>
                  </div>
                </>
              )}
            </div>
            {overviewData?.ga4?.topPages?.length > 0 && (
              <div>
                <h3 className="text-white/80 text-sm font-medium mb-2">Top pages (GA4)</h3>
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-white/10 bg-white/5"><th className="px-3 py-2 text-left text-white/70">Path</th><th className="px-3 py-2 text-left text-white/70">Views</th></tr></thead>
                    <tbody>
                      {overviewData.ga4.topPages.map((p, i) => (
                        <tr key={i} className="border-b border-white/5"><td className="px-3 py-2 text-white/90 truncate max-w-[200px]">{p.path || "/"}</td><td className="px-3 py-2 text-white/80">{p.views.toLocaleString()}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {overviewData?.searchConsole?.topQueries?.length > 0 && (
              <div>
                <h3 className="text-white/80 text-sm font-medium mb-2">Top queries (Search Console)</h3>
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-white/10 bg-white/5"><th className="px-3 py-2 text-left text-white/70">Query</th><th className="px-3 py-2 text-left text-white/70">Clicks</th><th className="px-3 py-2 text-left text-white/70">Impressions</th><th className="px-3 py-2 text-left text-white/70">Position</th></tr></thead>
                    <tbody>
                      {overviewData.searchConsole.topQueries.map((q, i) => (
                        <tr key={i} className="border-b border-white/5"><td className="px-3 py-2 text-white/90">{q.query}</td><td className="px-3 py-2 text-white/80">{q.clicks}</td><td className="px-3 py-2 text-white/80">{q.impressions}</td><td className="px-3 py-2 text-white/80">{q.position.toFixed(1)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {overviewData?.searchConsole?.topPages?.length > 0 && (
              <div>
                <h3 className="text-white/80 text-sm font-medium mb-2">Top pages (Search Console)</h3>
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-white/10 bg-white/5"><th className="px-3 py-2 text-left text-white/70">Page</th><th className="px-3 py-2 text-left text-white/70">Clicks</th><th className="px-3 py-2 text-left text-white/70">Impressions</th><th className="px-3 py-2 text-left text-white/70">Position</th></tr></thead>
                    <tbody>
                      {overviewData.searchConsole.topPages.map((p, i) => (
                        <tr key={i} className="border-b border-white/5"><td className="px-3 py-2 text-white/90 truncate max-w-[220px]" title={p.page}>{p.page}</td><td className="px-3 py-2 text-white/80">{p.clicks}</td><td className="px-3 py-2 text-white/80">{p.impressions}</td><td className="px-3 py-2 text-white/80">{p.position.toFixed(1)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DataForSEO — Keyword search volume */}
      <div className="mb-8 p-5 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <Search className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Keyword search volume</h2>
            <p className="text-white/50 text-sm">DataForSEO · Google Ads search volume (US)</p>
          </div>
        </div>
        <p className="text-white/50 text-xs mb-4">
          Enter keywords (one per line or comma-separated), then click &quot;Get search volume&quot; to see monthly searches, competition, and CPC. Data is for United States; each request uses your DataForSEO balance.
        </p>
        {credentialsOk === false && (
          <p className="text-amber-400/90 text-sm mb-3">
            DataForSEO not configured. Add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD to .env.local and restart the dev server.
          </p>
        )}
        {credentialsOk === true && (
          <p className="text-emerald-400/80 text-xs mb-1">DataForSEO credentials detected.</p>
        )}
        <div className="space-y-3">
          <textarea
            value={keywordsInput}
            onChange={(e) => setKeywordsInput(e.target.value)}
            placeholder="One keyword per line or comma-separated"
            rows={3}
            className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleFetchKeywords}
              disabled={keywordsLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {keywordsLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Fetching…
                </>
              ) : (
                "Get search volume"
              )}
            </button>
            {keywordsError && (
              <span className="text-red-400 text-sm">{keywordsError}</span>
            )}
          </div>
        </div>
        {keywordsResult?.result?.length > 0 && (
          <>
            {keywordsResult.saved_at && (
              <p className="mt-2 text-white/40 text-xs">
                Last saved to Firebase: {new Date(keywordsResult.saved_at).toLocaleString()}
              </p>
            )}
            <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-2 text-white/80 font-medium">Keyword</th>
                  <th className="px-4 py-2 text-white/80 font-medium">Search volume</th>
                  <th className="px-4 py-2 text-white/80 font-medium">Competition</th>
                  <th className="px-4 py-2 text-white/80 font-medium">CPC (USD)</th>
                </tr>
              </thead>
              <tbody>
                {keywordsResult.result.map((row, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-2 text-white">{row.keyword ?? "—"}</td>
                    <td className="px-4 py-2 text-white/80">
                      {row.search_volume != null ? row.search_volume.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2 text-white/80">{row.competition ?? "—"}</td>
                    <td className="px-4 py-2 text-white/80">
                      {row.cpc != null ? `$${row.cpc.toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
        {keywordsResult?.result?.length === 0 && !keywordsLoading && keywordsResult !== null && (
          <p className="mt-4 text-white/50 text-sm">No data returned for these keywords (e.g. restricted or invalid).</p>
        )}
      </div>

      {/* Keyword rankings — where does my site rank? */}
      <div className="mb-8 p-5 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Keyword rankings</h2>
            <p className="text-white/50 text-sm">Where your site ranks in Google (US) for each keyword · DataForSEO SERP</p>
          </div>
        </div>
        <p className="text-white/50 text-xs mb-4">
          Enter your domain and keywords (one per line, max 10). Each keyword uses one SERP API call. Checks top 100 results.
        </p>
        <div className="flex flex-wrap gap-4 mb-3">
          <label className="flex items-center gap-2">
            <span className="text-white/70 text-sm">Domain</span>
            <input
              type="text"
              value={rankingsDomain}
              onChange={(e) => setRankingsDomain(e.target.value)}
              placeholder="deckbase.co"
              className="rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white placeholder:text-white/40 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </label>
        </div>
        <textarea
          value={rankingsInput}
          onChange={(e) => setRankingsInput(e.target.value)}
          placeholder="One keyword per line (max 10)"
          rows={3}
          className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 mb-3"
        />
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={handleFetchRankings}
            disabled={rankingsLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {rankingsLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking rankings…
              </>
            ) : (
              "Check rankings"
            )}
          </button>
          {rankingsError && (
            <span className="text-red-400 text-sm">{rankingsError}</span>
          )}
        </div>
        {rankingsResult?.results?.length > 0 && (
          <>
            {rankingsResult.saved_at && (
              <p className="mt-2 text-white/40 text-xs">
                Last saved to Firebase: {new Date(rankingsResult.saved_at).toLocaleString()}
              </p>
            )}
            <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-2 text-white/80 font-medium">Keyword</th>
                  <th className="px-4 py-2 text-white/80 font-medium">Position</th>
                  <th className="px-4 py-2 text-white/80 font-medium">Title</th>
                  <th className="px-4 py-2 text-white/80 font-medium">URL</th>
                </tr>
              </thead>
              <tbody>
                {rankingsResult.results.map((row, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-2 text-white">{row.keyword}</td>
                    <td className="px-4 py-2 text-white/80">
                      {row.position != null ? (
                        <span className="font-medium text-accent">#{row.position}</span>
                      ) : (
                        <span className="text-white/50">{row.error || "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-white/80 max-w-[200px] truncate" title={row.title ?? ""}>
                      {row.title ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-white/60 max-w-[220px] truncate">
                      {row.url ? (
                        <a href={row.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent truncate block">
                          {row.url}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Firecrawl — scrape URL to markdown */}
      <div className="mb-8 p-5 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Site scraping</h2>
            <p className="text-white/50 text-sm">Scrape any URL (yours or competitors) to clean markdown for analysis · Firecrawl</p>
          </div>
        </div>
        <p className="text-white/50 text-xs mb-4">
          Enter a URL and click Scrape to get main-content markdown. Set FIRECRAWL_API_KEY in .env.local.
        </p>
        <p className="text-white/60 text-xs mb-3 max-w-2xl">
          <strong className="text-white/80">What this does:</strong> Turns any webpage (yours or a competitor’s) into clean markdown. Use it to audit your own copy, analyze competitor pages, or feed content into AI for summaries and keyword extraction—without dealing with HTML or layout.
        </p>
        {firecrawlOk === true && <p className="text-emerald-400/80 text-xs mb-2">Firecrawl API key detected.</p>}
        {firecrawlOk === false && <p className="text-amber-400/90 text-xs mb-2">Add FIRECRAWL_API_KEY to .env.local and restart the dev server.</p>}
        <div className="flex flex-wrap gap-3 mb-3">
          <input
            type="url"
            value={scrapeUrlInput}
            onChange={(e) => setScrapeUrlInput(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 min-w-[200px] rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <button
            type="button"
            onClick={handleScrape}
            disabled={scrapeLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50"
          >
            {scrapeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Scrape
          </button>
        </div>
        {scrapeError && <p className="text-amber-400/90 text-sm mb-2">{scrapeError}</p>}
        {scrapeResult && (
          <div className="mt-4 space-y-2">
            {(scrapeResult.title || scrapeResult.description) && (
              <p className="text-white/60 text-xs">
                {scrapeResult.title && <span className="font-medium">{scrapeResult.title}</span>}
                {scrapeResult.description && ` — ${scrapeResult.description}`}
              </p>
            )}
            <pre className="p-4 rounded-lg bg-black/30 border border-white/10 text-white/90 text-xs overflow-x-auto max-h-[400px] overflow-y-auto whitespace-pre-wrap">
              {scrapeResult.markdown || "(no content)"}
            </pre>
          </div>
        )}
      </div>

      {/* Perplexity — keyword strategy research */}
      <div className="mb-8 p-5 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <Search className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Keyword research</h2>
            <p className="text-white/50 text-sm">Deep-web research for programmatic keyword ideas and seed keywords · Perplexity Sonar</p>
          </div>
        </div>
        <p className="text-white/50 text-xs mb-4">
          Ask a research question (e.g. keyword ideas for your niche). Set PERPLEXITY_API_KEY in .env.local.
        </p>
        <p className="text-white/60 text-xs mb-3 max-w-2xl">
          <strong className="text-white/80">What this does:</strong> Runs your question through Perplexity’s web search so you get up-to-date, cited answers. Use it to discover keyword ideas, content angles, and seed terms for your niche—then paste the best ones into the Keyword search volume and Rankings sections above.
        </p>
        {perplexityOk === true && <p className="text-emerald-400/80 text-xs mb-2">Perplexity API key detected.</p>}
        {perplexityOk === false && <p className="text-amber-400/90 text-xs mb-2">Add PERPLEXITY_API_KEY to .env.local and restart the dev server.</p>}
        <div className="space-y-3">
          <textarea
            value={researchQueryInput}
            onChange={(e) => setResearchQueryInput(e.target.value)}
            placeholder="e.g. Keyword ideas for a flashcard app targeting students"
            rows={2}
            className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <button
            type="button"
            onClick={handleResearch}
            disabled={researchLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50"
          >
            {researchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Research
          </button>
        </div>
        {researchError && <p className="text-amber-400/90 text-sm mt-2">{researchError}</p>}
        {researchResult && (
          <div className="mt-4 space-y-2">
            <div className="p-4 rounded-lg bg-black/30 border border-white/10 text-white/90 text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto">
              {researchResult.content || "(no response)"}
            </div>
            {researchResult.citations?.length > 0 && (
              <p className="text-white/50 text-xs">
                Citations: {researchResult.citations.slice(0, 5).join(", ")}
                {researchResult.citations.length > 5 ? "…" : ""}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Content decay watchlist — pages to refresh (uses Search Console) */}
      <div id="content-decay" className="mb-8 p-5 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Content decay watchlist</h2>
            <p className="text-white/50 text-sm">Pages from Search Console — prioritize those losing traffic</p>
          </div>
        </div>
        {!(overviewData?.searchConsole && !overviewData.searchConsole.error) ? (
          <p className="text-white/50 text-sm">
            Connect Search Console in the Overview section above and click Refresh. This block will list your top pages by search traffic; period-over-period comparison (to highlight decay) is coming soon.
          </p>
        ) : overviewData?.searchConsole?.topPages?.length > 0 ? (
          <div className="space-y-3">
            <p className="text-white/50 text-xs">
              Current top pages by clicks (last 30 days). Comparing two periods to detect declining traffic will be added next.
            </p>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-3 py-2 text-left text-white/70">Page</th>
                    <th className="px-3 py-2 text-left text-white/70">Clicks</th>
                    <th className="px-3 py-2 text-left text-white/70">Impressions</th>
                    <th className="px-3 py-2 text-left text-white/70">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewData.searchConsole.topPages.map((p, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="px-3 py-2 text-white/90 truncate max-w-[280px]" title={p.page}>
                        <a href={p.page} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                          {p.page}
                        </a>
                      </td>
                      <td className="px-3 py-2 text-white/80">{p.clicks}</td>
                      <td className="px-3 py-2 text-white/80">{p.impressions}</td>
                      <td className="px-3 py-2 text-white/80">{p.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-white/50 text-sm">No page data yet for the last 30 days. Refresh Overview after Search Console is connected.</p>
        )}
      </div>

      {/* SERP opportunities — keyword volume + rankings combined */}
      <div id="serp-opportunities" className="mb-8 p-5 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">SERP opportunities</h2>
            <p className="text-white/50 text-sm">High-value keywords where you don’t rank (or rank low) — from keyword volume + rankings</p>
          </div>
        </div>
        {serpMerged.length === 0 ? (
          <p className="text-white/50 text-sm">
            Get search volume and check rankings above (same keywords in both) to see SERP opportunities here.
          </p>
        ) : (
          <div className="space-y-3">
            {serpMerged.filter((r) => r.isOpportunity).length > 0 && (
              <p className="text-white/50 text-xs">
                {serpMerged.filter((r) => r.isOpportunity).length} opportunity keywords (not in top 10 or no rank). Focus content on these for quick wins.
              </p>
            )}
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-3 py-2 text-left text-white/70">Keyword</th>
                    <th className="px-3 py-2 text-left text-white/70">Volume</th>
                    <th className="px-3 py-2 text-left text-white/70">Competition</th>
                    <th className="px-3 py-2 text-left text-white/70">Our position</th>
                    <th className="px-3 py-2 text-left text-white/70">Opportunity</th>
                  </tr>
                </thead>
                <tbody>
                  {serpMerged.map((r, i) => (
                    <tr key={i} className={`border-b border-white/5 ${r.isOpportunity ? "bg-amber-500/5" : ""}`}>
                      <td className="px-3 py-2 text-white/90 font-medium">{r.keyword}</td>
                      <td className="px-3 py-2 text-white/80">{r.search_volume != null ? r.search_volume.toLocaleString() : "—"}</td>
                      <td className="px-3 py-2 text-white/80">{r.competition ?? "—"}</td>
                      <td className="px-3 py-2 text-white/80">
                        {r.position != null ? <span className="text-accent">#{r.position}</span> : <span className="text-white/50">Not in top 100</span>}
                      </td>
                      <td className="px-3 py-2">
                        {r.isOpportunity ? <span className="text-amber-400 font-medium">Yes</span> : <span className="text-white/50">Ranked</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Technical audit — Firecrawl + basic SEO checks */}
      <div id="technical-audit" className="mb-8 p-5 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Technical audit</h2>
            <p className="text-white/50 text-sm">Site health: title, meta description, headings, word count · Firecrawl</p>
          </div>
        </div>
        <p className="text-white/60 text-xs mb-3 max-w-2xl">
          <strong className="text-white/80">What this does:</strong> Scrapes the URL and checks title length, meta description, H1/H2 count, and word count. Surfaces common SEO issues. Requires Firecrawl API key.
        </p>
        <div className="flex flex-wrap gap-3 mb-3">
          <input
            type="url"
            value={auditUrlInput}
            onChange={(e) => setAuditUrlInput(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 min-w-[200px] rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <button
            type="button"
            onClick={handleRunAudit}
            disabled={auditLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50"
          >
            {auditLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Run audit
          </button>
        </div>
        {auditError && <p className="text-amber-400/90 text-sm mb-2">{auditError}</p>}
        {auditResult && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                <p className="text-white/50 text-xs">Title</p>
                <p className="text-white text-sm truncate" title={auditResult.title}>{auditResult.title}</p>
              </div>
              <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                <p className="text-white/50 text-xs">Meta description</p>
                <p className="text-white/80 text-xs line-clamp-2" title={auditResult.description}>{auditResult.description}</p>
              </div>
              <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                <p className="text-white/50 text-xs">Word count</p>
                <p className="text-white font-semibold">{auditResult.wordCount?.toLocaleString() ?? "—"}</p>
              </div>
              <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                <p className="text-white/50 text-xs">H1 / H2</p>
                <p className="text-white font-semibold">{auditResult.h1Count ?? "—"} / {auditResult.h2Count ?? "—"}</p>
              </div>
            </div>
            {auditResult.issues?.length > 0 ? (
              <div>
                <h3 className="text-white/80 text-sm font-medium mb-2">Issues</h3>
                <ul className="space-y-1">
                  {auditResult.issues.map((issue, i) => (
                    <li key={i} className={`text-sm ${issue.severity === "error" ? "text-red-400" : "text-amber-400/90"}`}>
                      <span className="font-medium">{issue.type}:</span> {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-emerald-400/80 text-sm">No issues found. Basic checks passed.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
