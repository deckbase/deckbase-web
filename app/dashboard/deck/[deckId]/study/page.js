"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, CheckCircle2, RefreshCcw } from "lucide-react";
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

const safeJsonParse = (value) => {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

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

const getQuizData = (block, value) => {
  const config = safeJsonParse(block?.configJson);
  const rawOptions = Array.isArray(config?.options)
    ? config.options
    : Array.isArray(value?.items)
    ? value.items
    : [];
  const options = rawOptions.map((option) => String(option));
  let correctAnswers = [];

  if (Array.isArray(config?.correctAnswers)) {
    correctAnswers = config.correctAnswers.map((answer) => String(answer));
  } else if (Array.isArray(config?.correctAnswerIndices)) {
    correctAnswers = config.correctAnswerIndices
      .map((index) => options[index])
      .filter(Boolean);
  } else if (typeof config?.correctAnswerIndex === "number") {
    const answer = options[config.correctAnswerIndex];
    if (answer) correctAnswers = [answer];
  } else if (typeof config?.correctAnswer === "string") {
    correctAnswers = [config.correctAnswer];
  } else if (Array.isArray(value?.correctAnswers)) {
    correctAnswers = value.correctAnswers.map((answer) => String(answer));
  }

  return {
    question: config?.question || value?.text || block?.label || "Question",
    hint: config?.hint,
    options,
    correctAnswers,
    caseSensitive: Boolean(config?.caseSensitive),
  };
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

  const sessionCards = mode === "due" ? dueCards : allCards;
  const currentCard = sessionCards[currentIndex];
  const totalCards = sessionCards.length;
  const progress = totalCards > 0 ? (currentIndex + 1) / totalCards : 0;
  const progressText =
    totalCards > 0 ? `${currentIndex + 1} / ${totalCards}` : "0 / 0";

  const hasRevealableBlocks = useMemo(() => {
    return Boolean(
      currentCard?.blocksSnapshot?.some((block) =>
        REVEALABLE_TYPES.has(resolveBlockType(block.type))
      )
    );
  }, [currentCard]);

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

  const handleToggleReveal = (blockId) => {
    if (showAnswer) return;
    setRevealedBlocks((prev) => ({
      ...prev,
      [blockId]: !prev[blockId],
    }));
  };

  const handleQuizChange = (blockId, value) => {
    if (showAnswer) return;
    setQuizState((prev) => ({
      ...prev,
      [blockId]: value,
    }));
  };

  const handleRate = async (rating) => {
    if (!currentCard || !user || sessionComplete || isSaving) return;

    if (hasRevealableBlocks && !showAnswer) {
      triggerReveal();
      return;
    }

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
      setIsRevealing(false);
      setCardShownAt(Date.now());
      setRevealedBlocks({});
      setQuizState({});
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
          }
        } catch (mediaError) {
          console.error("Error loading media:", mediaError);
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
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!deck) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <Link
            href={`/dashboard/deck/${deckId}`}
            className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Deck
          </Link>
          <h1 className="text-3xl font-bold text-white">
            {deck.title || "Study Session"}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-white/50 mt-2">
            <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10">
              {mode === "due" ? "Due cards" : "All cards"}
            </span>
            <span>{progressText}</span>
            {cardShownAt && (
              <span>
                • Started {formatTimeAgo(cardShownAt).replace(" ago", "")} ago
              </span>
            )}
          </div>
          {mode === "all" && dueCards.length > 0 && (
            <button
              onClick={handleStudyDue}
              className="mt-2 text-xs text-accent hover:underline"
            >
              Switch back to due cards
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {dueCards.length === 0 && allCards.length > 0 && mode === "due" && (
            <button
              onClick={handleStudyAll}
              disabled={isSwitchingMode}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors disabled:opacity-50"
            >
              {isSwitchingMode ? "Loading..." : "Study all cards"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {sessionCards.length === 0 ? (
        <div className="text-center py-20">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-white/30" />
          </div>
          <h2 className="text-xl text-white/70 mb-2">
            {allCards.length === 0
              ? "No cards to study"
              : "No cards due right now"}
          </h2>
          <p className="text-white/40 mb-6">
            {allCards.length === 0
              ? "Add some cards to start a study session."
              : "You are all caught up. Study all cards if you want extra practice."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {allCards.length > 0 && (
              <button
                onClick={handleStudyAll}
                disabled={isSwitchingMode}
                className="px-5 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white transition-colors disabled:opacity-50"
              >
                {isSwitchingMode ? "Loading..." : "Study all cards"}
              </button>
            )}
            <Link
              href={`/dashboard/deck/${deckId}`}
              className="px-5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
            >
              Back to deck
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>

          {/* Card */}
          <motion.div
            key={currentCard?.cardId}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8"
          >
            <SrsInfoBar card={currentCard} />
            <div className="mt-6">
              <FlashcardContent
                card={currentCard}
                showAnswer={showAnswer}
                revealedBlocks={revealedBlocks}
                onToggleReveal={handleToggleReveal}
                mediaCache={mediaCache}
                quizState={quizState}
                onQuizChange={handleQuizChange}
              />
            </div>
          </motion.div>

          {/* Rating Buttons */}
          <div className="mt-6">
            {hasRevealableBlocks && (
              <p className="text-center text-white/40 text-xs mb-3">
                {showAnswer
                  ? "Tap a rating to record your recall."
                  : "Tap a rating to reveal the answer."}
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {RATINGS.map((rating) => (
                <button
                  key={rating.value}
                  onClick={() => handleRate(rating.value)}
                  disabled={isSaving || isRevealing}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-sm transition-colors ${rating.bg} ${rating.border} ${rating.hover} ${
                    isSaving || isRevealing
                      ? "opacity-60 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  <span className="text-2xl">{rating.emoji}</span>
                  <span className={`font-semibold ${rating.text}`}>
                    {rating.label}
                  </span>
                  <span className="text-[11px] text-white/40">
                    {ratingPreviews[rating.value] || "--"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Completion Modal */}
      <AnimatePresence>
        {sessionComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSessionComplete(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md text-center"
            >
              <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-accent" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                Session complete!
              </h2>
              <p className="text-white/60 mb-6">
                You reviewed {reviewedCount} card
                {reviewedCount === 1 ? "" : "s"}.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleStudyAgain}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Study again
                </button>
                <Link
                  href={`/dashboard/deck/${deckId}`}
                  className="flex-1 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
                >
                  Done
                </Link>
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
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-center gap-2">
        <span
          className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${stateClass}`}
        >
          {stateLabel}
        </span>
        <span className="text-xs text-white/60">{formatDueTime(card.srsDue)}</span>
      </div>
      <div className="flex items-center gap-4 text-xs text-white/40">
        <span>{card.reviewCount || 0} reviews</span>
        <span>{formatTimeAgo(card.srsLastReview)}</span>
      </div>
    </div>
  );
}

function FlashcardContent({
  card,
  showAnswer,
  revealedBlocks,
  onToggleReveal,
  mediaCache,
  quizState,
  onQuizChange,
}) {
  if (!card?.blocksSnapshot?.length) {
    return (
      <p className="text-white/50 text-sm">This card does not have content.</p>
    );
  }

  const getValueForBlock = (blockId) =>
    card?.values?.find((value) => value.blockId === blockId);

  return (
    <div className="space-y-4">
      {card.blocksSnapshot.map((block) => {
        const type = resolveBlockType(block.type);
        const value = getValueForBlock(block.blockId);

        switch (type) {
          case "header1":
            return value?.text ? (
              <h1
                key={block.blockId}
                className="text-3xl font-bold text-white"
              >
                {value.text}
              </h1>
            ) : null;
          case "header2":
            return value?.text ? (
              <h2
                key={block.blockId}
                className="text-2xl font-semibold text-white"
              >
                {value.text}
              </h2>
            ) : null;
          case "header3":
            return value?.text ? (
              <h3
                key={block.blockId}
                className="text-xl font-medium text-white"
              >
                {value.text}
              </h3>
            ) : null;
          case "text":
            return value?.text ? (
              <p key={block.blockId} className="text-white/80 whitespace-pre-wrap">
                {value.text}
              </p>
            ) : null;
          case "quote":
          case "example":
            return value?.text ? (
              <blockquote
                key={block.blockId}
                className="border-l-4 border-accent/50 pl-4 text-white/70 italic whitespace-pre-wrap"
              >
                {value.text}
              </blockquote>
            ) : null;
          case "hiddenText": {
            const isRevealed = showAnswer || revealedBlocks[block.blockId];
            return (
              <div key={block.blockId} className="rounded-xl border border-white/10 p-4">
                <button
                  onClick={() => onToggleReveal(block.blockId)}
                  disabled={showAnswer}
                  className="text-sm text-accent hover:text-accent/80 transition-colors mb-2 disabled:cursor-default"
                >
                  {isRevealed ? "Hide answer" : "Tap to reveal"}
                </button>
                {isRevealed && (
                  <p className="text-white/80 whitespace-pre-wrap">
                    {value?.text || "No answer provided."}
                  </p>
                )}
              </div>
            );
          }
          case "image": {
            if (!value?.mediaIds?.length) return null;
            const config = safeJsonParse(block.configJson);
            const layout = config?.imageLayout || "horizontal";
            const containerClass =
              layout === "vertical"
                ? "flex flex-col gap-3"
                : "flex gap-3 overflow-x-auto";
            return (
              <div key={block.blockId} className={containerClass}>
                {value.mediaIds.map((mediaId) => {
                  const media = mediaCache[mediaId];
                  if (!media?.downloadUrl) return null;
                  return (
                    <div
                      key={mediaId}
                      className="relative w-full sm:w-72 flex-shrink-0 aspect-video"
                    >
                      <Image
                        src={media.downloadUrl}
                        alt=""
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                  );
                })}
              </div>
            );
          }
          case "audio": {
            if (!value?.mediaIds?.length) return null;
            return (
              <div key={block.blockId} className="space-y-3">
                {value.mediaIds.map((mediaId) => {
                  const media = mediaCache[mediaId];
                  if (!media?.downloadUrl) return null;
                  return (
                    <audio
                      key={mediaId}
                      controls
                      className="w-full rounded-lg bg-white/5"
                    >
                      <source src={media.downloadUrl} />
                    </audio>
                  );
                })}
              </div>
            );
          }
          case "quizSingleSelect": {
            const quiz = getQuizData(block, value);
            const selected = quizState[block.blockId] || "";
            const correctSet = new Set(quiz.correctAnswers);
            return (
              <div key={block.blockId} className="space-y-3">
                <p className="text-white font-semibold">{quiz.question}</p>
                <div className="space-y-2">
                  {quiz.options.map((option) => {
                    const isSelected = selected === option;
                    const isCorrect = showAnswer && correctSet.has(option);
                    const isWrong = showAnswer && isSelected && !isCorrect;
                    return (
                      <button
                        key={option}
                        onClick={() => onQuizChange(block.blockId, option)}
                        disabled={showAnswer}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                          isCorrect
                            ? "border-green-400 bg-green-500/10 text-green-100"
                            : isWrong
                            ? "border-red-400 bg-red-500/10 text-red-100"
                            : isSelected
                            ? "border-accent/60 bg-accent/10 text-white"
                            : "border-white/10 text-white/70 hover:border-white/30"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                {quiz.hint && (
                  <details className="text-sm text-white/50">
                    <summary className="cursor-pointer hover:text-white">
                      Hint
                    </summary>
                    <p className="mt-2 text-white/70">{quiz.hint}</p>
                  </details>
                )}
              </div>
            );
          }
          case "quizMultiSelect": {
            const quiz = getQuizData(block, value);
            const selected = new Set(quizState[block.blockId] || []);
            const correctSet = new Set(quiz.correctAnswers);

            const toggleOption = (option) => {
              if (showAnswer) return;
              const next = new Set(selected);
              if (next.has(option)) {
                next.delete(option);
              } else {
                next.add(option);
              }
              onQuizChange(block.blockId, Array.from(next));
            };

            return (
              <div key={block.blockId} className="space-y-3">
                <p className="text-white font-semibold">{quiz.question}</p>
                <div className="space-y-2">
                  {quiz.options.map((option) => {
                    const isSelected = selected.has(option);
                    const isCorrect = showAnswer && correctSet.has(option);
                    const isWrong = showAnswer && isSelected && !isCorrect;
                    return (
                      <button
                        key={option}
                        onClick={() => toggleOption(option)}
                        disabled={showAnswer}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                          isCorrect
                            ? "border-green-400 bg-green-500/10 text-green-100"
                            : isWrong
                            ? "border-red-400 bg-red-500/10 text-red-100"
                            : isSelected
                            ? "border-accent/60 bg-accent/10 text-white"
                            : "border-white/10 text-white/70 hover:border-white/30"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                {quiz.hint && (
                  <details className="text-sm text-white/50">
                    <summary className="cursor-pointer hover:text-white">
                      Hint
                    </summary>
                    <p className="mt-2 text-white/70">{quiz.hint}</p>
                  </details>
                )}
              </div>
            );
          }
          case "quizTextAnswer": {
            const quiz = getQuizData(block, value);
            const answer = quizState[block.blockId] || "";
            const correctAnswer = quiz.correctAnswers[0] || "";
            const isCorrect = showAnswer
              ? quiz.caseSensitive
                ? answer === correctAnswer
                : answer.toLowerCase() === correctAnswer.toLowerCase()
              : false;

            return (
              <div key={block.blockId} className="space-y-3">
                <p className="text-white font-semibold">{quiz.question}</p>
                <input
                  type="text"
                  value={answer}
                  onChange={(event) =>
                    onQuizChange(block.blockId, event.target.value)
                  }
                  disabled={showAnswer}
                  placeholder="Type your answer..."
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-accent/50"
                />
                {showAnswer && correctAnswer && (
                  <div className="text-sm">
                    <p
                      className={
                        isCorrect ? "text-green-300" : "text-red-300"
                      }
                    >
                      {isCorrect ? "Correct!" : "Correct answer:"}{" "}
                      <span className="text-white">{correctAnswer}</span>
                    </p>
                  </div>
                )}
                {quiz.hint && (
                  <details className="text-sm text-white/50">
                    <summary className="cursor-pointer hover:text-white">
                      Hint
                    </summary>
                    <p className="mt-2 text-white/70">{quiz.hint}</p>
                  </details>
                )}
              </div>
            );
          }
          case "divider":
            return (
              <hr
                key={block.blockId}
                className="border-white/20 my-4"
              />
            );
          case "space": {
            const config = safeJsonParse(block.configJson);
            const height = Number(config?.height) || 16;
            return (
              <div
                key={block.blockId}
                style={{ height }}
                aria-hidden="true"
              />
            );
          }
          default:
            return value?.text ? (
              <p key={block.blockId} className="text-white/80">
                {value.text}
              </p>
            ) : null;
        }
      })}
    </div>
  );
}
