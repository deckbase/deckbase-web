"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, CheckCircle2, RefreshCcw } from "lucide-react";
import CardBlockList from "@/components/CardBlockList";
import { useAuth } from "@/contexts/AuthContext";
import {
  getDeck,
  getDueCards,
  getCards,
  getMedia,
  updateCardReview,
} from "@/utils/firestore";

const MS_MINUTE = 60 * 1000;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;

const DEFAULT_SCHEDULER = {
  learningStepsMinutes: [1, 10],
  relearningStepsMinutes: [10],
  maxIntervalDays: 36500,
};

const SRS_STATE = {
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3,
};

const BLOCK_TYPE_BY_ID = {
  0: "header1",
  1: "header2",
  2: "header3",
  3: "text",
  4: "quote",
  5: "hiddenText",
  6: "image",
  7: "audio",
  8: "quizMultiSelect",
  9: "quizSingleSelect",
  10: "quizTextAnswer",
  11: "divider",
  12: "space",
};

const REVEALABLE_TYPES = new Set([
  "quizSingleSelect",
  "quizMultiSelect",
  "quizTextAnswer",
  "hiddenText",
]);

const RATINGS = [
  {
    value: 1,
    label: "Nope",
    emoji: "😵",
    bg: "bg-red-500/10",
    border: "border-red-500/40",
    text: "text-red-300",
    hover: "hover:bg-red-500/20",
  },
  {
    value: 2,
    label: "Uhh...",
    emoji: "😬",
    bg: "bg-orange-500/10",
    border: "border-orange-500/40",
    text: "text-orange-300",
    hover: "hover:bg-orange-500/20",
  },
  {
    value: 3,
    label: "Got it",
    emoji: "😎",
    bg: "bg-green-500/10",
    border: "border-green-500/40",
    text: "text-green-300",
    hover: "hover:bg-green-500/20",
  },
  {
    value: 4,
    label: "Easy",
    emoji: "🚀",
    bg: "bg-blue-500/10",
    border: "border-blue-500/40",
    text: "text-blue-300",
    hover: "hover:bg-blue-500/20",
  },
];

const SRS_STATE_STYLES = {
  New: "bg-white/10 text-white/70 border-white/20",
  Learning: "bg-blue-500/15 text-blue-200 border-blue-500/30",
  Review: "bg-green-500/15 text-green-200 border-green-500/30",
  Relearning: "bg-orange-500/15 text-orange-200 border-orange-500/30",
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const toMillis = (value) => {
  if (!value) return null;
  if (typeof value === "number") return value;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  return null;
};

const resolveBlockType = (rawType) => {
  if (rawType === null || rawType === undefined) return null;
  if (typeof rawType === "number") return BLOCK_TYPE_BY_ID[rawType] || null;
  if (typeof rawType === "string") {
    const asNumber = Number(rawType);
    if (!Number.isNaN(asNumber) && BLOCK_TYPE_BY_ID[asNumber]) {
      return BLOCK_TYPE_BY_ID[asNumber];
    }
    return rawType;
  }
  return null;
};

/** @param {{ side?: string }} block */
const effectiveStudySide = (block) =>
  block?.side === "back" ? "back" : "front";

const blockHasRevealableType = (block) =>
  REVEALABLE_TYPES.has(resolveBlockType(block.type));

const formatInterval = (ms) => {
  const durationMs = Math.max(0, ms);
  const minutes = Math.round(durationMs / MS_MINUTE);
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  return `${months}mo`;
};

const formatDueTime = (dueMs) => {
  const resolvedDue = toMillis(dueMs);
  if (!resolvedDue) return "No due date";
  const diffMs = resolvedDue - Date.now();
  if (Math.abs(diffMs) < MS_MINUTE) return "Due now";
  const label = formatInterval(Math.abs(diffMs));
  return diffMs > 0 ? `Due in ${label}` : `Overdue by ${label}`;
};

const formatTimeAgo = (timeMs) => {
  const resolvedTime = toMillis(timeMs);
  if (!resolvedTime) return "Never reviewed";
  const diffMs = Date.now() - resolvedTime;
  const label = formatInterval(Math.abs(diffMs));
  return `${label} ago`;
};

const computeSchedule = (card, rating, nowMs, scheduler = DEFAULT_SCHEDULER) => {
  const normalizedState =
    card?.srsState === SRS_STATE.New || card?.srsState === undefined
      ? SRS_STATE.Learning
      : card?.srsState;
  const step = Number.isFinite(card?.srsStep) ? card.srsStep : 0;
  const reviewCount = (card?.reviewCount ?? 0) + 1;
  const baseDifficulty = clamp(card?.srsDifficulty ?? 5, 1, 10);
  const baseStability = Math.max(0.1, card?.srsStability ?? 1);
  const lastReviewMs = toMillis(card?.srsLastReview);
  const elapsedDays = lastReviewMs
    ? Math.max(0, (nowMs - lastReviewMs) / MS_DAY)
    : 0;
  const baseIntervalDays = card?.srsStability ?? Math.max(1, elapsedDays || 1);

  const learningSteps =
    scheduler.learningStepsMinutes?.length > 0
      ? scheduler.learningStepsMinutes
      : [10];
  const relearningSteps =
    scheduler.relearningStepsMinutes?.length > 0
      ? scheduler.relearningStepsMinutes
      : [10];
  const clampIntervalDays = (days) =>
    clamp(days, 1, scheduler.maxIntervalDays);

  let nextState = normalizedState;
  let nextStep = step;
  let nextStability = baseStability;
  let nextDifficulty = baseDifficulty;
  let intervalMs = learningSteps[0] * MS_MINUTE;

  if (normalizedState === SRS_STATE.Learning) {
    if (rating === 1) {
      nextState = SRS_STATE.Learning;
      nextStep = 0;
      intervalMs = learningSteps[0] * MS_MINUTE;
      nextStability *= 0.6;
      nextDifficulty += 1;
    } else if (rating === 2) {
      nextState = SRS_STATE.Learning;
      nextStep = Math.min(step + 1, learningSteps.length - 1);
      intervalMs = learningSteps[nextStep] * MS_MINUTE;
      nextStability *= 0.9;
      nextDifficulty += 0.3;
    } else if (rating === 3) {
      if (step + 1 < learningSteps.length) {
        nextState = SRS_STATE.Learning;
        nextStep = step + 1;
        intervalMs = learningSteps[nextStep] * MS_MINUTE;
      } else {
        nextState = SRS_STATE.Review;
        nextStep = 0;
        intervalMs = clampIntervalDays(baseIntervalDays) * MS_DAY;
      }
      nextStability *= 1.2;
      nextDifficulty -= 0.2;
    } else if (rating === 4) {
      nextState = SRS_STATE.Review;
      nextStep = 0;
      intervalMs = clampIntervalDays(baseIntervalDays * 2) * MS_DAY;
      nextStability *= 1.4;
      nextDifficulty -= 0.6;
    }
  } else if (normalizedState === SRS_STATE.Relearning) {
    if (rating === 1) {
      nextState = SRS_STATE.Relearning;
      nextStep = 0;
      intervalMs = relearningSteps[0] * MS_MINUTE;
      nextStability *= 0.6;
      nextDifficulty += 0.8;
    } else if (rating === 2) {
      nextState = SRS_STATE.Relearning;
      nextStep = Math.min(step + 1, relearningSteps.length - 1);
      intervalMs = relearningSteps[nextStep] * MS_MINUTE;
      nextStability *= 0.9;
      nextDifficulty += 0.3;
    } else if (rating === 3 || rating === 4) {
      nextState = SRS_STATE.Review;
      nextStep = 0;
      const multiplier = rating === 3 ? 1.5 : 2.5;
      intervalMs = clampIntervalDays(baseIntervalDays * multiplier) * MS_DAY;
      nextStability *= rating === 3 ? 1.15 : 1.3;
      nextDifficulty -= rating === 3 ? 0.3 : 0.6;
    }
  } else {
    if (rating === 1) {
      nextState = SRS_STATE.Relearning;
      nextStep = 0;
      intervalMs = relearningSteps[0] * MS_MINUTE;
      nextStability *= 0.5;
      nextDifficulty += 1;
    } else if (rating === 2) {
      nextState = SRS_STATE.Review;
      nextStep = 0;
      intervalMs = clampIntervalDays(baseIntervalDays * 1.2) * MS_DAY;
      nextStability *= 1.05;
      nextDifficulty += 0.2;
    } else if (rating === 3) {
      nextState = SRS_STATE.Review;
      nextStep = 0;
      intervalMs = clampIntervalDays(baseIntervalDays * 2.5) * MS_DAY;
      nextStability *= 1.2;
      nextDifficulty -= 0.2;
    } else if (rating === 4) {
      nextState = SRS_STATE.Review;
      nextStep = 0;
      intervalMs = clampIntervalDays(baseIntervalDays * 3.5) * MS_DAY;
      nextStability *= 1.4;
      nextDifficulty -= 0.6;
    }
  }

  return {
    nextCard: {
      ...card,
      srsState: nextState,
      srsStep: nextStep,
      srsStability: clamp(nextStability, 0.1, scheduler.maxIntervalDays),
      srsDifficulty: clamp(nextDifficulty, 1, 10),
      srsDue: nowMs + intervalMs,
      srsLastReview: nowMs,
      reviewCount,
    },
    intervalMs,
  };
};

export default function StudySessionPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const deckId = params.deckId;

  const [deck, setDeck] = useState(null);
  const [dueCards, setDueCards] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [mode, setMode] = useState("due");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [cardShownAt, setCardShownAt] = useState(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [revealedBlocks, setRevealedBlocks] = useState({});
  const [quizState, setQuizState] = useState({});
  const [mediaCache, setMediaCache] = useState({});
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  /** True when the card has a back face and it is visible (after flip). */
  const [flipRevealed, setFlipRevealed] = useState(false);

  const sessionCards = mode === "due" ? dueCards : allCards;
  const currentCard = sessionCards[currentIndex];
  const totalCards = sessionCards.length;
  const progress = totalCards > 0 ? (currentIndex + 1) / totalCards : 0;
  const progressText =
    totalCards > 0 ? `${currentIndex + 1} / ${totalCards}` : "0 / 0";

  const frontBlocks = useMemo(() => {
    const snap = currentCard?.blocksSnapshot;
    if (!Array.isArray(snap)) return [];
    return snap.filter((b) => effectiveStudySide(b) === "front");
  }, [currentCard]);

  const backBlocks = useMemo(() => {
    const snap = currentCard?.blocksSnapshot;
    if (!Array.isArray(snap)) return [];
    return snap.filter((b) => effectiveStudySide(b) === "back");
  }, [currentCard]);

  const hasFlipBack = backBlocks.length > 0;

  const hasRevealableOnBack = useMemo(
    () => backBlocks.some((b) => blockHasRevealableType(b)),
    [backBlocks],
  );

  /** Front quiz blocks only — hiddenText uses tap-to-reveal, not rating. */
  const frontNeedsQuizRatingReveal = useMemo(() => {
    return frontBlocks.some((b) => {
      const t = resolveBlockType(b.type);
      return (
        t === "quizMultiSelect" ||
        t === "quizSingleSelect" ||
        t === "quizTextAnswer"
      );
    });
  }, [frontBlocks]);

  /** Flat / legacy cards: any quiz or hiddenText on the snapshot (no separate back face). */
  const hasLegacyFlatRevealable = useMemo(() => {
    return Boolean(
      currentCard?.blocksSnapshot?.some((block) => blockHasRevealableType(block)),
    );
  }, [currentCard]);

  const ratingHint = useMemo(() => {
    if (!currentCard) return "";
    if (hasFlipBack) {
      if (!flipRevealed) {
        if (frontNeedsQuizRatingReveal && !showAnswer) {
          return "Tap a rating to reveal the answer.";
        }
        return "Tap a rating to show the back.";
      }
      if (hasRevealableOnBack && !showAnswer) {
        return "Tap a rating to reveal the answer.";
      }
      return "Tap a rating to record your recall.";
    }
    if (hasLegacyFlatRevealable && !showAnswer) {
      return "Tap a rating to reveal the answer.";
    }
    return "Tap a rating to record your recall.";
  }, [
    currentCard,
    hasFlipBack,
    flipRevealed,
    frontNeedsQuizRatingReveal,
    hasRevealableOnBack,
    showAnswer,
    hasLegacyFlatRevealable,
  ]);

  const ratingPreviews = useMemo(() => {
    if (!currentCard) return {};
    const nowMs = Date.now();
    return RATINGS.reduce((acc, rating) => {
      const { intervalMs } = computeSchedule(currentCard, rating.value, nowMs);
      return { ...acc, [rating.value]: formatInterval(intervalMs) };
    }, {});
  }, [currentCard]);

  const resetSession = useCallback(() => {
    setCurrentIndex(0);
    setReviewedCount(0);
    setShowAnswer(false);
    setFlipRevealed(false);
    setSessionComplete(false);
    setIsRevealing(false);
    setCardShownAt(Date.now());
    setRevealedBlocks({});
    setQuizState({});
  }, []);

  useEffect(() => {
    if (!user || !deckId) return;
    let isMounted = true;

    const loadSession = async () => {
      setLoading(true);
      setError("");
      try {
        const deckData = await getDeck(user.uid, deckId);
        if (!deckData || deckData.isDeleted) {
          router.push("/dashboard");
          return;
        }
        if (!isMounted) return;
        setDeck(deckData);

        const due = await getDueCards(user.uid, deckId);
        if (!isMounted) return;
        setDueCards(due);

        if (due.length > 0) {
          setMode("due");
          resetSession();
        } else {
          const all = await getCards(user.uid, deckId);
          if (!isMounted) return;
          setAllCards(all);
        }
      } catch (loadError) {
        console.error("Error loading study session:", loadError);
        if (isMounted) {
          setError("Unable to load study session. Please try again.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSession();
    return () => {
      isMounted = false;
    };
  }, [user, deckId, router, resetSession]);

  const triggerReveal = useCallback(() => {
    if (showAnswer || isRevealing) return;
    setIsRevealing(true);
    setShowAnswer(true);
    setTimeout(() => setIsRevealing(false), 800);
  }, [showAnswer, isRevealing]);

  useEffect(() => {
    setFlipRevealed(false);
  }, [currentCard?.cardId]);

  const handleToggleReveal = (blockId) => {
    if (showAnswer) return;
    setRevealedBlocks((prev) => ({
      ...prev,
      [blockId]: !prev[blockId],
    }));
  };

  const handleQuizChange = (blockId, value) => {
    if (showAnswer) return;
    setError(""); // clear "select at least one" when user selects
    setQuizState((prev) => ({
      ...prev,
      [blockId]: value,
    }));
  };

  const handleRate = async (rating) => {
    if (!currentCard || !user || sessionComplete || isSaving) return;
    // Direct rating mode: one tap rates and advances.
    setError("");

    setIsSaving(true);
    const nowMs = Date.now();
    const { nextCard } = computeSchedule(currentCard, rating, nowMs);

    try {
      await updateCardReview(user.uid, currentCard.cardId, {
        srsState: nextCard.srsState,
        srsStep: nextCard.srsStep,
        srsStability: nextCard.srsStability,
        srsDifficulty: nextCard.srsDifficulty,
        srsDue: nextCard.srsDue,
        srsLastReview: nextCard.srsLastReview,
        reviewCount: nextCard.reviewCount,
      });
    } catch (updateError) {
      console.error("Error updating card review:", updateError);
      setError("Unable to save review. Please try again.");
      setIsSaving(false);
      return;
    }

    setDueCards((prev) =>
      prev.map((card) => (card.cardId === nextCard.cardId ? nextCard : card))
    );
    setAllCards((prev) =>
      prev.map((card) => (card.cardId === nextCard.cardId ? nextCard : card))
    );

    setReviewedCount((prev) => prev + 1);

    if (currentIndex < sessionCards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowAnswer(false);
      setFlipRevealed(false);
      setIsRevealing(false);
      setCardShownAt(Date.now());
      setRevealedBlocks({});
      setQuizState({});
      setError("");
    } else {
      setSessionComplete(true);
    }

    setIsSaving(false);
  };

  const handleStudyAgain = () => {
    resetSession();
  };

  const handleStudyAll = async () => {
    if (!user || !deckId) return;
    setIsSwitchingMode(true);
    try {
      const cards =
        allCards.length > 0 ? allCards : await getCards(user.uid, deckId);
      setAllCards(cards);
      setMode("all");
      resetSession();
    } catch (loadError) {
      console.error("Error loading all cards:", loadError);
      setError("Unable to load all cards. Please try again.");
    } finally {
      setIsSwitchingMode(false);
    }
  };

  const handleStudyDue = () => {
    if (dueCards.length === 0) return;
    setMode("due");
    resetSession();
  };

  const currentMediaIds = useMemo(() => {
    const ids = new Set();
    currentCard?.values?.forEach((value) => {
      if (Array.isArray(value.mediaIds)) {
        value.mediaIds.forEach((id) => ids.add(id));
      }
    });
    return Array.from(ids);
  }, [currentCard]);

  useEffect(() => {
    if (!user || currentMediaIds.length === 0) return;
    let isMounted = true;

    const loadMedia = async () => {
      for (const mediaId of currentMediaIds) {
        if (mediaCache[mediaId]) continue;
        try {
          const media = await getMedia(user.uid, mediaId);
          if (media && isMounted) {
            setMediaCache((prev) => ({ ...prev, [mediaId]: media }));
          } else {
            console.warn("[StudyMediaResolve] media missing", {
              cardId: currentCard?.cardId || null,
              mediaId,
              uid: user.uid,
              projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null,
            });
          }
        } catch (mediaError) {
          console.error("[StudyMediaResolve] getMedia failed", {
            cardId: currentCard?.cardId || null,
            mediaId,
            uid: user.uid,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null,
            errorCode: mediaError?.code || null,
            errorMessage: mediaError?.message || String(mediaError),
          });
        }
      }
    };

    loadMedia();
    return () => {
      isMounted = false;
    };
  }, [user, currentMediaIds, mediaCache]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/[0.05]" />
          <div className="h-3.5 w-32 bg-white/[0.04] rounded" />
        </div>
        <div className="h-px bg-white/[0.05] rounded" />
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-3 w-16 bg-white/[0.06] rounded-full" />
            <div className="h-3 w-24 bg-white/[0.04] rounded" />
          </div>
          <div className="space-y-2.5 pt-2">
            <div className="h-6 w-3/4 bg-white/[0.06] rounded-lg" />
            <div className="h-4 w-full bg-white/[0.04] rounded" />
            <div className="h-4 w-5/6 bg-white/[0.04] rounded" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[0,1,2,3].map((i) => <div key={i} className="h-20 rounded-xl bg-white/[0.03] border border-white/[0.06]" />)}
        </div>
      </div>
    );
  }

  if (!deck) {
    return null;
  }

  return (
    <div className={
      sessionCards.length > 0
        ? "h-[100dvh] flex flex-col overflow-hidden"
        : "max-w-2xl mx-auto px-4 pt-3 min-h-[100dvh] flex flex-col"
    }>

      {/* Header — only shown on the empty/no-cards state */}
      {sessionCards.length === 0 && (
        <div className="flex items-center gap-2 mb-3">
          <Link
            href={`/dashboard/deck/${deckId}`}
            className="p-2 rounded-xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07] text-white/40 hover:text-white/80 transition-all flex-shrink-0"
            aria-label="Back to deck"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-[13px] text-white/35 truncate flex-1 min-w-0">{deck.title}</span>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/[0.07] text-red-300 text-[13px] px-4 py-3">
          {error}
        </div>
      )}

      {sessionCards.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto mb-5 w-14 h-14 rounded-2xl border border-white/[0.07] bg-white/[0.03] flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white/30" />
          </div>
          <h2 className="text-[16px] font-semibold text-white/60 mb-2">
            {allCards.length === 0 ? "No cards to study" : "All caught up"}
          </h2>
          <p className="text-[13px] text-white/35 mb-7 max-w-xs mx-auto">
            {allCards.length === 0
              ? "Add some cards to start a study session."
              : "No cards are due right now. Study all cards for extra practice."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
            {allCards.length > 0 && (
              <button
                onClick={handleStudyAll}
                disabled={isSwitchingMode}
                className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-[13px] font-semibold transition-colors disabled:opacity-50 shadow-[0_0_20px_rgba(35,131,226,0.2)]"
              >
                {isSwitchingMode ? "Loading…" : "Study all cards"}
              </button>
            )}
            <Link
              href={`/dashboard/deck/${deckId}`}
              className="px-5 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.05] text-white/60 hover:text-white/90 text-[13px] font-medium transition-all"
            >
              Back to deck
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex items-start justify-center px-3 pt-1 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
          <div className="w-auto flex items-start justify-center gap-3">
          <div className="flex-shrink-0">
          {/* Strict 9:16 portrait frame for study card */}
          <motion.div
              key={currentCard?.cardId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                aspectRatio: "9 / 16",
                width: "min(96vw, calc((100dvh - 5.5rem) * 9 / 16))",
                maxWidth: "32rem",
              }}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.025] overflow-hidden shadow-xl shadow-black/20 flex flex-col"
            >
            {/* ── Integrated card header ── */}
            <div className="px-4 pt-3 pb-2.5 flex-shrink-0 border-b border-white/[0.05]">
              <div className="flex items-center gap-2 mb-2">
                <Link
                  href={`/dashboard/deck/${deckId}`}
                  className="p-1 rounded-lg border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07] text-white/40 hover:text-white/80 transition-all flex-shrink-0"
                  aria-label="Back to deck"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </Link>
                <span className="text-[12px] text-white/35 truncate flex-1 min-w-0">{deck.title}</span>
                <span className="text-[11px] text-white/30 tabular-nums flex-shrink-0">{progressText}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.05] border border-white/[0.07] text-white/40 flex-shrink-0">
                  {mode === "due" ? "Due" : "All"}
                </span>
                {dueCards.length === 0 && allCards.length > 0 && mode === "due" && (
                  <button
                    onClick={handleStudyAll}
                    disabled={isSwitchingMode}
                    className="px-2 py-0.5 rounded-lg text-[11px] font-medium border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] text-white/50 hover:text-white/80 transition-all disabled:opacity-50 flex-shrink-0"
                  >
                    {isSwitchingMode ? "…" : "All"}
                  </button>
                )}
                {mode === "all" && dueCards.length > 0 && (
                  <button
                    onClick={handleStudyDue}
                    className="px-2 py-0.5 rounded-lg text-[11px] font-medium border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] text-white/50 hover:text-white/80 transition-all flex-shrink-0"
                  >
                    Due
                  </button>
                )}
              </div>
              {/* Progress bar */}
              <div className="h-0.5 bg-white/[0.07] rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300 rounded-full"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </div>

            {/* ── SRS info ── */}
            <div className="px-4 pt-3 pb-0 flex-shrink-0">
              <SrsInfoBar card={currentCard} />
            </div>

            {/* ── Scrollable content ── */}
            <div className="flex-1 overflow-y-auto p-4 pt-3">
              {hasFlipBack ? (
                <div className="relative w-full" style={{ perspective: "1200px" }}>
                  <motion.div
                    className="relative w-full"
                    style={{ transformStyle: "preserve-3d" }}
                    animate={{ rotateY: flipRevealed ? 180 : 0 }}
                    transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <div
                      className="w-full"
                      style={{
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                        transform: "rotateY(0deg) translateZ(1px)",
                      }}
                    >
                      <CardBlockList
                        blocks={frontBlocks}
                        getValue={(blockId) => currentCard?.values?.find((v) => v.blockId === blockId)}
                        showAnswer={showAnswer}
                        revealedBlocks={revealedBlocks}
                        onToggleReveal={handleToggleReveal}
                        mediaCache={mediaCache}
                        quizState={quizState}
                        onQuizChange={handleQuizChange}
                      />
                    </div>
                    <div
                      className="absolute top-0 left-0 w-full min-h-full"
                      style={{
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                        transform: "rotateY(180deg) translateZ(1px)",
                      }}
                    >
                      <CardBlockList
                        blocks={backBlocks}
                        getValue={(blockId) => currentCard?.values?.find((v) => v.blockId === blockId)}
                        showAnswer={showAnswer}
                        revealedBlocks={revealedBlocks}
                        onToggleReveal={handleToggleReveal}
                        mediaCache={mediaCache}
                        quizState={quizState}
                        onQuizChange={handleQuizChange}
                      />
                    </div>
                  </motion.div>
                </div>
              ) : (
                <CardBlockList
                  blocks={currentCard?.blocksSnapshot ?? []}
                  getValue={(blockId) => currentCard?.values?.find((v) => v.blockId === blockId)}
                  showAnswer={showAnswer}
                  revealedBlocks={revealedBlocks}
                  onToggleReveal={handleToggleReveal}
                  mediaCache={mediaCache}
                  quizState={quizState}
                  onQuizChange={handleQuizChange}
                />
              )}
            </div>
          </motion.div>
          </div>
          <div className="hidden md:flex w-24 ml-0 flex-col justify-center gap-2 flex-shrink-0">
            <p className="text-center text-[11px] text-white/30 mb-1">{ratingHint}</p>
            {RATINGS.map((rating) => (
              <button
                key={rating.value}
                onClick={() => handleRate(rating.value)}
                disabled={isSaving || isRevealing}
                className={`flex flex-col items-center gap-0.5 px-2 py-2.5 rounded-xl border transition-all ${rating.bg} ${rating.border} ${rating.hover} ${
                  isSaving || isRevealing ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"
                }`}
              >
                <span className="text-lg leading-none">{rating.emoji}</span>
                <span className={`text-[11px] font-semibold ${rating.text}`}>{rating.label}</span>
                <span className="text-[10px] text-white/30 tabular-nums">{ratingPreviews[rating.value] || "--"}</span>
              </button>
            ))}
          </div>

          {/* Mobile fallback: keep ratings at bottom */}
          <div className="md:hidden w-full max-w-[32rem] flex-shrink-0">
            <p className="text-center text-[11px] text-white/30 mb-2">{ratingHint}</p>
            <div className="grid grid-cols-4 gap-2">
              {RATINGS.map((rating) => (
                <button
                  key={rating.value}
                  onClick={() => handleRate(rating.value)}
                  disabled={isSaving || isRevealing}
                  className={`flex flex-col items-center gap-0.5 px-2 py-2.5 rounded-xl border transition-all ${rating.bg} ${rating.border} ${rating.hover} ${
                    isSaving || isRevealing ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"
                  }`}
                >
                  <span className="text-xl leading-none">{rating.emoji}</span>
                  <span className={`text-[12px] font-semibold ${rating.text}`}>{rating.label}</span>
                  <span className="text-[10px] text-white/30 tabular-nums">{ratingPreviews[rating.value] || "--"}</span>
                </button>
              ))}
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      <AnimatePresence>
        {sessionComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-4"
            onClick={() => setSessionComplete(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0e0e0e] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="px-6 pt-8 pb-6 text-center">
                <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-accent/[0.12] border border-accent/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-[17px] font-bold text-white mb-1.5">Session complete!</h2>
                <p className="text-[13px] text-white/45 mb-7">
                  You reviewed {reviewedCount} card{reviewedCount === 1 ? "" : "s"}.
                </p>
                <div className="flex gap-2.5">
                  <button
                    onClick={handleStudyAgain}
                    className="flex-1 px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white text-[13px] font-medium rounded-xl border border-white/[0.07] transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    Study again
                  </button>
                  <Link
                    href={`/dashboard/deck/${deckId}`}
                    className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent/90 text-white text-[13px] font-semibold rounded-xl transition-colors shadow-[0_0_20px_rgba(35,131,226,0.2)]"
                  >
                    Done
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SrsInfoBar({ card }) {
  if (!card) return null;
  const stateLabel =
    card.srsState === SRS_STATE.New || card.reviewCount === 0
      ? "New"
      : card.srsState === SRS_STATE.Learning
      ? "Learning"
      : card.srsState === SRS_STATE.Review
      ? "Review"
      : "Relearning";
  const stateClass = SRS_STATE_STYLES[stateLabel] || SRS_STATE_STYLES.New;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${stateClass}`}>
          {stateLabel}
        </span>
        <span className="text-[11px] text-white/40">{formatDueTime(card.srsDue)}</span>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-white/25">
        <span>{card.reviewCount || 0} reviews</span>
        <span>{formatTimeAgo(card.srsLastReview)}</span>
      </div>
    </div>
  );
}

