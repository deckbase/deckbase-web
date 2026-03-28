"use client";

import { useEffect, useRef, useState } from "react";
import { Layers } from "lucide-react";

/**
 * Session cache: emoji data + Picker are loaded once per page load, shared across all pickers.
 * Dynamic imports keep them out of the initial JS bundle until first load.
 */
let emojiMartBundleCache = null;
let emojiMartLoadPromise = null;

function getEmojiMartBundle() {
  if (emojiMartBundleCache) return Promise.resolve(emojiMartBundleCache);
  if (!emojiMartLoadPromise) {
    emojiMartLoadPromise = Promise.all([
      import("@emoji-mart/data"),
      import("@emoji-mart/react"),
    ])
      .then(([dataMod, reactMod]) => {
        emojiMartBundleCache = {
          data: dataMod.default,
          Picker: reactMod.default,
        };
        return emojiMartBundleCache;
      })
      .catch((err) => {
        emojiMartLoadPromise = null;
        throw err;
      });
  }
  return emojiMartLoadPromise;
}

/** Start download before open (e.g. hover) so the picker is ready faster. */
export function prefetchEmojiMartBundle() {
  getEmojiMartBundle().catch(() => {});
}

/**
 * Optional deck icon: pick one emoji or clear. Value is a trimmed string or null.
 * Uses Emoji Mart for the full emoji set + search + skin tones (aligned with typical React apps).
 */
export function DeckEmojiPicker({
  value,
  onChange,
  disabled = false,
  label = "Deck icon",
}) {
  const [open, setOpen] = useState(false);
  /** Sync with module cache so a second picker on the page opens instantly after the first load. */
  const [bundle, setBundle] = useState(() => emojiMartBundleCache);
  const [loadError, setLoadError] = useState(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (emojiMartBundleCache) {
      setBundle(emojiMartBundleCache);
      setLoadError(null);
      return;
    }
    setLoadError(null);
    let cancelled = false;
    getEmojiMartBundle()
      .then((b) => {
        if (!cancelled) setBundle(b);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const { Picker, data } = bundle || {};

  return (
    <div className="flex flex-col gap-1.5" ref={wrapRef}>
      <span className="text-[12px] font-medium text-white/40 uppercase tracking-wider">
        {label}
      </span>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onMouseEnter={prefetchEmojiMartBundle}
          onFocus={prefetchEmojiMartBundle}
          onClick={() => !disabled && setOpen((v) => !v)}
          className="flex items-center gap-3 w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-left transition-colors hover:bg-white/[0.06] disabled:opacity-50 disabled:pointer-events-none"
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <span
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center"
            aria-hidden
          >
            {value ? (
              <span className="text-[22px] leading-none">{value}</span>
            ) : (
              <Layers className="h-5 w-5 text-accent/80" />
            )}
          </span>
          <span className="text-[14px] text-white/70">
            {value ? "Change icon" : "Add optional icon"}
          </span>
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 flex flex-col gap-2 rounded-xl border border-white/[0.1] bg-[#141414] p-2 shadow-xl overflow-hidden">
            {loadError ? (
              <div className="min-h-[200px] flex items-center justify-center px-4 text-center text-[13px] text-white/45">
                Couldn&apos;t load emoji picker. Check your connection and try again.
              </div>
            ) : !Picker || !data ? (
              <div className="max-h-[min(380px,55vh)] min-h-[280px] flex flex-col items-center justify-center gap-3 px-4">
                <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-accent/80 animate-spin" />
                <span className="text-[13px] text-white/40">Loading emojis…</span>
              </div>
            ) : (
              <>
                <div className="max-h-[min(380px,55vh)] min-h-[280px] overflow-auto [&_em-emoji-picker]:w-full [&_em-emoji-picker]:max-w-none">
                  <Picker
                    data={data}
                    theme="dark"
                    set="native"
                    previewPosition="none"
                    searchPosition="sticky"
                    skinTonePosition="search"
                    navPosition="top"
                    maxFrequentRows={3}
                    perLine={8}
                    dynamicWidth
                    onEmojiSelect={(emoji) => {
                      const native = emoji?.native ?? emoji;
                      if (native) onChange(String(native));
                      setOpen(false);
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="w-full rounded-lg border border-white/[0.08] py-2 text-[13px] text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition-colors"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  Clear icon
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <p className="text-[11px] text-white/25 leading-relaxed">
        Shown in deck lists and headers. Syncs with the mobile app.
      </p>
    </div>
  );
}
