"use client";

import { Clock } from "lucide-react";

const SRS_STATE = {
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3,
};

const STATE_STYLES = {
  New: "bg-white/10 text-white/80 border-white/20",
  Learning: "bg-blue-500/85 text-blue-950 border-blue-400/50",
  Review: "bg-emerald-500/20 text-emerald-200 border-emerald-500/35",
  Relearning: "bg-orange-500/20 text-orange-200 border-orange-500/35",
};

const MS_MINUTE = 60 * 1000;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;

function formatInterval(ms) {
  const durationMs = Math.max(0, ms);
  const minutes = Math.round(durationMs / MS_MINUTE);
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  return `${months}mo`;
}

function formatDueTime(dueMs) {
  if (dueMs == null) return "No due date";
  const diffMs = dueMs - Date.now();
  if (Math.abs(diffMs) < MS_MINUTE) return "Due now";
  const label = formatInterval(Math.abs(diffMs));
  return diffMs > 0 ? `Due in ${label}` : `Overdue by ${label}`;
}

/**
 * Compact SRS row for card preview (mobile-style chips).
 * @param {{ topLeftOverlayInset?: number }} props
 */
export default function PreviewSrsBar({ card, topLeftOverlayInset = 0 }) {
  if (!card) return null;
  const hasSrs =
    card.srsState != null ||
    card.srsDue != null ||
    (card.reviewCount ?? 0) > 0;
  if (!hasSrs) return null;

  const stateLabel =
    card.srsState === SRS_STATE.New || card.reviewCount === 0
      ? "New"
      : card.srsState === SRS_STATE.Learning
        ? "Learning"
        : card.srsState === SRS_STATE.Review
          ? "Review"
          : "Relearning";

  const stateClass = STATE_STYLES[stateLabel] || STATE_STYLES.New;
  const dueLabel = formatDueTime(card.srsDue);

  return (
    <div
      className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 pb-3"
      style={{ paddingLeft: topLeftOverlayInset }}
    >
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${stateClass}`}
      >
        {stateLabel}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/90">
        <Clock className="h-3 w-3 opacity-80" strokeWidth={2.2} aria-hidden />
        {dueLabel}
      </span>
    </div>
  );
}
