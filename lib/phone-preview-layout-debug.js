"use client";

import { useLayoutEffect } from "react";

function isDebugEnabled() {
  if (typeof process === "undefined") return false;
  if (process.env.NEXT_PUBLIC_PHONE_PREVIEW_LAYOUT_DEBUG === "1") return true;
  return process.env.NODE_ENV !== "production";
}

/**
 * @param {HTMLElement | null} el
 */
function measureBox(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    clientHeight: el.clientHeight,
    clientWidth: el.clientWidth,
    scrollHeight: el.scrollHeight,
    scrollWidth: el.scrollWidth,
    rectH: Math.round(r.height * 10) / 10,
    rectW: Math.round(r.width * 10) / 10,
    rectTop: Math.round(r.top * 10) / 10,
    rectLeft: Math.round(r.left * 10) / 10,
  };
}

/**
 * @param {HTMLElement | null} el
 */
function measureFlexGrid(el) {
  if (!el) return null;
  const cs = getComputedStyle(el);
  return {
    display: cs.display,
    flexDirection: cs.flexDirection,
    flexGrow: cs.flexGrow,
    flexShrink: cs.flexShrink,
    flexBasis: cs.flexBasis,
    justifyContent: cs.justifyContent,
    alignItems: cs.alignItems,
    alignContent: cs.alignContent,
    minHeight: cs.minHeight,
    height: cs.height,
    maxHeight: cs.maxHeight,
    gridTemplateRows: cs.gridTemplateRows,
    gridTemplateColumns: cs.gridTemplateColumns,
    overflow: cs.overflow,
    overflowY: cs.overflowY,
    overflowX: cs.overflowX,
    position: cs.position,
  };
}

/**
 * Dev / opt-in: logs phone preview flex/scroll/grid metrics and vertical centering math.
 * Set NEXT_PUBLIC_PHONE_PREVIEW_LAYOUT_DEBUG=1 to enable in production builds.
 *
 * @param {string} label
 * @param {{
 *   phoneRef?: React.RefObject<HTMLElement|null>,
 *   bodyRef?: React.RefObject<HTMLElement|null>,
 *   scrollRef?: React.RefObject<HTMLElement|null>,
 *   innerRef?: React.RefObject<HTMLElement|null>,
 *   contentRef?: React.RefObject<HTMLElement|null>,
 * }} refs
 * @param {boolean} [enabled=true] — set false while e.g. card preview is loading so refs exist
 */
export function usePhonePreviewLayoutDebug(label, refs, enabled = true) {
  const { phoneRef, bodyRef, scrollRef, innerRef, contentRef } = refs;

  useLayoutEffect(() => {
    if (!isDebugEnabled() || !enabled) return undefined;

    const log = () => {
      const phone = phoneRef?.current;
      const body = bodyRef?.current;
      const scroll = scrollRef?.current;
      const inner = innerRef?.current;
      const content =
        contentRef?.current ??
        (inner?.firstElementChild instanceof HTMLElement ? inner.firstElementChild : null);

      const payload = {
        label,
        path: typeof window !== "undefined" ? window.location.pathname : "",
        phone: measureBox(phone),
        body: measureBox(body),
        scroll: measureBox(scroll),
        inner: measureBox(inner),
        content: measureBox(content),
        styles: {
          scroll: measureFlexGrid(scroll),
          inner: measureFlexGrid(inner),
        },
      };

      let centering = null;
      if (scroll && inner && content) {
        const sRect = scroll.getBoundingClientRect();
        const iRect = inner.getBoundingClientRect();
        const cRect = content.getBoundingClientRect();
        const innerH = inner.clientHeight;
        const contentH = content.offsetHeight;
        const slackPx = innerH - contentH;
        const contentTopInInner = cRect.top - iRect.top;
        const expectedTopIfCentered = slackPx > 0 ? slackPx / 2 : 0;
        const deltaFromIdeal = Math.round((contentTopInInner - expectedTopIfCentered) * 10) / 10;
        centering = {
          innerClientH: innerH,
          contentOffsetH: contentH,
          slackPx: Math.round(slackPx * 10) / 10,
          contentTopInInnerPx: Math.round(contentTopInInner * 10) / 10,
          expectedContentTopIfCenteredPx: Math.round(expectedTopIfCentered * 10) / 10,
          deltaFromIdealCenterPx: deltaFromIdeal,
          scrollTop: scroll.scrollTop,
          scrollClientH: scroll.clientHeight,
          scrollScrollH: scroll.scrollHeight,
        };
      }

      let note = null;
      const s = payload.scroll;
      const i = payload.inner;
      if (s && i) {
        if (s.clientHeight < i.clientHeight - 1) {
          note = "CHECK: scroll clientHeight < inner — flex/grid chain may be wrong";
        } else if (centering && centering.slackPx > 4 && Math.abs(centering.deltaFromIdealCenterPx) > 8) {
          note = `CHECK: inner has slack (${centering.slackPx}px) but content offset deviates from centered by ~${centering.deltaFromIdealCenterPx}px`;
        } else if (centering && centering.slackPx <= 4) {
          note = "inner height ≈ content height — no vertical slack (centering cannot add space)";
        } else {
          note = "scroll and inner heights line up; see centering for vertical offset vs ideal";
        }
      }

      const p = payload.phone;
      const b = payload.body;
      const sc = payload.scroll;
      const inn = payload.inner;
      const co = payload.content;
      const stScroll = payload.styles?.scroll;
      const stInner = payload.styles?.inner;

      const summaryLine =
        `[preview-phone-layout] ${label} | ` +
        `clientH phone=${p?.clientHeight ?? "?"} body=${b?.clientHeight ?? "?"} scroll=${sc?.clientHeight ?? "?"} ` +
        `inner=${inn?.clientHeight ?? "?"} content=${centering?.contentOffsetH ?? co?.clientHeight ?? "?"} | ` +
        (centering
          ? `slack=${centering.slackPx} contentTop=${centering.contentTopInInnerPx} expectTop=${centering.expectedContentTopIfCenteredPx} delta=${centering.deltaFromIdealCenterPx} scrollTop=${centering.scrollTop} | `
          : "centering=n/a | ") +
        `scroll: ${stScroll?.display ?? "?"} rows=${stScroll?.gridTemplateRows ?? "?"} | ` +
        `inner: ${stInner?.display ?? "?"} justify=${stInner?.justifyContent ?? "?"} | ` +
        `${note ?? ""}`;

      console.log(summaryLine);
      console.log("[preview-phone-layout:full]", { ...payload, centering, note });
    };

    let rafId = null;
    const logRaf = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        log();
      });
    };

    log();
    const ro = new ResizeObserver(() => logRaf());
    [phoneRef, bodyRef, scrollRef, innerRef, contentRef].forEach((ref) => {
      if (ref?.current) ro.observe(ref.current);
    });
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [label, enabled, phoneRef, bodyRef, scrollRef, innerRef, contentRef]);
}
