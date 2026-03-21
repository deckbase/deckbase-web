"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Cpu,
  Link2,
  Download,
  MessageCircle,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";
import { mediumArticle, M } from "@/components/resources/MediumArticle";

const resourceGroups = [
  {
    title: "Quick links",
    items: [
      {
        title: "MCP setup",
        description:
          "Connect Cursor, Claude Code, VS Code, and other AI tools to Deckbase via the Model Context Protocol.",
        href: "/mcp",
        internal: true,
        icon: Cpu,
      },
      {
        title: "Download app",
        description: "Get the Deckbase app for iOS and Android.",
        href: "/download",
        internal: true,
        icon: Download,
      },
      {
        title: "Contact",
        description: "Get in touch for support or feedback.",
        href: "/contact-us",
        internal: true,
        icon: MessageCircle,
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

function ResourceCard({ item }) {
  const Icon = item.icon;
  const cardClass =
    "block border-b border-neutral-800 py-7 transition-colors last:border-b-0 hover:text-neutral-100";

  const content = (
    <>
      <div className="flex items-start gap-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center text-accent">
          <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 text-base font-semibold text-neutral-100">
            {item.title}
            {!item.internal && (
              <ExternalLink className="h-4 w-4 flex-shrink-0 text-neutral-500" aria-hidden />
            )}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-neutral-400">{item.description}</p>
        </div>
      </div>
    </>
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
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${mediumArticle} flex flex-col gap-10`}
    >
      <header>
        <p className={M.kicker}>Resources</p>
        <h1 className={M.title}>Guides &amp; quick links</h1>
        <p className={M.lead}>
          MCP setup, downloads, contact, and in-depth guides. For technical API and MCP reference, see{" "}
          <Link href="/docs" className={M.link}>
            Docs
          </Link>
          .
        </p>
        <p className={M.byline}>
          <span className={M.bylineBrand}>Deckbase</span>
          <span aria-hidden="true">·</span>
          <span>1 min read</span>
        </p>
      </header>

      {resourceGroups.map((group) => (
        <section key={group.title} id="quick-links" className="scroll-mt-28 space-y-4">
          <h2 className={M.h2}>{group.title}</h2>
          <ul className="flex flex-col gap-4">
            {group.items.map((item) => (
              <li key={item.title}>
                <ResourceCard item={item} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </motion.article>
  );
}
