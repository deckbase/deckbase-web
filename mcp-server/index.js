#!/usr/bin/env node
/**
 * Deckbase MCP Server (stdio)
 * Exposes project docs and tools for Cursor/IDE MCP clients.
 * Run from project root: node mcp-server/index.js
 *
 * For hosted MCP with Firebase Auth, use POST /api/mcp with Authorization: Bearer <token>.
 */

import { readFile, readdir } from "fs/promises";
import { createInterface } from "readline";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

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
