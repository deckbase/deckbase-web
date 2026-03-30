"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  PREVIEW_LAYOUT,
  resolveCardSize,
} from "@/lib/card-preview-layout";

/**
 * Sized preview card chrome (9:16 in slot). Parent slide should not clip corners.
 */
export default function PreviewCardShell({
  reserveTopOverlay = false,
  layoutId = null,
  className = "",
  children,
}) {
  const wrapRef = useRef(null);
  const [{ w, h }, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { width, height } = resolveCardSize(w, h, reserveTopOverlay);

  const cardInner = (
    <div
      className={`relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border border-white/[0.07] bg-[#0a0a0a] shadow-[0_8px_24px_rgba(0,0,0,0.35)] ${className}`}
      style={{ borderRadius: PREVIEW_LAYOUT.cardBorderRadius }}
    >
      {children}
    </div>
  );

  return (
    <div
      ref={wrapRef}
      className="flex h-full max-h-full min-h-0 w-full max-w-full flex-1 items-center justify-center"
      style={{ overflow: "visible" }}
    >
      {width > 0 && height > 0 ? (
        layoutId ? (
          <motion.div
            layoutId={layoutId}
            className="min-h-0 min-w-0 overflow-hidden"
            style={{
              width,
              height,
              borderRadius: PREVIEW_LAYOUT.cardBorderRadius,
            }}
          >
            {cardInner}
          </motion.div>
        ) : (
          <div
            className="min-h-0 min-w-0 overflow-hidden"
            style={{
              width,
              height,
              borderRadius: PREVIEW_LAYOUT.cardBorderRadius,
            }}
          >
            {cardInner}
          </div>
        )
      ) : null}
    </div>
  );
}
