"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Edit2, Trash2, Eye, Check } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getDeck, getCard, getMedia, deleteCard } from "@/utils/firestore";
import BlockDisplay from "@/components/blocks/BlockDisplay";

const safeJsonParse = (value) => {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const BLOCK_TYPE_BY_NUM = {
  8: "quizMultiSelect",
  9: "quizSingleSelect",
  10: "quizTextAnswer",
};
const resolveBlockType = (type) => {
  if (type == null) return type;
  if (typeof type === "number" && BLOCK_TYPE_BY_NUM[type]) return BLOCK_TYPE_BY_NUM[type];
  if (typeof type === "string" && /^\d+$/.test(type)) return BLOCK_TYPE_BY_NUM[Number(type)] || type;
  return type;
};

const QUIZ_BLOCK_TYPES = new Set(["quizSingleSelect", "quizMultiSelect", "quizTextAnswer"]);
const isQuizBlock = (block) => block && QUIZ_BLOCK_TYPES.has(resolveBlockType(block.type));

const getQuizData = (block, value) => {
  const config = safeJsonParse(block?.configJson);
  const rawOptions = Array.isArray(config?.options)
    ? config.options
    : Array.isArray(value?.items)
    ? value.items
    : [];
  const options = rawOptions.map((o) => String(o));
  let correctAnswers = [];
  if (Array.isArray(config?.correctAnswers)) {
    correctAnswers = config.correctAnswers.map((a) => String(a));
  } else if (Array.isArray(config?.correctAnswerIndices)) {
    correctAnswers = config.correctAnswerIndices.map((i) => options[i]).filter(Boolean);
  } else if (typeof config?.correctAnswerIndex === "number" && options[config.correctAnswerIndex]) {
    correctAnswers = [options[config.correctAnswerIndex]];
  } else if (typeof config?.correctAnswer === "string") {
    correctAnswers = [config.correctAnswer];
  } else if (Array.isArray(value?.correctAnswers)) {
    correctAnswers = value.correctAnswers.map((a) => String(a));
  }
  return {
    question: config?.question || value?.text || block?.label || "Question",
    hint: config?.hint,
    options,
    correctAnswers,
    caseSensitive: Boolean(config?.caseSensitive),
  };
};

export default function CardPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const deckId = params.deckId;
  const cardId = params.cardId;

  const [deck, setDeck] = useState(null);
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mediaCache, setMediaCache] = useState({});
  const [revealedBlocks, setRevealedBlocks] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quizState, setQuizState] = useState({});
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizRevealError, setQuizRevealError] = useState("");

  useEffect(() => {
    if (!user || !deckId || !cardId) return;

    const fetchData = async () => {
      // Fetch deck
      const deckData = await getDeck(user.uid, deckId);
      if (!deckData || deckData.isDeleted) {
        router.push("/dashboard");
        return;
      }
      setDeck(deckData);

      // Fetch card
      const cardData = await getCard(user.uid, cardId);
      if (cardData && !cardData.isDeleted) {
        setCard(cardData);

        // Fetch media for image blocks
        for (const value of cardData.values || []) {
          if (value.mediaIds && value.mediaIds.length > 0) {
            for (const mediaId of value.mediaIds) {
              const media = await getMedia(user.uid, mediaId);
              if (media) {
                setMediaCache((prev) => ({ ...prev, [mediaId]: media }));
              }
            }
          }
        }
      } else {
        router.push(`/dashboard/deck/${deckId}`);
        return;
      }

      setLoading(false);
    };

    fetchData();
  }, [user, deckId, cardId, router]);

  const toggleReveal = (blockId) => {
    setRevealedBlocks((prev) => ({
      ...prev,
      [blockId]: !prev[blockId],
    }));
  };

  const hasQuiz = useMemo(
    () => (card?.blocksSnapshot || []).some((b) => isQuizBlock(b)),
    [card?.blocksSnapshot]
  );

  const onQuizChange = (blockId, value) => {
    if (showAnswer) return;
    setQuizRevealError("");
    setQuizState((prev) => ({ ...prev, [blockId]: value }));
  };

  const handleRevealAnswer = () => {
    const multiBlocks = (card?.blocksSnapshot || []).filter((b) => resolveBlockType(b.type) === "quizMultiSelect");
    for (const block of multiBlocks) {
      const selected = quizState[block.blockId];
      const count = Array.isArray(selected) ? selected.length : 0;
      if (count === 0) {
        setQuizRevealError("Please select at least one option.");
        return;
      }
    }
    setQuizRevealError("");
    setShowAnswer(true);
  };

  const handleDelete = async () => {
    try {
      await deleteCard(user.uid, cardId, deckId);
      router.push(`/dashboard/deck/${deckId}`);
    } catch (error) {
      console.error("Error deleting card:", error);
    }
  };

  // Get value for a block
  const getValue = (blockId) => {
    return card?.values?.find((v) => v.blockId === blockId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/deck/${deckId}`}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Card Preview</h1>
            <p className="text-white/50 text-sm">{deck?.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/deck/${deckId}/card/${cardId}`}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {/* Card Preview */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
        {card?.blocksSnapshot?.map((block, index) => {
          const type = resolveBlockType(block.type);
          const value = getValue(block.blockId);
          if (type === "quizSingleSelect") {
            const quiz = getQuizData(block, value);
            const selected = quizState[block.blockId] || "";
            const correctSet = new Set(quiz.correctAnswers);
            return (
              <motion.div
                key={block.blockId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="mb-4"
              >
                <p className="text-white font-semibold mb-2">{quiz.question}</p>
                <div className="space-y-2">
                  {quiz.options.map((opt) => {
                    const isSelected = selected === opt;
                    const isCorrect = showAnswer && correctSet.has(opt);
                    const isWrong = showAnswer && isSelected && !isCorrect;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => onQuizChange(block.blockId, opt)}
                        disabled={showAnswer}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                          isCorrect ? "border-green-400 bg-green-500/10 text-green-100" :
                          isWrong ? "border-red-400 bg-red-500/10 text-red-100" :
                          isSelected ? "border-accent/60 bg-accent/10 text-white" :
                          "border-white/10 text-white/70 hover:border-white/30"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {quiz.hint && (
                  <details className="text-sm text-white/50 mt-2">
                    <summary className="cursor-pointer hover:text-white">Hint</summary>
                    <p className="mt-2 text-white/70">{quiz.hint}</p>
                  </details>
                )}
              </motion.div>
            );
          }
          if (type === "quizMultiSelect") {
            const quiz = getQuizData(block, value);
            const selected = new Set(quizState[block.blockId] || []);
            const correctSet = new Set(quiz.correctAnswers);
            const toggle = (opt) => {
              if (showAnswer) return;
              const next = new Set(selected);
              if (next.has(opt)) next.delete(opt); else next.add(opt);
              onQuizChange(block.blockId, Array.from(next));
            };
            return (
              <motion.div
                key={block.blockId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="mb-4"
              >
                <p className="text-white font-semibold mb-2">{quiz.question}</p>
                <div className="space-y-2">
                  {quiz.options.map((opt) => {
                    const isSelected = selected.has(opt);
                    const isCorrect = showAnswer && correctSet.has(opt);
                    const isWrong = showAnswer && isSelected && !isCorrect;
                    const showCheck = isSelected || isCorrect;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggle(opt)}
                        disabled={showAnswer}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                          isCorrect ? "border-green-400 bg-green-500/10 text-green-100" :
                          isWrong ? "border-red-400 bg-red-500/10 text-red-100" :
                          isSelected ? "border-accent/60 bg-accent/10 text-white" :
                          "border-white/10 text-white/70 hover:border-white/30"
                        }`}
                      >
                        {showCheck && (
                          <Check className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                        )}
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
                {quiz.hint && (
                  <details className="text-sm text-white/50 mt-2">
                    <summary className="cursor-pointer hover:text-white">Hint</summary>
                    <p className="mt-2 text-white/70">{quiz.hint}</p>
                  </details>
                )}
              </motion.div>
            );
          }
          if (type === "quizTextAnswer") {
            const quiz = getQuizData(block, value);
            const answer = quizState[block.blockId] || "";
            const correctAnswer = quiz.correctAnswers[0] || "";
            const isCorrect = showAnswer && (quiz.caseSensitive ? answer === correctAnswer : answer.toLowerCase() === correctAnswer.toLowerCase());
            return (
              <motion.div
                key={block.blockId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="mb-4"
              >
                <p className="text-white font-semibold mb-2">{quiz.question}</p>
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => onQuizChange(block.blockId, e.target.value)}
                  disabled={showAnswer}
                  placeholder="Type your answer..."
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-accent/50"
                />
                {showAnswer && correctAnswer && (
                  <p className={`text-sm mt-2 ${isCorrect ? "text-green-300" : "text-red-300"}`}>
                    {isCorrect ? "Correct!" : "Correct answer:"} <span className="text-white">{correctAnswer}</span>
                  </p>
                )}
                {quiz.hint && (
                  <details className="text-sm text-white/50 mt-2">
                    <summary className="cursor-pointer hover:text-white">Hint</summary>
                    <p className="mt-2 text-white/70">{quiz.hint}</p>
                  </details>
                )}
              </motion.div>
            );
          }
          return (
            <motion.div
              key={block.blockId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <BlockDisplay
                block={block}
                value={value}
                mediaCache={mediaCache}
                revealedBlocks={revealedBlocks}
                onToggleReveal={toggleReveal}
              />
            </motion.div>
          );
        })}
        {hasQuiz && !showAnswer && (
          <div className="mt-6 pt-4 border-t border-white/10">
            {quizRevealError && (
              <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/15 text-red-200 text-sm px-4 py-3 text-center">
                {quizRevealError}
              </div>
            )}
            <button
              type="button"
              onClick={handleRevealAnswer}
              className="flex items-center gap-2 w-full justify-center py-3 px-4 bg-accent hover:bg-accent/90 text-white font-medium rounded-xl transition-colors"
            >
              <Eye className="w-4 h-4" />
              Reveal answer
            </button>
          </div>
        )}
      </div>

      {/* Card Metadata */}
      <div className="mt-6 text-center text-white/30 text-sm">
        <p>
          Created: {new Date(card?.createdAt).toLocaleDateString()} • Updated:{" "}
          {new Date(card?.updatedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-2">Delete Card?</h2>
            <p className="text-white/60 mb-6">
              Are you sure you want to delete this card? This action cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
