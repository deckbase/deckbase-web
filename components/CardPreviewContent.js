"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, FlipHorizontal } from "lucide-react";
import CardBlockList from "@/components/CardBlockList";

const BLOCK_TYPE_BY_NUM = { 8: "quizMultiSelect", 9: "quizSingleSelect", 10: "quizTextAnswer" };
const resolveBlockType = (type) => {
  if (type == null) return type;
  if (typeof type === "number" && BLOCK_TYPE_BY_NUM[type]) return BLOCK_TYPE_BY_NUM[type];
  if (typeof type === "string" && /^\d+$/.test(type)) return BLOCK_TYPE_BY_NUM[Number(type)] || type;
  return type;
};

const QUIZ_BLOCK_TYPES = new Set(["quizSingleSelect", "quizMultiSelect", "quizTextAnswer"]);
const isQuizBlock = (block) => block && QUIZ_BLOCK_TYPES.has(resolveBlockType(block.type));
const effectivePreviewSide = (block) => block?.side === "back" ? "back" : "front";

export default function CardPreviewContent({ blocks = [], getValue, mediaCache = {}, className = "" }) {
  const [revealedBlocks, setRevealedBlocks] = useState({});
  const [quizState, setQuizState] = useState({});
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizRevealError, setQuizRevealError] = useState("");
  const [flipRevealed, setFlipRevealed] = useState(false);

  const frontBlocks = useMemo(() => (blocks || []).filter((b) => effectivePreviewSide(b) === "front"), [blocks]);
  const backBlocks = useMemo(() => (blocks || []).filter((b) => effectivePreviewSide(b) === "back"), [blocks]);
  const hasFlipBack = backBlocks.length > 0;

  const visibleBlocks = useMemo(() => {
    if (!hasFlipBack) return blocks || [];
    return flipRevealed ? backBlocks : frontBlocks;
  }, [blocks, hasFlipBack, flipRevealed, frontBlocks, backBlocks]);

  const toggleReveal = useCallback((blockId) => {
    setRevealedBlocks((prev) => ({ ...prev, [blockId]: !prev[blockId] }));
  }, []);

  const hasQuiz = useMemo(() => visibleBlocks.some((b) => isQuizBlock(b)), [visibleBlocks]);

  const onQuizChange = (blockId, value) => {
    if (showAnswer) return;
    setQuizRevealError("");
    setQuizState((prev) => ({ ...prev, [blockId]: value }));
  };

  const handleRevealAnswer = () => {
    const multiBlocks = visibleBlocks.filter((b) => resolveBlockType(b.type) === "quizMultiSelect");
    for (const block of multiBlocks) {
      const selected = quizState[block.blockId];
      if (!Array.isArray(selected) || selected.length === 0) {
        setQuizRevealError("Please select at least one option.");
        return;
      }
    }
    setQuizRevealError("");
    setShowAnswer(true);
  };

  const handleToggleFlip = () => {
    setFlipRevealed((v) => !v);
    setShowAnswer(false);
    setQuizRevealError("");
  };

  const sharedListProps = { getValue, mediaCache, revealedBlocks, onToggleReveal: toggleReveal, quizState, onQuizChange, showAnswer };

  const flipCard = hasFlipBack ? (
    <div className="relative mx-auto w-full" style={{ perspective: "1200px" }}>
      <motion.div
        className="relative w-full min-h-[6rem]"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipRevealed ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="w-full" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(0deg) translateZ(1px)" }}>
          <CardBlockList blocks={frontBlocks} {...sharedListProps} />
        </div>
        <div className="absolute top-0 left-0 w-full min-h-full" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(1px)" }}>
          <CardBlockList blocks={backBlocks} {...sharedListProps} />
        </div>
      </motion.div>
    </div>
  ) : null;

  const revealSection = hasQuiz && !showAnswer ? (
    <div className="pt-4 mt-1 border-t border-white/[0.07] space-y-2">
      <AnimatePresence>
        {quizRevealError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-[12px] text-red-400 text-center"
          >
            {quizRevealError}
          </motion.p>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={handleRevealAnswer}
        className="flex items-center justify-center gap-2 w-full py-2.5 text-[13px] font-semibold rounded-xl bg-accent hover:bg-accent/90 text-white transition-colors shadow-[0_0_20px_rgba(35,131,226,0.2)]"
      >
        <Eye className="w-4 h-4" />
        Reveal answer
      </button>
    </div>
  ) : null;

  const flipToggle = hasFlipBack ? (
    <div className="pt-4 mt-1 border-t border-white/[0.07]">
      <button
        type="button"
        onClick={handleToggleFlip}
        className="flex items-center justify-center gap-2 w-full py-2.5 text-[13px] font-medium rounded-xl border border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.05] hover:border-white/[0.15] text-white/60 hover:text-white/90 transition-all"
      >
        <FlipHorizontal className="w-4 h-4" />
        {flipRevealed ? "Show front" : "Show back"}
      </button>
    </div>
  ) : null;

  return (
    <div className={`text-[15px] leading-relaxed ${className}`}>
      {hasFlipBack ? (
        <div className="space-y-4">
          {flipCard}
          {revealSection}
          {flipToggle}
        </div>
      ) : (
        <div className="space-y-4">
          <CardBlockList blocks={blocks || []} {...sharedListProps} />
          {revealSection}
        </div>
      )}
    </div>
  );
}
