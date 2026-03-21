"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Cpu, ChevronRight } from "lucide-react";
import { mediumArticle, M } from "@/components/resources/MediumArticle";

const docLinks = [
  {
    href: "/docs/mcp-server",
    title: "MCP Server",
    description:
      "Model Context Protocol (MCP) for Deckbase. Connect Cursor, Claude Code, VS Code, and other AI tools to read docs and manage decks and cards.",
    icon: Cpu,
  },
];

export default function DocsIndexClient() {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${mediumArticle} flex flex-col gap-10`}
    >
      <nav className={M.breadcrumb} aria-label="Breadcrumb">
        <ol className="flex flex-wrap gap-x-2 gap-y-1">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li aria-hidden="true" className="text-neutral-400">
            /
          </li>
          <li className={M.breadcrumbCurrent}>Docs</li>
        </ol>
      </nav>

      <header>
        <p className={M.kicker}>Documentation</p>
        <h1 className={M.title}>Docs</h1>
        <p className={M.lead}>
          Technical documentation for Deckbase: integrations, APIs, and guides.
        </p>
      </header>

      <section id="documentation" className="scroll-mt-28">
        <h2 className={M.h2}>Documentation</h2>
        <ul className="divide-y divide-neutral-800 border-y border-neutral-800">
          {docLinks.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-start gap-4 py-7 transition-colors hover:text-neutral-100"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center text-accent">
                    <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="flex items-center gap-2 text-base font-semibold text-neutral-100">
                      {item.title}
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-neutral-500" aria-hidden />
                    </h3>
                    <p className={`${M.bodyMuted} mt-1`}>{item.description}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <p className={M.footerNote}>
        For setup and client config (Cursor, VS Code, Claude, etc.), see{" "}
        <Link href="/mcp" className={M.linkPlain}>
          Connecting to Deckbase MCP
        </Link>
        . For quick links (Download, Contact), see{" "}
        <Link href="/resources" className={M.linkPlain}>
          Resources
        </Link>
        .
      </p>
    </motion.article>
  );
}
