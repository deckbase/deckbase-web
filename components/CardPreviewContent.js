"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, FlipHorizontal } from "lucide-react";
import CardBlockList from "@/components/CardBlockList";
import { normalizeBlockTypeName } from "@/utils/firestore";

const QUIZ_BLOCK_TYPES = new Set(["quizSingleSelect", "quizMultiSelect", "quizTextAnswer"]);
const isQuizBlock = (block) =>
  block && QUIZ_BLOCK_TYPES.has(normalizeBlockTypeName(block.type));
const effectivePreviewSide = (block) => block?.side === "back" ? "back" : "front";

export default function CardPreviewContent({
  blocks = [],
  getValue,
  mediaCache = {},
  className = "",
  forceImageAspectRatio = null,
  /**
   * Built-in template library preview: hide top borders above quiz / flip controls so they are not mistaken for a divider block.
   */
  libraryPreview = false,
  /** Optional ref on the root wrapper (phone preview layout debugging). */
  contentRef = null,
}) {
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
    const multiBlocks = visibleBlocks.filter(
      (b) => normalizeBlockTypeName(b.type) === "quizMultiSelect",
    );
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

  const sharedListProps = {
    getValue,
    mediaCache,
    revealedBlocks,
    onToggleReveal: toggleReveal,
    quizState,
    onQuizChange,
    showAnswer,
    forceImageAspectRatio,
    /** Preview: quiz “Reveal answer” must not auto-open hiddenText — use Tap to reveal only */
    openHiddenTextWithQuizReveal: false,
  };

  /**
   * Flip layout: both faces sit in one CSS grid cell so row height = max(front, back).
   * The old absolute back face only matched the front height and let tall backs overflow,
   * overlapping the quiz / flip controls below.
   * Face toggle: top-left chip (not a content block).
   */
  const flipCard = hasFlipBack ? (
    <div
      className="relative mx-auto flex min-h-0 w-full min-w-0 flex-1 flex-col justify-center"
      style={{ perspective: "1200px" }}
    >
      <button
        type="button"
        onClick={handleToggleFlip}
        className="absolute left-0 top-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.08] px-2.5 py-1.5 text-[11px] font-semibold text-white/85 shadow-[0_1px_3px_rgba(0,0,0,0.35)] backdrop-blur-md transition-colors hover:bg-white/[0.12] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        aria-label={flipRevealed ? "Show front of card" : "Show back of card"}
      >
        <FlipHorizontal className="h-3.5 w-3.5 shrink-0 text-white/90" strokeWidth={2.2} />
        {flipRevealed ? "Front" : "Back"}
      </button>
      <motion.div
        className="relative grid w-full min-w-0 min-h-[6rem] grid-cols-1 grid-rows-1 [transform-style:preserve-3d] px-1 pt-14 pb-2"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipRevealed ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <div
          className="col-start-1 row-start-1 flex min-h-[6rem] w-full min-w-0 flex-col justify-center text-center"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(0deg) translateZ(1px)",
          }}
        >
          <CardBlockList blocks={frontBlocks} {...sharedListProps} />
        </div>
        <div
          className="col-start-1 row-start-1 flex min-h-[6rem] w-full min-w-0 flex-col justify-center text-center"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg) translateZ(1px)",
          }}
        >
          <CardBlockList blocks={backBlocks} {...sharedListProps} />
        </div>
      </motion.div>
    </div>
  ) : null;

  const chromeSep =
    libraryPreview ? "pt-3 mt-0" : "pt-4 mt-1 border-t border-white/[0.07]";

  const revealSection = hasQuiz ? (
    <div className={`${chromeSep} space-y-2`}>
      <div className="h-4 flex items-center justify-center">
        <AnimatePresence>
          {quizRevealError && !showAnswer && (
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
      </div>
      <div className="h-[42px]">
        <button
          type="button"
          onClick={handleRevealAnswer}
          disabled={showAnswer}
          className={`flex items-center justify-center gap-2 w-full py-2.5 text-[13px] font-semibold rounded-xl bg-accent text-white transition-colors shadow-[0_0_20px_rgba(35,131,226,0.2)] ${
            showAnswer
              ? "opacity-0 pointer-events-none"
              : "hover:bg-accent/90"
          }`}
          aria-hidden={showAnswer}
        >
          <Eye className="w-4 h-4" />
          Reveal answer
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div
      ref={contentRef}
      className={`text-center text-[15px] leading-relaxed min-h-0 min-w-0 flex-1 overflow-x-hidden flex flex-col ${
        hasFlipBack ? "" : "justify-center"
      } ${className}`}
    >
      {hasFlipBack ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-4">
          {flipCard}
          {revealSection}
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
