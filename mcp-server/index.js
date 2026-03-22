#!/usr/bin/env node
/**
 * Deckbase MCP Server (stdio)
 * Exposes project docs and tools for Cursor/IDE MCP clients.
 * Run from project root: node mcp-server/index.js
 *
 * For hosted MCP, use POST /api/mcp with Authorization: Bearer <API key>.
 */

import { readFile, readdir } from "fs/promises";
import { createInterface } from "readline";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { formatMcpTemplateBlockCatalogForChat } from "../lib/mcp-template-blocks.js";
import { formatDeckbaseBlockSchemasForChat } from "../lib/mcp-block-schemas.js";
import { getElevenlabsVoicesMcpPayload } from "../lib/elevenlabs-voices.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DOCS_DIR = join(ROOT, "docs");

const SERVER_NAME = "deckbase-mcp";
const SERVER_VERSION = "1.0.0";

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function readStdinLines(onLine) {
  const rl = createInterface({ input: process.stdin, terminal: false });
  rl.on("line", (line) => {
    const s = line.trim();
    if (!s) return;
    try {
      onLine(JSON.parse(s));
    } catch (_) {}
  });
}

async function listDocs() {
  const names = await readdir(DOCS_DIR).catch(() => []);
  return names.filter((n) => n.endsWith(".md")).sort();
}

async function readDoc(pathOrUri) {
  let path = pathOrUri;
  if (path.startsWith("deckbase://docs/")) {
    path = path.slice("deckbase://docs/".length);
  }
  if (path.includes("..")) return null;
  const full = path.includes("/") ? join(ROOT, path) : join(DOCS_DIR, path);
  if (!full.startsWith(ROOT)) return null;
  try {
    return await readFile(full, "utf8");
  } catch {
    return null;
  }
}

async function handleInitialize() {
  return {
    protocolVersion: "2024-11-05",
    serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
    capabilities: { tools: {}, resources: {} },
  };
}

const HOSTED_ONLY_MSG =
  "This tool is only available when using the hosted MCP endpoint (POST /api/mcp) with an API key. Use the Deckbase MCP URL and Bearer token in your client.";

async function handleToolsList() {
  return {
    tools: [
      {
        name: "list_docs",
        description: "List all Markdown documentation files in the Deckbase docs/ folder.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "read_doc",
        description: "Read a Deckbase doc by path (e.g. STATE_BASED_SYNC_MOBILE.md or docs/FIRESTORE_FLASHCARDS_MIGRATION.md).",
        inputSchema: {
          type: "object",
          properties: { path: { type: "string", description: "Doc path or deckbase://docs/<filename>" } },
          required: ["path"],
        },
      },
      {
        name: "list_template_block_types",
        description:
          "List all template block types for create_template. Show the user the list so they can pick multiple in order, then pass block_types.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "list_block_schemas",
        description:
          "JSON shapes for each block type (block definition + value + configJson). For MCP/mobile clients.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "list_elevenlabs_voices",
        description:
          "ElevenLabs TTS voice ids (group, label, id) for attach_audio_to_card voice_id and template defaultVoiceId. No API key required.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "list_decks",
        description: "List the user's flashcard decks. Requires hosted MCP with API key.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "list_templates",
        description: "List card templates (templateId for create_card). Requires hosted MCP with API key.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_template_schema",
        description:
          "After picking a template: exact blockIds, configJson, valuesExample, create_card hints. Requires hosted MCP. Args: templateId or deckId (default template).",
        inputSchema: {
          type: "object",
          properties: {
            templateId: { type: "string" },
            deckId: { type: "string" },
          },
        },
      },
      {
        name: "create_deck",
        description: "Create a new flashcard deck. Requires hosted MCP with API key.",
        inputSchema: {
          type: "object",
          properties: { title: { type: "string" }, description: { type: "string" } },
          required: ["title"],
        },
      },
      {
        name: "update_deck",
        description:
          "Update deck title, description, default template. Requires hosted MCP with API key.",
        inputSchema: {
          type: "object",
          properties: {
            deckId: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            default_template_id: { type: "string" },
          },
          required: ["deckId"],
        },
      },
      {
        name: "create_card",
        description:
          "Create a card from a template. Omit templateId to use the deck default. voice_id from list_elevenlabs_voices when get_template_schema.voice_id_required_for_tts is true. Optional generate_audio (default true). Requires hosted MCP with API key.",
        inputSchema: {
          type: "object",
          properties: {
            deckId: { type: "string" },
            templateId: { type: "string" },
            front: { type: "string" },
            block_text: { type: "object" },
            generate_audio: { type: "boolean" },
            voice_id: { type: "string" },
          },
          required: ["deckId"],
        },
      },
      {
        name: "update_card",
        description:
          "Update card values and/or blocks_snapshot, or merge front/block_text. Requires hosted MCP with API key.",
        inputSchema: {
          type: "object",
          properties: {
            deckId: { type: "string" },
            cardId: { type: "string" },
            values: { type: "array" },
            blocks_snapshot: { type: "array" },
            front: { type: "string" },
            block_text: { type: "object" },
          },
          required: ["deckId", "cardId"],
        },
      },
      {
        name: "create_cards",
        description:
          "Bulk create cards (same deck + template). Optional top-level voice_id and generate_audio; per-card overrides. Max 50 per request. Requires hosted MCP with API key.",
        inputSchema: {
          type: "object",
          properties: {
            deckId: { type: "string" },
            templateId: { type: "string" },
            voice_id: { type: "string" },
            generate_audio: { type: "boolean" },
            cards: { type: "array" },
          },
          required: ["deckId", "cards"],
        },
      },
      {
        name: "attach_audio_to_card",
        description:
          "ElevenLabs TTS: add or replace audio on an existing card’s audio block. Required: deckId, cardId, voice_id (ask user; use list_elevenlabs_voices). Optional block_id, text, replace_existing. Requires hosted MCP with API key.",
        inputSchema: {
          type: "object",
          properties: {
            deckId: { type: "string" },
            cardId: { type: "string" },
            voice_id: { type: "string" },
            block_id: { type: "string" },
            text: { type: "string" },
            replace_existing: { type: "boolean" },
            generate_audio: { type: "boolean" },
          },
          required: ["deckId", "cardId", "voice_id"],
        },
      },
      {
        name: "export_deck",
        description:
          "Export a deck as JSON (metadata and cards). export_type: full (default) or values_only. Requires hosted MCP with API key.",
        inputSchema: {
          type: "object",
          properties: {
            deckId: { type: "string" },
            max_cards: { type: "number", description: "Optional; default 2000, max 5000" },
            export_type: {
              type: "string",
              description: 'Optional: "full" or "values_only"',
            },
          },
          required: ["deckId"],
        },
      },
      {
        name: "create_template",
        description:
          "Create a flashcard template (block layout). voice_id required when layout includes audio and blocks lack defaultVoiceId. Requires hosted MCP with API key.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            block_types: {
              type: "array",
              description: "Ordered type keys or numeric ids; use list_template_block_types first",
            },
            blocks: { type: "array", items: { type: "object" } },
            voice_id: { type: "string", description: "ElevenLabs voice id from list_elevenlabs_voices when template has audio" },
          },
          required: ["name"],
        },
      },
      {
        name: "update_template",
        description:
          "Update template metadata and/or block layout. Same voice_id rules as create_template. Requires hosted MCP with API key.",
        inputSchema: {
          type: "object",
          properties: {
            templateId: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            block_types: { type: "array" },
            blocks: { type: "array" },
            voice_id: { type: "string" },
          },
          required: ["templateId"],
        },
      },
    ],
  };
}

async function handleToolCall(name, args) {
  if (name === "list_docs") {
    const list = await listDocs();
    return { content: [{ type: "text", text: list.length ? `Deckbase docs (${list.length}):\n${list.join("\n")}` : "No .md files in docs/" }] };
  }
  if (name === "read_doc") {
    const path = args?.path;
    if (!path) return { content: [{ type: "text", text: "Error: path is required" }], isError: true };
    const content = await readDoc(path);
    if (content == null) return { content: [{ type: "text", text: `Doc not found: ${path}` }], isError: true };
    return { content: [{ type: "text", text: content }] };
  }
  if (name === "list_template_block_types") {
    return { content: [{ type: "text", text: formatMcpTemplateBlockCatalogForChat() }] };
  }
  if (name === "list_block_schemas") {
    return { content: [{ type: "text", text: formatDeckbaseBlockSchemasForChat() }] };
  }
  if (name === "list_elevenlabs_voices") {
    return {
      content: [{ type: "text", text: JSON.stringify(getElevenlabsVoicesMcpPayload(), null, 2) }],
    };
  }
  if (
    name === "list_decks" ||
    name === "list_templates" ||
    name === "get_template_schema" ||
    name === "create_deck" ||
    name === "update_deck" ||
    name === "create_card" ||
    name === "update_card" ||
    name === "create_cards" ||
    name === "attach_audio_to_card" ||
    name === "export_deck" ||
    name === "create_template" ||
    name === "update_template"
  ) {
    return { content: [{ type: "text", text: HOSTED_ONLY_MSG }], isError: true };
  }
  return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
}

async function handleResourcesList() {
  const names = await listDocs();
  return { resources: names.map((n) => ({ uri: `deckbase://docs/${n}`, name: n, description: `Deckbase doc: ${n}`, mimeType: "text/markdown" })) };
}

async function handleResourceRead(uri) {
  const content = await readDoc(uri);
  if (content == null) throw new Error(`Resource not found: ${uri}`);
  return { contents: [{ uri, mimeType: "text/markdown", text: content }] };
}

async function handleRequest(msg) {
  const { id, method, params } = msg;
  let result;
  let err = null;
  try {
    if (method === "initialize") result = await handleInitialize(params);
    else if (method === "tools/list") result = await handleToolsList();
    else if (method === "tools/call") result = await handleToolCall(params?.name, params?.arguments ?? {});
    else if (method === "resources/list") result = await handleResourcesList();
    else if (method === "resources/read") result = await handleResourceRead(params?.uri);
    else if (method === "notifications/initialized" || method === "ping") result = {};
    else err = { code: -32601, message: `Method not found: ${method}` };
  } catch (e) {
    err = { code: -32603, message: String(e?.message || e) };
  }
  if (id !== undefined) {
    send(err ? { jsonrpc: "2.0", id, error: err } : { jsonrpc: "2.0", id, result: result ?? {} });
  }
}

readStdinLines(handleRequest);
