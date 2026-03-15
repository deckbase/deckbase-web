"use client";

import { useState, useMemo } from "react";
import { Eye, Check } from "lucide-react";
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
  const rawConfig = block?.configJson ?? block?.config_json;
  const config = typeof rawConfig === "object" ? rawConfig : safeJsonParse(rawConfig);
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

/**
 * Renders card preview body: blocks + quiz UI.
 * getValue(blockId) should return the value object for that block.
 * Manages quiz state and revealed blocks internally.
 */
export default function CardPreviewContent({ blocks = [], getValue, mediaCache = {}, className = "" }) {
  const [revealedBlocks, setRevealedBlocks] = useState({});
  const [quizState, setQuizState] = useState({});
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizRevealError, setQuizRevealError] = useState("");

  const toggleReveal = (blockId) => {
    setRevealedBlocks((prev) => ({ ...prev, [blockId]: !prev[blockId] }));
  };

  const hasQuiz = useMemo(
    () => (blocks || []).some((b) => isQuizBlock(b)),
    [blocks]
  );

  const onQuizChange = (blockId, value) => {
    if (showAnswer) return;
    setQuizRevealError("");
    setQuizState((prev) => ({ ...prev, [blockId]: value }));
  };

  const handleRevealAnswer = () => {
    const multiBlocks = (blocks || []).filter((b) => resolveBlockType(b.type) === "quizMultiSelect");
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

  return (
    <div className={`space-y-3 text-[15px] leading-relaxed ${className}`}>
      {(blocks || []).map((block) => {
        const type = resolveBlockType(block.type);
        const value = getValue(block.blockId);
        const blockKey = block.blockId != null && block.blockId !== "" ? block.blockId : `block-${index}`;
        if (type === "quizSingleSelect") {
          const quiz = getQuizData(block, value);
          const selected = quizState[block.blockId] || "";
          const correctSet = new Set(quiz.correctAnswers);
          return (
            <div key={blockKey} className="space-y-2">
              <p className="text-white font-semibold mb-2">{quiz.question}</p>
              <div className="space-y-2">
                {quiz.options.map((opt, optIndex) => {
                  const isSelected = selected === opt;
                  const isCorrect = showAnswer && correctSet.has(opt);
                  const isWrong = showAnswer && isSelected && !isCorrect;
                  return (
                    <button
                      key={`${blockKey}-opt-${optIndex}`}
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
            </div>
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
            <div key={blockKey} className="space-y-2">
              <p className="text-white font-semibold mb-2">{quiz.question}</p>
              <div className="space-y-2">
                {quiz.options.map((opt, optIndex) => {
                  const isSelected = selected.has(opt);
                  const isCorrect = showAnswer && correctSet.has(opt);
                  const isWrong = showAnswer && isSelected && !isCorrect;
                  const showCheck = isSelected || isCorrect;
                  return (
                    <button
                      key={`${blockKey}-opt-${optIndex}`}
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
            </div>
          );
        }
        if (type === "quizTextAnswer") {
          const quiz = getQuizData(block, value);
          const answer = quizState[block.blockId] || "";
          const correctAnswer = quiz.correctAnswers[0] || "";
          const isCorrect = showAnswer && (quiz.caseSensitive ? answer === correctAnswer : answer.toLowerCase() === correctAnswer.toLowerCase());
          return (
            <div key={blockKey} className="space-y-2">
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
            </div>
          );
        }
        return (
          <div key={blockKey}>
            <BlockDisplay
              block={block}
              value={value}
              mediaCache={mediaCache}
              revealedBlocks={revealedBlocks}
              onToggleReveal={toggleReveal}
            />
          </div>
        );
      })}
      {hasQuiz && !showAnswer && (
        <div className="pt-3 mt-1 border-t border-white/10">
          {quizRevealError && (
            <p className="mb-2 text-center text-sm text-red-300">{quizRevealError}</p>
          )}
          <button
            type="button"
            onClick={handleRevealAnswer}
            className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium rounded-lg bg-accent hover:bg-accent/90 text-white transition-colors"
          >
            <Eye className="w-4 h-4" />
            Reveal answer
          </button>
        </div>
      )}
    </div>
  );
}
