"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BookOpen, Cpu, ChevronRight } from "lucide-react";

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
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-10"
    >
      <div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/15 border border-accent/30 text-accent text-sm font-medium mb-6">
          <BookOpen className="w-4 h-4" aria-hidden />
          Documentation
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-4">
          Docs
        </h1>
        <p className="text-base sm:text-lg text-white/85 max-w-2xl leading-relaxed">
          Technical documentation for Deckbase: integrations, APIs, and guides.
        </p>
      </div>

      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Documentation</h2>
        <ul className="space-y-4">
          {docLinks.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 hover:bg-white/[0.06] hover:border-white/15 transition-colors group"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-accent">
                    <Icon className="w-5 h-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 group-hover:text-accent transition-colors">
                      {item.title}
                      <ChevronRight className="w-4 h-4 flex-shrink-0" aria-hidden />
                    </h3>
                    <p className="text-white/75 text-sm mt-1">{item.description}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-white/60 text-sm pt-4 border-t border-white/10">
        For setup and client config (Cursor, VS Code, Claude, etc.), see{" "}
        <Link href="/mcp" className="text-accent hover:underline">
          Connecting to Deckbase MCP
        </Link>
        . For quick links (Download, Contact), see{" "}
        <Link href="/resources" className="text-accent hover:underline">
          Resources
        </Link>
        .
      </p>
    </motion.div>
  );
}
