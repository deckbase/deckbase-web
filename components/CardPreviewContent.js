"use client";

import { useState, useMemo, useCallback, useRef, useEffect, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, FlipHorizontal } from "lucide-react";
import CardBlockList from "@/components/CardBlockList";
import PreviewSrsBar from "@/components/PreviewSrsBar";
import { normalizeBlockTypeName } from "@/utils/firestore";
import { PREVIEW_LAYOUT } from "@/lib/card-preview-layout";
import { previewDebugLog, previewDebugLogVerbose } from "@/lib/preview-debug-log";

const QUIZ_BLOCK_TYPES = new Set(["quizSingleSelect", "quizMultiSelect", "quizTextAnswer"]);
const isQuizBlock = (block) =>
  block && QUIZ_BLOCK_TYPES.has(normalizeBlockTypeName(block.type));
const effectivePreviewSide = (block) => (block?.side === "back" ? "back" : "front");

function shouldIgnoreFlipTarget(target) {
  if (!target || typeof target.closest !== "function") return false;
  return Boolean(
    target.closest(
      "button, a, input, textarea, select, audio, [role='slider'], [role='button'], [data-flip-ignore]",
    ),
  );
}

export default function CardPreviewContent({
  blocks = [],
  getValue,
  mediaCache = {},
  className = "",
  forceImageAspectRatio = null,
  libraryPreview = false,
  contentRef = null,
  /** Firestore card — SRS chips when set */
  card = null,
  /** Deck preview route: match mobile FlashcardView */
  mobileDeckPreview = false,
  /** Disable inner vertical scroll (pager swipes between cards) */
  disableVerticalScroll = false,
  onOverflowChange = null,
  onRequestReadFull = null,
  /** After "Read full": return to pager (inner scroll off). */
  onExitReadFull = null,
  /** Expanded reader: inset SRS row for close button */
  topLeftOverlayInset = 0,
  centerBlockContent = true,
  /** Notifies parent for Hero / layoutId (`front` | `back`). */
  onFlipFaceChange = null,
  /** Deck pager: when true, this card is the visible slide — becomes false when user swipes away. */
  pagerActive = true,
  /** Optional label for preview debug logs (e.g. cardId). */
  previewDebugLabel = null,
}) {
  /** Inner scroll on (Read full): compact column so content scrolls inside the card, not past the window. */
  const scrollInsideCard = !disableVerticalScroll && mobileDeckPreview;
  const [revealedBlocks, setRevealedBlocks] = useState({});
  const [quizState, setQuizState] = useState({});
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizRevealError, setQuizRevealError] = useState("");
  const [flipRevealed, setFlipRevealed] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [compactBlockLimit, setCompactBlockLimit] = useState(null);
  const scrollRef = useRef(null);
  const compactBlockLimitRef = useRef(null);
  const compactTrimModeRef = useRef(false);
  const resizeTickRef = useRef(0);
  const prevPagerActiveRef = useRef(null);
  const onFlipFaceChangeRef = useRef(onFlipFaceChange);
  onFlipFaceChangeRef.current = onFlipFaceChange;

  useEffect(() => {
    if (
      mobileDeckPreview &&
      pagerActive &&
      prevPagerActiveRef.current !== true
    ) {
      setFlipRevealed(false);
      setShowAnswer(false);
      setQuizRevealError("");
      setRevealedBlocks({});
      onFlipFaceChangeRef.current?.("front");
    }
    prevPagerActiveRef.current = pagerActive;
  }, [pagerActive, mobileDeckPreview]);

  const frontBlocks = useMemo(
    () => (blocks || []).filter((b) => effectivePreviewSide(b) === "front"),
    [blocks],
  );
  const backBlocks = useMemo(
    () => (blocks || []).filter((b) => effectivePreviewSide(b) === "back"),
    [blocks],
  );
  const hasFlipBack = backBlocks.length > 0;
  const compactTrimMode = mobileDeckPreview && disableVerticalScroll;
  compactTrimModeRef.current = compactTrimMode;

  const visibleBlocks = useMemo(() => {
    if (!hasFlipBack) return blocks || [];
    return flipRevealed ? backBlocks : frontBlocks;
  }, [blocks, hasFlipBack, flipRevealed, frontBlocks, backBlocks]);

  useEffect(() => {
    if (!compactTrimMode) {
      previewDebugLog("content", "compactBlockLimit: clear (not compact trim mode)", {
        label: previewDebugLabel,
        compactTrimMode,
      });
      setCompactBlockLimit(null);
      return;
    }
    previewDebugLog("content", "compactBlockLimit: reset to visible count", {
      label: previewDebugLabel,
      nextLimit: visibleBlocks.length,
      visibleBlockCount: visibleBlocks.length,
    });
    setCompactBlockLimit(visibleBlocks.length);
  }, [compactTrimMode, visibleBlocks, previewDebugLabel]);

  /**
   * While compact trim is on, never pass maxBlocks=null to CardBlockList: that means "unlimited".
   * After Read full, `compactBlockLimit` is cleared to null until the reset effect runs; one frame
   * with null made the list render all blocks (full scrollHeight), then the trimmer over-cut.
   */
  const effectiveCompactLimit = useMemo(() => {
    if (!compactTrimMode) return null;
    if (typeof compactBlockLimit === "number") return compactBlockLimit;
    return visibleBlocks.length;
  }, [compactTrimMode, compactBlockLimit, visibleBlocks.length]);

  compactBlockLimitRef.current = effectiveCompactLimit;

  const prevDisableScrollRef = useRef(disableVerticalScroll);
  useLayoutEffect(() => {
    if (!mobileDeckPreview) return;
    const prev = prevDisableScrollRef.current;
    prevDisableScrollRef.current = disableVerticalScroll;
    if (prev === false && disableVerticalScroll === true && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
      previewDebugLog("content", "collapse: scrollTop reset to 0", {
        label: previewDebugLabel,
      });
    }
  }, [disableVerticalScroll, mobileDeckPreview, previewDebugLabel]);

  const toggleReveal = useCallback((blockId) => {
    setRevealedBlocks((prev) => ({ ...prev, [blockId]: !prev[blockId] }));
  }, []);

  const hasQuiz = useMemo(() => visibleBlocks.some((b) => isQuizBlock(b)), [visibleBlocks]);

  /** True when compact mode hid one or more blocks; overflow is cleared by trimming so we still need Read full. */
  const hasTrimmedBlocks = useMemo(
    () =>
      compactTrimMode &&
      typeof compactBlockLimit === "number" &&
      compactBlockLimit < visibleBlocks.length,
    [compactTrimMode, compactBlockLimit, visibleBlocks.length],
  );

  useEffect(() => {
    onOverflowChange?.(hasOverflow || hasTrimmedBlocks);
  }, [onOverflowChange, hasOverflow, hasTrimmedBlocks]);

  const prevDiagKeyRef = useRef("");
  useEffect(() => {
    const key = [
      previewDebugLabel,
      String(disableVerticalScroll),
      String(scrollInsideCard),
      String(compactBlockLimit),
      String(visibleBlocks.length),
      String(hasTrimmedBlocks),
      String(hasOverflow),
      String(pagerActive),
      String(flipRevealed),
    ].join("|");
    if (prevDiagKeyRef.current === key) return;
    prevDiagKeyRef.current = key;
    previewDebugLog("content", "diagnostics changed", {
      label: previewDebugLabel,
      pagerActive,
      disableVerticalScroll,
      scrollInsideCard,
      compactTrimMode,
      compactBlockLimit,
      visibleBlockCount: visibleBlocks.length,
      hasTrimmedBlocks,
      hasOverflow,
      flipRevealed,
    });
  }, [
    previewDebugLabel,
    pagerActive,
    disableVerticalScroll,
    scrollInsideCard,
    compactTrimMode,
    compactBlockLimit,
    visibleBlocks.length,
    hasTrimmedBlocks,
    hasOverflow,
    flipRevealed,
  ]);

  useEffect(() => {
    if (!previewDebugLabel) return;
    previewDebugLog("content", "compactBlockLimit state committed", {
      label: previewDebugLabel,
      compactBlockLimit,
      visibleBlockCount: visibleBlocks.length,
      disableVerticalScroll,
      scrollInsideCard,
    });
  }, [previewDebugLabel, compactBlockLimit, visibleBlocks.length, disableVerticalScroll, scrollInsideCard]);

  useLayoutEffect(() => {
    if (!previewDebugLabel) return;
    const el = scrollRef.current;
    if (!el) return;
    previewDebugLog("content", "layout: scroll region after commit", {
      label: previewDebugLabel,
      compactBlockLimit,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      offsetHeight: el.offsetHeight,
      overflowY: el.scrollHeight - el.clientHeight > 1,
    });
  }, [
    previewDebugLabel,
    compactBlockLimit,
    disableVerticalScroll,
    scrollInsideCard,
    visibleBlocks.length,
    flipRevealed,
    showAnswer,
  ]);

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

  const handleToggleFlip = useCallback(() => {
    setFlipRevealed((v) => {
      const next = !v;
      onFlipFaceChangeRef.current?.(next ? "back" : "front");
      return next;
    });
    setShowAnswer(false);
    setQuizRevealError("");
  }, []);

  const prevReportedOverflowRef = useRef(null);
  useEffect(() => {
    prevReportedOverflowRef.current = null;
  }, [compactTrimMode, scrollInsideCard, previewDebugLabel]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      resizeTickRef.current += 1;
      const tick = resizeTickRef.current;
      const limitNow = compactBlockLimitRef.current;
      const trimNow = compactTrimModeRef.current;
      const overflowY = el.scrollHeight - el.clientHeight > 1;
      const delta = el.scrollHeight - el.clientHeight;

      previewDebugLogVerbose("content", "resize tick", {
        label: previewDebugLabel,
        tick,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        delta,
        overflowY,
        compactTrimMode: trimNow,
        compactBlockLimit: limitNow,
      });

      if (trimNow && overflowY && typeof limitNow === "number" && limitNow > 0) {
        previewDebugLog("content", "resize: trim one block", {
          label: previewDebugLabel,
          tick,
          beforeLimit: limitNow,
          nextLimit: limitNow - 1,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          delta,
        });
        setCompactBlockLimit((prev) => {
          const next = typeof prev === "number" && prev > 0 ? prev - 1 : prev;
          if (prev !== next) {
            previewDebugLog("content", "trim: setCompactBlockLimit", {
              label: previewDebugLabel,
              prev,
              next,
            });
          }
          return next;
        });
        return;
      }
      if (prevReportedOverflowRef.current !== overflowY) {
        prevReportedOverflowRef.current = overflowY;
        previewDebugLog("content", "resize: overflow changed", {
          label: previewDebugLabel,
          tick,
          overflowY,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          delta,
          compactTrimMode: trimNow,
          compactBlockLimit: limitNow,
        });
      }
      setHasOverflow(overflowY);
    };
    previewDebugLog("content", "resize observer: (re)subscribe", {
      label: previewDebugLabel,
      compactTrimMode,
      compactBlockLimit,
    });
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [visibleBlocks, blocks, showAnswer, flipRevealed, compactTrimMode, compactBlockLimit, previewDebugLabel]);

  const handleCardPointerUp = useCallback(
    (e) => {
      if (!hasFlipBack || !mobileDeckPreview) return;
      if (e.button !== 0 && e.pointerType === "mouse") return;
      if (shouldIgnoreFlipTarget(e.target)) return;
      handleToggleFlip();
    },
    [hasFlipBack, mobileDeckPreview, handleToggleFlip],
  );

  const sharedListProps = {
    getValue,
    mediaCache,
    revealedBlocks,
    onToggleReveal: toggleReveal,
    quizState,
    onQuizChange,
    showAnswer,
    forceImageAspectRatio,
    openHiddenTextWithQuizReveal: false,
    previewTypography: mobileDeckPreview,
    maxBlocks: compactTrimMode ? effectiveCompactLimit : null,
    showEmptyState: !(
      compactTrimMode &&
      disableVerticalScroll &&
      (hasOverflow || hasTrimmedBlocks)
    ),
    previewDebugListLabel:
      previewDebugLabel && !hasFlipBack ? `${previewDebugLabel}:single` : undefined,
  };

  const flipCard = hasFlipBack ? (
    <div
      className={`relative mx-auto flex min-h-0 w-full min-w-0 flex-1 flex-col ${
        scrollInsideCard ? "justify-start" : "justify-center"
      }`}
      style={{ perspective: "1200px" }}
    >
      <motion.div
        className="relative grid w-full min-w-0 min-h-[4rem] grid-cols-1 grid-rows-1 [transform-style:preserve-3d] px-0 pb-10 pt-1"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipRevealed ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <div
          className="col-start-1 row-start-1 flex min-h-[4rem] w-full min-w-0 flex-col justify-center"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(0deg) translateZ(1px)",
          }}
        >
          <div
            className={
              centerBlockContent && !scrollInsideCard
                ? "flex min-h-[min(100%,24rem)] w-full flex-col justify-center"
                : "flex w-full min-h-0 flex-col justify-start"
            }
          >
            <CardBlockList
              blocks={frontBlocks}
              {...sharedListProps}
              centerBlockContent={centerBlockContent}
              previewDebugListLabel={
                previewDebugLabel ? `${previewDebugLabel}:flip-front` : undefined
              }
            />
          </div>
        </div>
        <div
          className="col-start-1 row-start-1 flex min-h-[4rem] w-full min-w-0 flex-col justify-center"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg) translateZ(1px)",
          }}
        >
          <div
            className={
              centerBlockContent && !scrollInsideCard
                ? "flex min-h-[min(100%,24rem)] w-full flex-col justify-center"
                : "flex w-full min-h-0 flex-col justify-start"
            }
          >
            <CardBlockList
              blocks={backBlocks}
              {...sharedListProps}
              centerBlockContent={centerBlockContent}
              previewDebugListLabel={
                previewDebugLabel ? `${previewDebugLabel}:flip-back` : undefined
              }
            />
          </div>
        </div>
      </motion.div>
      {mobileDeckPreview && (
        <span
          className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/70"
          aria-hidden
        >
          {flipRevealed ? "Back" : "Front"}
        </span>
      )}
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
            showAnswer ? "opacity-0 pointer-events-none" : "hover:bg-accent/90"
          }`}
          aria-hidden={showAnswer}
        >
          <Eye className="w-4 h-4" />
          Reveal answer
        </button>
      </div>
    </div>
  ) : null;

  const blocksColumn =
    hasFlipBack ? (
      <div
        className={`flex min-h-0 flex-1 flex-col gap-4 ${
          scrollInsideCard ? "justify-start" : "justify-center"
        }`}
      >
        {flipCard}
        {revealSection}
      </div>
    ) : (
      <div className="space-y-4">
        <div
          className={
            centerBlockContent && !scrollInsideCard
              ? "flex min-h-[min(100%,20rem)] w-full flex-col justify-center"
              : "w-full min-h-0"
          }
        >
          <CardBlockList blocks={blocks || []} {...sharedListProps} centerBlockContent={centerBlockContent} />
        </div>
        {revealSection}
      </div>
    );

  if (mobileDeckPreview) {
    return (
      <div
        ref={contentRef}
        data-preview-card-root
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden text-[15px] leading-relaxed ${
          scrollInsideCard ? "h-full max-h-full" : "h-full"
        } ${className}`}
        onPointerUp={handleCardPointerUp}
        style={{ touchAction: disableVerticalScroll ? "pan-x" : undefined }}
      >
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden px-6"
          style={{ paddingTop: PREVIEW_LAYOUT.cardInnerPadding, paddingBottom: PREVIEW_LAYOUT.cardInnerPadding }}
        >
          <PreviewSrsBar card={card} topLeftOverlayInset={topLeftOverlayInset} />
          <div
            ref={scrollRef}
            className={`flex min-h-0 flex-1 flex-col ${
              disableVerticalScroll ? "overflow-hidden" : "overflow-y-auto overscroll-y-contain"
            }`}
          >
            {blocksColumn}
          </div>
        </div>
        {(hasOverflow || hasTrimmedBlocks) && disableVerticalScroll && onRequestReadFull && (
          <div className="pointer-events-auto flex-shrink-0 border-t border-white/[0.06] px-4 py-2">
            <button
              type="button"
              data-flip-ignore
              onClick={onRequestReadFull}
              className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] py-2.5 text-[12px] font-semibold text-white/80 transition-colors hover:bg-white/[0.07]"
              aria-label="Read full card content"
            >
              Read full
            </button>
          </div>
        )}
        {!disableVerticalScroll && onExitReadFull && (
          <div className="pointer-events-auto flex-shrink-0 border-t border-white/[0.06] px-4 py-2">
            <button
              type="button"
              data-flip-ignore
              onClick={onExitReadFull}
              className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] py-2.5 text-[12px] font-semibold text-white/80 transition-colors hover:bg-white/[0.07]"
              aria-label="Collapse card and return to deck swipe"
            >
              Collapse
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={contentRef}
      className={`text-center text-[15px] leading-relaxed min-h-0 min-w-0 flex-1 overflow-x-hidden flex flex-col ${
        hasFlipBack ? "" : "justify-center"
      } ${className}`}
    >
      {hasFlipBack ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-4">
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
                <CardBlockList
                  blocks={frontBlocks}
                  {...sharedListProps}
                  centerBlockContent
                  previewDebugListLabel={
                    previewDebugLabel ? `${previewDebugLabel}:flip-front` : undefined
                  }
                />
              </div>
              <div
                className="col-start-1 row-start-1 flex min-h-[6rem] w-full min-w-0 flex-col justify-center text-center"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg) translateZ(1px)",
                }}
              >
                <CardBlockList
                  blocks={backBlocks}
                  {...sharedListProps}
                  centerBlockContent
                  previewDebugListLabel={
                    previewDebugLabel ? `${previewDebugLabel}:flip-back` : undefined
                  }
                />
              </div>
            </motion.div>
          </div>
          {revealSection}
        </div>
      ) : (
        <div className="space-y-4">
          <CardBlockList blocks={blocks || []} {...sharedListProps} centerBlockContent />
          {revealSection}
        </div>
      )}
    </div>
  );
}
