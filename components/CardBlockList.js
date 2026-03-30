"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { normalizeBlockTypeName } from "@/utils/firestore";
import BlockDisplay from "@/components/blocks/BlockDisplay";
import { previewDebugLog } from "@/lib/preview-debug-log";

const safeJsonParse = (value) => {
  if (!value || typeof value !== "string") return null;
  try { return JSON.parse(value); } catch { return null; }
};

const QUIZ_TYPES = new Set(["quizSingleSelect", "quizMultiSelect", "quizTextAnswer"]);

const getQuizData = (block, value) => {
  const rawConfig = block?.configJson ?? block?.config_json ?? value?.configJson;
  // Guard against typeof null === "object" bug
  const config = rawConfig != null && typeof rawConfig === "object" ? rawConfig : safeJsonParse(rawConfig);
  const rawOptions = Array.isArray(config?.options) ? config.options : Array.isArray(value?.items) ? value.items : [];
  const options = rawOptions.map((o) => String(o)).filter(Boolean);
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

function HintSection({ hint }) {
  const [open, setOpen] = useState(false);
  if (!hint) return null;
  return (
    <div className="mt-2 flex flex-col items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center gap-1.5 text-[12px] text-white/30 hover:text-white/60 transition-colors"
      >
        {open ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        {open ? "Hide hint" : "Show hint"}
      </button>
      <AnimatePresence>
        {open && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-[13px] text-white/45 mt-1.5 leading-relaxed overflow-hidden max-w-full text-center"
          >
            {hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Shared block list renderer for card preview and study session.
 *
 * Props:
 *   blocks        — array of block descriptors (blocksSnapshot)
 *   getValue      — (blockId: string) => value object | undefined
 *   mediaCache    — { [mediaId]: media }
 *   revealedBlocks — { [blockId]: boolean }
 *   onToggleReveal — (blockId: string) => void
 *   quizState     — { [blockId]: string | string[] }
 *   onQuizChange  — (blockId: string, value: string | string[]) => void
 *   showAnswer    — boolean — whether quiz answers are revealed (options, text quiz feedback)
 *   openHiddenTextWithQuizReveal — when true (study), tapping global reveal also shows hiddenText;
 *     when false (preview), hiddenText uses only revealedBlocks / per-block tap — separate from quiz reveal
 */
export default function CardBlockList({
  blocks = [],
  getValue,
  mediaCache = {},
  revealedBlocks = {},
  onToggleReveal,
  quizState = {},
  onQuizChange,
  showAnswer = false,
  forceImageAspectRatio = null,
  openHiddenTextWithQuizReveal = true,
  centerBlockContent = true,
  previewTypography = false,
  maxBlocks = null,
  showEmptyState = true,
  previewDebugListLabel = null,
}) {
  const visibleBlocks =
    typeof maxBlocks === "number" && maxBlocks >= 0
      ? blocks.slice(0, maxBlocks)
      : blocks;

  useEffect(() => {
    if (!previewDebugListLabel) return;
    previewDebugLog("blockList", "slice applied", {
      label: previewDebugListLabel,
      totalBlocks: blocks.length,
      maxBlocks,
      renderedCount: visibleBlocks.length,
      hiddenBySlice:
        typeof maxBlocks === "number" && maxBlocks >= 0
          ? Math.max(0, blocks.length - maxBlocks)
          : 0,
    });
  }, [previewDebugListLabel, blocks.length, maxBlocks, visibleBlocks.length]);
  const align = centerBlockContent ? "text-center" : "text-left";
  const justifyQuiz = centerBlockContent ? "justify-center" : "justify-start";
  const effectiveRevealedBlocks = useMemo(() => {
    const next = { ...revealedBlocks };
    if (openHiddenTextWithQuizReveal && showAnswer) {
      for (const b of visibleBlocks) {
        if (normalizeBlockTypeName(b.type) === "hiddenText" && b.blockId) {
          next[b.blockId] = true;
        }
      }
    }
    return next;
  }, [revealedBlocks, openHiddenTextWithQuizReveal, showAnswer, visibleBlocks]);

  const hiddenRevealToggleDisabled =
    openHiddenTextWithQuizReveal && showAnswer;

  if (!visibleBlocks.length) {
    if (!showEmptyState) return null;
    return <p className="text-center text-[13px] text-white/40">This card has no content.</p>;
  }

  return (
    <div className={`w-full space-y-4 ${align}`}>
      {visibleBlocks.map((block, index) => {
        const type = normalizeBlockTypeName(block.type);
        const value = getValue(block.blockId);
        const blockKey = block.blockId != null && block.blockId !== "" ? block.blockId : `block-${index}`;

        // Skip blocks that have no value and no block-level config (except structural types)
        const isStructural = type === "divider" || type === "space";
        const hasBlockConfig = block.configJson != null || block.config_json != null;
        const hasValueConfig = value?.configJson != null;
        if (!value && !isStructural && !hasBlockConfig && !hasValueConfig) return null;

        // ── quizSingleSelect ─────────────────────────────────────────────
        if (type === "quizSingleSelect") {
          const quiz = getQuizData(block, value);
          if (!quiz.options.length) return null;
          const selected = quizState[block.blockId] || "";
          const correctSet = new Set(quiz.correctAnswers);
          return (
            <div key={blockKey} className={`w-full space-y-3 ${align}`}>
              <p className={`text-[15px] font-semibold text-white leading-snug ${align}`}>{quiz.question}</p>
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
                      className={`w-full px-4 py-3 rounded-xl border text-[14px] transition-all flex items-center ${justifyQuiz} gap-3 disabled:cursor-default ${
                        isCorrect
                          ? "border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-200"
                          : isWrong
                            ? "border-red-500/40 bg-red-500/[0.08] text-red-200"
                            : isSelected
                              ? "border-accent/40 bg-accent/[0.08] text-white"
                              : "border-white/[0.08] bg-white/[0.02] text-white/65 hover:border-white/20 hover:bg-white/[0.04] hover:text-white/90"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        isCorrect ? "border-emerald-400 bg-emerald-500" : isWrong ? "border-red-400" : isSelected ? "border-accent bg-accent" : "border-white/25"
                      }`}>
                        {isCorrect && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                        {isWrong && <X className="w-2.5 h-2.5 text-red-300" strokeWidth={3} />}
                      </span>
                      <span className={centerBlockContent ? "text-center" : "text-left"}>{opt}</span>
                    </button>
                  );
                })}
              </div>
              <HintSection hint={quiz.hint} />
            </div>
          );
        }

        // ── quizMultiSelect ──────────────────────────────────────────────
        if (type === "quizMultiSelect") {
          const quiz = getQuizData(block, value);
          if (!quiz.options.length) return null;
          const selected = new Set(quizState[block.blockId] || []);
          const correctSet = new Set(quiz.correctAnswers);
          const toggle = (opt) => {
            if (showAnswer) return;
            const next = new Set(selected);
            if (next.has(opt)) next.delete(opt); else next.add(opt);
            onQuizChange(block.blockId, Array.from(next));
          };
          return (
            <div key={blockKey} className={`w-full space-y-3 ${align}`}>
              <p className={`text-[15px] font-semibold text-white leading-snug ${align}`}>{quiz.question}</p>
              <div className="space-y-2">
                {quiz.options.map((opt, optIndex) => {
                  const isSelected = selected.has(opt);
                  const isCorrect = showAnswer && correctSet.has(opt);
                  const isWrong = showAnswer && isSelected && !isCorrect;
                  return (
                    <button
                      key={`${blockKey}-opt-${optIndex}`}
                      type="button"
                      onClick={() => toggle(opt)}
                      disabled={showAnswer}
                      className={`w-full px-4 py-3 rounded-xl border text-[14px] transition-all flex items-center ${justifyQuiz} gap-3 disabled:cursor-default ${
                        isCorrect
                          ? "border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-200"
                          : isWrong
                            ? "border-red-500/40 bg-red-500/[0.08] text-red-200"
                            : isSelected
                              ? "border-accent/40 bg-accent/[0.08] text-white"
                              : "border-white/[0.08] bg-white/[0.02] text-white/65 hover:border-white/20 hover:bg-white/[0.04] hover:text-white/90"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        isCorrect ? "border-emerald-400 bg-emerald-500" : isWrong ? "border-red-400" : isSelected ? "border-accent bg-accent" : "border-white/25"
                      }`}>
                        {(isSelected || isCorrect) && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </span>
                      <span className={centerBlockContent ? "text-center" : "text-left"}>{opt}</span>
                    </button>
                  );
                })}
              </div>
              <HintSection hint={quiz.hint} />
            </div>
          );
        }

        // ── quizTextAnswer ───────────────────────────────────────────────
        if (type === "quizTextAnswer") {
          const quiz = getQuizData(block, value);
          if (!quiz.correctAnswers.length) return null;
          const answer = quizState[block.blockId] || "";
          const correctAnswer = quiz.correctAnswers[0] || "";
          const isCorrect = showAnswer && (quiz.caseSensitive ? answer === correctAnswer : answer.toLowerCase() === correctAnswer.toLowerCase());
          return (
            <div key={blockKey} className={`w-full space-y-3 ${align}`}>
              <p className={`text-[15px] font-semibold text-white leading-snug ${align}`}>{quiz.question}</p>
              <input
                type="text"
                value={answer}
                onChange={(e) => onQuizChange(block.blockId, e.target.value)}
                disabled={showAnswer}
                placeholder="Type your answer…"
                className={`w-full px-4 py-3 rounded-xl border text-[14px] ${centerBlockContent ? "text-center" : "text-left"} text-white placeholder-white/20 focus:outline-none transition-all ${
                  showAnswer
                    ? isCorrect
                      ? "border-emerald-500/40 bg-emerald-500/[0.06]"
                      : "border-red-500/30 bg-red-500/[0.04]"
                    : "border-white/[0.08] bg-white/[0.03] focus:border-accent/50 focus:bg-white/[0.05]"
                }`}
              />
              {/* Fixed-height slot: feedback only mounts after reveal; without reserving space the card grows and padding/scroll jumps */}
              <div className="min-h-[52px]">
                <AnimatePresence mode="popLayout">
                  {showAnswer && correctAnswer && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[13px] text-center ${
                        isCorrect
                          ? "bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-300"
                          : "bg-red-500/[0.07] border border-red-500/20 text-red-300"
                      }`}
                    >
                      {isCorrect
                        ? <Check className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2.5} />
                        : <X className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2.5} />}
                      <span>
                        {isCorrect
                          ? "Correct!"
                          : <><span className="text-white/40">Correct: </span><span className="text-white/80 font-medium">{correctAnswer}</span></>}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <HintSection hint={quiz.hint} />
            </div>
          );
        }

        // ── all other block types → BlockDisplay ─────────────────────────
        return (
          <div key={blockKey} className={`w-full min-w-0 ${align}`}>
            <BlockDisplay
              block={block}
              value={value}
              mediaCache={mediaCache}
              revealedBlocks={effectiveRevealedBlocks}
              onToggleReveal={onToggleReveal}
              forceImageAspectRatio={forceImageAspectRatio}
              revealToggleDisabled={hiddenRevealToggleDisabled}
              previewTypography={previewTypography}
              centerAlign={centerBlockContent}
            />
          </div>
        );
      })}
    </div>
  );
}
