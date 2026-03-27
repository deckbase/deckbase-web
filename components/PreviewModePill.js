"use client";

/** Shared “Preview” chip (accent dot + label) for full-page preview and preview modals. */
export default function PreviewModePill({ className = "" }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.06] px-2.5 py-1 shadow-sm shadow-black/20 ${className}`}
      title="Preview"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
        Preview
      </span>
    </div>
  );
}
