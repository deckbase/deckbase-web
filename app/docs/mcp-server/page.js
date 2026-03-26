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
                <td className={M.tableCell}>
                  <code className={M.code}>Authorization: Bearer</code> — dashboard API key or OAuth
                  access token (when OAuth is configured on the server). Same path as production:{" "}
                  <code className={`${M.code} break-all`}>/api/mcp</code>.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className={`${M.bodyMuted} mt-3`}>
          API keys are created in the dashboard. MCP is available for Pro and VIP subscribers in
          production. OAuth (browser login) is optional; see{" "}
          <Link href="/mcp" className={M.linkPlain}>
            Connecting to Deckbase MCP
          </Link>{" "}
          and the full reference in <code className={M.code}>docs/public/MCP.md</code> (via{" "}
          <code className={M.code}>read_doc</code>).
        </p>
      </section>

      <section id="tools" className="scroll-mt-28">
        <h2 className={M.h2}>Tools</h2>
        <h3 className={`${M.h3} mb-2 mt-6`}>Documentation</h3>
        <div className={`${M.tableWrap} mb-8`}>
          <table className="w-full text-left align-top">
            <thead>
              <tr className={M.tableHead}>
                <th scope="col" className={`${M.tableCell} w-[9.5rem] font-semibold text-neutral-200`}>
                  Tool
                </th>
                <th scope="col" className={`${M.tableCell} font-semibold text-neutral-200`}>
                  Description
                </th>
                <th scope="col" className={`${M.tableCell} min-w-[12rem] font-semibold text-neutral-200`}>
                  Parameters
                </th>
              </tr>
            </thead>
            <tbody className="text-neutral-400">
              <tr className="border-b border-neutral-800 align-top">
                <td className={`${M.tableCell} font-mono text-neutral-100 text-xs sm:text-sm`}>list_docs</td>
                <td className={M.tableCell}>
                  List Markdown files in <code className={M.code}>docs/public/</code>.
                </td>
                <td className={M.tableCell}>None.</td>
              </tr>
              <tr className="border-b border-neutral-800 align-top">
                <td className={`${M.tableCell} font-mono text-neutral-100 text-xs sm:text-sm`}>read_doc</td>
                <td className={M.tableCell}>
                  Read a doc by path. Only docs in <code className={M.code}>docs/public/</code> are served.
                </td>
                <td className={M.tableCell}>
                  <code className={M.code}>path</code> — e.g. <code className={M.code}>MCP.md</code> or{" "}
                  <code className={M.code}>deckbase://docs/public/MCP.md</code>.
                </td>
              </tr>
              <tr className="border-b border-neutral-800 align-top">
                <td className={`${M.tableCell} font-mono text-neutral-100 text-xs sm:text-sm`}>
                  list_template_block_types
                </td>
                <td className={M.tableCell}>
                  Block type keys and numeric ids (<strong className="text-neutral-300">text</strong>,{" "}
                  <strong className="text-neutral-300">media</strong>,{" "}
                  <strong className="text-neutral-300">quiz</strong>,{" "}
                  <strong className="text-neutral-300">layout</strong>). Use so the user can pick types in order,
                  then pass <code className={M.code}>block_types</code> to{" "}
                  <code className={M.code}>create_template</code>. Static data (no user Firestore reads).
                </td>
                <td className={M.tableCell}>None.</td>
              </tr>
              <tr className="border-b border-neutral-800 align-top">
                <td className={`${M.tableCell} font-mono text-neutral-100 text-xs sm:text-sm`}>
                  list_block_schemas
                </td>
                <td className={M.tableCell}>
                  JSON shapes per block <strong className="text-neutral-300">type</strong>:{" "}
                  <code className={M.code}>blocksSnapshot</code>, matching{" "}
                  <code className={M.code}>values</code>, and <code className={M.code}>configJson</code> for
                  quiz/image/audio. Per-template <code className={M.code}>side</code> (front/back) comes from{" "}
                  <code className={M.code}>get_template_schema</code>, not here. Pair with{" "}
                  <code className={M.code}>export_deck</code> for real examples.
                </td>
                <td className={M.tableCell}>None.</td>
              </tr>
              <tr className="border-b border-neutral-800 align-top">
                <td className={`${M.tableCell} font-mono text-neutral-100 text-xs sm:text-sm`}>
                  list_elevenlabs_voices
                </td>
                <td className={M.tableCell}>
                  ElevenLabs voice ids and labels for <code className={M.code}>voice_id</code> on{" "}
                  <code className={M.code}>attach_audio_to_card</code> or{" "}
                  <code className={M.code}>defaultVoiceId</code> in template audio blocks. Deckbase curated catalog (see{" "}
                  <code className={M.code}>docs/api/ELEVENLABS_VOICES.md</code>). Optional filters:{" "}
                  <code className={M.code}>language</code> (ISO 639), <code className={M.code}>gender</code> (female/male),{" "}
                  <code className={M.code}>search</code> (substring). Response includes{" "}
                  <code className={M.code}>languageOptions</code>, <code className={M.code}>filtersApplied</code>,{" "}
                  <code className={M.code}>totalVoicesInCatalog</code>, plus <code className={M.code}>source</code> and
                  optional <code className={M.code}>note</code> when TTS key is unset. No user Firestore reads.
                </td>
                <td className={M.tableCell}>
                  Optional <code className={M.code}>language</code>, <code className={M.code}>gender</code>,{" "}
                  <code className={M.code}>search</code>.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className={`${M.h3} mb-2`}>Decks and cards (hosted only; require API key)</h3>
        <div className={M.tableWrap}>
          <table className="w-full text-left align-top">
            <thead>
              <tr className={M.tableHead}>
                <th scope="col" className={`${M.tableCell} w-[9.5rem] font-semibold text-neutral-200`}>
                  Tool
                </th>
                <th scope="col" className={`${M.tableCell} font-semibold text-neutral-200`}>
                  Description
                </th>
                <th scope="col" className={`${M.tableCell} min-w-[12rem] font-semibold text-neutral-200`}>
                  Parameters
                </th>
              </tr>
            </thead>
            <tbody className="text-neutral-400">
              <tr className="border-b border-neutral-800 align-top">
                <td className={`${M.tableCell} font-mono text-neutral-100 text-xs sm:text-sm`}>list_decks</td>
                <td className={M.tableCell}>
                  User&apos;s decks (<code className={M.code}>deckId</code>, title, description, optional{" "}
                  <code className={M.code}>defaultTemplateId</code>). When set,{" "}
                  <code className={M.code}>create_card</code> can omit <code className={M.code}>templateId</code>.
                </td>
                <td className={M.tableCell}>None.</td>
              </tr>
              <tr className="border-b border-neutral-800 align-top">
                <td className={`${M.tableCell} font-mono text-neutral-100 text-xs sm:text-sm`}>create_deck</td>
                <td className={M.tableCell}>Create a deck. Returns <code className={M.code}>deckId</code>.</td>
                <td className={M.tableCell}>
                  <code className={M.code}>title</code> (required), <code className={M.code}>description</code>{" "}
                  (optional).
                </td>
              </tr>
              <tr className="border-b border-neutral-800 align-top">
                <td className={`${M.tableCell} font-mono text-neutral-100 text-xs sm:text-sm`}>update_deck</td>
                <td className={M.tableCell}>Update title, description, or default template.</td>
                <td className={M.tableCell}>
                  <code className={M.code}>deckId</code> (required); optional title, description,{" "}
                  <code className={M.code}>default_template_id</code> (empty string clears default).
                </td>
              </tr>
              <tr className="border-b border-neutral-800 align-top">
                <td className={`${M.tableCell} font-mono text-neutral-100 text-xs sm:text-sm`}>
                  list_templates
                </td>
                <td className={M.tableCell}>
                  Templates (<code className={M.code}>templateId</code>, name, description). If empty, use{" "}
                  <code className={M.code}>create_template</code> before <code className={M.code}>create_card</code>.
                </td>
                <td className={M.tableCell}>None.</td>
              </tr>
              <tr className="border-b border-neutral-800 align-top">
                <td className={`${M.tableCell} font-mono text-neutral-100 text-xs sm:text-sm`}>
                  get_template_schema
                </td>
                <td className={M.tableCell}>
                  Exact JSON for the layout: <code className={M.code}>blockId</code>, type,{" "}
                  <code className={M.code}>side</code> (<code className={M.code}>&quot;front&quot;</code> |{" "}
                  <code className={M.code}>&quot;back&quot;</code> — study shows front first, back after flip),{" "}
                  <code className={M.code}>configJson</code>, <code className={M.code}>valuesExample</code>,{" "}
                  <code className={M.code}>create_card</code> hints (<code className={M.code}>block_text</code> keys).
                  Includes <code className={M.code}>voice_id_required_for_tts</code> when TTS needs an explicit voice.
                </td>
                <td className={M.tableCell}>
                  <code className={M.code}>templateId</code> from <code className={M.code}>list_templates</code>, or{" "}
                  <code className={M.code}>deckId</code> only for the deck&apos;s default template.
                </td>
              </tr>
              <tr className="border-b border-neutral-800 align-top">
                <td className={`${M.tableCell} font-mono text-neutral-100 text-xs sm:text-sm`}>create_card</td>
                <td className={M.tableCell}>
                  New card from a template. Returns <code className={M.code}>cardId</code>,{" "}
                  <code className={M.code}>templateId</code>, <code className={M.code}>usedDeckDefault</code>.
                  Validates <code className={M.code}>block_text</code> and required text blocks.
                </td>
                <td className={M.tableCell}>
                  <code className={M.code}>deckId</code> required. <code className={M.code}>templateId</code> optional
                  (uses deck <code className={M.code}>defaultTemplateId</code> or pass from{" "}
                  <code className={M.code}>list_templates</code>). Optional <code className={M.code}>front</code>,{" "}
                  <code className={M.code}>block_text</code>, <code className={M.code}>generate_audio</code> (default
                  true). When the template has audio and TTS runs: <code className={M.code}>voice_id</code> from{" "}
                  <code className={M.code}>list_elevenlabs_voices</code> or{" "}
                  <code className={M.code}>audio_language</code> (ISO 639) + <code className={M.code}>audio_gender</code>{" "}
                  (female/male) after asking the user — same as <code className={M.code}>MCP.md</code>.
                </td>
              </tr>
              <tr className="border-b border-neutral-800 align-top">
                <td className={`${M.tableCell} font-mono text-neutral-100 text-xs sm:text-sm`}>update_card</td>
                <td className={M.tableCell}>Edit a card.</td>
                <td className={M.tableCell}>
                  <code className={M.code}>deckId</code>, <code className={M.code}>cardId</code>; optional full{" "}
                  <code className={M.code}>values</code> / <code className={M.code}>blocks_snapshot</code>, or merge{" "}
                  <code className={M.code}>front</code> / <code className={M.code}>block_text</code> (see{" "}
                  <code className={M.code}>export_deck</code> for shapes).
                </td>
              </tr>
              <tr className="border-b border-neutral-800 align-top">
                <td className={`${M.tableCell} font-mono text-neutral-100 text-xs sm:text-sm`}>create_cards</td>
                <td className={M.tableCell}>
                  Bulk create (same rules as <code className={M.code}>create_card</code>). Max 50 per request. On
                  failure: <code className={M.code}>created</code> + <code className={M.code}>failedAt</code>.
                </td>
                <td className={M.tableCell}>
                  <code className={M.code}>deckId</code>, optional <code className={M.code}>templateId</code>, optional
                  top-level <code className={M.code}>voice_id</code>, <code className={M.code}>audio_language</code>,{" "}
                  <code className={M.code}>audio_gender</code>, <code className={M.code}>generate_audio</code>, required{" "}
                  <code className={M.code}>cards</code> array (each element may set the same per-card overrides as{" "}
                  <code className={M.code}>create_card</code>).
                </td>
              </tr>
              <tr className="border-b border-neutral-800 align-top">
                <td className={`${M.tableCell} font-mono text-neutral-100 text-xs sm:text-sm`}>
                  attach_audio_to_card
                </td>
                <td className={M.tableCell}>ElevenLabs TTS for an existing card.</td>
                <td className={M.tableCell}>
                  <code className={M.code}>deckId</code>, <code className={M.code}>cardId</code>. Pass{" "}
                  <code className={M.code}>voice_id</code> or <code className={M.code}>audio_language</code> +{" "}
                  <code className={M.code}>audio_gender</code> (see <code className={M.code}>list_elevenlabs_voices</code>
                  ). Optional <code className={M.code}>text</code>, <code className={M.code}>block_id</code>,{" "}
                  <code className={M.code}>replace_existing</code>.
                </td>
              </tr>
              <tr className="border-b border-neutral-800 align-top">
                <td className={`${M.tableCell} font-mono text-neutral-100 text-xs sm:text-sm`}>export_deck</td>
                <td className={M.tableCell}>
                  Deck + cards JSON. Response includes <code className={M.code}>truncated</code>,{" "}
                  <code className={M.code}>exportType</code>. Default <code className={M.code}>export_type: full</code>{" "}
                  includes per-card <code className={M.code}>blocksSnapshot</code> with <code className={M.code}>side</code>{" "}
                  on each block plus <code className={M.code}>values</code>.
                </td>
                <td className={M.tableCell}>
                  <code className={M.code}>deckId</code> (required); optional <code className={M.code}>max_cards</code>{" "}
                  (default 2000, cap 5000); optional <code className={M.code}>export_type</code>:{" "}
                  <code className={M.code}>full</code> (default) or <code className={M.code}>values_only</code>.
                </td>
              </tr>
              <tr className="border-b border-neutral-800 align-top">
                <td className={`${M.tableCell} font-mono text-neutral-100 text-xs sm:text-sm`}>
                  create_template
                </td>
                <td className={M.tableCell}>
                  New template (block layout). Returns <code className={M.code}>templateId</code> and block ids.
                  Default Question + Answer if <code className={M.code}>block_types</code> and{" "}
                  <code className={M.code}>blocks</code> omitted.
                </td>
                <td className={M.tableCell}>
                  <code className={M.code}>name</code> (required), optional description,{" "}
                  <code className={M.code}>block_types</code> or <code className={M.code}>blocks</code> (each block may set{" "}
                  <code className={M.code}>side</code> for front/back). Optional <code className={M.code}>rendering</code>{" "}
                  (<code className={M.code}>frontBlockIds</code> / <code className={M.code}>backBlockIds</code>) is
                  normalized to per-block <code className={M.code}>side</code> and not stored as{" "}
                  <code className={M.code}>rendering</code> in Firestore. Optional <code className={M.code}>voice_id</code> or{" "}
                  <code className={M.code}>audio_language</code> + <code className={M.code}>audio_gender</code> for audio
                  blocks without <code className={M.code}>defaultVoiceId</code>; optional{" "}
                  <code className={M.code}>mainBlockId</code> / <code className={M.code}>subBlockId</code>.
                </td>
              </tr>
              <tr className="border-b border-neutral-800 align-top">
                <td className={`${M.tableCell} font-mono text-neutral-100 text-xs sm:text-sm`}>
                  update_template
                </td>
                <td className={M.tableCell}>
                  Update metadata and/or layout. Same audio <code className={M.code}>voice_id</code> rules as{" "}
                  <code className={M.code}>create_template</code>. Bumps <code className={M.code}>version</code>.
                </td>
                <td className={M.tableCell}>
                  <code className={M.code}>templateId</code> (required); optional name, description,{" "}
                  <code className={M.code}>block_types</code> / <code className={M.code}>blocks</code> (per-block{" "}
                  <code className={M.code}>side</code> as in <code className={M.code}>create_template</code>),{" "}
                  <code className={M.code}>rendering</code> (normalized to <code className={M.code}>side</code>),{" "}
                  <code className={M.code}>voice_id</code> or <code className={M.code}>audio_language</code> +{" "}
                  <code className={M.code}>audio_gender</code>, <code className={M.code}>mainBlockId</code> /{" "}
                  <code className={M.code}>subBlockId</code>.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className={`${M.bodyMuted} mt-4`}>
          The hosted MCP endpoint requires authentication on every request (API key or OAuth access token when OAuth
          is configured). Tools that read your data (
          <code className={M.code}>list_decks</code>, <code className={M.code}>list_templates</code>,{" "}
          <code className={M.code}>get_template_schema</code>, <code className={M.code}>create_deck</code>,{" "}
          <code className={M.code}>update_deck</code>, <code className={M.code}>create_card</code>,{" "}
          <code className={M.code}>update_card</code>, <code className={M.code}>create_cards</code>,{" "}
          <code className={M.code}>attach_audio_to_card</code>, <code className={M.code}>export_deck</code>,{" "}
          <code className={M.code}>create_template</code>, <code className={M.code}>update_template</code>)
          need that key;{" "}
          <code className={M.code}>list_template_block_types</code> and{" "}
          <code className={M.code}>list_block_schemas</code> return static reference data (no user Firestore
          reads). <code className={M.code}>list_elevenlabs_voices</code> does not read Firestore; it returns the
          Deckbase curated voice list (TTS still uses <code className={M.code}>ELEVENLABS_API_KEY</code> when
          generating audio). Unauthenticated requests return <strong className="text-neutral-300">401</strong>.
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
            <code className={M.code}>blockId</code> keys and <code className={M.code}>side</code> for{" "}
            <code className={M.code}>block_text</code>.
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
            <strong className="text-neutral-100">Hosted:</strong> JSON-RPC 2.0 over POST; use dashboard API key or OAuth
            access token (Bearer) — not a Firebase ID token on the wire.
          </li>
          <li>
            <strong className="text-neutral-100">Card shape:</strong> create_card copies the selected
            template&apos;s block layout into a new card (each block includes <code className={M.code}>side</code> from
            the template; empty values by default; optional <code className={M.code}>front</code> /{" "}
            <code className={M.code}>block_text</code>). Data is stored in Firestore and syncs to the dashboard and
            mobile app.
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
