"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  BookOpen,
  ExternalLink,
  Layers,
  Sparkles,
  ChevronRight,
  FileText,
  Cpu,
  ArrowRight,
} from "lucide-react";

/* ─── data ─────────────────────────────────────────────────────────────── */

const heroGuide = {
  href: "/resources/mcp",
  title: "MCP for flashcards",
  description:
    "How Deckbase MCP compares to other MCP servers and how to create decks and cards from Cursor or Claude Code — synced to the app.",
  icon: Cpu,
  tag: "Guide",
  readTime: "5 min read",
};

const guides = [
  {
    href: "/resources/fsrs-guide",
    title: "What is FSRS? Practical guide",
    description:
      "Plain-English FSRS explainer: how modern spaced repetition improves retention and daily workload.",
    icon: FileText,
    tag: "Guide",
    readTime: "6 min read",
  },
  {
    href: "/resources/ocr-study-workflows",
    title: "OCR study workflows",
    description:
      "Operational OCR pipeline for turning books and PDFs into clean, high-retention flashcards.",
    icon: FileText,
    tag: "Guide",
    readTime: "6 min read",
  },
  {
    href: "/resources/mcp-study-automation-examples",
    title: "MCP study automation examples",
    description:
      "Production-safe MCP patterns for listing decks, mapping templates, and creating cards in batches.",
    icon: Cpu,
    tag: "Guide",
    readTime: "6 min read",
  },
  {
    href: "/resources/anki-import-export",
    title: "Anki import/export migration guide",
    description:
      "How to migrate between Anki and Deckbase with .apkg import while keeping your study momentum.",
    icon: Layers,
    tag: "Guide",
    readTime: "5 min read",
  },
];

const articles = [
  {
    href: "/ai-flashcards",
    title: "AI flashcard maker (Deckbase)",
    description:
      "AI-generated flashcards from PDFs and notes, FSRS review, mobile sync, and optional MCP for Cursor and Claude.",
    icon: Sparkles,
    tag: "Product",
    readTime: "4 min read",
  },
  {
    href: "/anki-alternatives",
    title: "Best Anki alternatives",
    description:
      "Roundup of apps like Anki — AI-generated cards, FSRS algorithm, and mobile-first study.",
    icon: Layers,
    tag: "Article",
    readTime: "4 min read",
  },
  {
    href: "/best-flashcard-apps",
    title: "Best flashcard apps (2026)",
    description:
      "How to choose a flashcard app for med school, languages, and exam prep.",
    icon: Sparkles,
    tag: "Article",
    readTime: "4 min read",
  },
  {
    href: "/quizlet-alternatives",
    title: "Best Quizlet alternatives",
    description:
      "Roundup of Quizlet alternatives focused on long-term retention, FSRS, and AI card workflows.",
    icon: Layers,
    tag: "Article",
    readTime: "6 min read",
  },
];

const comparisons = [
  {
    href: "/deckbase-vs-anki",
    title: "Deckbase vs Anki",
    description:
      "Direct comparison of AI card creation, FSRS scheduling, pricing, and learning curve.",
    icon: BookOpen,
    tag: "Comparison",
    readTime: "8 min read",
  },
  {
    href: "/deckbase-vs-quizlet",
    title: "Deckbase vs Quizlet",
    description:
      "Head-to-head comparison of retention quality, study modes, pricing, and ideal use cases.",
    icon: BookOpen,
    tag: "Comparison",
    readTime: "8 min read",
  },
  {
    href: "/deckbase-vs-remnote",
    title: "Deckbase vs RemNote",
    description:
      "Compare focused flashcard workflows versus all-in-one note systems for serious study.",
    icon: BookOpen,
    tag: "Comparison",
    readTime: "7 min read",
  },
];

const related = [
  { href: "/docs", label: "API & MCP reference", icon: FileText },
  { href: "/mcp", label: "Connect your AI tool", icon: Cpu },
  { href: "/features", label: "All features", icon: Sparkles },
];

/* ─── tag styles ────────────────────────────────────────────────────────── */

const tagStyles = {
  Guide:
    "text-accent bg-accent/10 border-accent/20",
  Product:
    "text-sky-400 bg-sky-400/10 border-sky-400/20",
  Article:
    "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Comparison:
    "text-amber-400 bg-amber-400/10 border-amber-400/20",
};

/* ─── components ────────────────────────────────────────────────────────── */

function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-4">
      {children}
    </p>
  );
}

function HeroCard({ item }) {
  const Icon = item.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Link
        href={item.href}
        className="group relative flex flex-col gap-5 p-7 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/[0.10] via-accent/[0.05] to-transparent hover:border-accent/50 hover:from-accent/[0.14] transition-all duration-300 overflow-hidden"
      >
        {/* Glow */}
        <div className="pointer-events-none absolute -top-10 -left-10 w-48 h-48 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative flex items-start gap-4">
          <div className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-accent/15 border border-accent/30 text-accent">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${tagStyles[item.tag]}`}>
                {item.tag}
              </span>
              <span className="text-[11px] text-white/30">{item.readTime}</span>
            </div>
            <h2 className="text-xl font-bold text-white leading-snug mb-2.5 group-hover:text-white/90 transition-colors">
              {item.title}
            </h2>
            <p className="text-sm text-white/55 leading-relaxed max-w-lg">
              {item.description}
            </p>
          </div>
        </div>

        <div className="relative flex items-center gap-1.5 text-accent text-sm font-medium">
          Read guide
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
        </div>
      </Link>
    </motion.div>
  );
}

function SmallCard({ item, index }) {
  const Icon = item.icon;
  return (
    <motion.div
      custom={index}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: index * 0.07, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Link
        href={item.href}
        className="group flex items-start gap-4 p-4 rounded-xl border border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.05] hover:border-white/[0.15] transition-all duration-200 h-full"
      >
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/40 group-hover:text-white/70 transition-colors mt-0.5">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${tagStyles[item.tag]}`}>
              {item.tag}
            </span>
            <span className="text-[11px] text-white/25">{item.readTime}</span>
          </div>
          <h3 className="text-sm font-semibold text-white/80 leading-snug mb-1 group-hover:text-white transition-colors">
            {item.title}
          </h3>
          <p className="text-[12px] text-white/40 leading-relaxed line-clamp-2">
            {item.description}
          </p>
        </div>
        <ChevronRight className="flex-shrink-0 w-4 h-4 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all duration-200 mt-1 hidden sm:block" />
      </Link>
    </motion.div>
  );
}

/* ─── page ──────────────────────────────────────────────────────────────── */

export default function ResourcesPage() {
  return (
    <article className="w-full max-w-3xl flex flex-col gap-12">

      {/* Breadcrumb */}
      <nav className="text-xs text-white/30" aria-label="Breadcrumb">
        <ol className="flex flex-wrap gap-x-2 gap-y-1">
          <li>
            <Link href="/" className="hover:text-white/60 transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-white/50">Resources</li>
        </ol>
      </nav>

      {/* Header */}
      <motion.header
        className="flex flex-col gap-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
          Resources
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
          Guides &amp; articles
        </h1>
        <p className="text-white/50 text-base sm:text-lg leading-relaxed max-w-[500px]">
          MCP setup guides and in-depth articles. For the technical API and MCP
          reference, see{" "}
          <Link href="/docs" className="text-accent hover:underline underline-offset-2">
            Docs
          </Link>
          .
        </p>
      </motion.header>

      {/* Featured guide */}
      <section id="quick-links" className="scroll-mt-28 flex flex-col gap-3">
        <SectionLabel>Featured</SectionLabel>
        <HeroCard item={heroGuide} />
      </section>

      {/* Guides grid */}
      <section className="flex flex-col gap-3">
        <SectionLabel>Guides</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {guides.map((item, i) => (
            <SmallCard key={item.href} item={item} index={i} />
          ))}
        </div>
      </section>

      {/* Articles */}
      <section className="flex flex-col gap-3">
        <SectionLabel>Articles</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {articles.map((item, i) => (
            <SmallCard key={item.href} item={item} index={i} />
          ))}
        </div>
      </section>

      {/* Comparisons */}
      <section className="flex flex-col gap-3">
        <SectionLabel>Comparisons</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {comparisons.map((item, i) => (
            <SmallCard key={item.href} item={item} index={i} />
          ))}
        </div>
      </section>

      {/* Related links */}
      <section className="flex flex-col gap-3">
        <SectionLabel>Also useful</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {related.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-200"
              >
                <Icon className="w-4 h-4 text-white/30 group-hover:text-white/60 flex-shrink-0 transition-colors" />
                <span className="text-sm text-white/50 group-hover:text-white/80 transition-colors">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Footer note */}
      <p className="text-[13px] text-white/25 border-t border-white/[0.06] pt-6">
        Built by <span className="text-white/40">Deckbase</span> · Updated 2026
      </p>
    </article>
  );
}
