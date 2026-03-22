/**
 * Medium-inspired reading column: typography + borders only — no panel fills.
 */

export const mediumArticle =
  "medium-article w-full max-w-5xl mx-auto px-5 py-8 sm:px-8 sm:py-10 md:px-10 md:py-12 font-inter text-base leading-[1.65] text-neutral-300";

const articleTitle =
  "font-tiempos text-[1.625rem] sm:text-[1.875rem] md:text-[2rem] font-normal leading-[1.2] tracking-tight text-neutral-50";

/** Semantic tokens for guide pages (Tailwind class strings). */
export const M = {
  breadcrumb: "text-xs sm:text-sm text-neutral-500 [&_a]:text-neutral-400 [&_a]:hover:text-white",
  kicker: "text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-neutral-500",
  title: articleTitle,
  lead: "mt-4 text-base sm:text-[1.0625rem] leading-relaxed text-neutral-400 font-normal",
  byline: "mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-neutral-500",
  bylineBrand: "text-neutral-200",
  /** Page / in-article main heading (same token as `title`). */
  h1: articleTitle,
  h2: "font-tiempos text-lg sm:text-xl font-semibold text-neutral-50 mb-5 scroll-mt-28 tracking-tight",
  h3: "font-inter text-sm font-semibold text-neutral-100 mb-2",
  /** Subsection / card titles inside a section. */
  h4: "font-inter text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500 mb-2",
  bodyMuted: "text-sm leading-relaxed text-neutral-400",
  accent: "text-accent",
  link: "text-accent underline decoration-accent/45 underline-offset-[3px] hover:text-accent-hover hover:decoration-accent-hover/60",
  linkPlain: "text-accent hover:text-accent-hover hover:underline underline-offset-2",
  /** Outline only — no fill. */
  card: "border border-neutral-800 p-4 sm:p-5",
  cardGrid: "border border-neutral-800 p-4 flex flex-col gap-2 sm:p-5",
  tableWrap: "overflow-x-auto border border-neutral-800 text-sm",
  tableHead: "border-b border-neutral-800",
  tableCell: "p-2.5 sm:p-3",
  table: "w-full border-collapse text-left text-sm",
  tableHeaderRow: "border-b border-neutral-800",
  tableBodyRow: "border-b border-neutral-800 last:border-0",
  /** Italic / emphasis in body copy (pairs with bodyMuted). */
  italic: "italic text-neutral-400",
  /** Pull quote / callout. */
  blockquote:
    "border-l-2 border-neutral-600 pl-4 my-5 text-neutral-400 italic text-sm leading-relaxed",
  faqWrap: "divide-y divide-neutral-800 border-y border-neutral-800 text-sm",
  faqItem: "py-5",
  faqQ: "font-inter font-semibold text-neutral-100 leading-snug",
  faqA: "mt-2.5 leading-relaxed text-neutral-400",
  ctaBox: "border-y border-neutral-800 py-8 sm:py-10",
  btnPrimary:
    "inline-flex items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition hover:bg-accent/90",
  btnSecondary:
    "inline-flex items-center justify-center rounded-full border border-neutral-500 px-5 py-2 text-sm font-medium text-neutral-200 transition hover:text-white hover:border-neutral-400",
  badge: "text-[0.6875rem] text-neutral-500",
  breadcrumbCurrent: "text-neutral-300",
  /**
   * Slack-style inline code: dark pill, border, inset highlight (readable on marketing/dark pages).
   */
  code: "rounded border border-[#3d3d3d] bg-[#242424] px-[0.4em] py-[0.08em] font-mono text-[0.85em] font-normal text-[#e6edf3] [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.07)]",
  /** Fenced / multiline code (Slack-like code block). */
  codeBlock:
    "rounded-lg border border-[#3d3d3d] bg-[#1e1e1e] p-4 font-mono text-[13px] leading-relaxed text-[#e6edf3] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] sm:text-sm sm:leading-relaxed",
  footerNote: "text-sm text-neutral-500 border-t border-neutral-800 pt-6",
};
