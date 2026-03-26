"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
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
          <div className="space-y-2">
            {onToggleReveal && (
              <button
                type="button"
                onClick={() => onToggleReveal(block.blockId)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-medium transition-all ${
                  isRevealed
                    ? "border-white/[0.08] bg-white/[0.03] text-white/40 hover:text-white/60"
                    : "border-accent/30 bg-accent/[0.06] text-accent hover:bg-accent/[0.10]"
                }`}
              >
                {isRevealed ? (
                  <><EyeOff className="w-3.5 h-3.5" /><span>Hide</span></>
                ) : (
                  <><Eye className="w-3.5 h-3.5" /><span>Reveal</span></>
                )}
              </button>
            )}
            <div
              className={`transition-all duration-300 overflow-hidden ${
                isRevealed ? "opacity-100 max-h-[500px]" : "opacity-0 max-h-0"
              }`}
            >
              <p className="text-[14px] text-white/75 bg-white/[0.03] border border-white/[0.07] px-4 py-3 rounded-xl whitespace-pre-wrap leading-relaxed">
                {value?.text}
              </p>
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
        const cropAspect = getCropAspectFromConfig(config);
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
