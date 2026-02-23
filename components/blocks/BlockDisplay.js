"use client";

import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { BlockTypeNames } from "@/utils/firestore";

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
  const type = blockType(block);
  if (!value && type !== "divider" && type !== "space") return null;

  const commonClass = "mb-4";
  const content = (() => {
    switch (type) {
      case "header1":
        return (
          <h1 className="text-3xl font-bold text-white">
            {value?.text}
          </h1>
        );
      case "header2":
        return (
          <h2 className="text-2xl font-semibold text-white">
            {value?.text}
          </h2>
        );
      case "header3":
        return (
          <h3 className="text-xl font-medium text-white">
            {value?.text}
          </h3>
        );
      case "text":
        return (
          <p className="text-white/80 whitespace-pre-wrap">
            {value?.text}
          </p>
        );
      case "example":
        return (
          <blockquote className="border-l-4 border-accent/50 pl-4 text-white/70 italic">
            {value?.text}
          </blockquote>
        );
      case "hiddenText": {
        const isRevealed = revealedBlocks[block.blockId];
        return (
          <div>
            {onToggleReveal && (
              <button
                type="button"
                onClick={() => onToggleReveal(block.blockId)}
                className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors mb-2"
              >
                {isRevealed ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    <span className="text-sm">Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">Reveal</span>
                  </>
                )}
              </button>
            )}
            <div
              className={`transition-all duration-300 ${
                isRevealed
                  ? "opacity-100 max-h-[500px]"
                  : "opacity-0 max-h-0 overflow-hidden"
              }`}
            >
              <p className="text-white/80 bg-accent/10 p-3 rounded-lg whitespace-pre-wrap">
                {value?.text}
              </p>
            </div>
          </div>
        );
      }
      case "image":
        if (!value?.mediaIds?.length) return null;
        return (
          <div className="grid grid-cols-2 gap-2">
            {value.mediaIds.map((mediaId) => {
              const media = mediaCache[mediaId];
              if (!media?.downloadUrl) return null;
              return (
                <div key={mediaId} className="relative aspect-video">
                  <Image
                    src={media.downloadUrl}
                    alt=""
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
              );
            })}
          </div>
        );
      case "audio":
        if (!value?.mediaIds?.length) return null;
        return (
          <div className="space-y-2">
            {value.mediaIds.map((mediaId) => {
              const media = mediaCache[mediaId];
              if (!media?.downloadUrl) return null;
              return (
                <audio
                  key={mediaId}
                  controls
                  className="w-full rounded-lg bg-white/5 h-10"
                >
                  <source src={media.downloadUrl} />
                </audio>
              );
            })}
          </div>
        );
      case "divider":
        return <hr className="border-white/20 my-6" />;
      case "space":
        return <div style={{ height: 24 }} />;
      case "quizSingleSelect":
      case "quizMultiSelect":
      case "quizTextAnswer":
        try {
          const rawConfig = value?.configJson ?? block?.configJson;
          const config = typeof rawConfig === "string"
            ? JSON.parse(rawConfig || "{}")
            : rawConfig || {};
          const question = config.question || "";
          if (!question) return null;
          return (
            <div className="text-white/80">
              <p className="font-medium mb-2">{question}</p>
              {config.options && (
                <ul className="list-disc list-inside text-white/60 text-sm">
                  {config.options.filter(Boolean).map((opt, i) => (
                    <li key={i}>{opt}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        } catch {
          return null;
        }
      default:
        return value?.text ? (
          <p className="text-white/80">{value.text}</p>
        ) : null;
    }
  })();

  if (content === null) return null;
  if (type === "divider" || type === "space")
    return <div key={block.blockId}>{content}</div>;

  return (
    <div key={block.blockId} className={commonClass}>
      {content}
    </div>
  );
}
