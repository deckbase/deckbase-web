"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Check, X } from "lucide-react";
import BlockDisplay from "@/components/blocks/BlockDisplay";

const safeJsonParse = (value) => {
  if (!value || typeof value !== "string") return null;
  try { return JSON.parse(value); } catch { return null; }
};

const BLOCK_TYPE_BY_NUM = { 8: "quizMultiSelect", 9: "quizSingleSelect", 10: "quizTextAnswer" };
const resolveBlockType = (type) => {
  if (type == null) return type;
  if (typeof type === "number" && BLOCK_TYPE_BY_NUM[type]) return BLOCK_TYPE_BY_NUM[type];
  if (typeof type === "string" && /^\d+$/.test(type)) return BLOCK_TYPE_BY_NUM[Number(type)] || type;
  return type;
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
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[12px] text-white/30 hover:text-white/60 transition-colors"
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
            className="text-[13px] text-white/45 mt-1.5 leading-relaxed overflow-hidden"
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
 *   showAnswer    — boolean — whether answers are revealed
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
}) {
  if (!blocks.length) {
    return <p className="text-[13px] text-white/40">This card has no content.</p>;
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        const type = resolveBlockType(block.type);
        const value = getValue(block.blockId);
        const blockKey = block.blockId != null && block.blockId !== "" ? block.blockId : `block-${index}`;

        // Skip blocks that have no value and no block-level config (except structural types)
        const isStructural = type === "divider" || type === "space";
        const hasBlockConfig = block.configJson != null || block.config_json != null;
        const hasValueConfig = value?.configJson != null;
        if (!value && !isStructural && !hasBlockConfig && !hasValueConfig) return null;

        // ── hiddenText (interactive reveal) ──────────────────────────────
        if (type === "hiddenText") {
          const isRevealed = showAnswer || revealedBlocks[block.blockId];
          return (
            <div key={blockKey} className="space-y-2">
              {onToggleReveal && (
                <button
                  type="button"
                  onClick={() => onToggleReveal(block.blockId)}
                  disabled={showAnswer}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-medium transition-all disabled:cursor-default ${
                    isRevealed
                      ? "border-white/[0.08] bg-white/[0.03] text-white/40"
                      : "border-accent/30 bg-accent/[0.06] text-accent hover:bg-accent/[0.10]"
                  }`}
                >
                  {isRevealed ? <><EyeOff className="w-3.5 h-3.5" /><span>Hide</span></> : <><Eye className="w-3.5 h-3.5" /><span>Tap to reveal</span></>}
                </button>
              )}
              {isRevealed && (
                <p className="text-[14px] text-white/75 bg-white/[0.03] border border-white/[0.07] px-4 py-3 rounded-xl whitespace-pre-wrap leading-relaxed">
                  {value?.text || "No answer provided."}
                </p>
              )}
            </div>
          );
        }

        // ── quizSingleSelect ─────────────────────────────────────────────
        if (type === "quizSingleSelect") {
          const quiz = getQuizData(block, value);
          if (!quiz.options.length) return null;
          const selected = quizState[block.blockId] || "";
          const correctSet = new Set(quiz.correctAnswers);
          return (
            <div key={blockKey} className="space-y-3">
              <p className="text-[15px] font-semibold text-white leading-snug">{quiz.question}</p>
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
                      className={`w-full text-left px-4 py-3 rounded-xl border text-[14px] transition-all flex items-center gap-3 disabled:cursor-default ${
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
                      <span className="flex-1">{opt}</span>
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
            <div key={blockKey} className="space-y-3">
              <p className="text-[15px] font-semibold text-white leading-snug">{quiz.question}</p>
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
                      className={`w-full text-left px-4 py-3 rounded-xl border text-[14px] transition-all flex items-center gap-3 disabled:cursor-default ${
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
                      <span className="flex-1">{opt}</span>
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
            <div key={blockKey} className="space-y-3">
              <p className="text-[15px] font-semibold text-white leading-snug">{quiz.question}</p>
              <input
                type="text"
                value={answer}
                onChange={(e) => onQuizChange(block.blockId, e.target.value)}
                disabled={showAnswer}
                placeholder="Type your answer…"
                className={`w-full px-4 py-3 rounded-xl border text-[14px] text-white placeholder-white/20 focus:outline-none transition-all ${
                  showAnswer
                    ? isCorrect
                      ? "border-emerald-500/40 bg-emerald-500/[0.06]"
                      : "border-red-500/30 bg-red-500/[0.04]"
                    : "border-white/[0.08] bg-white/[0.03] focus:border-accent/50 focus:bg-white/[0.05]"
                }`}
              />
              <AnimatePresence>
                {showAnswer && correctAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] ${
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
              <HintSection hint={quiz.hint} />
            </div>
          );
        }

        // ── all other block types → BlockDisplay ─────────────────────────
        return (
          <div key={blockKey}>
            <BlockDisplay
              block={block}
              value={value}
              mediaCache={mediaCache}
              revealedBlocks={revealedBlocks}
              onToggleReveal={onToggleReveal}
            />
          </div>
        );
      })}
    </div>
  );
}
