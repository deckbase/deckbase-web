"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Smartphone, Loader2, Play, Check, X, ChevronDown, ChevronRight } from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";

export default function ASOCommandCenterPage() {
  const adminFetch = useAdminFetch();
  const [keywordsInput, setKeywordsInput] = useState("");
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineError, setPipelineError] = useState(null);
  const [pipelineResult, setPipelineResult] = useState(null);
  const [pipelineProgress, setPipelineProgress] = useState([]);
  const [usePerplexitySeeds, setUsePerplexitySeeds] = useState(true);
  const [useDataForSeoSuggestions, setUseDataForSeoSuggestions] = useState(true);
  const [useClaudeFilter, setUseClaudeFilter] = useState(true);
  const [useAppRankings, setUseAppRankings] = useState(false);
  const [integrations, setIntegrations] = useState(null);
  const [storeListings, setStoreListings] = useState(null);
  const [storeListingsLoading, setStoreListingsLoading] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [metadataDrafts, setMetadataDrafts] = useState(null);
  const [metadataDraftsLoading, setMetadataDraftsLoading] = useState(false);
  const [metadataDraftsError, setMetadataDraftsError] = useState(null);
  const [pastRuns, setPastRuns] = useState([]);
  const [expandedRunId, setExpandedRunId] = useState(null);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);

  useEffect(() => {
    adminFetch("/api/aso/integrations")
      .then((r) => r.json())
      .then((d) => setIntegrations(d))
      .catch(() => setIntegrations({}));
  }, [adminFetch]);

  useEffect(() => {
    adminFetch("/api/aso/snapshots?list=1")
      .then((r) => r.json())
      .then((d) => {
        if (d.opportunity_mapping) setLastRun({ opportunityMapping: d.opportunity_mapping, keywordShortlist: d.keyword_shortlist });
        if (d.metadata_drafts) setMetadataDrafts(d.metadata_drafts);
        if (Array.isArray(d.past_runs)) setPastRuns(d.past_runs);
      })
      .catch(() => setPastRuns([]))
      .finally(() => setSnapshotsLoading(false));
  }, [adminFetch]);

  useEffect(() => {
    if (integrations == null) return;
    if (integrations.googlePlay || integrations.appStoreConnect) {
      setStoreListingsLoading(true);
      adminFetch("/api/aso/store-listings")
        .then((r) => r.json())
        .then((d) => setStoreListings(d))
        .catch(() => setStoreListings({}))
        .finally(() => setStoreListingsLoading(false));
    } else {
      setStoreListings({ googlePlay: { ok: false }, appStore: { ok: false } });
    }
  }, [adminFetch, integrations?.googlePlay, integrations?.appStoreConnect]);

  const refreshStoreListings = () => {
    if (!integrations?.googlePlay && !integrations?.appStoreConnect) return;
    setStoreListingsLoading(true);
    adminFetch("/api/aso/store-listings")
      .then((r) => r.json())
      .then((d) => setStoreListings(d))
      .catch(() => setStoreListings({}))
      .finally(() => setStoreListingsLoading(false));
  };

  const handleGenerateDrafts = () => {
    setMetadataDraftsError(null);
    setMetadataDraftsLoading(true);
    adminFetch("/api/aso/metadata-drafts", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setMetadataDraftsError(d.error);
          return;
        }
        if (d.drafts) setMetadataDrafts({ ...d.drafts, run_at: new Date().toISOString() });
      })
      .catch((e) => setMetadataDraftsError(e.message || "Failed"))
      .finally(() => setMetadataDraftsLoading(false));
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
      keywords: list,
      use_perplexity_seeds: usePerplexitySeeds,
      use_dataforseo_suggestions: useDataForSeoSuggestions,
      use_claude_filter: useClaudeFilter,
      use_app_rankings: useAppRankings,
    };

    try {
      const res = await adminFetch("/api/aso/pipeline/stream", {
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
              setPipelineProgress((prev) => [
                ...prev,
                { step: event.step, status: event.status, message: event.message },
              ]);
            } else if (event.type === "result" && event.data) {
              setPipelineResult(event.data);
              if (event.data?.analysis?.opportunities != null) {
                setLastRun({
                  opportunityMapping: {
                    opportunities: event.data.analysis.opportunities,
                    opportunityCount: event.data.analysis.opportunityCount,
                    run_at: new Date().toISOString(),
                  },
                  keywordShortlist: null,
                });
                // Refetch snapshots so past runs list includes this run
                adminFetch("/api/aso/snapshots?list=1")
                  .then((r) => r.json())
                  .then((d) => {
                    if (Array.isArray(d.past_runs)) setPastRuns(d.past_runs);
                  })
                  .catch(() => {});
              }
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

  const stepLabel = (step) => {
    if (step === "store_listings") return "Store listing";
    if (step === "dataforseo_suggestions") return "DataForSEO suggestions";
    if (step === "app_rankings") return "App rankings (DataForSEO App Data)";
    if (step === "claude_filter") return "Claude filter";
    if (step === "opportunity_scoring") return "Opportunity scoring";
    return step.replace(/_/g, " ");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/dashboard/admin"
        className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Admin
      </Link>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Smartphone className="w-6 h-6 text-white/70" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">ASO Command Center</h1>
          <p className="text-white/50 text-sm">
            App Store Optimization: keyword discovery, filtering, and opportunity scoring for Apple App Store and Google Play
          </p>
        </div>
      </div>

      {integrations != null && (
        <section className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
          <h2 className="text-sm font-semibold text-white/80 mb-3">Connection status</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <li className="flex items-center gap-2">
              {integrations.appStoreConnect ? <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <X className="w-4 h-4 text-amber-400 flex-shrink-0" />}
              <span className={integrations.appStoreConnect ? "text-white/80" : "text-white/60"}>App Store Connect</span>
              {!integrations.appStoreConnect && integrations.appStoreConnectError && (
                <span className="text-white/50 text-xs truncate" title={integrations.appStoreConnectError}>{String(integrations.appStoreConnectError).slice(0, 35)}…</span>
              )}
            </li>
            <li className="flex items-center gap-2">
              {integrations.googlePlay ? <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <X className="w-4 h-4 text-amber-400 flex-shrink-0" />}
              <span className={integrations.googlePlay ? "text-white/80" : "text-white/60"}>Google Play</span>
              {!integrations.googlePlay && integrations.googlePlayError && (
                <span className="text-white/50 text-xs truncate" title={integrations.googlePlayError}>{String(integrations.googlePlayError).slice(0, 35)}…</span>
              )}
            </li>
            <li className="flex items-center gap-2">
              {integrations.perplexity ? <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <X className="w-4 h-4 text-amber-400 flex-shrink-0" />}
              <span className={integrations.perplexity ? "text-white/80" : "text-white/60"}>Perplexity</span>
            </li>
            <li className="flex items-center gap-2">
              {integrations.dataforseo ? <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <X className="w-4 h-4 text-amber-400 flex-shrink-0" />}
              <span className={integrations.dataforseo ? "text-white/80" : "text-white/60"}>DataForSEO</span>
            </li>
            <li className="flex items-center gap-2">
              {integrations.anthropic ? <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <X className="w-4 h-4 text-amber-400 flex-shrink-0" />}
              <span className={integrations.anthropic ? "text-white/80" : "text-white/60"}>Claude (Anthropic)</span>
            </li>
          </ul>
          {integrations.appStoreConnectError && <p className="text-white/50 text-xs mt-2" title={integrations.appStoreConnectError}>App Store: {integrations.appStoreConnectError}</p>}
          {integrations.googlePlayError && <p className="text-white/50 text-xs mt-1" title={integrations.googlePlayError}>Google Play: {integrations.googlePlayError}</p>}
        </section>
      )}

      {integrations != null && (integrations.googlePlay || integrations.appStoreConnect) && storeListings == null && storeListingsLoading && (
        <section className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-white/50" />
          <span className="text-white/60 text-sm">Loading store listing…</span>
        </section>
      )}

      {storeListings != null && (storeListings.googlePlay?.ok || storeListings.appStore?.ok) && (
        <section className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-sm font-semibold text-white/80">Current store listing</h2>
            <button
              type="button"
              onClick={refreshStoreListings}
              disabled={storeListingsLoading || (!integrations?.googlePlay && !integrations?.appStoreConnect)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 text-white/80 text-xs font-medium hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {storeListingsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {storeListings.googlePlay?.ok && storeListings.googlePlay.data && (
              <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                <h3 className="text-xs font-semibold text-emerald-400/90 uppercase tracking-wider mb-2">Google Play</h3>
                <p className="text-white/50 text-xs mb-2">{storeListings.googlePlay.data.packageName}</p>
                {(() => {
                  const list = storeListings.googlePlay.data.listings || [];
                  const en = list.find((l) => l.language === "en-US" || l.language === "en") || list[0];
                  if (!en) return <p className="text-white/50 text-sm">No listing data</p>;
                  return (
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-white/50 text-xs">Title</span>
                        <p className="text-white/90">{en.title || "—"}</p>
                      </div>
                      <div>
                        <span className="text-white/50 text-xs">Short description</span>
                        <p className="text-white/80 whitespace-pre-wrap">{en.shortDescription || "—"}</p>
                      </div>
                      <div>
                        <span className="text-white/50 text-xs">Full description</span>
                        <p className="text-white/70 text-xs max-h-32 overflow-y-auto whitespace-pre-wrap">{en.fullDescription || "—"}</p>
                      </div>
                      {list.length > 1 && <p className="text-white/40 text-xs">+{list.length - 1} other locale(s)</p>}
                    </div>
                  );
                })()}
              </div>
            )}
            {storeListings.appStore?.ok && storeListings.appStore.data && (
              <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                <h3 className="text-xs font-semibold text-emerald-400/90 uppercase tracking-wider mb-2">App Store</h3>
                <p className="text-white/50 text-xs mb-2">App ID: {storeListings.appStore.data.appId}</p>
                {storeListings.appStore.data.appName && (
                  <div className="mb-2">
                    <span className="text-white/50 text-xs">App name</span>
                    <p className="text-white/90 font-medium">{storeListings.appStore.data.appName}</p>
                  </div>
                )}
                {(() => {
                  const locs = storeListings.appStore.data.localizations || [];
                  const en = locs.find((l) => l.locale === "en-US" || l.locale === "en") || locs[0];
                  if (!en) return <p className="text-white/50 text-sm">No localization data</p>;
                  return (
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-white/50 text-xs">Subtitle</span>
                        <p className="text-white/90">{en.subtitle ? en.subtitle : "— (not set in App Store Connect)"}</p>
                      </div>
                      {en.promotionalText && (
                        <div>
                          <span className="text-white/50 text-xs">Promotional text</span>
                          <p className="text-white/80 text-xs">{en.promotionalText}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-white/50 text-xs">Keywords</span>
                        <p className="text-white/80">{en.keywords || "—"}</p>
                      </div>
                      <div>
                        <span className="text-white/50 text-xs">Description</span>
                        <p className="text-white/70 text-xs max-h-32 overflow-y-auto whitespace-pre-wrap">{en.description || "—"}</p>
                      </div>
                      {locs.length > 1 && <p className="text-white/40 text-xs">+{locs.length - 1} other locale(s)</p>}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </section>
      )}

      <div className="space-y-6">
        {lastRun?.opportunityMapping && !pipelineResult && (
          <section className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-1">Last run</h2>
            <p className="text-white/50 text-sm mb-4">
              {lastRun.opportunityMapping.run_at
                ? new Date(lastRun.opportunityMapping.run_at).toLocaleString()
                : "Saved run"}
              {" · "}
              <strong className="text-white/70">{lastRun.opportunityMapping.opportunityCount ?? lastRun.opportunityMapping.opportunities?.length ?? 0}</strong> opportunities
            </p>
            {lastRun.opportunityMapping.opportunities?.length > 0 && (
              <div className="overflow-x-auto rounded border border-white/10">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="px-2 py-1.5 text-left text-white/70">Keyword</th>
                      <th className="px-2 py-1.5 text-left text-white/70">Android</th>
                      <th className="px-2 py-1.5 text-left text-white/70">iOS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(lastRun.opportunityMapping.opportunities.filter((o) => o.opportunity).slice(0, 15) || []).map((o, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="px-2 py-1.5 text-white/90 align-top whitespace-nowrap">{o.keyword}</td>
                        <td className="px-2 py-1.5 align-top min-w-[200px] max-w-[320px]">
                          <span className={o.priorityAndroid === "high" ? "text-amber-400" : o.priorityAndroid === "medium" ? "text-sky-400" : "text-white/50"}>
                            {o.placementAndroid || "—"}
                          </span>
                          <p className="text-white/60 mt-0.5 break-words whitespace-normal">{o.noteAndroid ?? "—"}</p>
                        </td>
                        <td className="px-2 py-1.5 align-top min-w-[200px] max-w-[320px]">
                          <span className={o.priorityIos === "high" ? "text-amber-400" : o.priorityIos === "medium" ? "text-sky-400" : "text-white/50"}>
                            {o.placementIos || "—"}
                          </span>
                          <p className="text-white/60 mt-0.5 break-words whitespace-normal">{o.noteIos ?? "—"}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-white/40 text-xs mt-2">Run the pipeline again to refresh.</p>
          </section>
        )}

        <section className="p-4 rounded-xl bg-white/5 border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-3">Past analysis results</h2>
          {snapshotsLoading ? (
            <p className="text-white/50 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading history…
            </p>
          ) : pastRuns.length === 0 ? (
            <p className="text-white/50 text-sm">No past runs yet. Run the pipeline above to see analysis history here.</p>
          ) : (
            <>
              <p className="text-white/50 text-sm mb-4">Click a run to expand and see opportunities.</p>
              <ul className="space-y-2">
                {pastRuns.map((run) => {
                  const runDate = run.run_at ? new Date(run.run_at) : (run.created_at ? new Date(run.created_at) : null);
                  const dateStr = runDate ? runDate.toLocaleString() : "—";
                  const count = run.opportunityCount ?? run.opportunities?.filter((o) => o.opportunity).length ?? run.opportunities?.length ?? 0;
                  const isExpanded = expandedRunId === run.id;
                  const opportunities = run.opportunities || [];
                  const topOpps = opportunities.filter((o) => o.opportunity).slice(0, 15);
                  return (
                    <li key={run.id} className="rounded-lg border border-white/10 bg-black/20 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                        className="w-full flex items-center justify-between gap-4 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
                      >
                        <span className="text-white/90 text-sm">{dateStr}</span>
                        <span className="text-white/50 text-sm">{count} opportunities</span>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-white/50" /> : <ChevronRight className="w-4 h-4 text-white/50" />}
                      </button>
                      {isExpanded && topOpps.length > 0 && (
                        <div className="border-t border-white/10 p-3">
                          <div className="overflow-x-auto rounded border border-white/10">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                  <th className="px-2 py-1.5 text-left text-white/70">Keyword</th>
                                  <th className="px-2 py-1.5 text-left text-white/70">Android</th>
                                  <th className="px-2 py-1.5 text-left text-white/70">iOS</th>
                                </tr>
                              </thead>
                              <tbody>
                                {topOpps.map((o, i) => (
                                  <tr key={i} className="border-b border-white/5">
                                    <td className="px-2 py-1.5 text-white/90 align-top whitespace-nowrap">{o.keyword}</td>
                                    <td className="px-2 py-1.5 align-top min-w-[200px] max-w-[320px]">
                                      <span className={o.priorityAndroid === "high" ? "text-amber-400" : o.priorityAndroid === "medium" ? "text-sky-400" : "text-white/50"}>{o.placementAndroid || "—"}</span>
                                      <p className="text-white/60 mt-0.5 break-words whitespace-normal">{o.noteAndroid ?? "—"}</p>
                                    </td>
                                    <td className="px-2 py-1.5 align-top min-w-[200px] max-w-[320px]">
                                      <span className={o.priorityIos === "high" ? "text-amber-400" : o.priorityIos === "medium" ? "text-sky-400" : "text-white/50"}>{o.placementIos || "—"}</span>
                                      <p className="text-white/60 mt-0.5 break-words whitespace-normal">{o.noteIos ?? "—"}</p>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        {metadataDrafts && (metadataDrafts.android || metadataDrafts.ios) && (
          <section className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-white">Metadata drafts</h2>
              <button
                type="button"
                onClick={handleGenerateDrafts}
                disabled={metadataDraftsLoading || !((lastRun?.opportunityMapping?.opportunities?.length ?? 0) > 0 || pastRuns.some((r) => (r.opportunities?.length ?? 0) > 0))}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 text-white/90 text-sm font-medium hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {metadataDraftsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Regenerate
              </button>
            </div>
            {metadataDrafts.run_at && (
              <p className="text-white/50 text-xs mb-3">Generated {new Date(metadataDrafts.run_at).toLocaleString()}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {metadataDrafts.android && (
                <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                  <h3 className="text-emerald-400/90 text-xs font-semibold uppercase mb-2">Google Play</h3>
                  <p><span className="text-white/50">Title (30):</span> <span className="text-white/90">{metadataDrafts.android.title || "—"}</span></p>
                  <p className="mt-1"><span className="text-white/50">Short (80):</span> <span className="text-white/80 break-words">{metadataDrafts.android.shortDescription || "—"}</span></p>
                </div>
              )}
              {metadataDrafts.ios && (
                <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                  <h3 className="text-emerald-400/90 text-xs font-semibold uppercase mb-2">App Store</h3>
                  <p><span className="text-white/50">Subtitle (30):</span> <span className="text-white/90">{metadataDrafts.ios.subtitle || "—"}</span></p>
                  <p className="mt-1"><span className="text-white/50">Keywords (100):</span> <span className="text-white/80 break-words">{metadataDrafts.ios.keywords || "—"}</span></p>
                </div>
              )}
            </div>
            <p className="text-white/40 text-xs mt-2">Copy into your store listing. Run pipeline first to use latest opportunities.</p>
            {metadataDraftsError && <p className="text-amber-400/90 text-sm mt-2">{metadataDraftsError}</p>}
          </section>
        )}

        {(!metadataDrafts || (!metadataDrafts.android && !metadataDrafts.ios)) && (
          <section className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-1">Metadata drafts</h2>
            <p className="text-white/50 text-sm mb-3">Generate suggested title, subtitle, and keywords from your top opportunities (Claude). Run the ASO pipeline first.</p>
            <button
              type="button"
              onClick={handleGenerateDrafts}
              disabled={metadataDraftsLoading || !((lastRun?.opportunityMapping?.opportunities?.length ?? 0) > 0 || pastRuns.some((r) => (r.opportunities?.length ?? 0) > 0))}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-white/90 text-sm font-medium hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!lastRun?.opportunityMapping?.opportunities?.length && !pastRuns.some((r) => (r.opportunities?.length ?? 0) > 0) ? "Run the ASO pipeline first to get opportunities" : undefined}
            >
              {metadataDraftsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Generate drafts
            </button>
            {metadataDraftsError && <p className="text-amber-400/90 text-sm mt-2">{metadataDraftsError}</p>}
          </section>
        )}

        <section className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Run ASO pipeline</h2>
              <p className="text-white/50 text-sm">
                Store listing → (optional Perplexity/DataForSEO expansion) → Claude filter (&lt;200 terms) → optional App Data rankings → Listing + rank opportunity scoring. Keywords are derived from your store listing when none are entered.
              </p>
            </div>
            <button
              onClick={handleRunPipeline}
              disabled={pipelineLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {pipelineLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {pipelineLoading ? "Running…" : "Run"}
            </button>
          </div>
          <label className="block text-white/70 text-sm mb-2">Optional: add or override keywords (one per line or comma-separated). If empty, keywords are derived from your store listing.</label>
          <textarea
            value={keywordsInput}
            onChange={(e) => setKeywordsInput(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white placeholder-white/30 focus:border-accent/50 focus:ring-1 focus:ring-accent/30 outline-none resize-y"
            placeholder="Leave empty to use keywords from your store listing…"
          />
          <div className="flex flex-wrap gap-6 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={usePerplexitySeeds}
                onChange={(e) => setUsePerplexitySeeds(e.target.checked)}
                className="rounded border-white/30 bg-black/30 text-accent focus:ring-accent/50"
              />
              <span className="text-white/70 text-sm">Discover keywords with Perplexity first</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useDataForSeoSuggestions}
                onChange={(e) => setUseDataForSeoSuggestions(e.target.checked)}
                className="rounded border-white/30 bg-black/30 text-accent focus:ring-accent/50"
              />
              <span className="text-white/70 text-sm">Expand with DataForSEO suggestions</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useClaudeFilter}
                onChange={(e) => setUseClaudeFilter(e.target.checked)}
                className="rounded border-white/30 bg-black/30 text-accent focus:ring-accent/50"
              />
              <span className="text-white/70 text-sm">Filter with Claude (&lt;200 terms)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer" title="Use DataForSEO App Data API to get app store SERP rank per keyword (costs per request).">
              <input
                type="checkbox"
                checked={useAppRankings}
                onChange={(e) => setUseAppRankings(e.target.checked)}
                className="rounded border-white/30 bg-black/30 text-accent focus:ring-accent/50"
              />
              <span className="text-white/70 text-sm">DataForSEO App Data (rankings)</span>
            </label>
          </div>
          {pipelineError && <p className="text-amber-400/90 text-sm mt-3">{pipelineError}</p>}
          {pipelineLoading && pipelineProgress.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-black/20 border border-white/10 text-sm">
              <p className="text-white/70 font-medium mb-2">Pipeline progress</p>
              <ul className="space-y-1.5">
                {pipelineProgress.map((p, i) => (
                  <li key={i} className="flex items-center gap-2 text-white/80">
                    {p.status === "running" && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0 text-accent" />}
                    {p.status === "done" && <span className="text-emerald-400 flex-shrink-0">✓</span>}
                    {p.status === "skip" && <span className="text-white/40 flex-shrink-0">−</span>}
                    <span className="capitalize">{stepLabel(p.step)}</span>
                    <span className="text-white/50">—</span>
                    <span className="text-white/60">{p.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {pipelineResult && (
            <div className="mt-4 space-y-4">
              <div className="p-3 rounded-lg bg-black/20 border border-white/10 text-sm">
                <p className="text-white/80 mb-2">{pipelineResult.message}</p>
                <ul className="text-white/60 space-y-1">
                  {pipelineResult.steps?.store_listings != null && (
                    <li>
                      Store listing:{" "}
                      {pipelineResult.steps.store_listings.ok
                        ? "✓ (Google Play + App Store used as baseline)"
                        : `− ${pipelineResult.steps.store_listings.error || "Not configured"}`}
                    </li>
                  )}
                  {pipelineResult.steps?.perplexity != null && (
                    <li>
                      Perplexity:{" "}
                      {pipelineResult.steps.perplexity.ok
                        ? `✓ (${pipelineResult.steps.perplexity.discovered ?? 0} keywords)`
                        : `✗ ${pipelineResult.steps.perplexity.error || ""}`}
                    </li>
                  )}
                  {pipelineResult.steps?.dataforseo_suggestions != null && !pipelineResult.steps.dataforseo_suggestions.skip && (
                    <li>
                      DataForSEO suggestions:{" "}
                      {pipelineResult.steps.dataforseo_suggestions.ok
                        ? `✓ (+${pipelineResult.steps.dataforseo_suggestions.added ?? 0}, ${pipelineResult.steps.dataforseo_suggestions.totalKeywords ?? 0} total)`
                        : "−"}
                    </li>
                  )}
                  {pipelineResult.steps?.overview != null && (
                    <li>Overview: {pipelineResult.steps.overview.ok ? "✓" : "−"} {pipelineResult.steps.overview.message}</li>
                  )}
                  {pipelineResult.steps?.claude_filter != null && !pipelineResult.steps.claude_filter.skip && (
                    <li>
                      Claude filter:{" "}
                      {pipelineResult.steps.claude_filter.ok
                        ? `✓ ${pipelineResult.steps.claude_filter.before} → ${pipelineResult.steps.claude_filter.after}`
                        : `✗ ${pipelineResult.steps.claude_filter.error || ""}`}
                    </li>
                  )}
                  {pipelineResult.steps?.app_rankings != null && !pipelineResult.steps.app_rankings.skip && (
                    <li>
                      App rankings (DataForSEO App Data):{" "}
                      {pipelineResult.steps.app_rankings.ok
                        ? `✓ ${pipelineResult.steps.app_rankings.keywordsChecked ?? 0} keywords checked`
                        : `✗ ${pipelineResult.steps.app_rankings.error || ""}`}
                    </li>
                  )}
                  {pipelineResult.steps?.opportunity_scoring != null && (
                    <li>Opportunity scoring: {pipelineResult.steps.opportunity_scoring.ok ? `✓ ${pipelineResult.steps.opportunity_scoring.opportunityCount ?? pipelineResult.steps.opportunity_scoring.count} opportunities` : "✗"}</li>
                  )}
                </ul>
              </div>
              {pipelineResult.analysis && (
                <div className="p-4 rounded-lg bg-black/20 border border-white/10 text-sm">
                  <h3 className="text-white font-medium mb-3">Opportunities</h3>
                  <p className="text-white/70 mb-3">
                    <strong className="text-white">{pipelineResult.analysis.opportunityCount}</strong> opportunities
                    (of {pipelineResult.analysis.totalKeywords} keywords). Analysis is based on current store listing when configured.
                  </p>
                  {pipelineResult.analysis.topOpportunities?.length > 0 && (
                    <div className="overflow-x-auto rounded border border-white/10">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/5">
                            <th className="px-2 py-1.5 text-left text-white/70">Keyword</th>
                            <th className="px-2 py-1.5 text-left text-white/70">Android</th>
                            <th className="px-2 py-1.5 text-left text-white/70">iOS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pipelineResult.analysis.topOpportunities.map((o, i) => (
                            <tr key={i} className="border-b border-white/5">
                              <td className="px-2 py-1.5 text-white/90 align-top whitespace-nowrap">{o.keyword}</td>
                              <td className="px-2 py-1.5 align-top min-w-[200px] max-w-[320px]">
                                <span className={o.priorityAndroid === "high" ? "text-amber-400" : o.priorityAndroid === "medium" ? "text-sky-400" : "text-white/50"}>
                                  {o.placementAndroid || "—"}
                                </span>
                                <p className="text-white/60 mt-0.5 break-words whitespace-normal">{o.noteAndroid ?? "—"}</p>
                              </td>
                              <td className="px-2 py-1.5 align-top min-w-[200px] max-w-[320px]">
                                <span className={o.priorityIos === "high" ? "text-amber-400" : o.priorityIos === "medium" ? "text-sky-400" : "text-white/50"}>
                                  {o.placementIos || "—"}
                                </span>
                                <p className="text-white/60 mt-0.5 break-words whitespace-normal">{o.noteIos ?? "—"}</p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="text-white/40 text-xs mt-2">Analysis saved to Firestore (keyword_shortlist, opportunity_mapping).</p>
                </div>
              )}
            </div>
          )}
        </section>

        <p className="text-white/40 text-xs">
          Analysis uses <strong className="text-white/60">current store listing</strong> (Google Play + App Store Connect) as baseline when ANDROID_PACKAGE_NAME and/or APPSTORE_APP_ID / APPSTORE_BUNDLE_ID are set. Enable &quot;DataForSEO App Data (rankings)&quot; when running the pipeline to include app store SERP rank per keyword (listing + rank opportunities).
        </p>
      </div>
    </div>
  );
}
