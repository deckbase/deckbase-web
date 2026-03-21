"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Cpu } from "lucide-react";
import { mediumArticle, M } from "@/components/resources/MediumArticle";

export default function McpServerDocPage() {
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
          <li>
            <Link href="/docs">Docs</Link>
          </li>
          <li aria-hidden="true" className="text-neutral-400">
            /
          </li>
          <li className={M.breadcrumbCurrent}>MCP Server</li>
        </ol>
      </nav>

      <header>
        <p className={M.kicker}>MCP Server</p>
        <h1 className={M.title}>Deckbase MCP</h1>
        <p className={M.lead}>
          Model Context Protocol (MCP) server for Deckbase. AI tools (Cursor, Claude Code, VS Code,
          etc.) can read docs and manage decks and cards.
        </p>
      </header>

      <section id="endpoints" className="scroll-mt-28">
        <h2 className={`${M.h2} flex flex-wrap items-center gap-2`}>
          <Cpu className="h-5 w-5 shrink-0 text-accent" aria-hidden />
          Endpoints
        </h2>
        <div className={M.tableWrap}>
          <table className="w-full text-left">
            <thead>
              <tr className={M.tableHead}>
                <th className={`${M.tableCell} font-semibold text-neutral-200`}>Mode</th>
                <th className={`${M.tableCell} font-semibold text-neutral-200`}>Endpoint</th>
                <th className={`${M.tableCell} font-semibold text-neutral-200`}>Auth</th>
              </tr>
            </thead>
            <tbody className="text-neutral-400">
              <tr className="border-b border-neutral-800">
                <td className={M.tableCell}>Hosted (HTTP)</td>
                <td className={`${M.tableCell} font-mono ${M.accent} text-xs break-all`}>
                  POST /api/mcp
                </td>
                <td className={M.tableCell}>Bearer API key</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className={`${M.bodyMuted} mt-3`}>
          API keys are created in the dashboard. MCP is available for Pro and VIP subscribers in
          production.
        </p>
      </section>

      <section id="tools" className="scroll-mt-28">
        <h2 className={M.h2}>Tools</h2>
        <h3 className={`${M.h3} mb-2`}>Documentation</h3>
        <ul className={`space-y-2 ${M.bodyMuted} mb-6`}>
          <li>
            <strong className="font-mono text-neutral-100">list_docs</strong> — List Markdown files in{" "}
            <code className={M.code}>docs/public/</code>. No parameters.
          </li>
          <li>
            <strong className="font-mono text-neutral-100">read_doc</strong> — Read a doc by path.
            Parameter: <code className={M.code}>path</code> (e.g. <code className={M.code}>MCP.md</code>{" "}
            or <code className={M.code}>deckbase://docs/public/MCP.md</code>). Only docs in{" "}
            <code className={M.code}>docs/public/</code> are served.
          </li>
        </ul>
        <h3 className={`${M.h3} mb-2`}>Decks and cards (hosted only; require API key)</h3>
        <ul className={`space-y-2 ${M.bodyMuted}`}>
          <li>
            <strong className="font-mono text-neutral-100">list_decks</strong> — List the user&apos;s
            flashcard decks (deckId, title, description). No parameters.
          </li>
          <li>
            <strong className="font-mono text-neutral-100">create_deck</strong> — Create a new deck.
            Parameters: <code className={M.code}>title</code> (required),{" "}
            <code className={M.code}>description</code> (optional). Returns{" "}
            <code className={M.code}>deckId</code>.
          </li>
          <li>
            <strong className="font-mono text-neutral-100">create_card</strong> — Create a simple
            flashcard with front content only (back not supported). Parameters:{" "}
            <code className={M.code}>deckId</code>, <code className={M.code}>front</code> (both
            required). Returns <code className={M.code}>cardId</code>.
          </li>
        </ul>
        <p className={`${M.bodyMuted} mt-3`}>
          Deck and card tools (list_decks, create_deck, create_card) require the hosted MCP endpoint
          with an API key.
        </p>
      </section>

      <section id="resources" className="scroll-mt-28">
        <h2 className={M.h2}>Resources</h2>
        <p className={`${M.bodyMuted} mb-2`}>
          The server exposes MCP resources for docs in <code className={M.code}>docs/public/</code>:
        </p>
        <ul className={`${M.bodyMuted} list-inside list-disc space-y-1`}>
          <li>
            <strong className="font-mono text-neutral-100">resources/list</strong> — One resource per{" "}
            <code className={M.code}>.md</code> file in <code className={M.code}>docs/public/</code>{" "}
            (e.g. <code className={M.code}>deckbase://docs/public/MCP.md</code>).
          </li>
          <li>
            <strong className="font-mono text-neutral-100">resources/read</strong> — Fetch doc
            content by that URI.
          </li>
        </ul>
      </section>

      <section id="example" className="scroll-mt-28">
        <h2 className={M.h2}>Example: create a deck and add a card (hosted)</h2>
        <ol className={`${M.bodyMuted} list-inside list-decimal space-y-2`}>
          <li>
            Configure your client with the MCP URL and{" "}
            <code className={M.code}>Authorization: Bearer YOUR_API_KEY</code>.
          </li>
          <li>
            Call <strong className="font-mono text-neutral-100">create_deck</strong> with{" "}
            <code className={M.code}>title</code> (e.g. &quot;Spanish verbs&quot;) and optional{" "}
            <code className={M.code}>description</code>.
          </li>
          <li>
            Use the returned <code className={M.code}>deckId</code> and call{" "}
            <strong className="font-mono text-neutral-100">create_card</strong> with{" "}
            <code className={M.code}>deckId</code> and <code className={M.code}>front</code> (e.g.
            &quot;What is &apos;to run&apos; in Spanish?&quot;). Only the front is supported.
          </li>
        </ol>
      </section>

      <section id="technical-details" className="scroll-mt-28">
        <h2 className={M.h2}>Technical details</h2>
        <ul className={`space-y-1 ${M.bodyMuted}`}>
          <li>
            <strong className="text-neutral-100">Protocol:</strong> MCP 2024-11-05
          </li>
          <li>
            <strong className="text-neutral-100">Server name:</strong> deckbase-mcp
          </li>
          <li>
            <strong className="text-neutral-100">Hosted:</strong> JSON-RPC 2.0 over POST; auth is API
            key only (no Firebase token).
          </li>
          <li>
            <strong className="text-neutral-100">Card shape:</strong> create_card builds a minimal
            flashcard with front content only (back not supported) and writes via Firestore. Decks and
            cards appear in the dashboard and sync to the mobile app.
          </li>
        </ul>
      </section>

      <p className={M.footerNote}>
        For setup and client config (Cursor, VS Code, Claude, etc.), see{" "}
        <Link href="/mcp" className={M.linkPlain}>
          Connecting to Deckbase MCP
        </Link>
        . For other links (Download, Contact), see{" "}
        <Link href="/resources" className={M.linkPlain}>
          Resources
        </Link>
        .
      </p>
    </motion.article>
  );
}
