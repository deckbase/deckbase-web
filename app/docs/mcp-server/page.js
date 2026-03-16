"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Cpu } from "lucide-react";

export default function McpServerDocPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-10"
    >
      <div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/15 border border-accent/30 text-accent text-sm font-medium mb-6">
          MCP Server
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-4">
          Deckbase MCP
        </h1>
        <p className="text-base sm:text-lg text-white/85 max-w-2xl leading-relaxed">
          Model Context Protocol (MCP) server for Deckbase. AI tools (Cursor, Claude Code, VS Code, etc.) can read docs and manage decks and cards.
        </p>
      </div>

      <section id="endpoints">
        <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2 scroll-mt-32">
          <Cpu className="w-5 h-5 text-accent" />
          Endpoints
        </h2>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 font-semibold text-white">Mode</th>
                <th className="px-4 py-3 font-semibold text-white">Endpoint</th>
                <th className="px-4 py-3 font-semibold text-white">Auth</th>
              </tr>
            </thead>
            <tbody className="text-white/85">
              <tr>
                <td className="px-4 py-3">Hosted (HTTP)</td>
                <td className="px-4 py-3 font-mono text-accent text-xs break-all">POST /api/mcp</td>
                <td className="px-4 py-3">Bearer API key</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-white/60 text-sm mt-3">
          API keys are created in the dashboard. MCP is available for Pro and VIP subscribers in production.
        </p>
      </section>

      <section id="tools">
        <h2 className="text-xl font-semibold text-white mb-3 scroll-mt-32">Tools</h2>
        <h3 className="text-base font-medium text-white/90 mb-2">Documentation</h3>
        <ul className="space-y-2 text-white/80 text-sm mb-6">
          <li><strong className="text-white font-mono">list_docs</strong> — List Markdown files in <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs">docs/public/</code>. No parameters.</li>
          <li><strong className="text-white font-mono">read_doc</strong> — Read a doc by path. Parameter: <code className="px-1.5 py-0.5 rounded bg-white/10 text-accent font-mono text-xs">path</code> (e.g. <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs">MCP.md</code> or <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs">deckbase://docs/public/MCP.md</code>). Only docs in <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs">docs/public/</code> are served.</li>
        </ul>
        <h3 className="text-base font-medium text-white/90 mb-2">Decks and cards (hosted only; require API key)</h3>
        <ul className="space-y-2 text-white/80 text-sm">
          <li><strong className="text-white font-mono">list_decks</strong> — List the user&apos;s flashcard decks (deckId, title, description). No parameters.</li>
          <li><strong className="text-white font-mono">create_deck</strong> — Create a new deck. Parameters: <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs">title</code> (required), <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs">description</code> (optional). Returns <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs">deckId</code>.</li>
          <li><strong className="text-white font-mono">create_card</strong> — Create a simple flashcard with front content only (back not supported). Parameters: <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs">deckId</code>, <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs">front</code> (both required). Returns <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs">cardId</code>.</li>
        </ul>
        <p className="text-white/60 text-sm mt-3">
          Deck and card tools (list_decks, create_deck, create_card) require the hosted MCP endpoint with an API key.
        </p>
      </section>

      <section id="resources">
        <h2 className="text-xl font-semibold text-white mb-3 scroll-mt-32">Resources</h2>
        <p className="text-white/80 text-sm mb-2">
          The server exposes MCP resources for docs in <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs">docs/public/</code>:
        </p>
        <ul className="space-y-1 text-white/80 text-sm list-disc list-inside">
          <li><strong className="text-white font-mono">resources/list</strong> — One resource per <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs">.md</code> file in <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs">docs/public/</code> (e.g. <code className="px-1.5 py-0.5 rounded bg-white/10 text-accent font-mono text-xs">deckbase://docs/public/MCP.md</code>).</li>
          <li><strong className="text-white font-mono">resources/read</strong> — Fetch doc content by that URI.</li>
        </ul>
      </section>

      <section id="example">
        <h2 className="text-xl font-semibold text-white mb-3 scroll-mt-32">Example: create a deck and add a card (hosted)</h2>
        <ol className="list-decimal list-inside space-y-2 text-white/80 text-sm">
          <li>Configure your client with the MCP URL and <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs">Authorization: Bearer YOUR_API_KEY</code>.</li>
          <li>Call <strong className="text-white font-mono">create_deck</strong> with <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs">title</code> (e.g. &quot;Spanish verbs&quot;) and optional <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs">description</code>.</li>
          <li>Use the returned <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs">deckId</code> and call <strong className="text-white font-mono">create_card</strong> with <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs">deckId</code> and <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs">front</code> (e.g. &quot;What is &apos;to run&apos; in Spanish?&quot;). Only the front is supported.</li>
        </ol>
      </section>

      <section id="technical-details">
        <h2 className="text-xl font-semibold text-white mb-3 scroll-mt-32">Technical details</h2>
        <ul className="space-y-1 text-white/80 text-sm">
          <li><strong className="text-white">Protocol:</strong> MCP 2024-11-05</li>
          <li><strong className="text-white">Server name:</strong> deckbase-mcp</li>
          <li><strong className="text-white">Hosted:</strong> JSON-RPC 2.0 over POST; auth is API key only (no Firebase token).</li>
          <li><strong className="text-white">Card shape:</strong> create_card builds a minimal flashcard with front content only (back not supported) and writes via Firestore. Decks and cards appear in the dashboard and sync to the mobile app.</li>
        </ul>
      </section>

      <p className="text-white/60 text-sm pt-4 border-t border-white/10">
        For setup and client config (Cursor, VS Code, Claude, etc.), see{" "}
        <Link href="/mcp" className="text-accent hover:underline">
          Connecting to Deckbase MCP
        </Link>
        . For other links (Download, Contact), see{" "}
        <Link href="/resources" className="text-accent hover:underline">
          Resources
        </Link>
        .
      </p>
    </motion.div>
  );
}
