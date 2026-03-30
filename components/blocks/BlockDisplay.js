"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, Check, Eye, EyeOff } from "lucide-react";
import { normalizeBlockTypeName } from "@/utils/firestore";
import { getCropAspectFromConfig } from "@/lib/image-block-config";

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
        const rawUrl = media.downloadUrl;
        const url = typeof rawUrl === "string" ? rawUrl.trim() : "";
        /** Firebase Storage URLs need server proxy (CORS); same-origin, data:, and other HTTPS can play directly. */
        const needsProxy =
          url.includes("firebasestorage.googleapis.com") ||
          url.includes("storage.googleapis.com") ||
          url.includes("storage.cloud.google.com");
        if (!needsProxy && url && (url.startsWith("/") || url.startsWith("data:") || /^https?:\/\//i.test(url))) {
          setAudioSrcByMediaId((prev) => ({ ...prev, [mediaId]: url }));
          continue;
        }
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
    <div className="flex w-full flex-col items-center space-y-2">
      {value.mediaIds.map((mediaId) => {
        const media = mediaCache[mediaId];
        if (!media?.downloadUrl) return null;
        const src = audioSrcByMediaId[mediaId];
        const isLoading = loadingMediaIds.has(mediaId);
        return (
          <div key={mediaId} className="flex items-center justify-center gap-2 w-full max-w-full">
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-accent rounded-full animate-spin flex-shrink-0" aria-hidden />
            )}
            <audio
              src={src ?? undefined}
              controls
              className="flex-1 min-w-0 h-8 max-w-md mx-auto"
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
  /** Mobile deck preview: header sizes / line-height (FlashcardView parity). */
  previewTypography = false,
  centerAlign = true,
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

  const type = normalizeBlockTypeName(block?.type);
  const headerWithLabel =
    (type === "header1" || type === "header2" || type === "header3") && block?.label;
  if (!value && type !== "divider" && type !== "space" && !headerWithLabel) return null;

  const content = (() => {
    switch (type) {
      case "header1":
        return (
          <h1
            className={`${centerAlign ? "text-center" : "text-left"} text-white ${
              previewTypography
                ? "text-[42px] font-extrabold leading-[1.05] tracking-[-0.025em]"
                : "text-[22px] font-bold leading-tight tracking-tight"
            }`}
          >
            {value?.text ?? block?.label}
          </h1>
        );
      case "header2":
        return (
          <h2
            className={`${centerAlign ? "text-center" : "text-left"} text-white ${
              previewTypography
                ? "text-[28px] font-bold leading-[1.15] tracking-[-0.015em]"
                : "text-[18px] font-semibold leading-snug"
            }`}
          >
            {value?.text ?? block?.label}
          </h2>
        );
      case "header3":
        return (
          <h3
            className={`${centerAlign ? "text-center" : "text-left"} text-white ${
              previewTypography
                ? "text-[21px] font-bold leading-[1.2] tracking-[-0.0075em]"
                : "text-[15px] font-semibold text-white/85 leading-snug"
            }`}
          >
            {value?.text ?? block?.label}
          </h3>
        );
      case "text":
        if (!value?.text?.trim()) return null;
        return (
          <p
            className={`${centerAlign ? "text-center" : "text-left"} text-[14px] text-white/70 whitespace-pre-wrap leading-relaxed`}
          >
            {value?.text}
          </p>
        );
      case "quote":
      case "example":
        return (
          <div className="px-4 py-3 rounded-xl border border-white/[0.07] bg-white/[0.02] text-center">
            <p className="text-[14px] text-white/60 italic leading-relaxed">{value?.text}</p>
          </div>
        );
      case "hiddenText": {
        const isRevealed = revealedBlocks[block.blockId];
        const textAlign = centerAlign ? "text-center" : "text-left";
        return (
          <div className={`w-full ${textAlign}`}>
            <div
              role="region"
              aria-label="Hidden answer"
              className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0a0c10] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_40px_rgba(0,0,0,0.45)]"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.55]"
                style={{
                  backgroundImage:
                    "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(35,131,226,0.18), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(35,131,226,0.06), transparent 50%)",
                }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
                aria-hidden
              />

              {onToggleReveal && (
                <div className="relative flex justify-center px-3 pt-3 pb-1">
                  <motion.button
                    type="button"
                    onClick={() => onToggleReveal(block.blockId)}
                    disabled={revealToggleDisabled}
                    whileTap={revealToggleDisabled ? undefined : { scale: 0.98 }}
                    whileHover={revealToggleDisabled ? undefined : { scale: 1.015 }}
                    transition={{ type: "spring", stiffness: 520, damping: 28 }}
                    className={[
                      "group relative flex max-w-[min(100%,18rem)] items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium tracking-tight shadow-md transition-colors duration-200",
                      revealToggleDisabled
                        ? "cursor-not-allowed border-white/[0.06] bg-white/[0.04] text-white/35"
                        : isRevealed
                          ? "border-accent/35 bg-accent/12 text-white/95 shadow-[0_0_0_1px_rgba(35,131,226,0.15)]"
                          : "cursor-pointer border-white/[0.12] bg-white/[0.05] text-white/90 hover:border-accent/45 hover:bg-accent/10 hover:text-white hover:shadow-[0_0_16px_rgba(35,131,226,0.12)]",
                    ].join(" ")}
                    aria-expanded={isRevealed}
                    aria-controls={`hidden-text-${block.blockId}`}
                  >
                    <motion.span
                      key={isRevealed ? "eye" : "eye-off"}
                      initial={{ scale: 0.92, opacity: 0.75 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 420, damping: 24 }}
                      className="flex shrink-0"
                      aria-hidden
                    >
                      {isRevealed ? (
                        <Eye className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
                      ) : (
                        <EyeOff
                          className="h-3.5 w-3.5 text-accent/85 transition-colors group-hover:text-accent"
                          strokeWidth={2}
                        />
                      )}
                    </motion.span>
                    <span className="whitespace-nowrap">
                      {isRevealed ? "Hide answer" : "Reveal answer"}
                    </span>
                    {revealToggleDisabled && (
                      <span className="ml-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/38">
                        Quiz
                      </span>
                    )}
                  </motion.button>
                </div>
              )}

              <div
                className={[
                  "overflow-hidden px-3",
                  onToggleReveal ? "pb-3 pt-1" : "py-3",
                  onToggleReveal && !isRevealed ? "h-[5.5rem]" : "min-h-0",
                ].join(" ")}
              >
                <div
                  className={[
                    "relative overflow-hidden rounded-lg bg-gradient-to-b from-white/[0.02] to-black/20",
                    onToggleReveal && !isRevealed ? "h-full" : "min-h-0",
                  ].join(" ")}
                >
                  {!isRevealed && (
                    <div
                      className="pointer-events-none absolute inset-0 z-[1] rounded-lg bg-gradient-to-b from-[#07090d]/92 via-[#0a0c10]/88 to-[#07090d]/95 backdrop-blur-[3px]"
                      aria-hidden
                    />
                  )}
                  <motion.div
                    id={`hidden-text-${block.blockId}`}
                    initial={false}
                    animate={{
                      opacity: isRevealed ? 1 : 0,
                    }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className={[
                      "relative z-0 px-2.5 py-2",
                      onToggleReveal && !isRevealed
                        ? "h-full overflow-hidden"
                        : "max-h-[min(70vh,28rem)] overflow-y-auto",
                      isRevealed ? "pointer-events-auto" : "pointer-events-none select-none",
                    ].join(" ")}
                    aria-hidden={!isRevealed}
                  >
                    <p
                      className={[
                        "text-[13px] leading-relaxed text-white/[0.92] antialiased whitespace-pre-wrap",
                        textAlign,
                      ].join(" ")}
                    >
                      {value?.text || "No answer provided."}
                    </p>
                  </motion.div>
                </div>
              </div>
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
          <div className="flex w-full min-w-0 max-w-full flex-col gap-2">
            <div
              className={`relative w-full min-w-0 max-w-full shrink-0 overflow-hidden rounded-xl ${showCarousel ? "touch-pan-y cursor-grab active:cursor-grabbing select-none" : ""}`}
              style={{
                aspectRatio: cropAspect,
                width: "100%",
              }}
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
                <div className="absolute inset-0 rounded-xl overflow-hidden bg-black/35">
                  <Image
                    src={currentMedia.downloadUrl}
                    alt=""
                    fill
                    className="object-cover object-center rounded-xl"
                    sizes="(max-width: 32rem) 96vw, 32rem"
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
          <div className="flex w-full items-center gap-3 py-1">
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
            <div className="space-y-2.5 text-center">
              <p className="text-[14px] font-semibold text-white leading-snug">{question}</p>
              {options.length > 0 && (
                <div className="space-y-1.5">
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center justify-center gap-2.5 px-3 py-2 rounded-lg border border-white/[0.07] bg-white/[0.02]">
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
          <p className="text-white/80 text-center">{value.text}</p>
        ) : null;
    }
  })();

  if (content === null) return null;
  const isImageBlock = normalizeBlockTypeName(block?.type) === "image";
  return (
    <div
      className={`w-full min-w-0 ${isImageBlock ? "max-w-none" : "text-center"}`}
    >
      {content}
    </div>
  );
}
