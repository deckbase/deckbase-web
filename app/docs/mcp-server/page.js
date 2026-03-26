"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Cpu, Lock, Globe, ArrowRight } from "lucide-react";
import { M } from "@/components/resources/MediumArticle";

/** Styled inline code */
function C({ children }) {
  return (
    <code className="rounded border border-white/[0.08] bg-white/[0.05] px-[0.4em] py-[0.06em] font-mono text-[0.83em] text-[#93c5fd]">
      {children}
    </code>
  );
}

/** Tool name cell */
function ToolName({ children }) {
  return (
    <td className="px-3 py-3 font-mono text-[12px] sm:text-[13px] text-white font-medium whitespace-nowrap align-top">
      {children}
    </td>
  );
}

function Td({ children, className = "" }) {
  return (
    <td className={`px-3 py-3 text-[13px] text-white/55 align-top leading-relaxed ${className}`}>
      {children}
    </td>
  );
}

function TableSection({ label, icon: Icon, children }) {
  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.015]">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.03] border-b border-white/[0.07]">
        {Icon && <Icon className="w-3.5 h-3.5 text-white/40" />}
        <span className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
          {label}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/30 w-44">Tool</th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/30">Description</th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/30 min-w-[180px]">Parameters</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export default function McpServerDocPage() {
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
          <li><Link href="/docs">Docs</Link></li>
          <li aria-hidden="true" className="text-white/20">/</li>
          <li className="text-white/50">MCP Server</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="flex flex-col gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
          MCP Server
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
          Deckbase MCP
        </h1>
        <p className="text-white/50 text-base sm:text-lg leading-relaxed max-w-[540px]">
          Model Context Protocol server for Deckbase. AI tools (Cursor, Claude Code, VS Code, etc.)
          can read docs and manage decks and cards.
        </p>
      </header>

      {/* Endpoints */}
      <section id="endpoints" className="scroll-mt-28 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-white/30" />
          <h2 className="text-base font-semibold text-white">Endpoints</h2>
        </div>

        <div className="rounded-xl overflow-hidden border border-white/[0.08]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/[0.07]">
                  <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/30">Mode</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/30">Endpoint</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/30">Auth</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td>Hosted (HTTP)</Td>
                  <td className="px-3 py-3 font-mono text-[12px] text-accent align-top">POST /api/mcp</td>
                  <Td>
                    <C>Authorization: Bearer</C> — dashboard API key or OAuth access token. Same path in
                    production: <C>/api/mcp</C>.
                  </Td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.07]">
          <Lock className="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
          <p className="text-[13px] text-white/45 leading-relaxed">
            API keys are created in the dashboard. MCP is available for Pro and VIP subscribers.
            OAuth (browser login) is optional — see{" "}
            <Link href="/mcp" className="text-accent hover:underline underline-offset-2">
              Connecting to Deckbase MCP
            </Link>{" "}
            and the full reference in <C>docs/public/MCP.md</C> via <C>read_doc</C>.
          </p>
        </div>
      </section>

      {/* Tools */}
      <section id="tools" className="scroll-mt-28 flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-white/30" />
          <h2 className="text-base font-semibold text-white">Tools</h2>
        </div>

        {/* Documentation tools */}
        <TableSection label="Documentation" icon={null}>
          <tr className="hover:bg-white/[0.02] transition-colors">
            <ToolName>list_docs</ToolName>
            <Td>List Markdown files in <C>docs/public/</C>.</Td>
            <Td className="text-white/30 italic">None.</Td>
          </tr>
          <tr className="hover:bg-white/[0.02] transition-colors">
            <ToolName>read_doc</ToolName>
            <Td>Read a doc by path. Only docs in <C>docs/public/</C> are served.</Td>
            <Td><C>path</C> — e.g. <C>MCP.md</C> or <C>deckbase://docs/public/MCP.md</C>.</Td>
          </tr>
          <tr className="hover:bg-white/[0.02] transition-colors">
            <ToolName>list_template_block_types</ToolName>
            <Td>
              Block type keys and numeric ids (<strong className="text-white/70">text</strong>,{" "}
              <strong className="text-white/70">media</strong>,{" "}
              <strong className="text-white/70">quiz</strong>,{" "}
              <strong className="text-white/70">layout</strong>). Use before <C>create_template</C>. Static data.
            </Td>
            <Td className="text-white/30 italic">None.</Td>
          </tr>
          <tr className="hover:bg-white/[0.02] transition-colors">
            <ToolName>list_block_schemas</ToolName>
            <Td>
              JSON shapes per block type: <C>blocksSnapshot</C>, <C>values</C>, <C>configJson</C>.
              Pair with <C>export_deck</C> for real examples.
            </Td>
            <Td className="text-white/30 italic">None.</Td>
          </tr>
          <tr className="hover:bg-white/[0.02] transition-colors">
            <ToolName>list_elevenlabs_voices</ToolName>
            <Td>
              ElevenLabs voice ids and labels for <C>voice_id</C> on <C>attach_audio_to_card</C>.
              Deckbase curated catalog. No user Firestore reads.
            </Td>
            <Td>
              Optional <C>language</C>, <C>gender</C>, <C>search</C>.
            </Td>
          </tr>
        </TableSection>

        {/* Decks & cards tools */}
        <TableSection label="Decks & Cards — require API key" icon={Lock}>
          <tr className="hover:bg-white/[0.02] transition-colors">
            <ToolName>list_decks</ToolName>
            <Td>User's decks (<C>deckId</C>, title, description, optional <C>defaultTemplateId</C>).</Td>
            <Td className="text-white/30 italic">None.</Td>
          </tr>
          <tr className="hover:bg-white/[0.02] transition-colors">
            <ToolName>create_deck</ToolName>
            <Td>Create a deck. Returns <C>deckId</C>.</Td>
            <Td><C>title</C> (required), <C>description</C> (optional).</Td>
          </tr>
          <tr className="hover:bg-white/[0.02] transition-colors">
            <ToolName>update_deck</ToolName>
            <Td>Update title, description, or default template.</Td>
            <Td><C>deckId</C> (required); optional title, description, <C>default_template_id</C>.</Td>
          </tr>
          <tr className="hover:bg-white/[0.02] transition-colors">
            <ToolName>list_templates</ToolName>
            <Td>Templates (<C>templateId</C>, name, description).</Td>
            <Td className="text-white/30 italic">None.</Td>
          </tr>
          <tr className="hover:bg-white/[0.02] transition-colors">
            <ToolName>get_template_schema</ToolName>
            <Td>
              Exact JSON for the layout: <C>blockId</C>, type, <C>side</C> (<C>"front"</C> | <C>"back"</C>),{" "}
              <C>configJson</C>, <C>valuesExample</C>, <C>create_card</C> hints.
            </Td>
            <Td><C>templateId</C> or <C>deckId</C> for the deck's default template.</Td>
          </tr>
          <tr className="hover:bg-white/[0.02] transition-colors">
            <ToolName>create_card</ToolName>
            <Td>
              New card from a template. Returns <C>cardId</C>, <C>templateId</C>, <C>usedDeckDefault</C>.
            </Td>
            <Td>
              <C>deckId</C> required. Optional <C>templateId</C>, <C>front</C>, <C>block_text</C>,{" "}
              <C>generate_audio</C>, <C>voice_id</C>, <C>audio_language</C>, <C>audio_gender</C>.
            </Td>
          </tr>
          <tr className="hover:bg-white/[0.02] transition-colors">
            <ToolName>create_cards</ToolName>
            <Td>Bulk create. Max 50 per request. On failure: <C>created</C> + <C>failedAt</C>.</Td>
            <Td>
              <C>deckId</C>, <C>cards</C> array (required). Optional top-level <C>templateId</C>,{" "}
              <C>voice_id</C>, <C>generate_audio</C>.
            </Td>
          </tr>
          <tr className="hover:bg-white/[0.02] transition-colors">
            <ToolName>update_card</ToolName>
            <Td>Edit a card's content.</Td>
            <Td>
              <C>deckId</C>, <C>cardId</C>; optional <C>values</C> / <C>blocks_snapshot</C>, or merge{" "}
              <C>front</C> / <C>block_text</C>.
            </Td>
          </tr>
          <tr className="hover:bg-white/[0.02] transition-colors">
            <ToolName>attach_audio_to_card</ToolName>
            <Td>ElevenLabs TTS for an existing card.</Td>
            <Td>
              <C>deckId</C>, <C>cardId</C>. Pass <C>voice_id</C> or <C>audio_language</C> +{" "}
              <C>audio_gender</C>. Optional <C>text</C>, <C>block_id</C>, <C>replace_existing</C>.
            </Td>
          </tr>
          <tr className="hover:bg-white/[0.02] transition-colors">
            <ToolName>export_deck</ToolName>
            <Td>
              Deck + cards JSON. Includes <C>truncated</C>, <C>exportType</C>. Full export includes{" "}
              per-card <C>blocksSnapshot</C> with <C>side</C> + <C>values</C>.
            </Td>
            <Td>
              <C>deckId</C> (required); optional <C>max_cards</C> (default 2000, cap 5000),{" "}
              <C>export_type</C>: <C>full</C> or <C>values_only</C>.
            </Td>
          </tr>
          <tr className="hover:bg-white/[0.02] transition-colors">
            <ToolName>create_template</ToolName>
            <Td>
              New template (block layout). Returns <C>templateId</C> and block ids. Default Q+A if{" "}
              <C>block_types</C> omitted.
            </Td>
            <Td>
              <C>name</C> (required); optional description, <C>block_types</C> / <C>blocks</C> (per-block{" "}
              <C>side</C>), <C>voice_id</C>, <C>audio_language</C>, <C>audio_gender</C>,{" "}
              <C>mainBlockId</C> / <C>subBlockId</C>.
            </Td>
          </tr>
          <tr className="hover:bg-white/[0.02] transition-colors">
            <ToolName>update_template</ToolName>
            <Td>Update metadata and/or layout. Bumps <C>version</C>.</Td>
            <Td>
              <C>templateId</C> (required); optional name, description, <C>block_types</C> / <C>blocks</C>,{" "}
              <C>voice_id</C>, <C>audio_language</C> + <C>audio_gender</C>, <C>mainBlockId</C> / <C>subBlockId</C>.
            </Td>
          </tr>
        </TableSection>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[13px] text-white/40 leading-relaxed">
          Tools that read your data require a valid API key or OAuth token.{" "}
          <C>list_template_block_types</C> and <C>list_block_schemas</C> return static data (no auth needed).{" "}
          <C>list_elevenlabs_voices</C> doesn't read Firestore. Unauthenticated requests return{" "}
          <strong className="text-white/60">401</strong>.
        </div>
      </section>

      {/* Resources */}
      <section id="resources" className="scroll-mt-28 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-white">Resources</h2>
        <p className="text-[13px] text-white/45 leading-relaxed">
          The server exposes MCP resources for docs in <C>docs/public/</C>:
        </p>
        <div className="rounded-xl overflow-hidden border border-white/[0.08] divide-y divide-white/[0.06]">
          {[
            {
              name: "resources/list",
              desc: (
                <>
                  One resource per <C>.md</C> file in <C>docs/public/</C> (e.g.{" "}
                  <C>deckbase://docs/public/MCP.md</C>).
                </>
              ),
            },
            {
              name: "resources/read",
              desc: "Fetch doc content by that URI.",
            },
          ].map((r) => (
            <div key={r.name} className="flex items-start gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors">
              <code className="text-[12px] font-mono text-white/70 bg-white/[0.05] border border-white/[0.07] px-2 py-0.5 rounded-md flex-shrink-0 mt-0.5">
                {r.name}
              </code>
              <p className="text-[13px] text-white/45 leading-snug mt-0.5">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Example */}
      <section id="example" className="scroll-mt-28 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-white">Example: deck, template, and card</h2>
        <ol className="flex flex-col gap-3">
          {[
            <>Configure your client with the MCP URL and <C>Authorization: Bearer YOUR_API_KEY</C>.</>,
            <>Call <strong className="text-white/80 font-mono text-[13px]">list_templates</strong>. If empty, use <strong className="text-white/80 font-mono text-[13px]">list_template_block_types</strong> and <strong className="text-white/80 font-mono text-[13px]">create_template</strong> first.</>,
            <>Call <strong className="text-white/80 font-mono text-[13px]">get_template_schema</strong> with the chosen <C>templateId</C> to learn exact <C>blockId</C> keys and <C>side</C> values.</>,
            <>Call <strong className="text-white/80 font-mono text-[13px]">create_deck</strong> with a <C>title</C> and optional <C>description</C>.</>,
            <>Call <strong className="text-white/80 font-mono text-[13px]">create_card</strong> with <C>deckId</C> and optionally <C>templateId</C>, <C>front</C>, or <C>block_text</C>.</>,
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-accent border border-accent/25 bg-accent/[0.07] mt-0.5">
                {i + 1}
              </span>
              <p className="text-[13px] text-white/50 leading-relaxed flex-1">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Technical details */}
      <section id="technical-details" className="scroll-mt-28 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-white">Technical details</h2>
        <div className="rounded-xl border border-white/[0.07] divide-y divide-white/[0.06] overflow-hidden">
          {[
            { label: "Protocol", value: "MCP 2024-11-05" },
            { label: "Server name", value: "deckbase-mcp" },
            {
              label: "Hosted",
              value: "JSON-RPC 2.0 over POST. Use a dashboard API key or OAuth access token (Bearer) — not a Firebase ID token.",
            },
            {
              label: "Card shape",
              value: "create_card copies the template's block layout. Each block includes side from the template; empty values by default. Data is stored in Firestore and syncs to dashboard and mobile app.",
            },
          ].map((item) => (
            <div key={item.label} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors">
              <span className="text-[12px] font-semibold text-white/40 sm:w-28 flex-shrink-0 uppercase tracking-wider">{item.label}</span>
              <span className="text-[13px] text-white/55 leading-relaxed flex-1">{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer note */}
      <p className="text-[13px] text-white/25 border-t border-white/[0.06] pt-6 flex flex-wrap items-center gap-x-2 gap-y-1">
        For client setup (Cursor, VS Code, Claude, etc.), see{" "}
        <Link href="/mcp" className="text-accent hover:underline underline-offset-2 inline-flex items-center gap-1">
          Connecting to Deckbase MCP <ArrowRight className="w-3 h-3" />
        </Link>
        &bull; For other links, see{" "}
        <Link href="/resources" className="text-accent hover:underline underline-offset-2 inline-flex items-center gap-1">
          Resources <ArrowRight className="w-3 h-3" />
        </Link>
      </p>
    </motion.article>
  );
}
