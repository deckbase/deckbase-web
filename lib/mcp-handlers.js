/**
 * Shared MCP request handlers for Deckbase.
 * Used by the stdio server (mcp-server/index.js) and the hosted HTTP API (app/api/mcp/route.js).
 * All handlers are async and take (rootPath, ...params) so they can read from the project's docs/.
 */

import { readFile, readdir } from "fs/promises";
import { join } from "path";

const SERVER_NAME = "deckbase-mcp";
const SERVER_VERSION = "1.0.0";

export async function listDocNames(rootPath) {
  const docsDir = join(rootPath, "docs");
  const names = await readdir(docsDir).catch(() => []);
  return names.filter((n) => n.endsWith(".md")).sort();
}

export async function readDocContent(rootPath, pathOrUri) {
  let path = pathOrUri;
  if (path.startsWith("deckbase://docs/")) {
    path = path.slice("deckbase://docs/".length);
  }
  if (path.includes("..")) {
    return null;
  }
  const docsDir = join(rootPath, "docs");
  const full = path.includes("/") ? join(rootPath, path) : join(docsDir, path);
  if (!full.startsWith(rootPath)) return null;
  try {
    return await readFile(full, "utf8");
  } catch {
    return null;
  }
}

export async function handleInitialize() {
  return {
    protocolVersion: "2024-11-05",
    serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
    capabilities: {
      tools: {},
      resources: {},
    },
  };
}

export async function handleToolsList() {
  return {
    tools: [
      {
        name: "list_docs",
        description:
          "List all Markdown documentation files in the Deckbase docs/ folder. Use this to discover available docs (e.g. STATE_BASED_SYNC_MOBILE.md, FIRESTORE_FLASHCARDS_MIGRATION.md).",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "read_doc",
        description:
          "Read a Deckbase doc by path. Path can be a filename (e.g. STATE_BASED_SYNC_MOBILE.md) or relative path (e.g. docs/FIRESTORE_FLASHCARDS_MIGRATION.md). Use list_docs first to see available docs.",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description:
                "Doc path: filename in docs/ (e.g. STATE_BASED_SYNC_MOBILE.md) or deckbase://docs/<filename>",
            },
          },
          required: ["path"],
        },
      },
    ],
  };
}

export async function handleToolCall(rootPath, name, args) {
  if (name === "list_docs") {
    const list = await listDocNames(rootPath);
    return {
      content: [
        {
          type: "text",
          text:
            list.length > 0
              ? `Deckbase docs (${list.length}):\n${list.join("\n")}`
              : "No .md files in docs/",
        },
      ],
    };
  }
  if (name === "read_doc") {
    const path = args?.path;
    if (!path) {
      return {
        content: [{ type: "text", text: "Error: path is required" }],
        isError: true,
      };
    }
    const content = await readDocContent(rootPath, path);
    if (content == null) {
      return {
        content: [{ type: "text", text: `Doc not found: ${path}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: content }],
    };
  }
  return {
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
    isError: true,
  };
}

export async function handleResourcesList(rootPath) {
  const names = await listDocNames(rootPath);
  return {
    resources: names.map((n) => ({
      uri: `deckbase://docs/${n}`,
      name: n,
      description: `Deckbase doc: ${n}`,
      mimeType: "text/markdown",
    })),
  };
}

export async function handleResourceRead(rootPath, uri) {
  const content = await readDocContent(rootPath, uri);
  if (content == null) {
    throw new Error(`Resource not found: ${uri}`);
  }
  return {
    contents: [
      {
        uri,
        mimeType: "text/markdown",
        text: content,
      },
    ],
  };
}

/**
 * Handle a single MCP JSON-RPC request. Returns { result } or { error }.
 * @param {string} rootPath - Project root (for resolving docs/)
 * @param {object} msg - JSON-RPC message { id, method, params }
 */
export async function handleMcpRequest(rootPath, msg) {
  const { method, params } = msg;
  try {
    if (method === "initialize") {
      return { result: await handleInitialize(params) };
    }
    if (method === "tools/list") {
      return { result: await handleToolsList() };
    }
    if (method === "tools/call") {
      const { name, arguments: args } = params ?? {};
      return { result: await handleToolCall(rootPath, name, args ?? {}) };
    }
    if (method === "resources/list") {
      return { result: await handleResourcesList(rootPath) };
    }
    if (method === "resources/read") {
      const { uri } = params ?? {};
      return { result: await handleResourceRead(rootPath, uri) };
    }
    if (method === "notifications/initialized" || method === "ping") {
      return { result: {} };
    }
    return { error: { code: -32601, message: `Method not found: ${method}` } };
  } catch (e) {
    return {
      error: { code: -32603, message: String(e?.message || e) },
    };
  }
}
