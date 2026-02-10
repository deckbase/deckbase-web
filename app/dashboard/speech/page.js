"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mic, Plus } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/contexts/AuthContext";
import {
  createSpeechDiarizationJob,
  createSpeechPerson,
  createCard,
  getDecks,
  getSpeechPeople,
  subscribeToSpeechAnalysis,
  subscribeToSpeechDiarizationJobs,
  uploadSpeechTranscript,
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
  queued: "bg-white/10 text-white/60 border-white/20",
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

const formatDate = (value) => {
  if (!value) return "";
  const ms =
    typeof value?.toMillis === "function"
      ? value.toMillis()
      : typeof value === "number"
      ? value
      : value?.seconds
      ? value.seconds * 1000
      : null;
  if (!ms) return "";
  return new Date(ms).toLocaleDateString();
};

const formatTimestamp = (value) => {
  if (value === undefined || value === null) return "";
  const totalSeconds = Math.max(0, Math.floor(Number(value)));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const getJobSpeakers = (job) => {
  const speakers =
    job?.result?.speakers ||
    job?.results?.speakers ||
    job?.speakerResults ||
    [];
  return Array.isArray(speakers) ? speakers : [];
};

const getSpeakerId = (speaker, index) =>
  speaker?.speakerId ||
  speaker?.id ||
  speaker?.label ||
  speaker?.name ||
  `speaker-${index + 1}`;

const getSpeakerLabel = (speaker, index) =>
  speaker?.label || speaker?.name || `Speaker ${index + 1}`;

const getSpeakerDialogueText = (speaker) => {
  if (!speaker) return "";
  if (typeof speaker.text === "string") return speaker.text;
  if (typeof speaker.dialogue === "string") return speaker.dialogue;
  if (typeof speaker.transcript === "string") return speaker.transcript;
  if (Array.isArray(speaker.segments) && speaker.segments.length > 0) {
    return speaker.segments
      .map((segment) => {
        const prefix = formatTimestamp(segment.start);
        const content = segment.text || segment.transcript || "";
        return prefix ? `[${prefix}] ${content}` : content;
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
};

const formatPatternKind = (kind) => PATTERN_KIND_LABELS[kind] || kind || "Pattern";

const buildSpeechCardContent = ({ item, type, speakerLabel }) => {
  const term = item?.t || "Speech item";
  const lines = ["Source: Speech analysis"];

  if (speakerLabel) {
    lines.push(`Speaker: ${speakerLabel}`);
  }

  if (type === "vocabulary") {
    lines.push("Category: Vocabulary");
    if (item?.c !== undefined) lines.push(`Count: ${formatNumber(item.c)}`);
    if (item?.p10k !== undefined)
      lines.push(`Per 10k: ${formatNumber(item.p10k)}`);
  } else if (type === "learning") {
    lines.push("Category: Learning phrase");
    if (item?.c !== undefined) lines.push(`Count: ${formatNumber(item.c)}`);
    if (item?.df !== undefined) lines.push(`Docs: ${formatNumber(item.df)}`);
    if (item?.s !== undefined) lines.push(`Score: ${formatNumber(item.s)}`);
    if (item?.n && item.n !== item.t) lines.push(`Normalized: ${item.n}`);
  } else if (type === "patterns") {
    lines.push("Category: Pattern phrase");
    if (item?.kind) lines.push(`Pattern: ${formatPatternKind(item.kind)}`);
    if (item?.c !== undefined) lines.push(`Count: ${formatNumber(item.c)}`);
    if (item?.df !== undefined) lines.push(`Docs: ${formatNumber(item.df)}`);
  } else if (type === "signature") {
    lines.push("Category: Signature phrase");
    if (item?.c !== undefined) lines.push(`Count: ${formatNumber(item.c)}`);
    if (item?.dist !== undefined)
      lines.push(`Distinctiveness: ${formatNumber(item.dist)}`);
    if (item?.s !== undefined) lines.push(`Score: ${formatNumber(item.s)}`);
    if (item?.bg !== undefined)
      lines.push(`Background freq: ${formatNumber(item.bg)}`);
  }

  return { frontText: term, backText: lines.join("\n") };
};

const getItemKey = (type, item) =>
  `${type}-${item?.t || "item"}-${item?.kind || ""}`;

export default function SpeechAnalysisPage() {
  const { user } = useAuth();
  const [people, setPeople] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [search, setSearch] = useState("");
  const [newSpeakerName, setNewSpeakerName] = useState("");
  const [isCreatingSpeaker, setIsCreatingSpeaker] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [transcriptFile, setTranscriptFile] = useState(null);
  const [isUploadingTranscript, setIsUploadingTranscript] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [speakerCount, setSpeakerCount] = useState(2);
  const [isCreatingDiarization, setIsCreatingDiarization] = useState(false);
  const [diarizationJobs, setDiarizationJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedJobSpeakerId, setSelectedJobSpeakerId] = useState("");
  const [analysisTargetPersonId, setAnalysisTargetPersonId] = useState("");
  const [analysisTargetName, setAnalysisTargetName] = useState("");
  const [isSendingToAnalysis, setIsSendingToAnalysis] = useState(false);
  const [expanded, setExpanded] = useState({
    vocabulary: false,
    learning: false,
    patterns: false,
    signature: false,
  });
  const [notice, setNotice] = useState(null);
  const [addingKey, setAddingKey] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    setLoadingPeople(true);
    getSpeechPeople()
      .then((list) => {
        if (!isMounted) return;
        setPeople(list);
        setLoadingPeople(false);
        setSelectedPersonId((prev) => prev || list[0]?.personId || "");
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
    if (!user) return;
    let isMounted = true;
    const loadDecks = async () => {
      try {
        const userDecks = await getDecks(user.uid);
        if (!isMounted) return;
        setDecks(userDecks);
        setSelectedDeckId((prev) => prev || userDecks[0]?.deckId || "");
      } catch (error) {
        console.error("Error loading decks:", error);
        if (isMounted) {
          setNotice({ type: "error", message: "Unable to load decks." });
        }
      }
    };
    loadDecks();
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedPersonId) {
      setAnalysis(null);
      setAnalysisLoading(false);
      return;
    }
    setAnalysis(null);
    setAnalysisLoading(true);
    const unsubscribe = subscribeToSpeechAnalysis(
      selectedPersonId,
      (data) => {
        setAnalysis(data);
        setAnalysisLoading(false);
      }
    );
    return () => unsubscribe?.();
  }, [selectedPersonId]);

  useEffect(() => {
    if (!user) return () => {};
    const unsubscribe = subscribeToSpeechDiarizationJobs(user.uid, (jobs) => {
      setDiarizationJobs(jobs);
    });
    return () => unsubscribe?.();
  }, [user]);

  useEffect(() => {
    if (!selectedJobId && diarizationJobs.length > 0) {
      setSelectedJobId(diarizationJobs[0].jobId);
    }
  }, [selectedJobId, diarizationJobs]);

  useEffect(() => {
    if (!selectedJobId) return;
    setSelectedJobSpeakerId("");
    setAnalysisTargetPersonId("");
    setAnalysisTargetName("");
  }, [selectedJobId]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const selectedPerson = useMemo(
    () => people.find((person) => person.personId === selectedPersonId),
    [people, selectedPersonId]
  );
  const selectedDeck = useMemo(
    () => decks.find((deck) => deck.deckId === selectedDeckId),
    [decks, selectedDeckId]
  );
  const selectedJob = useMemo(
    () => diarizationJobs.find((job) => job.jobId === selectedJobId),
    [diarizationJobs, selectedJobId]
  );

  const searchTerm = search.trim().toLowerCase();
  const selectedJobSpeakers = useMemo(
    () => getJobSpeakers(selectedJob),
    [selectedJob]
  );
  const selectedJobSpeaker = useMemo(() => {
    if (selectedJobSpeakers.length === 0) return null;
    const match = selectedJobSpeakers.find(
      (speaker, index) =>
        getSpeakerId(speaker, index) === selectedJobSpeakerId
    );
    return match || selectedJobSpeakers[0];
  }, [selectedJobSpeakers, selectedJobSpeakerId]);

  useEffect(() => {
    if (selectedJobSpeakers.length === 0) return;
    const firstId = getSpeakerId(selectedJobSpeakers[0], 0);
    if (!selectedJobSpeakerId) {
      setSelectedJobSpeakerId(firstId);
    }
  }, [selectedJobSpeakers, selectedJobSpeakerId]);

  useEffect(() => {
    if (!selectedJobSpeaker) return;
    if (!analysisTargetName) {
      const label = getSpeakerLabel(
        selectedJobSpeaker,
        selectedJobSpeakers.indexOf(selectedJobSpeaker)
      );
      setAnalysisTargetName(label);
    }
  }, [analysisTargetName, selectedJobSpeaker, selectedJobSpeakers]);

  useEffect(() => {
    if (!selectedJobSpeakerId) return;
    setAnalysisTargetPersonId("");
    setAnalysisTargetName("");
  }, [selectedJobSpeakerId]);

  const vocabularyItems = useMemo(() => {
    const items = analysis?.vocabulary || [];
    if (!searchTerm) return items;
    return items.filter((item) =>
      String(item?.t || "").toLowerCase().includes(searchTerm)
    );
  }, [analysis, searchTerm]);

  const learningItems = useMemo(() => {
    const items = analysis?.learningPhrases || [];
    if (!searchTerm) return items;
    return items.filter((item) =>
      String(item?.t || "").toLowerCase().includes(searchTerm)
    );
  }, [analysis, searchTerm]);

  const patternItems = useMemo(() => {
    const items = analysis?.patternPhrases || [];
    if (!searchTerm) return items;
    return items.filter((item) => {
      const term = String(item?.t || "").toLowerCase();
      const kind = String(item?.kind || "").toLowerCase();
      return term.includes(searchTerm) || kind.includes(searchTerm);
    });
  }, [analysis, searchTerm]);

  const signatureItems = useMemo(() => {
    const items = analysis?.signaturePhrases || [];
    if (!searchTerm) return items;
    return items.filter((item) =>
      String(item?.t || "").toLowerCase().includes(searchTerm)
    );
  }, [analysis, searchTerm]);

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
  const status = progress.status || (analysis ? "done" : "idle");
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const progressPercent = Number.isFinite(progress.percent)
    ? progress.percent
    : analysis
    ? 100
    : 0;
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.idle;
  const speakerLabel = selectedPerson?.displayName || selectedPersonId;
  const canUploadTranscript = Boolean(
    selectedPersonId && (transcriptText.trim() || transcriptFile)
  );
  const normalizedSpeakerCount = Number(speakerCount);
  const canStartDiarization = Boolean(
    youtubeUrl.trim() && Number.isFinite(normalizedSpeakerCount) && normalizedSpeakerCount >= 2
  );

  const toggleSection = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCreateSpeaker = async () => {
    if (!newSpeakerName.trim()) {
      setNotice({ type: "error", message: "Enter a speaker name first." });
      return;
    }
    setIsCreatingSpeaker(true);
    setNotice(null);
    try {
      const person = await createSpeechPerson(newSpeakerName);
      setPeople((prev) => {
        const next = [...prev, person];
        next.sort((a, b) =>
          (a.displayName || "").localeCompare(b.displayName || "")
        );
        return next;
      });
      setSelectedPersonId(person.personId);
      setNewSpeakerName("");
      setNotice({
        type: "success",
        message: `Speaker "${person.displayName}" created.`,
      });
    } catch (error) {
      console.error("Error creating speaker:", error);
      setNotice({
        type: "error",
        message: "Unable to create speaker. Please try again.",
      });
    } finally {
      setIsCreatingSpeaker(false);
    }
  };

  const handleTranscriptFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const isTxt = file.name?.toLowerCase().endsWith(".txt");
    if (file.type && file.type !== "text/plain" && !isTxt) {
      setNotice({
        type: "error",
        message: "Please upload a plain text (.txt) file.",
      });
      return;
    }
    setTranscriptFile(file);
    setNotice(null);
  };

  const resetTranscriptInputs = () => {
    setTranscriptText("");
    setTranscriptFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadTranscript = async () => {
    if (!selectedPersonId) {
      setNotice({ type: "error", message: "Select a speaker first." });
      return;
    }
    if (!transcriptText.trim() && !transcriptFile) {
      setNotice({
        type: "error",
        message: "Paste a transcript or upload a .txt file.",
      });
      return;
    }

    setIsUploadingTranscript(true);
    setNotice(null);
    try {
      await uploadSpeechTranscript({
        personId: selectedPersonId,
        text: transcriptText,
        file: transcriptFile,
      });
      resetTranscriptInputs();
      setNotice({
        type: "success",
        message: "Transcript uploaded and queued for analysis.",
      });
    } catch (error) {
      console.error("Error uploading transcript:", error);
      setNotice({
        type: "error",
        message: "Unable to upload transcript. Please try again.",
      });
    } finally {
      setIsUploadingTranscript(false);
    }
  };

  const resetDiarizationInputs = () => {
    setYoutubeUrl("");
    setSpeakerCount(2);
  };

  const handleStartDiarization = async () => {
    if (!youtubeUrl.trim()) {
      setNotice({ type: "error", message: "Enter a YouTube URL first." });
      return;
    }
    if (!Number.isFinite(normalizedSpeakerCount) || normalizedSpeakerCount < 2) {
      setNotice({
        type: "error",
        message: "Enter at least two speakers for diarization.",
      });
      return;
    }
    setIsCreatingDiarization(true);
    setNotice(null);

    try {
      await createSpeechDiarizationJob({
        youtubeUrl: youtubeUrl.trim(),
        speakerCount: normalizedSpeakerCount,
        requestedBy: user?.uid || null,
      });

      resetDiarizationInputs();
      setNotice({
        type: "success",
        message: "Diarization job queued. We'll process the video shortly.",
      });
    } catch (error) {
      console.error("Error creating diarization job:", error);
      setNotice({
        type: "error",
        message: "Unable to queue diarization job. Please try again.",
      });
    } finally {
      setIsCreatingDiarization(false);
    }
  };

  const handleSendSpeakerToAnalysis = async () => {
    if (!selectedJob || !selectedJobSpeaker) {
      setNotice({
        type: "error",
        message: "Select a diarization job and speaker first.",
      });
      return;
    }

    const speakerIndex = selectedJobSpeakers.indexOf(selectedJobSpeaker);
    const speakerId = getSpeakerId(selectedJobSpeaker, speakerIndex);
    const speakerLabelValue = getSpeakerLabel(selectedJobSpeaker, speakerIndex);
    const dialogueText = getSpeakerDialogueText(selectedJobSpeaker).trim();
    if (!dialogueText) {
      setNotice({
        type: "error",
        message: "No dialogue available for this speaker yet.",
      });
      return;
    }

    setIsSendingToAnalysis(true);
    setNotice(null);
    try {
      let targetPersonId = analysisTargetPersonId;
      let targetPersonName = analysisTargetName.trim();
      if (!targetPersonId) {
        if (!targetPersonName) {
          setNotice({
            type: "error",
            message: "Select or create a speaker profile first.",
          });
          return;
        }
        const created = await createSpeechPerson(targetPersonName);
        setPeople((prev) => {
          const next = [...prev, created];
          next.sort((a, b) =>
            (a.displayName || "").localeCompare(b.displayName || "")
          );
          return next;
        });
        targetPersonId = created.personId;
      } else {
        const existing = people.find((person) => person.personId === targetPersonId);
        if (!existing && targetPersonName) {
          const created = await createSpeechPerson(targetPersonName);
          setPeople((prev) => {
            const next = [...prev, created];
            next.sort((a, b) =>
              (a.displayName || "").localeCompare(b.displayName || "")
            );
            return next;
          });
          targetPersonId = created.personId;
        }
      }

      const title =
        selectedJob?.title ||
        `${speakerLabelValue} transcript (${selectedJob.jobId})`;

      await uploadSpeechTranscript({
        personId: targetPersonId,
        text: dialogueText,
        title,
        sourceType: "diarization",
        sourceUrl: selectedJob.youtubeUrl || null,
        sourceData: {
          jobId: selectedJob.jobId,
          speakerId,
          speakerLabel: speakerLabelValue,
        },
      });

      setSelectedPersonId(targetPersonId);
      setAnalysisTargetPersonId(targetPersonId);
      setNotice({
        type: "success",
        message: "Speaker transcript sent for analysis.",
      });
    } catch (error) {
      console.error("Error sending speaker to analysis:", error);
      setNotice({
        type: "error",
        message: "Unable to queue analysis for this speaker.",
      });
    } finally {
      setIsSendingToAnalysis(false);
    }
  };

  const handleAddToDeck = async (item, type) => {
    if (!user) return;
    if (!selectedDeckId) {
      setNotice({ type: "error", message: "Select a deck to add cards." });
      return;
    }

    const itemKey = getItemKey(type, item);
    setAddingKey(itemKey);
    setNotice(null);

    try {
      const { frontText, backText } = buildSpeechCardContent({
        item,
        type,
        speakerLabel,
      });
      const frontBlockId = uuidv4();
      const backBlockId = uuidv4();
      const blocksSnapshot = [
        { blockId: frontBlockId, type: "header1", label: "Front", required: true },
        { blockId: backBlockId, type: "text", label: "Back", required: true },
      ];
      const values = [
        { blockId: frontBlockId, type: "header1", text: frontText },
        { blockId: backBlockId, type: "text", text: backText },
      ];

      await createCard(user.uid, selectedDeckId, blocksSnapshot, values);

      setNotice({
        type: "success",
        message: `Added to ${selectedDeck?.title || "deck"}.`,
      });
    } catch (error) {
      console.error("Error adding speech card:", error);
      setNotice({
        type: "error",
        message: "Unable to add card. Please try again.",
      });
    } finally {
      setAddingKey(null);
    }
  };

  const hasAnalysis =
    analysis &&
    (analysis.vocabulary?.length ||
      analysis.learningPhrases?.length ||
      analysis.patternPhrases?.length ||
      analysis.signaturePhrases?.length);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Decks
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Mic className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Speech Analysis</h1>
              <p className="text-white/50">
                Explore vocabulary, phrases, and patterns extracted from speeches.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-white/60 text-xs uppercase tracking-wide mb-2">
              Speaker
            </label>
            <select
              value={selectedPersonId}
              onChange={(event) => setSelectedPersonId(event.target.value)}
              disabled={loadingPeople || people.length === 0}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent/50 disabled:opacity-60"
            >
              {loadingPeople && <option>Loading speakers...</option>}
              {!loadingPeople && people.length === 0 && (
                <option>No speakers found</option>
              )}
              {people.map((person) => (
                <option key={person.personId} value={person.personId}>
                  {person.displayName || person.personId}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-white/60 text-xs uppercase tracking-wide mb-2">
              Target deck
            </label>
            <select
              value={selectedDeckId}
              onChange={(event) => setSelectedDeckId(event.target.value)}
              disabled={decks.length === 0}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent/50 disabled:opacity-60"
            >
              {decks.length === 0 && <option>No decks available</option>}
              {decks.map((deck) => (
                <option key={deck.deckId} value={deck.deckId}>
                  {deck.title}
                </option>
              ))}
            </select>
            {decks.length === 0 && (
              <p className="text-white/40 text-xs mt-2">
                Create a deck first to add speech cards.{" "}
                <Link href="/dashboard" className="text-accent hover:underline">
                  Go to decks
                </Link>
              </p>
            )}
          </div>
          <div>
            <label className="block text-white/60 text-xs uppercase tracking-wide mb-2">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search phrases or patterns..."
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-accent/50"
            />
          </div>
        </div>

        <div className="mt-6 border-t border-white/10 pt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-white/60 text-xs uppercase tracking-wide mb-2">
              Add speaker
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newSpeakerName}
                onChange={(event) => setNewSpeakerName(event.target.value)}
                placeholder="Enter speaker name"
                className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-accent/50"
              />
              <button
                onClick={handleCreateSpeaker}
                disabled={isCreatingSpeaker || !newSpeakerName.trim()}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingSpeaker ? "Creating..." : "Create speaker"}
              </button>
            </div>
            <p className="text-white/40 text-xs mt-2">
              Use this if the speaker is not in the list.
            </p>
          </div>

          <div>
            <label className="block text-white/60 text-xs uppercase tracking-wide mb-2">
              Upload transcript
            </label>
            <textarea
              value={transcriptText}
              onChange={(event) => setTranscriptText(event.target.value)}
              placeholder="Paste dialog text here..."
              rows={5}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-accent/50 resize-none"
            />
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <label className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg cursor-pointer transition-colors">
                Upload dialog.txt
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,text/plain"
                  onChange={handleTranscriptFileChange}
                  className="hidden"
                />
              </label>
              {transcriptFile ? (
                <span className="text-white/50 text-xs">
                  {transcriptFile.name}
                </span>
              ) : (
                <span className="text-white/40 text-xs">No file selected</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <button
                onClick={handleUploadTranscript}
                disabled={isUploadingTranscript || !canUploadTranscript}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingTranscript ? "Uploading..." : "Start analysis"}
              </button>
              <button
                onClick={resetTranscriptInputs}
                disabled={isUploadingTranscript}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
              {!selectedPersonId && (
                <span className="text-white/40 text-xs">
                  Select a speaker to enable uploads.
                </span>
              )}
            </div>
            <p className="text-white/40 text-xs mt-2">
              Uploads are queued for processing under{" "}
              {speakerLabel || "the selected speaker"}.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Multi-speaker diarization (YouTube)
            </h2>
            <p className="text-white/40 text-sm">
              Provide a YouTube link and the number of speakers. We&apos;ll
              diarize by voice, then you can map each cluster to a speaker
              afterward.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-white/60 text-xs uppercase tracking-wide mb-2">
              YouTube URL
            </label>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(event) => setYoutubeUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-accent/50"
            />
          </div>
          <div>
            <label className="block text-white/60 text-xs uppercase tracking-wide mb-2">
              Number of speakers
            </label>
            <input
              type="number"
              min={2}
              value={speakerCount}
              onChange={(event) => setSpeakerCount(event.target.value)}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-accent/50"
            />
            <p className="text-white/40 text-xs mt-2">
              Use at least 2 speakers for diarization.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleStartDiarization}
            disabled={isCreatingDiarization || !canStartDiarization}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingDiarization ? "Starting..." : "Start diarization"}
          </button>
          <button
            onClick={resetDiarizationInputs}
            disabled={isCreatingDiarization}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
          {Number.isFinite(normalizedSpeakerCount) &&
            normalizedSpeakerCount < 2 && (
              <span className="text-white/40 text-xs">
                Enter at least two speakers.
              </span>
            )}
        </div>
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

      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Diarization results
            </h2>
            <p className="text-white/40 text-sm">
              Pick a job, then select a speaker to view dialogue and send to
              analysis.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wide mb-3">
              Jobs
            </p>
            {diarizationJobs.length === 0 ? (
              <p className="text-white/40 text-sm">
                No diarization jobs yet.
              </p>
            ) : (
              <div className="space-y-3">
                {diarizationJobs.map((job) => {
                  const jobStatus = job.status || job.progress?.status || "queued";
                  const jobStyle = STATUS_STYLES[jobStatus] || STATUS_STYLES.idle;
                  const isSelected = job.jobId === selectedJobId;
                  return (
                    <button
                      key={job.jobId}
                      onClick={() => setSelectedJobId(job.jobId)}
                      className={`w-full text-left border rounded-lg p-3 transition-colors ${
                        isSelected
                          ? "border-accent bg-accent/10"
                          : "border-white/10 bg-black/30 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-white text-sm font-semibold truncate">
                            {job.youtubeUrl || "YouTube job"}
                          </p>
                          <p className="text-white/40 text-xs mt-1">
                            {formatDate(job.createdAt)}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-[10px] rounded-full border ${jobStyle}`}
                        >
                          {jobStatus}
                        </span>
                      </div>
                      <p className="text-white/40 text-xs mt-2">
                        Speakers: {formatNumber(job.speakerCount || 0)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="text-white/50 text-xs uppercase tracking-wide mb-3">
              Speaker dialogue
            </p>
            {!selectedJob ? (
              <p className="text-white/40 text-sm">Select a job to continue.</p>
            ) : selectedJobSpeakers.length === 0 ? (
              <p className="text-white/40 text-sm">
                No diarization results yet for this job.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedJobSpeakers.map((speaker, index) => {
                    const speakerId = getSpeakerId(speaker, index);
                    const isActive = speakerId === selectedJobSpeakerId;
                    return (
                      <button
                        key={speakerId}
                        onClick={() => setSelectedJobSpeakerId(speakerId)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                          isActive
                            ? "border-accent text-accent bg-accent/10"
                            : "border-white/10 text-white/60 hover:text-white"
                        }`}
                      >
                        {getSpeakerLabel(speaker, index)}
                      </button>
                    );
                  })}
                </div>
                <div className="border border-white/10 rounded-lg bg-black/30 p-3 max-h-64 overflow-y-auto">
                  <pre className="text-white/70 text-sm whitespace-pre-wrap">
                    {getSpeakerDialogueText(selectedJobSpeaker) ||
                      "No dialogue available yet."}
                  </pre>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4 space-y-3">
                  <p className="text-white/60 text-sm font-semibold">
                    Send speaker to analysis
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white/50 text-xs uppercase tracking-wide mb-2">
                        Existing speaker
                      </label>
                      <select
                        value={analysisTargetPersonId}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAnalysisTargetPersonId(value);
                          const person = people.find(
                            (item) => item.personId === value
                          );
                          setAnalysisTargetName(person?.displayName || "");
                        }}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent/50"
                      >
                        <option value="">Select speaker</option>
                        {people.map((person) => (
                          <option key={person.personId} value={person.personId}>
                            {person.displayName || person.personId}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-white/50 text-xs uppercase tracking-wide mb-2">
                        Or create new speaker
                      </label>
                      <input
                        type="text"
                        value={analysisTargetName}
                        onChange={(event) => setAnalysisTargetName(event.target.value)}
                        placeholder="Speaker name"
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-accent/50"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSendSpeakerToAnalysis}
                    disabled={
                      isSendingToAnalysis ||
                      !selectedJobSpeaker ||
                      (!analysisTargetPersonId && !analysisTargetName.trim())
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingToAnalysis ? "Sending..." : "Send to analysis"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Analysis Progress</h2>
            <p className="text-white/40 text-sm">
              {speakerLabel || "Select a speaker"} analysis status
            </p>
          </div>
          <span
            className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${statusStyle}`}
          >
            {statusLabel}
          </span>
        </div>
        {analysisLoading ? (
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-accent"></div>
            Loading analysis...
          </div>
        ) : analysis ? (
          <>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/50">
              <span>
                {formatNumber(progress.processedDocs)} /{" "}
                {formatNumber(progress.totalDocs)} docs
              </span>
              <span>{formatNumber(progressPercent)}% complete</span>
            </div>
            {status === "failed" && progress?.error && (
              <p className="mt-3 text-sm text-red-200">{progress.error}</p>
            )}
          </>
        ) : (
          <p className="text-white/50 text-sm">
            {selectedPersonId
              ? "No analysis results yet for this speaker."
              : "Select a speaker to load analysis results."}
          </p>
        )}
      </div>

      {!analysisLoading && !hasAnalysis && (
        <div className="text-center py-12 text-white/50">
          {analysis
            ? status === "processing"
              ? "Analysis is running. Results will appear soon."
              : "No analysis results to display yet."
            : selectedPersonId
            ? "No analysis results yet for this speaker."
            : "Select a speaker to view analysis results."}
        </div>
      )}

      {hasAnalysis && (
        <div className="space-y-6">
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
                      adding={addingKey === itemKey}
                      disabled={!selectedDeckId || addingKey === itemKey}
                      onAdd={() => handleAddToDeck(item, "vocabulary")}
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
                      adding={addingKey === itemKey}
                      disabled={!selectedDeckId || addingKey === itemKey}
                      onAdd={() => handleAddToDeck(item, "learning")}
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
                      adding={addingKey === itemKey}
                      disabled={!selectedDeckId || addingKey === itemKey}
                      onAdd={() => handleAddToDeck(item, "patterns")}
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
                      adding={addingKey === itemKey}
                      disabled={!selectedDeckId || addingKey === itemKey}
                      onAdd={() => handleAddToDeck(item, "signature")}
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

function SpeechItem({ title, meta, onAdd, disabled, adding }) {
  const metaText = Array.isArray(meta)
    ? meta.filter(Boolean).join(" | ")
    : meta;

  return (
    <div className="flex items-start justify-between gap-3 bg-black/30 border border-white/10 rounded-lg p-3">
      <div className="min-w-0">
        <p className="text-white font-medium line-clamp-2">{title}</p>
        {metaText && (
          <p className="text-white/40 text-xs mt-1">{metaText}</p>
        )}
      </div>
      <button
        onClick={onAdd}
        disabled={disabled}
        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
          disabled
            ? "bg-white/5 text-white/40 cursor-not-allowed"
            : "bg-accent/20 text-accent hover:bg-accent/30"
        }`}
      >
        <Plus className="w-3.5 h-3.5" />
        {adding ? "Adding..." : "Add to deck"}
      </button>
    </div>
  );
}
