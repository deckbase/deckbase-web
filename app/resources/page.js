"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BookOpen, ExternalLink, Layers, Sparkles, ChevronRight, FileText, Cpu } from "lucide-react";

const guides = [
  {
    href: "/resources/mcp",
    title: "MCP for flashcards",
    description:
      "How Deckbase MCP compares to other MCP servers and how to create decks and cards from Cursor or Claude Code — synced to the app.",
    icon: Cpu,
    tag: "Guide",
    readTime: "5 min read",
    featured: true,
    internal: true,
  },
  {
    href: "/anki-alternatives",
    title: "Best Anki alternatives",
    description: "Roundup of apps like Anki — AI-generated cards, FSRS algorithm, and mobile-first study.",
    icon: Layers,
    tag: "Article",
    readTime: "4 min read",
    internal: true,
  },
  {
    href: "/best-flashcard-apps",
    title: "Best flashcard apps (2026)",
    description: "How to choose a flashcard app for med school, languages, and exam prep.",
    icon: Sparkles,
    tag: "Article",
    readTime: "4 min read",
    internal: true,
  },
];

const related = [
  { href: "/docs", label: "API & MCP reference", icon: FileText },
  { href: "/mcp", label: "Connect your AI tool", icon: Cpu },
  { href: "/features", label: "All features", icon: Sparkles },
];

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.08, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

function ResourceCard({ item, index }) {
  const Icon = item.icon;
  const Tag = item.internal ? Link : "a";
  const extraProps = item.internal ? {} : { target: "_blank", rel: "noopener noreferrer" };

  return (
    <motion.div custom={index} variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <Tag
        href={item.href}
        {...extraProps}
        className={`group flex flex-col sm:flex-row items-start gap-5 p-5 sm:p-6 rounded-2xl border transition-all duration-200 ${
          item.featured
            ? "border-accent/25 bg-accent/[0.04] hover:bg-accent/[0.07] hover:border-accent/40"
            : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]"
        }`}
      >
        {/* Icon */}
        <div
          className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl mt-0.5 ${
            item.featured
              ? "bg-accent/15 border border-accent/25 text-accent"
              : "bg-white/[0.05] border border-white/[0.08] text-white/50 group-hover:text-white/80"
          } transition-colors duration-200`}
        >
          <Icon className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                item.featured
                  ? "text-accent bg-accent/10 border border-accent/20"
                  : "text-white/30 bg-white/[0.04] border border-white/[0.07]"
              }`}
            >
              {item.tag}
            </span>
            <span className="text-[11px] text-white/25">{item.readTime}</span>
          </div>

          <h3 className="text-base font-semibold text-white leading-snug mb-2 group-hover:text-white transition-colors flex items-center gap-1.5">
            {item.title}
            {!item.internal && (
              <ExternalLink className="w-3.5 h-3.5 text-white/25 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            )}
          </h3>
          <p className="text-[13px] text-white/45 leading-relaxed">{item.description}</p>
        </div>

        <ChevronRight className="flex-shrink-0 w-4 h-4 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all duration-200 mt-1 hidden sm:block" />
      </Tag>
    </motion.div>
  );
}

export default function ResourcesPage() {
  return (
    <article className="w-full max-w-3xl flex flex-col gap-12">

      {/* Breadcrumb */}
      <nav className="text-xs text-white/30" aria-label="Breadcrumb">
        <ol className="flex flex-wrap gap-x-2 gap-y-1">
          <li><Link href="/" className="hover:text-white/60 transition-colors">Home</Link></li>
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

      {/* Cards */}
      <section id="quick-links" className="scroll-mt-28 flex flex-col gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-1">
          All resources
        </p>
        <div className="flex flex-col gap-3">
          {guides.map((item, i) => (
            <ResourceCard key={item.href} item={item} index={i} />
          ))}
        </div>
      </section>

      {/* Related links */}
      <section className="flex flex-col gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-1">
          Also useful
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {related.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-200"
              >
                <Icon className="w-4 h-4 text-white/30 group-hover:text-white/60 flex-shrink-0 transition-colors" />
                <span className="text-sm text-white/50 group-hover:text-white/80 transition-colors">{item.label}</span>
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
