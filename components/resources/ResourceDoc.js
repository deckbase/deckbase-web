import { Fragment } from "react";
import Link from "next/link";
import { mediumArticle, M } from "@/components/resources/MediumArticle";
import { cn } from "@/components/resources/cn";

export { mediumArticle, M };

/** Outer column for resources / docs guides (max width + padding + base type). */
export function ResourceArticle({ children, className, gapClass = "gap-10" }) {
  return <article className={cn(mediumArticle, "flex flex-col", gapClass, className)}>{children}</article>;
}

/** Section with anchor id + scroll margin for sidebar “On this page”. */
export function ResourceSection({ id, children, className }) {
  return (
    <section id={id} className={cn("scroll-mt-28", className)}>
      {children}
    </section>
  );
}

export function ResourceKicker({ children, className }) {
  return <p className={cn(M.kicker, className)}>{children}</p>;
}

/** Main article title (H1 styling); use `as` for a single hero line that must not be `<h1>` (rare). */
export function ResourceTitle({ children, className, as: Tag = "h1" }) {
  return <Tag className={cn(M.h1, className)}>{children}</Tag>;
}

/** Explicit page heading — always renders `<h1>`. */
export function ResourceH1({ children, className, id }) {
  return (
    <h1 id={id} className={cn(M.h1, className)}>
      {children}
    </h1>
  );
}

export function ResourceLead({ children, className }) {
  return <p className={cn(M.lead, className)}>{children}</p>;
}

export function ResourceByline({ brand = "Deckbase", meta, className }) {
  return (
    <p className={cn(M.byline, className)}>
      <span className={M.bylineBrand}>{brand}</span>
      {meta ? (
        <>
          <span aria-hidden="true"> · </span>
          <span>{meta}</span>
        </>
      ) : null}
    </p>
  );
}

export function ResourceH2({ children, id, className }) {
  return (
    <h2 id={id} className={cn(M.h2, className)}>
      {children}
    </h2>
  );
}

export function ResourceH3({ children, className, id }) {
  return (
    <h3 id={id} className={cn(M.h3, className)}>
      {children}
    </h3>
  );
}

/** Small uppercase label-style heading (subsections, cards). */
export function ResourceH4({ children, className, id }) {
  return (
    <h4 id={id} className={cn(M.h4, className)}>
      {children}
    </h4>
  );
}

/** Muted body copy (default resources paragraph). */
export function ResourceP({ children, className, lead }) {
  return <p className={cn(lead ? M.lead : M.bodyMuted, className)}>{children}</p>;
}

/** Alias for `ResourceP` — same muted body paragraph. */
export function ResourceParagraph(props) {
  return <ResourceP {...props} />;
}

/** Strong label in lists / emphasis. */
export function ResourceStrong({ children, className, variant = "default" }) {
  const v =
    variant === "emphasis"
      ? "font-semibold text-neutral-200"
      : "font-semibold text-neutral-100";
  return <strong className={cn(v, className)}>{children}</strong>;
}

/** Italic emphasis tuned for dark body copy (`ResourceP` / lists). */
export function ResourceEm({ children, className }) {
  return <em className={cn(M.italic, className)}>{children}</em>;
}

/** Same styling as `ResourceEm` — prefer `<em>` for semantics; use this name when you mean “italic style”. */
export const ResourceItalic = ResourceEm;

/** Highlight phrase (lighter gray) — keywords in SEO intros. */
export function ResourceHighlight({ children, className }) {
  return <span className={cn("text-neutral-300", className)}>{children}</span>;
}

/** Pull quote or long cited line. */
export function ResourceBlockquote({ children, cite, className }) {
  return (
    <blockquote cite={cite} className={cn(M.blockquote, className)}>
      {children}
    </blockquote>
  );
}

/** Slack-style inline code. */
export function ResourceCode({ children, className }) {
  return <code className={cn(M.code, className)}>{children}</code>;
}

/** Multiline fenced block (Slack-like). Pass raw string as children. */
export function ResourceCodeBlock({ children, className }) {
  return (
    <pre className={cn(M.codeBlock, "overflow-x-auto", className)}>
      <code>{children}</code>
    </pre>
  );
}

/** Numbered list with resources spacing (outside markers). */
export function ResourceOl({ children, className }) {
  return (
    <ol
      className={cn(
        M.bodyMuted,
        "list-outside space-y-4 pl-6 marker:text-neutral-500",
        className
      )}
    >
      {children}
    </ol>
  );
}

/** Bullet list (`variant`: `disc` | `square`). */
export function ResourceUl({ children, className, variant = "disc" }) {
  const bullet = variant === "square" ? "list-[square]" : "list-disc";
  return (
    <ul className={cn(M.bodyMuted, "list-outside space-y-2 pl-6", bullet, className)}>{children}</ul>
  );
}

export function ResourceLi({ children, className }) {
  return <li className={cn("pl-2", className)}>{children}</li>;
}

/** Inline “dot” separator — use between breadcrumb or meta fragments. */
export function ResourceDot({ className }) {
  return (
    <span aria-hidden="true" className={cn("text-neutral-500", className)}>
      ·
    </span>
  );
}

export function ResourceLink({ href, children, className, plain }) {
  return (
    <Link href={href} className={cn(plain ? M.linkPlain : M.link, className)}>
      {children}
    </Link>
  );
}

/**
 * @param {{ items: Array<{ href?: string, label: string, current?: boolean }> }} props
 */
export function ResourceBreadcrumb({ items, className }) {
  return (
    <nav className={cn(M.breadcrumb, className)} aria-label="Breadcrumb">
      <ol className="flex flex-wrap gap-x-2 gap-y-1">
        {items.map((item, i) => (
          <Fragment key={`${item.label}-${i}`}>
            {i > 0 ? (
              <li aria-hidden="true" className="text-neutral-400">
                /
              </li>
            ) : null}
            <li>
              {item.current ? (
                <span className={M.breadcrumbCurrent}>{item.label}</span>
              ) : (
                <Link href={item.href}>{item.label}</Link>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

/** Border + horizontal scroll; use with a normal `<table>` or prefer `ResourceTable`. */
export function ResourceTableWrap({ children, className }) {
  return <div className={cn(M.tableWrap, className)}>{children}</div>;
}

/** Bordered, scrollable table shell — put `ResourceThead` / `ResourceTbody` inside. */
export function ResourceTable({ children, className }) {
  return (
    <ResourceTableWrap>
      <table className={cn(M.table, className)}>{children}</table>
    </ResourceTableWrap>
  );
}

export function ResourceThead({ children, className }) {
  return <thead className={className}>{children}</thead>;
}

export function ResourceTbody({ children, className }) {
  return <tbody className={className}>{children}</tbody>;
}

/**
 * Table row. Use `variant="header"` for header rows (`thead`), default for body.
 */
export function ResourceTr({ children, className, variant = "body" }) {
  return (
    <tr className={cn(variant === "header" ? M.tableHeaderRow : M.tableBodyRow, className)}>
      {children}
    </tr>
  );
}

export function ResourceTh({ children, className, scope, colSpan, rowSpan }) {
  return (
    <th
      scope={scope}
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={cn(M.tableCell, "text-left align-top font-semibold text-neutral-200", className)}
    >
      {children}
    </th>
  );
}

export function ResourceTd({ children, className, colSpan, rowSpan }) {
  return (
    <td colSpan={colSpan} rowSpan={rowSpan} className={cn(M.tableCell, "align-top text-neutral-400", className)}>
      {children}
    </td>
  );
}

/**
 * Opinionated data grid: header row + uniform body rows.
 * Set `firstColumnBold={false}` if every cell should use the same weight.
 */
export function ResourceDataTable({
  columns,
  rows,
  className,
  firstColumnBold = true,
}) {
  return (
    <ResourceTable className={className}>
      <ResourceThead>
        <ResourceTr variant="header">
          {columns.map((col, i) => (
            <ResourceTh key={i}>{col}</ResourceTh>
          ))}
        </ResourceTr>
      </ResourceThead>
      <ResourceTbody>
        {rows.map((row, ri) => (
          <ResourceTr key={ri}>
            {row.map((cell, ci) => (
              <ResourceTd
                key={ci}
                className={cn(firstColumnBold && ci === 0 && "font-medium text-neutral-100")}
              >
                {cell}
              </ResourceTd>
            ))}
          </ResourceTr>
        ))}
      </ResourceTbody>
    </ResourceTable>
  );
}

export function ResourceFaqList({ children, className }) {
  return <div className={cn(M.faqWrap, className)}>{children}</div>;
}

export function ResourceFaqItem({ question, answer, className }) {
  return (
    <div className={cn(M.faqItem, className)}>
      <h3 className={M.faqQ}>{question}</h3>
      <p className={M.faqA}>{answer}</p>
    </div>
  );
}

export function ResourceFooterNote({ children, className }) {
  return <p className={cn(M.footerNote, className)}>{children}</p>;
}
