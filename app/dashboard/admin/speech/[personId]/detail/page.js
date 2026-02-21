"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Mic } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  clearSpeechAnalysis,
  createAnalysisSession,
  getSpeechPeople,
  deleteSessionTranscript,
  saveTranscriptToSession,
  updateSessionTranscriptSpeaker,
  subscribeToSessionTranscripts,
  subscribeToAnalysisSession,
  subscribeToAnalysisSessionById,
  uploadSpeechTranscript,
  updateAnalysisSession,
} from "@/utils/firestore";

const SECTION_LIMIT = 20;

const PATTERN_KIND_LABELS = {
  VPO: "Verb + Prep + Object",
  phrasal: "Phrasal Verb",
  VO: "Verb + Object",
  adjn: "Adj + Noun",
  nn: "Noun + Noun",
};

const STATUS_STYLES = {
  processing: "bg-blue-500/10 text-blue-200 border-blue-500/30",
  done: "bg-green-500/10 text-green-200 border-green-500/30",
  failed: "bg-red-500/10 text-red-200 border-red-500/30",
  idle: "bg-white/10 text-white/60 border-white/20",
};

const formatNumber = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric.toLocaleString();
  return String(value);
};

const formatPatternKind = (kind) =>
  PATTERN_KIND_LABELS[kind] || kind || "Pattern";

const getItemKey = (type, item) =>
  `${type}-${item?.t || "item"}-${item?.kind || ""}`;

function getLineText(line) {
  return line?.text ?? line?.content ?? "";
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PLACEHOLDER_WORD = "(?:\\S+(?:\\s+\\S+)*?)";
const PLACEHOLDER_NUM = "(?:\\d+(?:\\.\\d+)?)";
const WORD_INFLECTIONS = "(?:s|ed|ing|er)?";

function wordPattern(seg) {
  if (!/\w+/.test(seg)) return null;
  const escaped = escapeRegex(seg);
  if (seg.length > 1 && seg.toLowerCase().endsWith("e")) {
    const stem = seg.slice(0, -1);
    const stemEscaped = escapeRegex(stem);
    return `\\b(?:${escaped}(?:s|er)?|${stemEscaped}(?:ed|ing))\\b`;
  }
  return "\\b" + escaped + WORD_INFLECTIONS + "\\b";
}

const OPTIONAL_ARTICLE = "(?:(?:the|a|an)\\s+)*?";

function literalWithWordForms(literal) {
  const segments = literal.split(/(\W+)/);
  let out = "";
  for (const seg of segments) {
    const wp = wordPattern(seg);
    if (wp) {
      out += wp;
    } else if (/^\s+$/.test(seg)) {
      out += "\\s+" + OPTIONAL_ARTICLE;
    } else {
      out += escapeRegex(seg);
    }
  }
  return out;
}

const MAX_PHRASE_HIGHLIGHT_LENGTH = 120;

function termToHighlightRegex(term) {
  const t = term.trim();
  if (!t || t.length > MAX_PHRASE_HIGHLIGHT_LENGTH) return null;
  const parts = t.split(/\b(SB|STH|NUM)\b/);
  let pattern = "";
  for (const part of parts) {
    if (part === "SB" || part === "STH") {
      pattern += PLACEHOLDER_WORD;
    } else if (part === "NUM") {
      pattern += PLACEHOLDER_NUM;
    } else {
      pattern += literalWithWordForms(part);
    }
  }
  return pattern;
}

const MAX_HIGHLIGHT_MATCH_LENGTH = 200;

function highlightInText(text, term, lineIndex) {
  if (!text || !term?.trim()) return text;
  const pattern = termToHighlightRegex(term);
  if (!pattern) return text;
  let re;
  try {
    re = new RegExp(`(${pattern})`, "gi");
  } catch {
    return text;
  }
  const parts = [];
  let lastIndex = 0;
  let match;
  let idx = 0;
  const baseKey = `h-${lineIndex ?? 0}`;
  while ((match = re.exec(text)) !== null) {
    const matchLen = match[0].length;
    if (matchLen <= MAX_HIGHLIGHT_MATCH_LENGTH) {
      parts.push(
        <span key={`${baseKey}-${idx}`}>{text.slice(lastIndex, match.index)}</span>,
        <mark
          key={`${baseKey}-${idx}-m`}
          className="bg-amber-400 text-amber-950 rounded px-0.5 font-medium"
        >
          {match[0]}
        </mark>,
      );
      lastIndex = re.lastIndex;
      idx += 1;
    }
  }
  parts.push(<span key={`${baseKey}-${idx}-tail`}>{text.slice(lastIndex)}</span>);
  return parts.length > 1 ? parts : text;
}

function getFallbackSurfaces(term) {
  if (!term || typeof term !== "string") return [];
  const t = term.trim().toLowerCase();
  if (t.length > 80) return [];
  const out = new Set([t]);
  if (/^go to (.+)$/.test(t)) {
    const rest = t.replace(/^go to /, "");
    out.add(`goes to ${rest}`);
    out.add(`going to ${rest}`);
    out.add(`went to ${rest}`);
    out.add(`go to the ${rest}`);
    out.add(`goes to the ${rest}`);
    out.add(`going to the ${rest}`);
    out.add(`went to the ${rest}`);
  }
  if (/^look at (.+)$/.test(t)) {
    const rest = t.replace(/^look at /, "");
    out.add(`looks at ${rest}`);
    out.add(`looking at ${rest}`);
    out.add(`looked at ${rest}`);
    out.add(`look at the ${rest}`);
    out.add(`looks at the ${rest}`);
  }
  return Array.from(out);
}

function highlightInTextBySurfaces(text, surfaces, lineIndex) {
  if (!text || !Array.isArray(surfaces) || surfaces.length === 0) return text;
  const ranges = [];
  const lower = text.toLowerCase();
  for (const s of surfaces) {
    const literal = String(s).trim();
    if (!literal) continue;
    const search = literal.toLowerCase();
    let pos = 0;
    while (pos < lower.length) {
      const i = lower.indexOf(search, pos);
      if (i === -1) break;
      ranges.push([i, i + literal.length]);
      pos = i + 1;
    }
  }
  if (ranges.length === 0) return text;
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of ranges) {
    if (merged.length && start <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], end);
    } else {
      merged.push([start, end]);
    }
  }
  const parts = [];
  let lastIndex = 0;
  const baseKey = `s-${lineIndex ?? 0}`;
  merged.forEach(([start, end], idx) => {
    parts.push(<span key={`${baseKey}-${idx}`}>{text.slice(lastIndex, start)}</span>);
    parts.push(
      <mark
        key={`${baseKey}-${idx}-m`}
        className="bg-amber-400 text-amber-950 rounded px-0.5 font-medium"
      >
        {text.slice(start, end)}
      </mark>,
    );
    lastIndex = end;
  });
  parts.push(<span key={`${baseKey}-tail`}>{text.slice(lastIndex)}</span>);
  return parts;
}

export default function AdminSpeechPersonPage() {
  const { user } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const personId = params?.personId ?? "";
  const urlSessionId = searchParams.get("sessionId") || null;

  const [people, setPeople] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [youtubeSpeakerCount, setYoutubeSpeakerCount] = useState(2);
  const [quickTranscriptUrl, setQuickTranscriptUrl] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return new URLSearchParams(window.location.search).get("sourceUrl") || "";
    } catch {
      return "";
    }
  });
  const [quickTranscriptResult, setQuickTranscriptResult] = useState(null);
  const [isLoadingQuickTranscript, setIsLoadingQuickTranscript] =
    useState(false);
  const [selectedSpeakerToAnalyze, setSelectedSpeakerToAnalyze] = useState("");
  const [isUploadingBySpeaker, setIsUploadingBySpeaker] = useState(false);
  const [savedYoutubeTranscripts, setSavedYoutubeTranscripts] = useState([]);
  const [loadingSavedTranscripts, setLoadingSavedTranscripts] = useState(false);
  const [deletingTranscriptId, setDeletingTranscriptId] = useState(null);
  const [currentSavedTranscriptId, setCurrentSavedTranscriptId] = useState(null);
  const [expanded, setExpanded] = useState({
    vocabulary: false,
    learning: false,
    patterns: false,
    signature: false,
  });
  const [notice, setNotice] = useState(null);
  const [highlightedTerm, setHighlightedTerm] = useState(null);
  const [highlightedSurfaces, setHighlightedSurfaces] = useState(null);
  const transcriptWithHighlightsRef = useRef(null);

  // Source of truth: analysis_sessions. All vocabulary/phrases/progress come from the session doc only.
  const analysis = session;
  const analysisLoading = sessionLoading;

  // Prefill YouTube URL when opening from a source link (overview page)
  useEffect(() => {
    const url =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("sourceUrl")
        : searchParams.get("sourceUrl");
    if (url && typeof url === "string") {
      setQuickTranscriptUrl(url);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    setLoadingPeople(true);
    getSpeechPeople()
      .then((list) => {
        if (!isMounted) return;
        setPeople(list);
        setLoadingPeople(false);
      })
      .catch((error) => {
        console.error("Error loading speakers:", error);
        if (!isMounted) return;
        setPeople([]);
        setLoadingPeople(false);
        setNotice({ type: "error", message: "Unable to load speakers." });
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!personId || !session?.id) {
      setSavedYoutubeTranscripts([]);
      setLoadingSavedTranscripts(false);
      return;
    }
    setLoadingSavedTranscripts(true);
    const unsub = subscribeToSessionTranscripts(personId, session.id, (list) => {
      setSavedYoutubeTranscripts(list);
      setLoadingSavedTranscripts(false);
    });
    return () => unsub?.();
  }, [personId, session?.id]);

  const sessionFetchedRef = useRef(false);
  const createdSessionWhenNullRef = useRef(false);
  const latestSessionRef = useRef(null);

  useEffect(() => {
    if (!personId) {
      setSession(null);
      setSessionLoading(false);
      return;
    }
    setSessionLoading(true);
    if (urlSessionId) {
      sessionFetchedRef.current = true;
      latestSessionRef.current = undefined;
      console.log("[speech-detail] subscribe by id:", { personId, urlSessionId });
      const unsub = subscribeToAnalysisSessionById(personId, urlSessionId, (data) => {
        latestSessionRef.current = data;
        console.log("[speech-detail] session update (by id):", {
          sessionId: data?.id,
          status: data?.status,
          progress: data?.progress ? { status: data.progress.status, percent: data.progress.percent } : null,
        });
        setSession(data);
        setSessionLoading(false);
      });
      return () => unsub?.();
    }
    console.log("[speech-detail] subscribe latest session:", { personId });
    const unsub = subscribeToAnalysisSession(personId, (data) => {
      sessionFetchedRef.current = true;
      latestSessionRef.current = data;
      console.log("[speech-detail] session update (latest):", {
        sessionId: data?.id,
        status: data?.status,
        progress: data?.progress ? { status: data.progress.status, percent: data.progress.percent } : null,
      });
      setSession(data);
      setSessionLoading(false);
    });
    return () => unsub?.();
  }, [personId, urlSessionId]);

  // Only create a session when none exists (and no sessionId in URL), after a short delay.
  useEffect(() => {
    if (!personId || urlSessionId) return;
    if (session !== null) {
      createdSessionWhenNullRef.current = false;
      return;
    }
    if (!sessionFetchedRef.current || createdSessionWhenNullRef.current) return;
    const timer = setTimeout(() => {
      if (createdSessionWhenNullRef.current) return;
      if (latestSessionRef.current !== null && latestSessionRef.current !== undefined) return;
      createdSessionWhenNullRef.current = true;
      createAnalysisSession(personId).catch(console.error);
    }, 400);
    return () => clearTimeout(timer);
  }, [personId, urlSessionId, session]);

  useEffect(() => {
    if (!personId || !session?.id || session?.status === "done") return;
    const { status, percent } = analysis?.progress || {};
    if (status !== "done" && percent !== 100) return;
    updateAnalysisSession(personId, session.id, { status: "done" }).catch(() => {});
  }, [personId, session?.id, session?.status, analysis?.progress?.status, analysis?.progress?.percent]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const distinctSpeakers = useMemo(() => {
    if (!quickTranscriptResult?.transcript?.length) return [];
    const seen = new Set();
    return quickTranscriptResult.transcript
      .map((line) => line.speaker)
      .filter((s) => s && !seen.has(s) && (seen.add(s), true));
  }, [quickTranscriptResult]);

  useEffect(() => {
    if (distinctSpeakers.length === 0) {
      setSelectedSpeakerToAnalyze("");
      return;
    }
    if (selectedSpeakerToAnalyze && !distinctSpeakers.includes(selectedSpeakerToAnalyze)) {
      setSelectedSpeakerToAnalyze("");
    }
    if (distinctSpeakers.length === 1 && !selectedSpeakerToAnalyze) {
      setSelectedSpeakerToAnalyze(distinctSpeakers[0]);
    }
  }, [distinctSpeakers, selectedSpeakerToAnalyze]);

  const selectedPerson = useMemo(
    () => people.find((person) => person.personId === personId),
    [people, personId],
  );
  const speakerLabelForSelectedPerson = useMemo(() => {
    return selectedSpeakerToAnalyze || null;
  }, [selectedSpeakerToAnalyze]);
  const transcriptLinesForSelectedSpeaker = useMemo(() => {
    if (session?.analysisTranscript?.transcriptLines?.length) {
      return session.analysisTranscript.transcriptLines;
    }
    if (!quickTranscriptResult?.transcript?.length || !speakerLabelForSelectedPerson)
      return [];
    return quickTranscriptResult.transcript.filter(
      (line) => line.speaker === speakerLabelForSelectedPerson,
    );
  }, [session?.analysisTranscript?.transcriptLines, quickTranscriptResult, speakerLabelForSelectedPerson]);

  const hasAnalysis = Boolean(
    analysis?.vocabulary?.length ||
      analysis?.learningPhrases?.length ||
      analysis?.patternPhrases?.length ||
      analysis?.signaturePhrases?.length,
  );
  const hasAutoRestoredRef = useRef(false);
  const hasRestoredDraftRef = useRef(false);

  useEffect(() => {
    if (!personId || session?.status !== "draft" || !session?.draftTranscriptId) return;
    if (loadingSavedTranscripts || savedYoutubeTranscripts.length === 0) return;
    if (hasRestoredDraftRef.current) return;
    const saved = savedYoutubeTranscripts.find(
      (s) => s.transcriptId === session.draftTranscriptId,
    );
    if (saved?.transcript?.length) {
      hasRestoredDraftRef.current = true;
      setCurrentSavedTranscriptId(saved.transcriptId || null);
      setQuickTranscriptUrl(saved.youtubeUrl || "");
      setQuickTranscriptResult({
        transcript: saved.transcript,
        fromDiarization: saved.fromDiarization ?? false,
        videoId: saved.videoId,
        speakerCount: saved.speakerCount,
      });
      if (
        saved.defaultSpeakerToAnalyze != null &&
        saved.defaultSpeakerToAnalyze !== ""
      ) {
        setSelectedSpeakerToAnalyze(String(saved.defaultSpeakerToAnalyze));
      }
    }
  }, [
    personId,
    session?.status,
    session?.draftTranscriptId,
    loadingSavedTranscripts,
    savedYoutubeTranscripts,
  ]);

  useEffect(() => {
    if (!personId) {
      hasAutoRestoredRef.current = false;
      hasRestoredDraftRef.current = false;
    }
  }, [personId]);

  useEffect(() => {
    if (!user?.uid || !personId || !hasAnalysis) return;
    if (quickTranscriptResult?.transcript?.length) return;
    if (loadingSavedTranscripts || savedYoutubeTranscripts.length === 0) return;
    if (hasAutoRestoredRef.current) return;
    hasAutoRestoredRef.current = true;
    const latest = savedYoutubeTranscripts[0];
    if (latest?.transcript?.length) {
      setQuickTranscriptUrl(latest.youtubeUrl || "");
      setQuickTranscriptResult({
        transcript: latest.transcript,
        fromDiarization: latest.fromDiarization ?? false,
        videoId: latest.videoId,
        speakerCount: latest.speakerCount,
      });
    }
  }, [user?.uid, personId, hasAnalysis, loadingSavedTranscripts, savedYoutubeTranscripts]);

  const vocabularyItems = useMemo(
    () => analysis?.vocabulary || [],
    [analysis?.vocabulary],
  );
  const learningItems = useMemo(
    () => analysis?.learningPhrases || [],
    [analysis?.learningPhrases],
  );
  const patternItems = useMemo(
    () => analysis?.patternPhrases || [],
    [analysis?.patternPhrases],
  );
  const signatureItems = useMemo(
    () => analysis?.signaturePhrases || [],
    [analysis?.signaturePhrases],
  );

  const visibleVocabulary = expanded.vocabulary
    ? vocabularyItems
    : vocabularyItems.slice(0, SECTION_LIMIT);
  const visibleLearning = expanded.learning
    ? learningItems
    : learningItems.slice(0, SECTION_LIMIT);
  const visiblePatterns = expanded.patterns
    ? patternItems
    : patternItems.slice(0, SECTION_LIMIT);
  const visibleSignature = expanded.signature
    ? signatureItems
    : signatureItems.slice(0, SECTION_LIMIT);

  const progress = analysis?.progress || {};
  // Session is source of truth: draft → processing → done. When session is "processing", show Processing (not Idle) even if pipeline hasn't written progress yet.
  const status =
    session?.status === "done"
      ? "done"
      : session?.status === "processing"
        ? (progress?.status === "idle" || progress?.status == null ? "processing" : progress.status)
        : "idle";
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

  // Log why progress shows Idle / processing / done (helps debug "analysis never starts")
  useEffect(() => {
    if (!personId || !(session?.status === "processing" || session?.status === "done")) return;
    console.log("[speech-detail] progress block state:", {
      sessionId: session?.id,
      sessionStatus: session?.status,
      progressStatus: progress?.status,
      progressPercent: progress?.percent,
      derivedStatus: status,
      derivedPercent: session?.status === "done" ? 100 : (Number.isFinite(progress?.percent) ? progress.percent : 0),
    });
  }, [personId, session?.id, session?.status, progress?.status, progress?.percent, status]);
  const progressPercent =
    session?.status === "done"
      ? 100
      : Number.isFinite(progress.percent)
        ? progress.percent
        : 0;
  const displayProcessed = session?.status === "done" ? 1 : (progress.processedDocs ?? 0);
  const displayTotal = session?.status === "done" ? 1 : (progress.totalDocs ?? 0);
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.idle;
  const speakerLabel = selectedPerson?.displayName || personId;
  const isSessionDone = session?.status === "done";
  const hasSourceUrlInUrl = Boolean(searchParams.get("sourceUrl")?.trim());
  const showReadOnly = isSessionDone && !hasSourceUrlInUrl;
  const toggleSection = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGetQuickTranscript = async () => {
    const url = (quickTranscriptUrl || "").trim();
    if (!url) {
      setNotice({ type: "error", message: "Enter a YouTube URL first." });
      return;
    }
    setIsLoadingQuickTranscript(true);
    setNotice(null);
    setQuickTranscriptResult(null);
    try {
      const res = await fetch("/api/speech/youtube-diarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeUrl: url,
          speakerCount: youtubeSpeakerCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice({
          type: "error",
          message: data.error || "Failed to get transcript.",
        });
        return;
      }
      setQuickTranscriptResult(data);
      setCurrentSavedTranscriptId(null);

      if (data.transcript?.length) {
        const sessionIdToUse = session?.id ?? (await createAnalysisSession(personId).catch(() => null));
        if (sessionIdToUse) {
          try {
            const saved = await saveTranscriptToSession(personId, sessionIdToUse, {
              youtubeUrl: url,
              videoId: data.videoId,
              speakerCount: data.speakerCount,
              transcript: data.transcript,
              fromDiarization: data.fromDiarization,
              defaultSpeakerToAnalyze: selectedSpeakerToAnalyze || null,
            });
            setCurrentSavedTranscriptId(saved.transcriptId);
            await updateAnalysisSession(personId, sessionIdToUse, {
              status: "draft",
              draftTranscriptId: saved.transcriptId,
            });
            setNotice({
              type: "success",
              message: data.fromDiarization
                ? "Transcript with speaker labels ready. Saved to session."
                : "Transcript ready. Saved to session.",
            });
          } catch (err) {
            console.error("Failed to save transcript:", err);
            setNotice({
              type: "error",
              message: `Save failed: ${err?.message || err}. Transcript is shown below but will be lost on refresh until save works.`,
            });
          }
        } else {
          setNotice({ type: "error", message: "Could not create session. Try again." });
        }
      } else {
        if (data.message) {
          setNotice({ type: "success", message: data.message });
        } else if (data.fromDiarization) {
          setNotice({
            type: "success",
            message: "Transcript with speaker labels ready.",
          });
        } else {
          setNotice({ type: "success", message: "Transcript ready." });
        }
      }
    } catch (err) {
      console.error("Quick transcript error:", err);
      setNotice({
        type: "error",
        message: "Could not fetch transcript. Try again.",
      });
    } finally {
      setIsLoadingQuickTranscript(false);
    }
  };

  const openSavedTranscript = (saved) => {
    if (!saved?.transcript?.length) return;
    setCurrentSavedTranscriptId(saved.transcriptId || null);
    setQuickTranscriptUrl(saved.youtubeUrl || "");
    setQuickTranscriptResult({
      transcript: saved.transcript,
      fromDiarization: saved.fromDiarization ?? false,
      videoId: saved.videoId,
      speakerCount: saved.speakerCount,
    });
    if (saved.defaultSpeakerToAnalyze != null && saved.defaultSpeakerToAnalyze !== "") {
      setSelectedSpeakerToAnalyze(String(saved.defaultSpeakerToAnalyze));
    }
    if (session?.id) {
      updateAnalysisSession(personId, session.id, {
        status: "draft",
        draftTranscriptId: saved.transcriptId || null,
      }).catch(() => {});
    }
    setNotice({
      type: "success",
      message:
        "Loaded saved transcript. Labels and speaker blocks are restored.",
    });
  };

  const handleDeleteSavedTranscript = async (transcriptId) => {
    if (!personId || !session?.id || !transcriptId) return;
    setDeletingTranscriptId(transcriptId);
    setNotice(null);
    try {
      await deleteSessionTranscript(personId, session.id, transcriptId);
      if (transcriptId === currentSavedTranscriptId) {
        setCurrentSavedTranscriptId(null);
        await updateAnalysisSession(personId, session.id, { draftTranscriptId: null }).catch(() => {});
      }
      setNotice({ type: "success", message: "Saved transcript deleted." });
    } catch (err) {
      console.error("Delete transcript error:", err);
      setNotice({
        type: "error",
        message: err?.message || "Failed to delete transcript.",
      });
    } finally {
      setDeletingTranscriptId(null);
    }
  };

  const handleStartAnalysisForSpeaker = async () => {
    if (
      !personId ||
      !quickTranscriptResult?.transcript?.length ||
      !selectedSpeakerToAnalyze
    ) {
      console.log("[speech-detail] Start analysis BLOCKED (guard):", {
        hasPersonId: Boolean(personId),
        hasTranscript: Boolean(quickTranscriptResult?.transcript?.length),
        selectedSpeakerToAnalyze: selectedSpeakerToAnalyze || "(none)",
      });
      setNotice({ type: "error", message: "Select which speaker in the transcript is this person first." });
      return;
    }

    setIsUploadingBySpeaker(true);
    setNotice(null);
    console.log("[speech-detail] Start analysis clicked:", {
      personId,
      urlSessionId,
      sessionId: session?.id,
      selectedSpeakerToAnalyze,
      hasQuickTranscript: Boolean(quickTranscriptResult?.transcript?.length),
    });
    try {
      const linesForSpeaker = quickTranscriptResult.transcript.filter(
        (line) => line.speaker === selectedSpeakerToAnalyze,
      );
      const text = linesForSpeaker
        .map((line) => line.text ?? line.content ?? "")
        .join(" ");
      if (!text.trim()) {
        console.warn("[speech-detail] Start analysis aborted: no transcript lines for speaker", selectedSpeakerToAnalyze);
        setNotice({ type: "error", message: "No transcript lines for this speaker." });
        return;
      }
      let effectiveSessionId = urlSessionId ?? session?.id;
      console.log("[speech-detail] effectiveSessionId (before create):", effectiveSessionId);
      if (!effectiveSessionId) {
        effectiveSessionId = await createAnalysisSession(personId);
        console.log("[speech-detail] created session:", effectiveSessionId);
        router.replace(`/dashboard/admin/speech/${personId}/detail?sessionId=${effectiveSessionId}`, { scroll: false });
      }
      if (effectiveSessionId) {
        console.log("[speech-detail] clearing session analysis...");
        await clearSpeechAnalysis(personId, effectiveSessionId);
        console.log("[speech-detail] clearSpeechAnalysis done");
      }
      console.log("[speech-detail] uploading transcript...");
      await uploadSpeechTranscript({
        personId,
        text: text.trim(),
        title: `YouTube - ${selectedSpeakerToAnalyze}`,
        sourceUrl: quickTranscriptUrl?.trim() || null,
      });
      console.log("[speech-detail] uploadSpeechTranscript done");
      if (effectiveSessionId) {
        console.log("[speech-detail] setting session status to processing...", { personId, effectiveSessionId });
        await updateAnalysisSession(personId, effectiveSessionId, {
          status: "processing",
          analysisTranscript: {
            transcriptLines: linesForSpeaker,
            speakerLabel: selectedSpeakerToAnalyze,
          },
        });
        console.log("[speech-detail] updateAnalysisSession(processing) done");
      }

      if (effectiveSessionId && currentSavedTranscriptId) {
        try {
          await updateSessionTranscriptSpeaker(personId, effectiveSessionId, currentSavedTranscriptId, {
            defaultSpeakerToAnalyze: selectedSpeakerToAnalyze,
          });
        } catch (e) {
          console.warn("Failed to persist speaker selection to saved transcript:", e);
        }
      }

      try {
        console.log("[speech-detail] calling trigger-analysis API...", { personId, sessionId: effectiveSessionId });
        const triggerRes = await fetch("/api/speech/trigger-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ personId, sessionId: effectiveSessionId }),
        });
        const triggerData = await triggerRes.json().catch(() => ({}));
        console.log("[speech-detail] trigger-analysis response:", {
          ok: triggerRes.ok,
          status: triggerRes.status,
          data: triggerData,
        });
        const displayName = selectedPerson?.displayName || personId;
        if (!triggerRes.ok) {
          setNotice({
            type: "success",
            message: `Transcript uploaded for ${displayName}. Analysis pipeline did not start: ${triggerData?.error || triggerRes.statusText}. Set SPEECH_ANALYZER_URL and deploy speech-analyzer to Cloud Run.`,
          });
        } else {
          setNotice({
            type: "success",
            message: `Analysis started for ${displayName}. View progress and results below.`,
          });
        }
      } catch (triggerErr) {
        console.error("[speech-detail] trigger-analysis fetch failed:", triggerErr);
        setNotice({
          type: "success",
          message: `Transcript uploaded for ${selectedPerson?.displayName || personId}. Triggering analysis failed; deploy speech-analyzer (see speech-analyzer/README.md) and set SPEECH_ANALYZER_URL.`,
        });
      }
    } catch (err) {
      console.error("[speech-detail] Start analysis error:", err);
      const msg = err?.message || String(err);
      const isCorsOrNetwork =
        /CORS|ERR_FAILED|blocked|access control|preflight/i.test(msg) ||
        (err?.code && String(err.code).includes("storage"));
      setNotice({
        type: "error",
        message: isCorsOrNetwork
          ? "Upload blocked by Storage CORS. Run once from project root: gcloud auth login && gcloud config set project lingo-buddy-dev && gsutil cors set storage-cors.json gs://lingo-buddy-dev.appspot.com (see docs/STORAGE_CORS.md)"
          : msg || "Failed to start analysis. Try again.",
      });
    } finally {
      setIsUploadingBySpeaker(false);
    }
  };

  if (!personId) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/dashboard/admin/speech" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Speech Analysis
        </Link>
        <p className="text-white/50">No person specified.</p>
      </div>
    );
  }
  if (loadingPeople) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/dashboard/admin/speech" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Speech Analysis
        </Link>
        <p className="text-white/50">Speaker not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Link
              href={`/dashboard/admin/speech/${personId}`}
              className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to overview
            </Link>
            <Link
              href="/dashboard/admin/speech"
              className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors"
            >
              All speakers
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Mic className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                {selectedPerson?.displayName || personId}
              </h1>
              <p className="text-white/50">
                Speech analysis — vocabulary, phrases, and patterns.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
        {showReadOnly ? (
          <p className="text-white/60 text-sm">
            Analysis complete — this session is read-only. View results below.
          </p>
        ) : (
          <>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Get transcript from YouTube
            </h2>
            <p className="text-white/40 text-sm">
              Paste a YouTube URL and how many speakers are in the video. Click
              &quot;Get transcript&quot; to fetch the transcript and label each
              line as Speaker A, Speaker B, etc. (Requires ASSEMBLYAI_API_KEY in
              .env.) Use &quot;Download audio&quot; to save the audio file
              separately.
            </p>
          </div>
        </div>

        {user?.uid && session?.status !== "draft" && (
          <div className="mb-4">
            <div>
              <span className="text-white/60 text-xs uppercase tracking-wide">
                Saved transcripts (with YouTube link)
              </span>
              <p
                className="text-white/40 text-xs mt-0.5 font-mono"
                title="Stored under this session"
              >
                Path: people/{personId}/analysis_sessions/{session?.id ?? "…"}/saved_transcripts
              </p>
            </div>
            {loadingSavedTranscripts ? (
              <p className="text-white/50 text-sm mt-1">
                Loading saved transcripts…
              </p>
            ) : savedYoutubeTranscripts.length === 0 ? (
              <p className="text-white/50 text-sm mt-1">
                No saved transcripts yet. Get a transcript above and it will be
                saved automatically.
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {savedYoutubeTranscripts.map((saved) => (
                  <li
                    key={saved.transcriptId}
                    className="flex items-stretch gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => openSavedTranscript(saved)}
                      className="flex-1 text-left px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white text-sm transition-colors"
                    >
                      <span className="text-accent truncate block">
                        {saved.youtubeUrl ||
                          saved.videoId ||
                          "Saved transcript"}
                      </span>
                      <span className="text-white/50 text-xs">
                        {saved.transcript?.length ?? 0} lines
                        {saved.createdAt
                          ? ` · ${new Date(saved.createdAt).toLocaleString()}`
                          : ""}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteSavedTranscript(saved.transcriptId)
                      }
                      disabled={deletingTranscriptId === saved.transcriptId}
                      className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-300 text-sm transition-colors disabled:opacity-50"
                      title="Delete saved transcript"
                    >
                      {deletingTranscriptId === saved.transcriptId
                        ? "…"
                        : "Delete"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-white/60 text-xs uppercase tracking-wide mb-2">
              YouTube URL
            </label>
            <input
              type="url"
              value={quickTranscriptUrl}
              onChange={(event) => setQuickTranscriptUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-accent/50"
            />
          </div>
          <div>
            <label className="block text-white/60 text-xs uppercase tracking-wide mb-2">
              Number of speakers
            </label>
            <select
              value={youtubeSpeakerCount}
              onChange={(event) =>
                setYoutubeSpeakerCount(Number(event.target.value))
              }
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent/50"
            >
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  {n} speaker{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleGetQuickTranscript}
            disabled={isLoadingQuickTranscript || !quickTranscriptUrl.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingQuickTranscript
              ? "Fetching transcript…"
              : "Get transcript"}
          </button>
          {quickTranscriptUrl.trim() && !isLoadingQuickTranscript && (
            <a
              href={`/api/speech/youtube-audio?url=${encodeURIComponent(quickTranscriptUrl.trim())}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
            >
              Download audio
            </a>
          )}
        </div>

        {isLoadingQuickTranscript && (
          <div className="mt-4">
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full w-2/5 bg-accent rounded-full animate-loading-bar"
                style={{ minWidth: "40%" }}
              />
            </div>
            <p className="text-white/50 text-xs mt-2">
              Downloading audio and transcribing… This may take a minute.
            </p>
          </div>
        )}

        {quickTranscriptResult?.transcript?.length > 0 && (
          <div className="space-y-0">
            <div className="mt-5 rounded-xl border border-white/10 bg-black/30 overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 flex-wrap">
                <span className="text-white/60 text-sm">
                  {quickTranscriptResult.fromDiarization
                    ? "Labeled by voice (Speaker A, B, …)"
                    : "Captions only (no speaker labels). Add ASSEMBLYAI_API_KEY to .env for Speaker A/B labeling."}
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto p-3 space-y-3">
                {(() => {
                  const lines = quickTranscriptResult.transcript;
                  const blocks = [];
                  let i = 0;
                  while (i < lines.length) {
                    const speaker = lines[i].speaker;
                    const texts = [];
                    while (i < lines.length && lines[i].speaker === speaker) {
                      texts.push(lines[i].text);
                      i++;
                    }
                    blocks.push({
                      speaker,
                      text: texts.join(" "),
                    });
                  }
                  const speakerColors = [
                    "border-l-accent bg-accent/10",
                    "border-l-emerald-500 bg-emerald-500/10",
                    "border-l-amber-500 bg-amber-500/10",
                    "border-l-violet-500 bg-violet-500/10",
                    "border-l-rose-500 bg-rose-500/10",
                    "border-l-cyan-500 bg-cyan-500/10",
                    "border-l-orange-500 bg-orange-500/10",
                    "border-l-teal-500 bg-teal-500/10",
                    "border-l-pink-500 bg-pink-500/10",
                    "border-l-sky-500 bg-sky-500/10",
                  ];
                  const speakerBadgeColors = [
                    "bg-accent/90 text-white",
                    "bg-emerald-500/90 text-white",
                    "bg-amber-500/90 text-white",
                    "bg-violet-500/90 text-white",
                    "bg-rose-500/90 text-white",
                    "bg-cyan-500/90 text-white",
                    "bg-orange-500/90 text-white",
                    "bg-teal-500/90 text-white",
                    "bg-pink-500/90 text-white",
                    "bg-sky-500/90 text-white",
                  ];
                  const speakerIndex = (label) => {
                    const m = (label || "").match(/Speaker\s+([A-Z])/i);
                    return m ? m[1].toUpperCase().charCodeAt(0) - 65 : 0;
                  };
                  return blocks.map((block, idx) => {
                    const colorIdx = Math.min(
                      speakerIndex(block.speaker),
                      speakerColors.length - 1,
                    );
                    return (
                      <div
                        key={idx}
                        className={`rounded-lg border-l-4 pl-3 pr-3 py-2.5 ${speakerColors[colorIdx]}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${speakerBadgeColors[colorIdx]}`}
                          >
                            {block.speaker}
                          </span>
                        </div>
                        <p className="text-white/95 text-sm leading-relaxed">
                          {block.text}
                        </p>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {!showReadOnly && distinctSpeakers.length > 0 && personId && (
              <div className="mt-5 pt-4 border-t border-white/10">
                <p className="text-white/60 text-xs uppercase tracking-wide mb-2">
                  Which speaker in this transcript is {selectedPerson?.displayName || "this person"}?
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={selectedSpeakerToAnalyze}
                    onChange={(e) => setSelectedSpeakerToAnalyze(e.target.value)}
                    className="flex-1 min-w-[160px] px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent/50"
                  >
                    <option value="">— Select speaker —</option>
                    {distinctSpeakers.map((speaker) => (
                      <option key={speaker} value={speaker}>
                        {speaker}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleStartAnalysisForSpeaker}
                    disabled={
                      isUploadingBySpeaker || !selectedSpeakerToAnalyze
                    }
                    className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploadingBySpeaker ? "Starting…" : "Start analysis"}
                  </button>
                </div>
                {isUploadingBySpeaker && (
                  <div className="mt-3">
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full w-2/5 bg-accent rounded-full animate-loading-bar"
                        style={{ minWidth: "40%" }}
                      />
                    </div>
                    <p className="text-white/50 text-xs mt-2">
                      Uploading transcript and starting analysis…
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
          </>
        )}
      </div>

      {notice && (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            notice.type === "error"
              ? "border-red-500/40 bg-red-500/10 text-red-200"
              : "border-green-500/40 bg-green-500/10 text-green-200"
          }`}
        >
          {notice.message}
        </div>
      )}

      {personId &&
        (session?.status === "processing" || session?.status === "done") && (
        <div
          className={`bg-white/5 border rounded-xl p-4 mb-6 ${!personId ? "border-white/10 opacity-75" : "border-white/10"}`}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Analysis Progress
              </h2>
            <p className="text-white/40 text-sm">
              {speakerLabel || "Select a speaker"} analysis status
            </p>
          </div>
          {personId && (
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${statusStyle}`}
            >
              {statusLabel}
            </span>
          )}
        </div>
        {!personId ? (
          <p className="text-white/50 text-sm py-2">
            Select one speaker to analyze above to view progress and results.
          </p>
        ) : analysisLoading ? (
          <div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full w-2/5 bg-accent rounded-full animate-loading-bar"
                style={{ minWidth: "40%" }}
              />
            </div>
            <p className="text-white/50 text-sm mt-2">Loading analysis…</p>
          </div>
        ) : analysis ? (
          <>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${status === "processing" && progressPercent === 0 ? "bg-accent animate-loading-bar" : "bg-accent"}`}
                style={{
                  width: status === "processing" && progressPercent === 0 ? "40%" : `${progressPercent}%`,
                  minWidth: status === "processing" && progressPercent === 0 ? "40%" : undefined,
                }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/50">
              <span>
                {formatNumber(displayProcessed)} / {formatNumber(displayTotal)} docs
              </span>
              <span>{formatNumber(progressPercent)}% complete</span>
              {status === "processing" && progressPercent === 0 && (
                <span className="text-accent">Pipeline running…</span>
              )}
            </div>
            {status === "failed" && progress?.error && (
              <p className="mt-3 text-sm text-red-200">{progress.error}</p>
            )}
          </>
        ) : (
          <div className="text-white/50 text-sm space-y-1">
            <p>No analysis results yet for this speaker.</p>
            <p className="text-white/40 text-xs">
              Your transcript was uploaded and queued. Results appear here after the analysis pipeline runs (Python/spaCy backend). See SPEECH_PATTERN_IMPLEMENTATION_GUIDE.md to deploy it.
            </p>
          </div>
        )}
        </div>
      )}

      {!personId ? (
        <div className="text-center py-12 text-white/50 rounded-xl border border-white/10 bg-white/5">
          <p className="text-sm">
            Add a speaker above or use the YouTube section to run analysis, then
            view vocabulary, phrases, and patterns here.
          </p>
        </div>
      ) : personId && !hasAnalysis ? (
        <div className="text-center py-12 text-white/50">
          {analysisLoading ? (
            <>
              <div className="max-w-md mx-auto mb-4">
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full w-2/5 bg-accent rounded-full animate-loading-bar"
                    style={{ minWidth: "40%" }}
                  />
                </div>
              </div>
              <p className="text-sm">Loading analysis…</p>
            </>
          ) : status === "processing" ? (
            <>
              <div className="max-w-md mx-auto mb-4">
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full w-2/5 bg-accent rounded-full animate-loading-bar"
                    style={{ minWidth: "40%" }}
                  />
                </div>
              </div>
              <p className="text-sm">Analyzing… Results will appear soon.</p>
            </>
          ) : isSessionDone ? (
            "Analysis complete. No vocabulary or phrases were saved for this run."
          ) : (
            "No analysis results yet for this speaker."
          )}
        </div>
      ) : null}

      {personId && hasAnalysis && (
        <div className="space-y-6">
          <section
            ref={transcriptWithHighlightsRef}
            className="bg-white/5 border border-white/10 rounded-xl p-4"
          >
            <h2 className="text-lg font-semibold text-white mb-2">
              Transcript used for analysis
            </h2>
            {transcriptLinesForSelectedSpeaker.length > 0 ? (
              <>
                <p className="text-white/40 text-sm mb-3">
                  {highlightedTerm
                    ? `Highlighting: "${highlightedTerm.length > MAX_PHRASE_HIGHLIGHT_LENGTH ? highlightedTerm.slice(0, 40) + "…" : highlightedTerm}"${highlightedTerm.length > MAX_PHRASE_HIGHLIGHT_LENGTH ? " (phrase too long; only short phrases are highlighted)" : ""}`
                    : "Click a word or phrase above to highlight it here."}
                  {(highlightedTerm || highlightedSurfaces?.length) && (
                    <button
                      type="button"
                      onClick={() => {
                        setHighlightedTerm(null);
                        setHighlightedSurfaces(null);
                      }}
                      className="ml-2 text-accent hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto rounded-lg bg-black/20 p-3 text-sm text-white/90">
                  {transcriptLinesForSelectedSpeaker.map((line, idx) => {
                    const lineText = getLineText(line);
                    return (
                      <p key={`tl-${idx}`} className="leading-relaxed">
                        {highlightedSurfaces?.length
                          ? highlightInTextBySurfaces(
                              lineText,
                              highlightedSurfaces,
                              idx,
                            )
                          : highlightedTerm?.trim()
                            ? highlightInText(
                                lineText,
                                highlightedTerm,
                                idx,
                              )
                            : lineText}
                      </p>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-white/50 text-sm">
                {quickTranscriptResult?.transcript?.length
                  ? "Select which speaker in the transcript is this person in the YouTube section above, then the transcript and highlights will appear here."
                  : "Load a transcript from Saved transcripts or paste a YouTube URL above, then select the speaker to see the transcript and highlights here."}
              </p>
            )}
          </section>

          <section className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Top Vocabulary
                </h2>
                <p className="text-white/40 text-sm">
                  {formatNumber(vocabularyItems.length)} items
                </p>
              </div>
              {vocabularyItems.length > SECTION_LIMIT && (
                <button
                  onClick={() => toggleSection("vocabulary")}
                  className="text-xs text-accent hover:underline"
                >
                  {expanded.vocabulary ? "Show less" : "Show all"}
                </button>
              )}
            </div>
            {vocabularyItems.length === 0 ? (
              <p className="text-white/40 text-sm">No vocabulary results.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {visibleVocabulary.map((item) => {
                  const itemKey = getItemKey("vocabulary", item);
                  return (
                    <SpeechItem
                      key={itemKey}
                      title={item.t}
                      meta={[
                        `Count: ${formatNumber(item.c)}`,
                        item.p10k !== undefined
                          ? `Per 10k: ${formatNumber(item.p10k)}`
                          : null,
                      ]}
                      onHighlightTitle={() => {
                        setHighlightedTerm(item.t);
                        const surfaces = item.surfaces?.length
                          ? item.surfaces
                          : getFallbackSurfaces(item.t);
                        setHighlightedSurfaces(surfaces.length ? surfaces : null);
                        transcriptWithHighlightsRef.current?.scrollIntoView({
                          behavior: "smooth",
                        });
                      }}
                    />
                  );
                })}
              </div>
            )}
          </section>

          <section className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Learning Phrases
                </h2>
                <p className="text-white/40 text-sm">
                  {formatNumber(learningItems.length)} items
                </p>
              </div>
              {learningItems.length > SECTION_LIMIT && (
                <button
                  onClick={() => toggleSection("learning")}
                  className="text-xs text-accent hover:underline"
                >
                  {expanded.learning ? "Show less" : "Show all"}
                </button>
              )}
            </div>
            {learningItems.length === 0 ? (
              <p className="text-white/40 text-sm">No learning phrases yet.</p>
            ) : (
              <div className="space-y-3">
                {visibleLearning.map((item) => {
                  const itemKey = getItemKey("learning", item);
                  return (
                    <SpeechItem
                      key={itemKey}
                      title={item.t}
                      meta={[
                        `Count: ${formatNumber(item.c)}`,
                        `Docs: ${formatNumber(item.df)}`,
                        item.s !== undefined
                          ? `Score: ${formatNumber(item.s)}`
                          : null,
                      ]}
                      onHighlightTitle={() => {
                        setHighlightedTerm(item.t);
                        const surfaces = item.surfaces?.length
                          ? item.surfaces
                          : getFallbackSurfaces(item.t);
                        setHighlightedSurfaces(surfaces.length ? surfaces : null);
                        transcriptWithHighlightsRef.current?.scrollIntoView({
                          behavior: "smooth",
                        });
                      }}
                    />
                  );
                })}
              </div>
            )}
          </section>

          <section className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Pattern Phrases
                </h2>
                <p className="text-white/40 text-sm">
                  {formatNumber(patternItems.length)} items
                </p>
              </div>
              {patternItems.length > SECTION_LIMIT && (
                <button
                  onClick={() => toggleSection("patterns")}
                  className="text-xs text-accent hover:underline"
                >
                  {expanded.patterns ? "Show less" : "Show all"}
                </button>
              )}
            </div>
            {patternItems.length === 0 ? (
              <p className="text-white/40 text-sm">No pattern phrases yet.</p>
            ) : (
              <div className="space-y-3">
                {visiblePatterns.map((item) => {
                  const itemKey = getItemKey("patterns", item);
                  return (
                    <SpeechItem
                      key={itemKey}
                      title={item.t}
                      meta={[
                        `Pattern: ${formatPatternKind(item.kind)}`,
                        `Count: ${formatNumber(item.c)}`,
                        `Docs: ${formatNumber(item.df)}`,
                      ]}
                      onHighlightTitle={() => {
                        setHighlightedTerm(item.t);
                        const surfaces = item.surfaces?.length
                          ? item.surfaces
                          : getFallbackSurfaces(item.t);
                        setHighlightedSurfaces(surfaces.length ? surfaces : null);
                        transcriptWithHighlightsRef.current?.scrollIntoView({
                          behavior: "smooth",
                        });
                      }}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {signatureItems.length > 0 && (
            <section className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Signature Phrases
                  </h2>
                  <p className="text-white/40 text-sm">
                    {formatNumber(signatureItems.length)} items
                  </p>
                </div>
                {signatureItems.length > SECTION_LIMIT && (
                  <button
                    onClick={() => toggleSection("signature")}
                    className="text-xs text-accent hover:underline"
                  >
                    {expanded.signature ? "Show less" : "Show all"}
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {visibleSignature.map((item) => {
                  const itemKey = getItemKey("signature", item);
                  return (
                    <SpeechItem
                      key={itemKey}
                      title={item.t}
                      meta={[
                        `Count: ${formatNumber(item.c)}`,
                        item.dist !== undefined
                          ? `Distinctiveness: ${formatNumber(item.dist)}`
                          : null,
                        item.s !== undefined
                          ? `Score: ${formatNumber(item.s)}`
                          : null,
                      ]}
                      onHighlightTitle={() => {
                        setHighlightedTerm(item.t);
                        const surfaces = item.surfaces?.length
                          ? item.surfaces
                          : getFallbackSurfaces(item.t);
                        setHighlightedSurfaces(surfaces.length ? surfaces : null);
                        transcriptWithHighlightsRef.current?.scrollIntoView({
                          behavior: "smooth",
                        });
                      }}
                    />
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function SpeechItem({ title, meta, onHighlightTitle }) {
  const metaText = Array.isArray(meta)
    ? meta.filter(Boolean).join(" | ")
    : meta;

  return (
    <div className="flex items-start justify-between gap-3 bg-black/30 border border-white/10 rounded-lg p-3">
      <div className="min-w-0 flex-1">
        <p
          className={`text-white font-medium line-clamp-2 ${onHighlightTitle ? "cursor-pointer hover:underline hover:text-accent" : ""}`}
          onClick={onHighlightTitle ? () => onHighlightTitle(title) : undefined}
          role={onHighlightTitle ? "button" : undefined}
        >
          {title}
        </p>
        {metaText && <p className="text-white/40 text-xs mt-1">{metaText}</p>}
      </div>
    </div>
  );
}
