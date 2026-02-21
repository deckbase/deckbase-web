"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Play, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  createAnalysisSession,
  deleteAnalysisSession,
  getSpeechPeople,
  getSpeechPersonDocs,
  removeSpeechPersonSource,
  subscribeToAnalysisSession,
  subscribeToAnalysisSessions,
  updateAnalysisSession,
} from "@/utils/firestore";

const TOP_VOCAB = 10;
const TOP_LEARNING = 5;
const TOP_PATTERN = 5;
const TOP_SIGNATURE = 5;

const PATTERN_KIND_LABELS = {
  VPO: "Verb + Prep + Object",
  phrasal: "Phrasal Verb",
  VO: "Verb + Object",
  adjn: "Adj + Noun",
  nn: "Noun + Noun",
};

const formatNumber = (v) =>
  v !== undefined && v !== null && Number.isFinite(Number(v))
    ? Number(v).toLocaleString()
    : "-";

const formatSessionCreatedAt = (createdAt) => {
  if (!createdAt) return null;
  const date = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
};

export default function AdminSpeechPersonOverviewPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const personId = params?.personId ?? "";

  const [people, setPeople] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [removingDocId, setRemovingDocId] = useState(null);
  const [removeError, setRemoveError] = useState(null);
  const [startingNew, setStartingNew] = useState(false);
  const [session, setSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const [sessionError, setSessionError] = useState(null);

  useEffect(() => {
    if (!user || !personId) return;
    let isMounted = true;
    setLoadingPeople(true);
    getSpeechPeople()
      .then((list) => {
        if (!isMounted) return;
        setPeople(list);
        setLoadingPeople(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setPeople([]);
        setLoadingPeople(false);
      });
    return () => { isMounted = false; };
  }, [user, personId]);

  // Single source of truth: analysis_sessions. Overview words/phrases come from the session doc only.
  useEffect(() => {
    if (!personId) return;
    setAnalysis(null);
    setAnalysisLoading(true);
    const unsub = subscribeToAnalysisSession(personId, (data) => {
      setSession(data);
      setAnalysis(data);
      setAnalysisLoading(false);
    });
    return () => unsub?.();
  }, [personId]);

  useEffect(() => {
    if (!personId) return;
    const unsub = subscribeToAnalysisSessions(personId, (list) => setSessions(list));
    return () => unsub?.();
  }, [personId]);

  useEffect(() => {
    if (!personId || !session?.id || session?.status === "done") return;
    const progress = analysis?.progress;
    if (!progress || (progress.status !== "done" && progress.percent !== 100)) return;
    updateAnalysisSession(personId, session.id, { status: "done" }).catch(() => {});
  }, [personId, session?.id, session?.status, analysis?.progress?.status, analysis?.progress?.percent]);

  useEffect(() => {
    if (!personId) return;
    setLoadingDocs(true);
    getSpeechPersonDocs(personId)
      .then(setDocs)
      .catch(() => setDocs([]))
      .finally(() => setLoadingDocs(false));
  }, [personId]);

  const selectedPerson = useMemo(
    () => people.find((p) => p.personId === personId),
    [people, personId],
  );

  const doneSessionForLink = useMemo(
    () => sessions.find((s) => s.status === "done") ?? session,
    [sessions, session],
  );

  const topVocab = useMemo(
    () => (analysis?.vocabulary || []).slice(0, TOP_VOCAB),
    [analysis?.vocabulary],
  );
  const topLearning = useMemo(
    () => (analysis?.learningPhrases || []).slice(0, TOP_LEARNING),
    [analysis?.learningPhrases],
  );
  const topPattern = useMemo(
    () => (analysis?.patternPhrases || []).slice(0, TOP_PATTERN),
    [analysis?.patternPhrases],
  );
  const topSignature = useMemo(
    () => (analysis?.signaturePhrases || []).slice(0, TOP_SIGNATURE),
    [analysis?.signaturePhrases],
  );

  const hasAnalysis = Boolean(
    analysis?.vocabulary?.length ||
      analysis?.learningPhrases?.length ||
      analysis?.patternPhrases?.length ||
      analysis?.signaturePhrases?.length,
  );

  const handleRemoveSource = async (docId) => {
    const docItem = docs.find((d) => d.docId === docId);
    const label = docItem?.title || docItem?.sourceUrl || docId;
    if (!window.confirm(`Remove this source from analysis?\n\n"${label}"\n\nWord and phrase counts will be recomputed without it.`)) {
      return;
    }
    setRemoveError(null);
    setRemovingDocId(docId);
    try {
      await removeSpeechPersonSource(personId, docId);
      setDocs((prev) => prev.filter((d) => d.docId !== docId));
      const res = await fetch("/api/speech/trigger-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, sessionId: session?.id ?? undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRemoveError(data.error || "Failed to start re-analysis.");
      } else if (session?.id) {
        await updateAnalysisSession(personId, session.id, { status: "processing" });
      }
    } catch (e) {
      setRemoveError(e?.message || "Failed to remove source.");
    } finally {
      setRemovingDocId(null);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!sessionId || !personId) return;
    setSessionError(null);
    setDeletingSessionId(sessionId);
    try {
      await deleteAnalysisSession(personId, sessionId);
      // If we deleted the session currently driving the overview, clear it so
      // "Most frequently used words and phrases" updates immediately.
      if (sessionId === session?.id) {
        setSession(null);
        setAnalysis(null);
      }
    } catch (e) {
      console.error("Failed to delete session:", e);
      setSessionError(e?.message || "Failed to delete session.");
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleStartNewAnalysis = async () => {
    setStartingNew(true);
    try {
      const newSessionId = await createAnalysisSession(personId);
      const detailUrl = `/dashboard/admin/speech/${personId}/detail?sessionId=${newSessionId}`;
      console.log("[speech] Start new analysis: created sessionId:", newSessionId, "navigating to:", detailUrl);
      router.push(detailUrl);
    } catch (e) {
      console.error("Failed to start new analysis session:", e);
      setStartingNew(false);
    }
  };

  if (!personId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/dashboard/admin/speech" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Speech Analysis
        </Link>
        <p className="text-white/50">No speaker specified.</p>
      </div>
    );
  }

  if (loadingPeople) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/dashboard/admin/speech" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Speech Analysis
        </Link>
        <p className="text-white/50">Loading…</p>
      </div>
    );
  }

  if (!selectedPerson) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/dashboard/admin/speech" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Speech Analysis
        </Link>
        <p className="text-white/50">Speaker not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link
          href="/dashboard/admin/speech"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Speech Analysis
        </Link>
        <button
          type="button"
          onClick={handleStartNewAnalysis}
          disabled={startingNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4" />
          {startingNew ? "Starting…" : "Start new analysis"}
        </button>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center">
          {selectedPerson.imageUrl ? (
            <img
              src={selectedPerson.imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white/70 text-xl font-medium">
              {(selectedPerson.displayName || "?")[0].toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">
            {selectedPerson.displayName || personId}
          </h1>
          <p className="text-white/50">
            Overview of top words and phrases · {formatNumber(docs.length)} source{docs.length !== 1 ? "s" : ""} used for analysis
          </p>
        </div>
      </div>

      {sessionError && (
        <p className="text-red-400 text-sm mb-4">{sessionError}</p>
      )}
      {sessions.filter((s) => s.status !== "done").length > 0 && (
        <section className="space-y-4 mb-6">
          {sessions
            .filter((s) => s.status !== "done")
            .map((s) => (
              <div
                key={s.id}
                className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h2 className="text-lg font-semibold text-amber-200">
                    Draft — analysis not complete
                  </h2>
                  {formatSessionCreatedAt(s.createdAt) && (
                    <span className="text-white/40 text-sm tabular-nums">
                      {formatSessionCreatedAt(s.createdAt)}
                    </span>
                  )}
                </div>
                <p className="text-white/60 text-sm mb-3">
                  {s.status === "draft"
                    ? "Get a transcript and run analysis to see results here."
                    : "Analysis is running. Results will appear when the pipeline finishes."}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/dashboard/admin/speech/${personId}/detail?sessionId=${s.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 text-sm font-medium transition-colors"
                  >
                    {s.status === "draft" ? "Continue to analysis" : "View progress"}
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDeleteSession(s.id)}
                    disabled={deletingSessionId === s.id}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white/60 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 text-sm font-medium transition-colors disabled:opacity-50"
                    title="Delete session"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete session
                  </button>
                </div>
              </div>
            ))}
        </section>
      )}

      {/* Overview: top words and phrases */}
      <section className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Most frequently used words and phrases
        </h2>
        {analysisLoading ? (
          <p className="text-white/50 text-sm">Loading analysis…</p>
        ) : !hasAnalysis ? (
          <p className="text-white/50 text-sm">
            No analysis yet. Add transcripts and run analysis from the full
            analysis page.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-white/70 text-sm font-medium uppercase tracking-wide mb-2">
                Top vocabulary
              </h3>
              <ul className="space-y-1">
                {topVocab.map((item, i) => (
                  <li key={i} className="flex justify-between gap-2 text-sm">
                    <span className="text-white truncate">{item.t}</span>
                    <span className="text-white/50 flex-shrink-0">
                      {formatNumber(item.c)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-white/70 text-sm font-medium uppercase tracking-wide mb-2">
                Learning phrases
              </h3>
              <ul className="space-y-1">
                {topLearning.map((item, i) => (
                  <li key={i} className="flex justify-between gap-2 text-sm">
                    <span className="text-white truncate">{item.t}</span>
                    <span className="text-white/50 flex-shrink-0">
                      {formatNumber(item.c)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-white/70 text-sm font-medium uppercase tracking-wide mb-2">
                Pattern phrases
              </h3>
              <ul className="space-y-1">
                {topPattern.map((item, i) => (
                  <li key={i} className="flex justify-between gap-2 text-sm">
                    <span className="text-white truncate">{item.t}</span>
                    <span className="text-white/50 flex-shrink-0">
                      {PATTERN_KIND_LABELS[item.kind] || item.kind} · {formatNumber(item.c)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-white/70 text-sm font-medium uppercase tracking-wide mb-2">
                Signature phrases
              </h3>
              <ul className="space-y-1">
                {topSignature.map((item, i) => (
                  <li key={i} className="flex justify-between gap-2 text-sm">
                    <span className="text-white truncate">{item.t}</span>
                    <span className="text-white/50 flex-shrink-0">
                      {formatNumber(item.c)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* Sources / YouTube links */}
      <section className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">
          Sources used for analysis
          <span className="text-white/50 font-normal ml-2">
            ({formatNumber(docs.length)})
          </span>
        </h2>
        {loadingDocs ? (
          <p className="text-white/50 text-sm">Loading sources…</p>
        ) : docs.length === 0 ? (
          <p className="text-white/50 text-sm">
            No transcripts yet. Add transcripts from the full analysis page.
          </p>
        ) : (
          <>
            {removeError && (
              <p className="text-red-400 text-sm mb-3">{removeError}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {docs.map((docItem) => (
                <div
                  key={docItem.docId}
                  className="relative group p-4 rounded-xl border border-white/10 bg-black/20 hover:border-accent/50 hover:bg-accent/10 transition-colors text-left"
                >
                  <Link
                    href={`/dashboard/admin/speech/${personId}/detail${docItem.sourceUrl?.trim() || doneSessionForLink?.id ? `?${[docItem.sourceUrl?.trim() && `sourceUrl=${encodeURIComponent(docItem.sourceUrl.trim())}`, doneSessionForLink?.id && `sessionId=${doneSessionForLink.id}`].filter(Boolean).join("&")}` : ""}`}
                    className="block pr-10"
                  >
                    <p className="text-white font-medium truncate">
                      {docItem.title || "Untitled transcript"}
                    </p>
                    {docItem.sourceUrl ? (
                      <p className="text-accent text-sm mt-1 truncate flex items-center gap-1">
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        {docItem.sourceUrl.replace(/^https?:\/\/(www\.)?/, "")}
                      </p>
                    ) : (
                      <p className="text-white/40 text-sm mt-1">
                        {docItem.sourceType || "manual"} · {formatNumber(docItem.tokenCount)} words
                      </p>
                    )}
                    <p className="text-white/40 text-xs mt-2">
                      Tap to open full analysis
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleRemoveSource(docItem.docId);
                    }}
                    disabled={removingDocId === docItem.docId}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    title="Remove source and recompute counts"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {removingDocId === docItem.docId && (
                    <span className="absolute bottom-3 right-3 text-white/50 text-xs">
                      Removing…
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
