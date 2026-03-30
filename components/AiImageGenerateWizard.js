"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Sparkles, ChevronLeft, ChevronRight, Search, ImageIcon, Upload } from "lucide-react";
import { BlockTypeNames } from "@/utils/firestore";
import { TEXT_TO_IMAGE_MODEL_OPTIONS } from "@/lib/fal-image-models";
import {
  buildUnifiedPromptEntries,
  mergeImagePromptParts,
  normalizeMediaTag,
} from "@/lib/unified-prompt-library";
import imageSubjectPromptsJson from "@/data/image-subject-prompts.json";

const STEPS = [
  { id: "main", title: "Main prompt" },
  { id: "library", title: "Prompt library" },
  { id: "preview", title: "Review & tags" },
  { id: "model", title: "Model" },
  { id: "reference", title: "Reference" },
];

const TEXT_BLOCK_TYPES = new Set([
  "header1",
  "header2",
  "header3",
  "text",
  "quote",
  "hiddenText",
  "example",
]);

function normBlockType(t) {
  if (typeof t === "number" && BlockTypeNames[t] != null) return BlockTypeNames[t];
  if (typeof t === "string" && /^\d+$/.test(t)) {
    const n = Number(t);
    return BlockTypeNames[n] != null ? BlockTypeNames[n] : t;
  }
  return t;
}

/**
 * Fixed-step wizard: main → library (multi) → preview + tags → model → reference (optional) → generate.
 */
export default function AiImageGenerateWizard({
  allBlocks,
  allValues,
  defaultSourceBlockId,
  mainBlockId,
  stylePromptLibrary,
  /** Existing images on this block: { id: mediaId, url: downloadUrl }[] */
  referenceImageOptions = [],
  imageCreditsUsed,
  imageCreditsLimit,
  generatingImage,
  generateImageProRequired,
  onGenerate,
}) {
  const [step, setStep] = useState(0);
  const [mainSourceBlockId, setMainSourceBlockId] = useState(
    () => defaultSourceBlockId || mainBlockId || "",
  );
  const [mainEdited, setMainEdited] = useState(false);
  const [mainPrompt, setMainPrompt] = useState(() => {
    const bid = defaultSourceBlockId || mainBlockId;
    if (!bid || !allValues) return "";
    const t = allValues[bid]?.text;
    return typeof t === "string" && t.trim() ? t.trim() : "";
  });

  const [libraryQuery, setLibraryQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("all"); // all | subject | style
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const [previewPrompt, setPreviewPrompt] = useState("");
  const [previewTouched, setPreviewTouched] = useState(false);

  const [tagInput, setTagInput] = useState("");
  const [userTags, setUserTags] = useState([]);

  const [modelId, setModelId] = useState("fal-ai/flux/schnell");

  const [referenceMediaId, setReferenceMediaId] = useState(null);
  const [referenceFile, setReferenceFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);

  useEffect(() => {
    if (!referenceFile) {
      setFilePreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(referenceFile);
    setFilePreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [referenceFile]);

  const unifiedEntries = useMemo(
    () =>
      buildUnifiedPromptEntries(
        Array.isArray(imageSubjectPromptsJson) ? imageSubjectPromptsJson : [],
        stylePromptLibrary?.entries,
      ),
    [stylePromptLibrary?.entries],
  );

  const filteredLibrary = useMemo(() => {
    let list = unifiedEntries;
    if (kindFilter === "subject") list = list.filter((e) => e.kind === "subject");
    if (kindFilter === "style") list = list.filter((e) => e.kind === "style");
    const q = libraryQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((e) => e.searchText.includes(q));
    }
    return list;
  }, [unifiedEntries, kindFilter, libraryQuery]);

  const selectedTexts = useMemo(() => {
    const texts = [];
    for (const id of selectedIds) {
      const e = unifiedEntries.find((x) => x.id === id);
      if (e) texts.push(e.text);
    }
    return texts;
  }, [selectedIds, unifiedEntries]);

  const syncPreviewFromParts = useCallback(() => {
    setPreviewPrompt(mergeImagePromptParts(mainPrompt, selectedTexts));
  }, [mainPrompt, selectedTexts]);

  useEffect(() => {
    if (!mainEdited && mainSourceBlockId && allValues) {
      const t = allValues[mainSourceBlockId]?.text;
      const next = typeof t === "string" && t.trim() ? t.trim() : "";
      setMainPrompt(next);
    }
  }, [mainSourceBlockId, allValues, mainEdited]);

  useEffect(() => {
    if (step === 2 && !previewTouched) {
      syncPreviewFromParts();
    }
  }, [step, previewTouched, syncPreviewFromParts]);

  const textBlocksForMain = useMemo(() => {
    return (allBlocks || []).filter((b) => TEXT_BLOCK_TYPES.has(normBlockType(b.type)));
  }, [allBlocks]);

  const toggleLibrary = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPreviewTouched(false);
  };

  const addTag = () => {
    const n = normalizeMediaTag(tagInput);
    if (!n || userTags.includes(n)) return;
    setUserTags((t) => [...t, n]);
    setTagInput("");
  };

  const removeTag = (tag) => {
    setUserTags((t) => t.filter((x) => x !== tag));
  };

  const canNext = () => {
    if (step === 0) return mainPrompt.trim().length > 0;
    if (step === 1) return true;
    if (step === 2) return previewPrompt.trim().length > 0;
    if (step === 3) return !!modelId;
    if (step === 4) return true;
    return false;
  };

  const clearReference = () => {
    setReferenceMediaId(null);
    setReferenceFile(null);
  };

  const pickReferenceFromBlock = (id) => {
    setReferenceFile(null);
    setReferenceMediaId((prev) => (prev === id ? null : id));
  };

  const handleReferenceFileChange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !f.type.startsWith("image/")) return;
    const maxBytes = 4 * 1024 * 1024;
    if (f.size > maxBytes) {
      alert("Image must be 4MB or smaller.");
      return;
    }
    setReferenceMediaId(null);
    setReferenceFile(f);
  };

  const handleGenerate = () => {
    if (!previewPrompt.trim()) return;
    onGenerate({
      finalPrompt: previewPrompt.trim(),
      modelId,
      tags: userTags,
      ...(referenceMediaId ? { referenceMediaId } : {}),
      ...(referenceFile ? { referenceFile } : {}),
    });
  };

  if (generateImageProRequired) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3.5">
        <span className="text-[12px] text-amber-300/80 font-medium flex items-center gap-1.5 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Generate image with AI
        </span>
        <p className="text-[12px] text-white/45 mb-2">
          Subscribe to use AI image generation (monthly image credits).
        </p>
        <Link href="/dashboard/subscription" className="text-[13px] text-amber-400 hover:text-amber-300 font-medium transition-colors">
          View plans →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-white/50 font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Generate with AI
        </span>
        <span className="text-[10px] text-white/35 tabular-nums">
          {step + 1}/{STEPS.length}
        </span>
      </div>

      {typeof imageCreditsUsed === "number" &&
        typeof imageCreditsLimit === "number" &&
        imageCreditsLimit > 0 && (
          <p className="text-[11px] text-white/40">
            Image credits:{" "}
            <span className="text-white/60 tabular-nums">
              {imageCreditsUsed} / {imageCreditsLimit}
            </span>
          </p>
      )}

      <div className="flex flex-wrap gap-1">
        {STEPS.map((s, i) => (
          <span
            key={s.id}
            className={`text-[10px] px-2 py-0.5 rounded-md border ${
              i === step
                ? "border-accent/40 bg-accent/[0.12] text-accent"
                : i < step
                  ? "border-white/10 text-white/45"
                  : "border-white/[0.06] text-white/25"
            }`}
          >
            {i + 1}. {s.title}
          </span>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-white/40">
            Choose which text block feeds the main idea (you can edit below).
          </p>
          <select
            value={mainSourceBlockId}
            onChange={(e) => {
              setMainSourceBlockId(e.target.value);
              setMainEdited(false);
            }}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-2 text-[12px] text-white/80"
          >
            {textBlocksForMain.map((b) => (
              <option key={b.blockId} value={b.blockId}>
                {b.label || b.blockId}
                {b.blockId === mainBlockId ? " (main)" : ""}
              </option>
            ))}
          </select>
          <textarea
            value={mainPrompt}
            onChange={(e) => {
              setMainEdited(true);
              setMainPrompt(e.target.value);
            }}
            placeholder="Main prompt from the card…"
            rows={4}
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-[13px] text-white/80 placeholder-white/20 focus:outline-none focus:border-accent/40 resize-none"
          />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-2">
          <p className="text-[11px] text-white/40">
            Search and add one or more snippets (subject + style). They append to your main prompt.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {["all", "subject", "style"].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKindFilter(k)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                  kindFilter === k
                    ? "border-accent/40 bg-accent/[0.12] text-accent"
                    : "border-white/[0.08] bg-white/[0.03] text-white/45"
                }`}
              >
                {k === "all" ? "All" : k === "subject" ? "Subject" : "Style"}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="search"
              value={libraryQuery}
              onChange={(e) => setLibraryQuery(e.target.value)}
              placeholder="Search labels, tags, text…"
              className="w-full pl-8 pr-2 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[12px] text-white/80 placeholder-white/25 focus:outline-none focus:border-accent/40"
            />
          </div>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-white/[0.06] divide-y divide-white/[0.06]">
            {filteredLibrary.length === 0 && (
              <p className="text-[11px] text-white/35 p-2">No matches. Try another search or filter.</p>
            )}
            {filteredLibrary.map((e) => (
              <label
                key={e.id}
                className="flex items-start gap-2 p-2 hover:bg-white/[0.03] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(e.id)}
                  onChange={() => toggleLibrary(e.id)}
                  className="mt-1 rounded border-white/20"
                />
                <span className="min-w-0">
                  <span className="text-[11px] text-amber-400/90 uppercase">{e.kind}</span>{" "}
                  <span className="text-[12px] text-white/80">{e.label}</span>
                  {e.description && (
                    <span className="block text-[10px] text-white/40 mt-0.5">{e.description}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
          {selectedIds.size > 0 && (
            <p className="text-[10px] text-white/35">{selectedIds.size} snippet(s) selected</p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div>
            <span className="text-[11px] text-white/50 block mb-1">Final prompt</span>
            <textarea
              value={previewPrompt}
              onChange={(e) => {
                setPreviewTouched(true);
                setPreviewPrompt(e.target.value);
              }}
              rows={5}
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-[13px] text-white/85 placeholder-white/20 focus:outline-none focus:border-accent/40 resize-none"
            />
            <button
              type="button"
              onClick={() => {
                setPreviewTouched(false);
                syncPreviewFromParts();
              }}
              className="mt-1 text-[11px] text-accent/80 hover:text-accent"
            >
              Reset from main + library
            </button>
          </div>
          <div>
            <span className="text-[11px] text-white/50 block mb-1">Tags (for search later)</span>
            <p className="text-[10px] text-white/30 mb-1.5">
              Add tags to find this image in your library. Suggestions: subject/style tags from above, or your own.
            </p>
            <div className="flex flex-wrap gap-1 mb-2">
              {userTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => removeTag(t)}
                  className="px-2 py-0.5 rounded-md text-[11px] bg-white/[0.08] text-white/70 hover:bg-white/15"
                >
                  {t} ×
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="e.g. chemistry, creepy-style"
                className="flex-1 min-w-0 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[12px] text-white/80"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-1.5 rounded-lg text-[12px] bg-white/[0.08] text-white/80 hover:bg-white/12"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-2">
          <label className="text-[11px] text-white/50">Model</label>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            disabled={generatingImage}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-2 text-[12px] text-white/80"
          >
            {TEXT_TO_IMAGE_MODEL_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label} ({opt.credits} cr)
              </option>
            ))}
          </select>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[12px] text-white/70 font-medium flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-white/45" />
                Reference image (optional)
              </p>
              <p className="text-[11px] text-white/40 leading-relaxed mt-1">
                Use a photo from this card or upload one. Generation uses Nano Banana 2 edit when a reference is set;
                otherwise the model you picked above applies.
              </p>
            </div>
            {(referenceMediaId || referenceFile) && (
              <button
                type="button"
                onClick={clearReference}
                className="shrink-0 text-[11px] text-white/45 hover:text-white/75 underline-offset-2 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          {referenceImageOptions.length > 0 && (
            <div>
              <span className="text-[10px] text-white/35 uppercase tracking-wider block mb-1.5">
                From this card
              </span>
              <div className="flex flex-wrap gap-2">
                {referenceImageOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => pickReferenceFromBlock(opt.id)}
                    title={referenceMediaId === opt.id ? "Click to deselect" : "Use as reference"}
                    className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      referenceMediaId === opt.id
                        ? "border-amber-400/90 ring-2 ring-amber-400/25"
                        : "border-white/[0.08] hover:border-white/20"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={opt.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <span className="text-[10px] text-white/35 uppercase tracking-wider block mb-1.5">
              Upload
            </span>
            <label className="flex flex-col items-center justify-center gap-1.5 py-3 border border-dashed border-white/[0.1] rounded-lg cursor-pointer hover:border-white/20 transition-colors">
              <Upload className="w-4 h-4 text-white/35" />
              <span className="text-[11px] text-white/45">
                {referenceFile ? "Replace file…" : "Choose image (max 4MB)"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleReferenceFileChange}
              />
            </label>
          </div>

          {(referenceMediaId || filePreviewUrl) && (
            <div className="rounded-lg border border-white/[0.06] p-2 bg-white/[0.02]">
              <span className="text-[10px] text-white/35 block mb-1.5">Current reference</span>
              <div className="flex items-center gap-3">
                <div className="relative w-20 h-20 rounded-md overflow-hidden border border-white/[0.08] shrink-0">
                  {referenceFile && filePreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={filePreviewUrl} alt="" className="w-full h-full object-cover" />
                  ) : referenceMediaId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        referenceImageOptions.find((o) => o.id === referenceMediaId)?.url || ""
                      }
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>
                <p className="text-[11px] text-white/45 min-w-0">
                  {referenceFile
                    ? referenceFile.name
                    : referenceMediaId
                      ? "Image from this card — click another thumbnail or upload to replace."
                      : null}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || generatingImage}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] text-white/60 hover:text-white/90 hover:bg-white/[0.06] disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => {
              if (step === 1) setPreviewTouched(false);
              setStep((s) => s + 1);
            }}
            disabled={!canNext() || generatingImage}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] bg-white/[0.08] text-white/90 hover:bg-white/12 disabled:opacity-40"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generatingImage || !previewPrompt.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-white text-[13px] font-medium disabled:opacity-40"
          >
            {generatingImage ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Generate
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
