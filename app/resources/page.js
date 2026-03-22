"use client";

import Link from "next/link";
import { BookOpen, ExternalLink, Layers, Sparkles } from "lucide-react";
import { mediumArticle, M } from "@/components/resources/MediumArticle";

const resourceGroups = [
  {
    title: "Quick links",
    items: [
      {
        title: "MCP for flashcards (guide)",
        description:
          "How Deckbase MCP compares to other MCP servers and how to create decks and cards from Cursor or Claude Code — synced to the app.",
        href: "/resources/mcp",
        internal: true,
        icon: BookOpen,
        featured: true,
      },
      {
        title: "Best Anki alternatives",
        description: "Roundup of apps like Anki — AI cards, FSRS, and mobile study.",
        href: "/anki-alternatives",
        internal: true,
        icon: Layers,
      },
      {
        title: "Best flashcard apps (2026)",
        description: "How to choose a flashcard app for med school, languages, and exams.",
        href: "/best-flashcard-apps",
        internal: true,
        icon: Sparkles,
      },
    ],
  },
];

const cardBase =
  "group relative block rounded-2xl border p-5 transition-colors duration-200 sm:p-6 " +
  "border-neutral-800/90 bg-neutral-900/25 hover:border-neutral-600 hover:bg-neutral-900/45 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const cardFeatured =
  "ring-1 ring-accent/25 border-accent/20 bg-gradient-to-br from-accent/[0.07] to-transparent hover:border-accent/35";

function ResourceCard({ item }) {
  const Icon = item.icon;
  const isFeatured = item.featured;
  const cardClass = `${cardBase} ${isFeatured ? cardFeatured : ""}`;

  const content = (
    <div className="flex gap-4 sm:gap-5">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${
          isFeatured ? "bg-accent/20 text-accent" : "bg-white/[0.06] text-accent"
        }`}
      >
        <Icon className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {isFeatured && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider text-accent">
              Guide
            </span>
          )}
          <h3 className="text-[1.0625rem] font-semibold leading-snug tracking-tight text-neutral-50 sm:text-lg">
            {item.title}
            {!item.internal && (
              <ExternalLink className="ml-1.5 inline h-4 w-4 shrink-0 text-neutral-500 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            )}
          </h3>
        </div>
        <p className="mt-2.5 max-w-prose text-[0.9375rem] leading-[1.65] text-neutral-400">{item.description}</p>
      </div>
    </div>
  );

  if (item.internal) {
    return (
      <Link href={item.href} className={cardClass}>
        {content}
      </Link>
    );
  }

  return (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={cardClass}>
      {content}
    </a>
  );
}

export default function ResourcesPage() {
  return (
    <article className={`${mediumArticle} flex flex-col gap-12`}>
      <header className="max-w-2xl">
        <p className={M.kicker}>Resources</p>
        <h1 className={M.title}>Guides &amp; quick links</h1>
        <p className={`${M.lead} text-neutral-400`}>
          MCP guides and in-depth articles. One column so you can scan without noise. For technical API and MCP
          reference, see{" "}
          <Link href="/docs" className={M.link}>
            Docs
          </Link>
          .
        </p>
        <p className={M.byline}>
          <span className={M.bylineBrand}>Deckbase</span>
          <span aria-hidden="true"> · </span>
          <span>1 min read</span>
        </p>
      </header>

      {resourceGroups.map((group) => (
        <section key={group.title} id="quick-links" className="scroll-mt-28">
          <h2 className={`${M.h2} mb-6`}>{group.title}</h2>
          <ul className="flex flex-col gap-4">
            {group.items.map((item) => (
              <li key={item.title}>
                <ResourceCard item={item} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}
