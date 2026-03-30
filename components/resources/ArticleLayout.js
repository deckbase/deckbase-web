/**
 * ArticleLayout — shared primitives for long-form content pages.
 * Server-component safe (no hooks, no "use client").
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

/** Outer article container */
export function ArticleShell({ children }) {
  return (
    <article className="w-full max-w-3xl flex flex-col gap-12 pb-6">
      {children}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------

/**
 * @param {{ crumbs: Array<{ label: string, href?: string }> }} props
 */
export function ArticleBreadcrumb({ crumbs }) {
  return (
    <nav className="text-xs text-white/30" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {crumbs.map((crumb, i) => (
          <li key={crumb.label} className="flex items-center gap-x-2">
            {i > 0 && <span aria-hidden="true" className="text-white/20">/</span>}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-white/60 transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-white/50">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

/**
 * @param {{ kicker?: string, title: string, lead?: React.ReactNode, author?: string, readTime?: string }} props
 */
export function ArticleHeader({ kicker, title, lead, author = "Deckbase", readTime }) {
  return (
    <header className="flex flex-col gap-4">
      {kicker && (
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
          {kicker}
        </p>
      )}
      <h1 className="text-3xl sm:text-[2.25rem] font-bold tracking-tight text-white leading-[1.15]">
        {title}
      </h1>
      {lead && (
        <p className="text-white/55 text-[15px] sm:text-[16px] leading-relaxed max-w-[600px]">
          {lead}
        </p>
      )}
      {(author || readTime) && (
        <div className="flex items-center gap-2 text-[12px] text-white/25 mt-0.5">
          {author && <span className="text-white/40 font-medium">{author}</span>}
          {author && readTime && <span aria-hidden>·</span>}
          {readTime && <span>{readTime}</span>}
        </div>
      )}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

/** Section wrapper with scroll anchor */
export function ArticleSection({ id, children }) {
  return (
    <section
      id={id}
      className="scroll-mt-28 flex flex-col gap-5"
    >
      {children}
    </section>
  );
}

/** Section h2 heading */
export function ArticleH2({ children }) {
  return (
    <h2 className="text-[18px] sm:text-[20px] font-bold text-white tracking-tight leading-snug">
      {children}
    </h2>
  );
}

/** Section h3 heading */
export function ArticleH3({ children, accent }) {
  return (
    <h3 className={`text-[14px] font-semibold leading-snug ${accent ? "text-accent" : "text-white/80"}`}>
      {children}
    </h3>
  );
}

// ---------------------------------------------------------------------------
// Body text
// ---------------------------------------------------------------------------

export function ArticleBody({ children, className = "" }) {
  return (
    <p className={`text-[14px] text-white/55 leading-relaxed ${className}`}>
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Inline / block code
// ---------------------------------------------------------------------------

export function Code({ children }) {
  return (
    <code className="rounded border border-white/[0.08] bg-white/[0.05] px-[0.42em] py-[0.07em] font-mono text-[0.82em] text-[#93c5fd]">
      {children}
    </code>
  );
}

export function CodeBlock({ children }) {
  return (
    <pre className="rounded-xl border border-white/[0.09] bg-[#0d0d0d] p-4 sm:p-5 font-mono text-[13px] text-white/80 leading-relaxed overflow-x-auto">
      <code>{children}</code>
    </pre>
  );
}

// ---------------------------------------------------------------------------
// Callout / Note
// ---------------------------------------------------------------------------

const noteStyles = {
  default: "border-white/[0.08] bg-white/[0.03]",
  info:    "border-blue-500/20 bg-blue-500/[0.04]",
  warning: "border-amber-500/20 bg-amber-500/[0.05]",
  accent:  "border-accent/20 bg-accent/[0.04]",
};

export function ArticleNote({ children, variant = "default" }) {
  return (
    <div className={`rounded-xl border p-4 sm:p-5 text-[13px] text-white/50 leading-relaxed ${noteStyles[variant]}`}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

/**
 * @param {{ columns: string[], rows: Array<string[]> }} props
 */
export function ArticleTable({ columns, rows }) {
  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.015]">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/[0.07]">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/30 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-3 py-3 text-[13px] leading-relaxed align-top ${
                      j === 0 ? "text-white/80 font-medium whitespace-nowrap" : "text-white/45"
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card grid
// ---------------------------------------------------------------------------

export function ArticleCardGrid({ children, cols = 2 }) {
  const colClass = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" }[cols] ?? "sm:grid-cols-2";
  return (
    <div className={`grid grid-cols-1 gap-3 ${colClass}`}>
      {children}
    </div>
  );
}

export function ArticleCard({ title, titleAccent, badge, children }) {
  return (
    <div className="flex flex-col gap-2.5 p-4 sm:p-5 rounded-xl border border-white/[0.07] bg-white/[0.02]">
      {(title || badge) && (
        <div className="flex flex-wrap items-center gap-2">
          {title && (
            <h3 className={`text-[13px] font-semibold leading-snug ${titleAccent ? "text-accent" : "text-white/80"}`}>
              {title}
            </h3>
          )}
          {badge && (
            <span className="text-[10px] text-white/30 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded-md">
              {badge}
            </span>
          )}
        </div>
      )}
      <div className="text-[13px] text-white/45 leading-relaxed">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

/**
 * @param {{ items: Array<{ q: string, a: import('react').ReactNode, answerPlain?: string }> }} props
 * `answerPlain` — optional plain string for JSON-LD when `a` is JSX; defaults to `a` when `a` is a string.
 */
export function ArticleFaq({ items }) {
  return (
    <div className="flex flex-col divide-y divide-white/[0.06] border-y border-white/[0.06]">
      {items.map(({ q, a }) => (
        <div key={q} className="py-5 flex flex-col gap-2">
          <h3 className="text-[14px] font-semibold text-white/80 leading-snug">{q}</h3>
          <div className="text-[13px] text-white/45 leading-relaxed [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-accent/90">
            {a}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ordered steps
// ---------------------------------------------------------------------------

export function ArticleSteps({ items }) {
  return (
    <ol className="flex flex-col gap-4">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-accent border border-accent/25 bg-accent/[0.07] mt-[2px]">
            {i + 1}
          </span>
          <div className="text-[13px] text-white/55 leading-relaxed flex-1">{item}</div>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Bullet list
// ---------------------------------------------------------------------------

export function ArticleList({ items }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="mt-[6px] w-1 h-1 rounded-full bg-white/25 flex-shrink-0" />
          <span className="text-[13px] text-white/55 leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// CTA box
// ---------------------------------------------------------------------------

export function ArticleCta({ title, description, primaryHref, primaryLabel, secondaryHref, secondaryLabel }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-white/[0.025]">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[15px] font-semibold text-white">{title}</h3>
        {description && (
          <p className="text-[13px] text-white/40 leading-relaxed max-w-sm">{description}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 flex-shrink-0">
        {primaryHref && (
          <Link
            href={primaryHref}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-accent hover:bg-accent/90 text-white text-sm font-semibold rounded-xl transition-colors shadow-[0_0_20px_rgba(35,131,226,0.25)]"
          >
            {primaryLabel}
          </Link>
        )}
        {secondaryHref && (
          <Link
            href={secondaryHref}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-white/70 hover:text-white text-sm font-medium rounded-xl border border-white/[0.08] transition-colors"
          >
            {secondaryLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Related links
// ---------------------------------------------------------------------------

export function ArticleRelated({ links }) {
  return (
    <div className="flex flex-col gap-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="inline-flex items-center gap-2 text-[13px] text-accent hover:text-accent/80 transition-colors group w-fit"
        >
          <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 group-hover:translate-x-0.5 transition-transform duration-150" />
          {link.label}
        </Link>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Footer note
// ---------------------------------------------------------------------------

export function ArticleFooter({ children }) {
  return (
    <p className="text-[12px] text-white/25 border-t border-white/[0.06] pt-6 leading-relaxed">
      {children}
    </p>
  );
}
