"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { BlockTypeNames } from "@/utils/firestore";
import { getCropAspectFromConfig } from "@/lib/image-block-config";

// Normalize block type (Firestore/templates may use numeric or string "7" etc.)
const blockType = (block) => {
  const t = block?.type;
  if (t == null) return t;
  if (typeof t === "number" && BlockTypeNames[t] != null) return BlockTypeNames[t];
  if (typeof t === "string" && /^\d+$/.test(t)) {
    const name = BlockTypeNames[Number(t)];
    return name != null ? name : t;
  }
  return t;
};

function BlockDisplayAudio({ value, mediaCache }) {
  const [audioSrcByMediaId, setAudioSrcByMediaId] = useState({});
  const [loadingMediaIds, setLoadingMediaIds] = useState(() => new Set());
  const objectUrlsRef = useRef({});

  useEffect(() => {
    const mediaIds = value?.mediaIds ?? [];
    const hasAllMedia = mediaIds.length > 0 && mediaIds.every((id) => mediaCache[id]?.downloadUrl);
    if (!hasAllMedia) return;

    let cancelled = false;
    const prev = objectUrlsRef.current;
    objectUrlsRef.current = {};
    Object.values(prev).forEach((u) => URL.revokeObjectURL(u));

    const load = async () => {
      for (const mediaId of mediaIds) {
        const media = mediaCache[mediaId];
        if (!media?.downloadUrl || cancelled) continue;
        setLoadingMediaIds((prev) => new Set(prev).add(mediaId));
        try {
          const res = await fetch("/api/proxy-media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: media.downloadUrl }),
          });
          if (!res.ok || cancelled) return;
          const blob = await res.blob();
          if (cancelled) return;
          const objectUrl = URL.createObjectURL(blob);
          objectUrlsRef.current[mediaId] = objectUrl;
          setAudioSrcByMediaId((prev) => ({ ...prev, [mediaId]: objectUrl }));
        } catch (err) {
          console.warn("[BlockDisplayAudio] preload failed", mediaId, err);
        } finally {
          if (!cancelled) {
            setLoadingMediaIds((prev) => {
              const next = new Set(prev);
              next.delete(mediaId);
              return next;
            });
          }
        }
      }
    };
    load();

    return () => {
      cancelled = true;
      Object.values(objectUrlsRef.current).forEach((u) => URL.revokeObjectURL(u));
      objectUrlsRef.current = {};
    };
  }, [
    value?.mediaIds?.join(","),
    (value?.mediaIds ?? []).map((id) => (mediaCache[id]?.downloadUrl ? "1" : "0")).join(","),
  ]);

  return (
    <div className="space-y-2">
      {value.mediaIds.map((mediaId) => {
        const media = mediaCache[mediaId];
        if (!media?.downloadUrl) return null;
        const src = audioSrcByMediaId[mediaId];
        const isLoading = loadingMediaIds.has(mediaId);
        return (
          <div key={mediaId} className="flex items-center gap-2">
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-accent rounded-full animate-spin flex-shrink-0" aria-hidden />
            )}
            <audio
              src={src ?? undefined}
              controls
              className="flex-1 min-w-0 h-8"
              style={{ colorScheme: "dark" }}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Read-only display of a single card block.
 * Used by Card Preview (and can be reused elsewhere).
 * Does not include animation; wrap in motion.div in the parent if needed.
 */
export default function BlockDisplay({
  block,
  value,
  mediaCache = {},
  revealedBlocks = {},
  onToggleReveal,
  forceImageAspectRatio = null,
  /** When true, hidden-text reveal toggle is disabled (e.g. quiz global reveal in study). */
  revealToggleDisabled = false,
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const swipeStartRef = useRef(null);

  const handleSwipeStart = useCallback((clientX) => {
    swipeStartRef.current = { x: clientX };
  }, []);
  const handleSwipeEnd = useCallback((clientX, total, currentIndex, setIndex) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (start == null || total <= 1) return;
    const deltaX = start.x - clientX;
    const threshold = 50;
    if (deltaX > threshold && currentIndex < total - 1) setIndex((i) => Math.min(total - 1, i + 1));
    else if (deltaX < -threshold && currentIndex > 0) setIndex((i) => Math.max(0, i - 1));
  }, []);

  const type = blockType(block);
  if (!value && type !== "divider" && type !== "space") return null;

  const content = (() => {
    switch (type) {
      case "header1":
        return (
          <h1 className="text-[22px] font-bold text-white leading-tight tracking-tight">
            {value?.text}
          </h1>
        );
      case "header2":
        return (
          <h2 className="text-[18px] font-semibold text-white leading-snug">
            {value?.text}
          </h2>
        );
      case "header3":
        return (
          <h3 className="text-[15px] font-semibold text-white/85 leading-snug">
            {value?.text}
          </h3>
        );
      case "text":
        return (
          <p className="text-[14px] text-white/70 whitespace-pre-wrap leading-relaxed">
            {value?.text}
          </p>
        );
      case "example":
        return (
          <div className="flex gap-3 px-4 py-3 rounded-xl border border-white/[0.07] bg-white/[0.02]">
            <div className="w-0.5 rounded-full bg-accent/40 flex-shrink-0 self-stretch" />
            <p className="text-[14px] text-white/60 italic leading-relaxed">{value?.text}</p>
          </div>
        );
      case "hiddenText": {
        const isRevealed = revealedBlocks[block.blockId];
        return (
          <div className="relative">
            {/* Top hairline — subtle “vault” frame */}
            <div
              className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
              aria-hidden
            />
            <div
              role="region"
              aria-label="Hidden answer"
              className={[
                "relative overflow-hidden rounded-2xl border border-white/[0.09]",
                "bg-gradient-to-br from-white/[0.07] via-white/[0.02] to-black/50",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_40px_rgba(0,0,0,0.45)]",
              ].join(" ")}
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-[0.14] mix-blend-overlay"
                style={{
                  backgroundImage:
                    "radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)",
                  backgroundSize: "5px 5px",
                }}
                aria-hidden
              />

              {onToggleReveal && (
                <button
                  type="button"
                  onClick={() => onToggleReveal(block.blockId)}
                  disabled={revealToggleDisabled}
                  className={[
                    "relative z-[1] w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors",
                    isRevealed
                      ? "border-b border-white/[0.07] hover:bg-white/[0.04]"
                      : "hover:bg-white/[0.05] active:bg-white/[0.07]",
                    revealToggleDisabled ? "cursor-not-allowed opacity-70" : "",
                  ].join(" ")}
                  aria-expanded={isRevealed}
                  aria-controls={`hidden-text-${block.blockId}`}
                >
                  <span
                    className={[
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      isRevealed
                        ? "bg-white/[0.06] ring-1 ring-white/10 text-white/45"
                        : "bg-accent/12 ring-1 ring-accent/35 text-accent",
                    ].join(" ")}
                  >
                    {isRevealed ? (
                      <EyeOff className="h-4 w-4" strokeWidth={2.2} />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={2.2} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">
                      Hidden answer
                    </span>
                    <span className="mt-0.5 block text-[13px] font-medium text-white/80">
                      {isRevealed ? "Visible — tap to hide" : "Tap to reveal"}
                    </span>
                    {revealToggleDisabled && (
                      <span className="mt-1 block text-[11px] text-white/30">
                        Shown with quiz reveal
                      </span>
                    )}
                  </span>
                  <span
                    className={[
                      "shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
                      isRevealed ? "bg-white/[0.06] text-white/45" : "bg-accent/15 text-accent/90",
                    ].join(" ")}
                  >
                    {isRevealed ? "Hide" : "Reveal"}
                  </span>
                </button>
              )}

              <AnimatePresence initial={false}>
                {isRevealed && (
                  <motion.div
                    id={`hidden-text-${block.blockId}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                    className="relative z-[1] overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-1">
                      <div className="relative rounded-xl border border-white/[0.06] bg-black/35 pl-4 pr-3 py-3.5 backdrop-blur-[2px]">
                        <div
                          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-accent via-accent/75 to-accent/35"
                          aria-hidden
                        />
                        <p className="pl-2 text-[14px] leading-relaxed tracking-[0.01em] text-white/[0.88] whitespace-pre-wrap">
                          {value?.text || "No answer provided."}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      }
      case "image": {
        if (!value?.mediaIds?.length) return null;
        const rawConfig = block?.configJson ?? block?.config_json;
        let config = null;
        if (typeof rawConfig === "object" && rawConfig !== null) {
          config = rawConfig;
        } else if (typeof rawConfig === "string") {
          try {
            config = JSON.parse(rawConfig);
          } catch {
            config = null;
          }
        }
        const cropAspect =
          typeof forceImageAspectRatio === "number" && forceImageAspectRatio > 0
            ? forceImageAspectRatio
            : getCropAspectFromConfig(config);
        const mediaIds = value.mediaIds.filter((id) => mediaCache[id]?.downloadUrl);
        if (!mediaIds.length) return null;
        const total = mediaIds.length;
        const showCarousel = total > 1;
        const currentIndex = showCarousel ? Math.min(imageIndex, total - 1) : 0;
        const currentMedia = mediaCache[mediaIds[currentIndex]];

        return (
          <div className="flex flex-col gap-2 w-[calc(100%+2.5rem)] max-w-none -mx-5">
            <div
              className={`relative w-full overflow-hidden rounded-xl ${showCarousel ? "touch-pan-y cursor-grab active:cursor-grabbing select-none" : ""}`}
              style={{ aspectRatio: cropAspect }}
              role="region"
              aria-label={showCarousel ? "Image carousel - swipe or use arrows to change image" : "Card image"}
              onPointerDown={
                showCarousel
                  ? (e) => {
                      // Don't capture when tapping nav buttons — capture steals pointerup and breaks onClick
                      if (e.target.closest?.("button")) return;
                      e.currentTarget.setPointerCapture(e.pointerId);
                      handleSwipeStart(e.clientX);
                    }
                  : undefined
              }
              onPointerUp={
                showCarousel
                  ? (e) => {
                      try {
                        if (typeof e.currentTarget.hasPointerCapture === "function" && e.currentTarget.hasPointerCapture(e.pointerId)) {
                          e.currentTarget.releasePointerCapture(e.pointerId);
                        }
                      } catch {
                        /* release only valid after setPointerCapture */
                      }
                      handleSwipeEnd(e.clientX, total, currentIndex, setImageIndex);
                    }
                  : undefined
              }
              onPointerCancel={showCarousel ? () => { swipeStartRef.current = null; } : undefined}
              onPointerLeave={showCarousel ? () => { swipeStartRef.current = null; } : undefined}
            >
              {currentMedia?.downloadUrl && (
                <div className="absolute inset-0 rounded-xl overflow-hidden">
                  <Image
                    src={currentMedia.downloadUrl}
                    alt=""
                    fill
                    className="object-cover rounded-xl"
                  />
                </div>
              )}
              {showCarousel && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageIndex((i) => Math.max(0, i - 1));
                    }}
                    disabled={currentIndex === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/55 hover:bg-black/75 text-white disabled:opacity-25 disabled:pointer-events-none transition-colors shadow-lg pointer-events-auto"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageIndex((i) => Math.min(total - 1, i + 1));
                    }}
                    disabled={currentIndex === total - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/55 hover:bg-black/75 text-white disabled:opacity-25 disabled:pointer-events-none transition-colors shadow-lg pointer-events-auto"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
            {showCarousel && (
              <div className="flex gap-1.5 justify-center px-2" role="tablist" aria-label="Image index">
                {mediaIds.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === currentIndex}
                    onClick={() => setImageIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === currentIndex ? "bg-accent scale-110" : "bg-white/40 hover:bg-white/60"
                    }`}
                    aria-label={`Image ${i + 1} of ${total}`}
                  />
                ))}
              </div>
            )}
          </div>
        );
      }
      case "audio": {
        if (!value?.mediaIds?.length) return null;
        return (
          <BlockDisplayAudio
            value={value}
            mediaCache={mediaCache}
          />
        );
      }
      case "divider":
        return (
          <div className="py-1 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>
        );
      case "space":
        return <div style={{ height: 20 }} />;
      case "quizSingleSelect":
      case "quizMultiSelect":
      case "quizTextAnswer": {
        const rawConfig = value?.configJson ?? block?.configJson ?? block?.config_json;
        try {
          const config = rawConfig != null && typeof rawConfig === "object"
            ? rawConfig
            : (typeof rawConfig === "string" ? JSON.parse(rawConfig || "{}") : {});
          const question = config.question || "";
          const options = Array.isArray(config.options) ? config.options.filter(Boolean) : [];
          if (!question || (type !== "quizTextAnswer" && !options.length)) return null;
          const isMulti = type === "quizMultiSelect";
          return (
            <div className="space-y-2.5">
              <p className="text-[14px] font-semibold text-white leading-snug">{question}</p>
              {options.length > 0 && (
                <div className="space-y-1.5">
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-white/[0.07] bg-white/[0.02]">
                      {isMulti ? (
                        <span className="w-3.5 h-3.5 rounded flex-shrink-0 border border-white/20 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white/20" strokeWidth={3} />
                        </span>
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-white/20" />
                      )}
                      <span className="text-[13px] text-white/60">{opt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        } catch (e) {
          return null;
        }
      }
      default:
        return value?.text ? (
          <p className="text-white/80">{value.text}</p>
        ) : null;
    }
  })();

  if (content === null) return null;
  return <div>{content}</div>;
}
