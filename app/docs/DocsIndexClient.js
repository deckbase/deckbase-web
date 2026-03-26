"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Cpu, ChevronRight, BookOpen, Zap, ArrowRight } from "lucide-react";
import { M } from "@/components/resources/MediumArticle";

const docLinks = [
  {
    href: "/docs/mcp-server",
    title: "MCP Server",
    description:
      "Full reference for the Model Context Protocol server: endpoints, tools, resources, and authentication.",
    icon: Cpu,
    badge: "Reference",
    tools: ["list_docs", "list_decks", "create_card", "create_template"],
  },
];

const quickLinks = [
  {
    href: "/mcp",
    icon: Zap,
    title: "Setup guide",
    description: "Connect Cursor, Claude Code, VS Code, Windsurf, and more.",
  },
  {
    href: "/dashboard/api-keys",
    icon: BookOpen,
    title: "API keys",
    description: "Create and manage your API keys in the dashboard.",
  },
];

export default function DocsIndexClient() {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="w-full max-w-3xl flex flex-col gap-12"
    >
      {/* Breadcrumb */}
      <nav className={M.breadcrumb} aria-label="Breadcrumb">
        <ol className="flex flex-wrap gap-x-2 gap-y-1">
          <li><Link href="/">Home</Link></li>
          <li aria-hidden="true" className="text-white/20">/</li>
          <li className="text-white/50">Docs</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="flex flex-col gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
          Documentation
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
          Docs
        </h1>
        <p className="text-white/50 text-base sm:text-lg leading-relaxed max-w-[500px]">
          Technical reference for Deckbase integrations, APIs, and developer guides.
        </p>
      </header>

      {/* Doc cards */}
      <section id="documentation" className="scroll-mt-28 flex flex-col gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-1">
          Reference
        </p>
        {docLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-start gap-5 p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-200"
            >
              <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-accent/10 border border-accent/20 text-accent mt-0.5">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30 bg-white/[0.05] border border-white/[0.07] px-1.5 py-0.5 rounded-md">
                    {item.badge}
                  </span>
                </div>
                <p className="text-[13px] text-white/45 leading-snug mb-3">{item.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.tools.map((tool) => (
                    <span
                      key={tool}
                      className="font-mono text-[11px] text-white/35 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-md"
                    >
                      {tool}
                    </span>
                  ))}
                  <span className="font-mono text-[11px] text-white/20 px-2 py-0.5">+ more</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/25 flex-shrink-0 mt-1 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all duration-200" />
            </Link>
          );
        })}
      </section>

      {/* Quick links */}
      <section className="flex flex-col gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-1">
          Quick links
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-start gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-200"
              >
                <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/50 group-hover:text-white/80 transition-colors">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white/70 group-hover:text-white transition-colors mb-0.5">{item.title}</p>
                  <p className="text-[12px] text-white/35 leading-snug">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Footer note */}
      <p className="text-[13px] text-white/25 border-t border-white/[0.06] pt-6 flex items-center gap-1.5">
        For other links (Download, Contact), see{" "}
        <Link href="/resources" className="text-accent hover:underline underline-offset-2 inline-flex items-center gap-1">
          Resources <ArrowRight className="w-3 h-3" />
        </Link>
      </p>
    </motion.article>
  );
}
