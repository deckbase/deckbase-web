/**
 * Shared MCP request handlers for Deckbase.
 * Used by the stdio server (mcp-server/index.js) and the hosted HTTP API (app/api/mcp/route.js).
 * All handlers are async and take (rootPath, ...params) so they can read from the project's docs/.
 * Create/list deck and card tools require context.uid (hosted API with API key only).
 */

import { readFile, readdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import {
  createDeckAdmin,
  createCardAdmin,
  getDecksAdmin,
  getDeckAdmin,
  isAvailable as isFirestoreAdminAvailable,
} from "@/lib/firestore-admin";

const SERVER_NAME = "deckbase-mcp";
const SERVER_VERSION = "1.0.0";

/** Only docs under docs/public/ are exposed via list_docs and read_doc. Prevents leaking internal docs. */
const PUBLIC_DOCS_DIR = "public";

export async function listDocNames(rootPath) {
  const publicDir = join(rootPath, "docs", PUBLIC_DOCS_DIR);
  const names = await readdir(publicDir).catch(() => []);
  return names.filter((n) => n.endsWith(".md")).sort();
}

export async function readDocContent(rootPath, pathOrUri) {
  let path = pathOrUri;
  if (path.startsWith("deckbase://docs/")) {
    path = path.slice("deckbase://docs/".length);
  }
  if (path.includes("..")) return null;
  const publicDir = join(rootPath, "docs", PUBLIC_DOCS_DIR);
  const normalized = path.startsWith("public/") ? path.slice(7) : path;
  if (normalized.includes("/")) return null;
  const full = join(publicDir, normalized);
  const realPublic = join(rootPath, "docs", PUBLIC_DOCS_DIR);
  if (!full.startsWith(realPublic)) return null;
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
          "List Markdown files in docs/public/. Only docs in that folder are exposed. Use list_docs to see available filenames, then read_doc to fetch one.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "read_doc",
        description:
          "Read a doc from docs/public/ by path. Only docs in that folder are served. Use list_docs first to see available filenames (e.g. MCP.md).",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description:
                "Doc path (e.g. MCP.md or deckbase://docs/public/MCP.md). Only files in docs/public/ are served.",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "list_decks",
        description:
          "List the user's flashcard decks (deckId, title, description). Requires hosted MCP with API key. Use deckId with create_card to add cards.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "create_deck",
        description:
          "Create a new flashcard deck for the user. Requires hosted MCP with API key. Returns deckId for use with create_card.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Deck title" },
            description: { type: "string", description: "Optional deck description" },
          },
          required: ["title"],
        },
      },
      {
        name: "create_card",
        description:
          "Create a simple flashcard with front-side content only (back not supported). Requires hosted MCP with API key. Use list_decks to get deckId.",
        inputSchema: {
          type: "object",
          properties: {
            deckId: { type: "string", description: "Deck ID (from list_decks or create_deck)" },
            front: { type: "string", description: "Front-side text (card content)" },
          },
          required: ["deckId", "front"],
        },
      },
    ],
  };
}

const HOSTED_ONLY_MSG =
  "This tool is only available when using the hosted MCP endpoint (POST /api/mcp) with an API key. Use the Deckbase MCP URL and Bearer token in your client.";

export async function handleToolCall(rootPath, name, args, context = {}) {
  const uid = context?.uid;

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

  // Deck/card tools require uid (hosted API with API key)
  if (name === "list_decks") {
    if (!uid) {
      return {
        content: [{ type: "text", text: HOSTED_ONLY_MSG }],
        isError: true,
      };
    }
    if (!isFirestoreAdminAvailable()) {
      return {
        content: [{ type: "text", text: "Server error: Firestore Admin not configured." }],
        isError: true,
      };
    }
    try {
      const decks = await getDecksAdmin(uid);
      const text =
        decks.length > 0
          ? JSON.stringify(decks, null, 2)
          : "No decks yet. Use create_deck to create one.";
      return { content: [{ type: "text", text }] };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error listing decks: ${e?.message || e}` }],
        isError: true,
      };
    }
  }

  if (name === "create_deck") {
    if (!uid) {
      return {
        content: [{ type: "text", text: HOSTED_ONLY_MSG }],
        isError: true,
      };
    }
    if (!isFirestoreAdminAvailable()) {
      return {
        content: [{ type: "text", text: "Server error: Firestore Admin not configured." }],
        isError: true,
      };
    }
    const title = args?.title?.trim();
    if (!title) {
      return {
        content: [{ type: "text", text: "Error: title is required" }],
        isError: true,
      };
    }
    try {
      const { deckId } = await createDeckAdmin(uid, title, args?.description?.trim() ?? "");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ deckId, title, description: args?.description?.trim() ?? "" }),
          },
        ],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error creating deck: ${e?.message || e}` }],
        isError: true,
      };
    }
  }

  if (name === "create_card") {
    if (!uid) {
      return {
        content: [{ type: "text", text: HOSTED_ONLY_MSG }],
        isError: true,
      };
    }
    if (!isFirestoreAdminAvailable()) {
      return {
        content: [{ type: "text", text: "Server error: Firestore Admin not configured." }],
        isError: true,
      };
    }
    const deckId = args?.deckId?.trim();
    const front = args?.front != null ? String(args.front).trim() : "";
    if (!deckId) {
      return {
        content: [{ type: "text", text: "Error: deckId is required" }],
        isError: true,
      };
    }
    // Verify deck exists and belongs to user
    const deck = await getDeckAdmin(uid, deckId);
    if (!deck) {
      return {
        content: [{ type: "text", text: `Error: deck not found: ${deckId}. Use list_decks to get valid deckIds.` }],
        isError: true,
      };
    }
    const promptBlockId = uuidv4();
    const answerBlockId = uuidv4();
    const blocksSnapshot = [
      { blockId: promptBlockId, type: "header1", label: "Question", required: false },
      { blockId: answerBlockId, type: "hiddenText", label: "Answer", required: false },
    ];
    const values = [
      { blockId: promptBlockId, type: "text", text: front || "New card" },
      { blockId: answerBlockId, type: "text", text: "" },
    ];
    try {
      const { cardId } = await createCardAdmin(
        uid,
        deckId,
        null,
        blocksSnapshot,
        values,
        promptBlockId,
        answerBlockId
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ cardId, deckId, front: front || "New card" }),
          },
        ],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error creating card: ${e?.message || e}` }],
        isError: true,
      };
    }
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
      uri: `deckbase://docs/${PUBLIC_DOCS_DIR}/${n}`,
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
 * @param {object} [context] - Optional { uid } for hosted API (deck/card tools)
 */
export async function handleMcpRequest(rootPath, msg, context = {}) {
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
      return { result: await handleToolCall(rootPath, name, args ?? {}, context) };
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
