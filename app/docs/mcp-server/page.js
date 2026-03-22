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
          <li>
            <strong className="font-mono text-neutral-100">list_template_block_types</strong> — List
            all template block type keys and numeric ids (text, media, quiz, layout). No parameters.
            Use this so you can show the user what to pick; they choose multiple types in order, then you
            pass that list as <code className={M.code}>block_types</code> to{" "}
            <code className={M.code}>create_template</code>. Static data (no user Firestore reads).
          </li>
          <li>
            <strong className="font-mono text-neutral-100">list_block_schemas</strong> — Returns JSON
            shapes for every block type: typical <code className={M.code}>blocksSnapshot</code> entry,
            matching <code className={M.code}>values</code> entry, and{" "}
            <code className={M.code}>configJson</code> fields for quiz/image/audio. No parameters. Use for
            mobile, MCP, or any client building or
            parsing cards; pair with <code className={M.code}>export_deck</code> for real examples.
          </li>
          <li>
            <strong className="font-mono text-neutral-100">list_elevenlabs_voices</strong> — Returns JSON
            with curated ElevenLabs <code className={M.code}>id</code>s (and labels) for{" "}
            <code className={M.code}>voice_id</code> on <code className={M.code}>attach_audio_to_card</code>{" "}
            or <code className={M.code}>defaultVoiceId</code> in template audio blocks. Includes server
            default/fallback hints. No parameters; static data (no user Firestore reads).
          </li>
        </ul>
        <h3 className={`${M.h3} mb-2`}>Decks and cards (hosted only; require API key)</h3>
        <ul className={`space-y-2 ${M.bodyMuted}`}>
          <li>
            <strong className="font-mono text-neutral-100">list_decks</strong> — List the user&apos;s
            flashcard decks (<code className={M.code}>deckId</code>, title, description, optional{" "}
            <code className={M.code}>defaultTemplateId</code>). No parameters. When{" "}
            <code className={M.code}>defaultTemplateId</code> is set, <code className={M.code}>create_card</code>{" "}
            can omit <code className={M.code}>templateId</code>.
          </li>
          <li>
            <strong className="font-mono text-neutral-100">create_deck</strong> — Create a new deck.
            Parameters: <code className={M.code}>title</code> (required),{" "}
            <code className={M.code}>description</code> (optional). Returns{" "}
            <code className={M.code}>deckId</code>.
          </li>
          <li>
            <strong className="font-mono text-neutral-100">update_deck</strong> — Update title, description,
            or <code className={M.code}>default_template_id</code>. Parameter:{" "}
            <code className={M.code}>deckId</code> (required); other fields optional.
          </li>
          <li>
            <strong className="font-mono text-neutral-100">list_templates</strong> — List templates (
            <code className={M.code}>templateId</code>, name, description). No parameters. If the list is
            empty, use <code className={M.code}>create_template</code> before{" "}
            <code className={M.code}>create_card</code>.
          </li>
          <li>
            <strong className="font-mono text-neutral-100">get_template_schema</strong> — After the user
            picks a template, returns exact JSON for that layout: each{" "}
            <code className={M.code}>blockId</code>, type, <code className={M.code}>configJson</code>,{" "}
            <code className={M.code}>valuesExample</code>, and hints for{" "}
            <code className={M.code}>create_card</code> (<code className={M.code}>block_text</code> keys).
            Includes <code className={M.code}>voice_id_required_for_tts</code> when TTS needs an explicit
            voice. Parameters: <code className={M.code}>templateId</code> from{" "}
            <code className={M.code}>list_templates</code>, or <code className={M.code}>deckId</code> only to
            use the deck&apos;s default template.
          </li>
          <li>
            <strong className="font-mono text-neutral-100">create_card</strong> — Create a new card using
            a template&apos;s fields. <code className={M.code}>deckId</code> required.{" "}
            <code className={M.code}>templateId</code> optional: if omitted, uses the deck&apos;s{" "}
            <code className={M.code}>defaultTemplateId</code> from <code className={M.code}>list_decks</code>{" "}
            (set in the dashboard); if the deck has no default, pass <code className={M.code}>templateId</code>{" "}
            from <code className={M.code}>list_templates</code>. Optional <code className={M.code}>front</code>{" "}
            and <code className={M.code}>block_text</code>. When TTS runs and{" "}
            <code className={M.code}>get_template_schema.voice_id_required_for_tts</code> is true, pass{" "}
            <code className={M.code}>voice_id</code> from <code className={M.code}>list_elevenlabs_voices</code>{" "}
            after the user picks a voice. Validates <code className={M.code}>block_text</code> keys, required
            text blocks, and that at least one text field is filled when the template has text blocks. Returns{" "}
            <code className={M.code}>cardId</code>, <code className={M.code}>templateId</code> used, and{" "}
            <code className={M.code}>usedDeckDefault</code>.
          </li>
          <li>
            <strong className="font-mono text-neutral-100">update_card</strong> — Edit an existing card:
            required <code className={M.code}>deckId</code> and <code className={M.code}>cardId</code>; optional
            full <code className={M.code}>values</code> and/or <code className={M.code}>blocks_snapshot</code>,
            or merge <code className={M.code}>front</code> / <code className={M.code}>block_text</code> into
            current values (use <code className={M.code}>export_deck</code> for ids and shapes).
          </li>
          <li>
            <strong className="font-mono text-neutral-100">create_cards</strong> — Create multiple
            cards in one request (same <code className={M.code}>deckId</code>, template resolution, and
            validation as <code className={M.code}>create_card</code>). Parameters:{" "}
            <code className={M.code}>deckId</code>
            , optional <code className={M.code}>templateId</code>, optional top-level{" "}
            <code className={M.code}>voice_id</code>, required non-empty <code className={M.code}>cards</code>{" "}
            array; each element may include <code className={M.code}>front</code>,{" "}
            <code className={M.code}>block_text</code>, and <code className={M.code}>voice_id</code> like a
            single <code className={M.code}>create_card</code> call. Max 50 cards per request. If one
            card fails, the response lists <code className={M.code}>created</code> so far and{" "}
            <code className={M.code}>failedAt</code>; earlier cards may already exist in Firestore.
          </li>
          <li>
            <strong className="font-mono text-neutral-100">attach_audio_to_card</strong> — ElevenLabs
            TTS for an <em>existing</em> card: required <code className={M.code}>deckId</code>,{" "}
            <code className={M.code}>cardId</code> (from <code className={M.code}>export_deck</code>), and{" "}
            <code className={M.code}>voice_id</code> from <code className={M.code}>list_elevenlabs_voices</code>{" "}
            after the user chooses. Optional <code className={M.code}>text</code>,{" "}
            <code className={M.code}>block_id</code> when the card has multiple audio blocks, and{" "}
            <code className={M.code}>replace_existing</code> to overwrite existing audio.
          </li>
          <li>
            <strong className="font-mono text-neutral-100">export_deck</strong> — Export deck
            metadata and cards as JSON. Parameters: <code className={M.code}>deckId</code> (required),
            optional <code className={M.code}>max_cards</code> (default 2000, cap 5000), optional{" "}
            <code className={M.code}>export_type</code>: <code className={M.code}>full</code> (default:
            each card includes <code className={M.code}>blocksSnapshot</code> and{" "}
            <code className={M.code}>values</code>) or <code className={M.code}>values_only</code>{" "}
            (<code className={M.code}>values</code> only, smaller payload). Response includes{" "}
            <code className={M.code}>truncated</code> and <code className={M.code}>exportType</code>.
          </li>
          <li>
            <strong className="font-mono text-neutral-100">create_template</strong> — Create a
            flashcard template (block layout for new cards). Parameters:{" "}
            <code className={M.code}>name</code> (required), optional{" "}
            <code className={M.code}>description</code>, optional{" "}
            <code className={M.code}>block_types</code> (ordered list of type keys or 0–12 ids from{" "}
            <code className={M.code}>list_template_block_types</code>; mutually exclusive with{" "}
            <code className={M.code}>blocks</code>), optional <code className={M.code}>blocks</code>{" "}
            (full block objects; omit both for default Question + Answer). If the layout includes an
            audio block, pass <code className={M.code}>voice_id</code> from{" "}
            <code className={M.code}>list_elevenlabs_voices</code> after the user chooses (unless every
            audio block already has <code className={M.code}>defaultVoiceId</code> in{" "}
            <code className={M.code}>configJson</code>). Optional{" "}
            <code className={M.code}>rendering</code> (<code className={M.code}>frontBlockIds</code> /{" "}
            <code className={M.code}>backBlockIds</code>), optional{" "}
            <code className={M.code}>mainBlockId</code> / <code className={M.code}>subBlockId</code>.
            Returns <code className={M.code}>templateId</code> and block ids.
          </li>
          <li>
            <strong className="font-mono text-neutral-100">update_template</strong> — Change a template’s
            metadata and/or layout. Required <code className={M.code}>templateId</code>; optional{" "}
            <code className={M.code}>name</code>, <code className={M.code}>description</code>,{" "}
            <code className={M.code}>block_types</code> / <code className={M.code}>blocks</code>,{" "}
            <code className={M.code}>voice_id</code>, <code className={M.code}>rendering</code>,{" "}
            <code className={M.code}>mainBlockId</code> / <code className={M.code}>subBlockId</code>. Same
            audio <code className={M.code}>voice_id</code> rules as <code className={M.code}>create_template</code>.
            Returns updated <code className={M.code}>version</code>.
          </li>
        </ul>
        <p className={`${M.bodyMuted} mt-3`}>
          The hosted MCP endpoint requires an API key on every request. Tools that read your data (
          <code className={M.code}>list_decks</code>, <code className={M.code}>list_templates</code>,{" "}
          <code className={M.code}>get_template_schema</code>, <code className={M.code}>create_deck</code>,{" "}
          <code className={M.code}>update_deck</code>, <code className={M.code}>create_card</code>,{" "}
          <code className={M.code}>update_card</code>, <code className={M.code}>create_cards</code>,{" "}
          <code className={M.code}>attach_audio_to_card</code>, <code className={M.code}>export_deck</code>,{" "}
          <code className={M.code}>create_template</code>, <code className={M.code}>update_template</code>)
          need that key;{" "}
          <code className={M.code}>list_template_block_types</code>,{" "}
          <code className={M.code}>list_block_schemas</code>, and{" "}
          <code className={M.code}>list_elevenlabs_voices</code> only return static reference data (no user
          Firestore reads) but still use the same auth on hosted.
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
        <h2 className={M.h2}>Example: deck, template, and card (hosted)</h2>
        <ol className={`${M.bodyMuted} list-inside list-decimal space-y-2`}>
          <li>
            Configure your client with the MCP URL and{" "}
            <code className={M.code}>Authorization: Bearer YOUR_API_KEY</code>.
          </li>
          <li>
            Call <strong className="font-mono text-neutral-100">list_templates</strong>. If the list is
            empty, use <strong className="font-mono text-neutral-100">list_template_block_types</strong>{" "}
            and <strong className="font-mono text-neutral-100">create_template</strong> first, then list
            again.
          </li>
          <li>
            Call <strong className="font-mono text-neutral-100">get_template_schema</strong> with the
            chosen <code className={M.code}>templateId</code> (or <code className={M.code}>deckId</code> only
            if the deck default is the right layout) so clients know exact{" "}
            <code className={M.code}>blockId</code> keys for <code className={M.code}>block_text</code>.
          </li>
          <li>
            Call <strong className="font-mono text-neutral-100">create_deck</strong> with a{" "}
            <code className={M.code}>title</code> and optional <code className={M.code}>description</code>.
          </li>
          <li>
            Call <strong className="font-mono text-neutral-100">create_card</strong> with{" "}
            <code className={M.code}>deckId</code> and optionally <code className={M.code}>templateId</code>{" "}
            (omit if the deck has a default template). Optionally <code className={M.code}>front</code> or{" "}
            <code className={M.code}>block_text</code> to pre-fill text fields.
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
            <strong className="text-neutral-100">Card shape:</strong> create_card copies the selected
            template&apos;s block layout into a new card (empty values by default; optional{" "}
            <code className={M.code}>front</code> / <code className={M.code}>block_text</code>). Data is
            stored in Firestore and syncs to the dashboard and mobile app.
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
