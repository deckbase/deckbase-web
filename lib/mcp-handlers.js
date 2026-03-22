/**
 * Shared MCP request handlers for Deckbase.
 * Used by the stdio server (mcp-server/index.js) and the hosted HTTP API (app/api/mcp/route.js).
 * All handlers are async and take (rootPath, ...params) so they can read from the project's docs/.
 * Create/list deck and card tools require context.uid (hosted API with API key only).
 */

import { readFile, readdir } from "fs/promises";
import { join } from "path";
import {
  createDeckAdmin,
  createTemplateAdmin,
  createCardFromTemplateAdmin,
  updateDeckAdmin,
  updateTemplateAdmin,
  updateCardContentAdmin,
  getDecksAdmin,
  getDeckAdmin,
  getDeckExportAdmin,
  getTemplatesAdmin,
  buildMcpTemplateCardSchema,
  attachAudioToExistingCardAdmin,
  isAvailable as isFirestoreAdminAvailable,
} from "@/lib/firestore-admin";
import { formatMcpTemplateBlockCatalogForChat } from "@/lib/mcp-template-blocks";
import { formatDeckbaseBlockSchemasForChat } from "@/lib/mcp-block-schemas";
import { getElevenlabsVoicesMcpPayload } from "@/lib/elevenlabs-voices";

const SERVER_NAME = "deckbase-mcp";
const SERVER_VERSION = "1.0.0";

/** Max cards per create_cards request (Firestore + request timeout). */
const MCP_MAX_BULK_CARDS = 50;

/**
 * Resolve template for create_card / create_cards. Returns { ok, templateId, usedDeckDefault } or { ok: false, message }.
 */
async function resolveMcpCreateCardTemplate(uid, deckId, explicitTemplateId) {
  const deck = await getDeckAdmin(uid, deckId);
  if (!deck) {
    return {
      ok: false,
      message: `Error: deck not found: ${deckId}. Use list_decks to get valid deckIds.`,
    };
  }
  let templates;
  try {
    templates = await getTemplatesAdmin(uid);
  } catch (e) {
    return { ok: false, message: `Error loading templates: ${e?.message || e}` };
  }
  if (templates.length === 0) {
    return {
      ok: false,
      message:
        "Error: You have no templates. Use list_template_block_types → create_template to create a template first, then list_templates and create_card.",
    };
  }
  const defaultTemplateId =
    deck.defaultTemplateId != null ? String(deck.defaultTemplateId).trim() : "";
  const explicit = String(explicitTemplateId ?? "").trim();
  const templateId = explicit || defaultTemplateId;
  if (!templateId) {
    const ids = templates.map((t) => t.templateId).join(", ");
    return {
      ok: false,
      message: `Error: This deck has no default template. Pass templateId, or set a default template on the deck in the dashboard. Available templateIds: ${ids}`,
    };
  }
  const validIds = new Set(templates.map((t) => t.templateId));
  if (!validIds.has(templateId)) {
    return {
      ok: false,
      message: `Error: templateId not found for this account: ${templateId}. Use list_templates for valid templateIds, or fix the deck default in the dashboard.`,
    };
  }
  const usedDeckDefault = !explicit && !!defaultTemplateId;
  return { ok: true, templateId, usedDeckDefault };
}

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
        name: "list_template_block_types",
        description:
          "List all Deckbase template block types (keys, numeric ids, labels). Use this so the user can choose multiple block types in order; then pass that list as block_types to create_template. For JSON shapes of block + value per type, call list_block_schemas. Works in local stdio and hosted MCP.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list_block_schemas",
        description:
          "Return JSON structure for each block type: typical blocksSnapshot entry, matching value entry, and configJson fields (quiz/image/audio). Use when building or parsing cards. Works in local stdio and hosted MCP. Real examples: export_deck.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list_elevenlabs_voices",
        description:
          "List ElevenLabs TTS voice ids (group, label, id) for attach_audio_to_card voice_id and template audio block defaultVoiceId. Includes server default env/fallback. Static data; works in local stdio and hosted MCP without extra auth.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list_decks",
        description:
          "List the user's flashcard decks (deckId, title, description). Requires hosted MCP with API key. Use with list_templates before create_card.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "list_templates",
        description:
          "List the user's card templates (templateId, name, description). Requires hosted MCP with API key. Use when create_card needs an explicit templateId (deck has no defaultTemplateId). If the list is empty, use create_template first. After the user picks a template, call get_template_schema for exact blockIds and JSON shapes.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_template_schema",
        description:
          "After the user selects a template, returns exact JSON for that template: each blockId, type, label, configJson, category, plus valuesExample (empty card values) and create_card hints (block_text keys, voice_id_required_for_tts for TTS). Requires hosted MCP. Pass templateId from list_templates, or deckId only to use the deck’s default template.",
        inputSchema: {
          type: "object",
          properties: {
            templateId: {
              type: "string",
              description: "From list_templates (preferred when user picked a template)",
            },
            deckId: {
              type: "string",
              description: "Optional alternative: use with omitted templateId to resolve defaultTemplateId",
            },
          },
        },
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
        name: "update_deck",
        description:
          "Update an existing deck’s title, description, and/or default template id. Requires hosted MCP with API key. Pass only fields to change.",
        inputSchema: {
          type: "object",
          properties: {
            deckId: { type: "string", description: "Deck ID from list_decks" },
            title: { type: "string", description: "New title (optional)" },
            description: { type: "string", description: "New description (optional)" },
            default_template_id: {
              type: "string",
              description:
                "Optional. Template ID for new cards when templateId is omitted in create_card. Empty string clears the default.",
            },
          },
          required: ["deckId"],
        },
      },
      {
        name: "update_card",
        description:
          "Update an existing card’s content. Requires hosted MCP with API key. Pass values (full array) and/or blocks_snapshot to replace; or pass front and/or block_text to merge into current values (block_text keys must be blockIds from the card layout — use export_deck or get_template_schema). Changing blocks_snapshot without values rebuilds empty values then applies front/block_text.",
        inputSchema: {
          type: "object",
          properties: {
            deckId: { type: "string", description: "Deck containing the card" },
            cardId: { type: "string", description: "Card ID" },
            values: {
              type: "array",
              description:
                "Optional full replacement for card values (same shape as export_deck cards[].values)",
            },
            blocks_snapshot: {
              type: "array",
              description:
                "Optional full replacement for layout (block defs). If set with values, each blockId must have a value entry.",
            },
            front: {
              type: "string",
              description: "Optional text for the main block (same role as create_card.front)",
            },
            block_text: {
              type: "object",
              description: "Optional map blockId → string merged into values",
            },
          },
          required: ["deckId", "cardId"],
        },
      },
      {
        name: "create_card",
        description:
          "Create a new card from a template’s block layout. Requires hosted MCP with API key. Required: deckId. If templateId is omitted, uses the deck’s default template (defaultTemplateId from list_decks); if the deck has none, pass templateId from list_templates. If no templates exist, create_template first. Optional: front, block_text, generate_audio (default true), voice_id. When TTS runs (generate_audio true) and get_template_schema.voice_id_required_for_tts is true, call list_elevenlabs_voices, ask the user which voice, then pass voice_id. If template audio blocks already have defaultVoiceId, voice_id is optional (overrides when set). Set generate_audio: false to skip TTS. Validation: block_text keys must be template blockIds; required text blocks must be non-empty; if the template has any text blocks, at least one must have non-empty content (via front and/or block_text).",
        inputSchema: {
          type: "object",
          properties: {
            deckId: { type: "string", description: "Deck ID (from list_decks or create_deck)" },
            templateId: {
              type: "string",
              description:
                "Optional. Template ID from list_templates. Omit to use the deck’s default template (set in the dashboard).",
            },
            front: {
              type: "string",
              description: "Optional initial text for the template’s main block",
            },
            block_text: {
              type: "object",
              description: "Optional map of blockId → text for any text blocks",
            },
            generate_audio: {
              type: "boolean",
              description:
                "Optional. Default true. If true and template includes an audio block, generate ElevenLabs TTS when source text exists (see get_template_schema note). Set false to skip TTS.",
            },
            voice_id: {
              type: "string",
              description:
                "ElevenLabs voice id from list_elevenlabs_voices. Required when TTS runs and template audio block(s) lack defaultVoiceId; ask the user which voice to use.",
            },
          },
          required: ["deckId"],
        },
      },
      {
        name: "create_cards",
        description:
          `Bulk create cards in one deck using the same template resolution and validation as create_card (deck default or explicit templateId). Requires hosted MCP. Pass cards: array of objects, each with optional front, block_text, generate_audio, voice_id (per-card). Optional top-level voice_id and generate_audio apply to the whole batch when not set per card. Max ${MCP_MAX_BULK_CARDS} cards per request. If one card fails, earlier cards may already exist in Firestore.`,
        inputSchema: {
          type: "object",
          properties: {
            deckId: { type: "string" },
            templateId: {
              type: "string",
              description: "Optional; omit to use deck default template",
            },
            voice_id: {
              type: "string",
              description:
                "Optional default for all cards when TTS needs voice_id (see create_card). Per-card voice_id overrides.",
            },
            generate_audio: {
              type: "boolean",
              description:
                "Optional. Default true. If false, skip ElevenLabs TTS for all cards (each card can still set generate_audio: false when this is true).",
            },
            cards: {
              type: "array",
              description: `Non-empty array of per-card payloads (front?, block_text?, generate_audio?, voice_id?). Max ${MCP_MAX_BULK_CARDS} items.`,
            },
          },
          required: ["deckId", "cards"],
        },
      },
      {
        name: "attach_audio_to_card",
        description:
          "Generate ElevenLabs TTS audio and attach it to an existing card’s audio block (updates values.mediaIds). Requires hosted MCP with API key. Required: deckId, cardId, voice_id — call list_elevenlabs_voices and ask the user which voice to use before calling. If the card has multiple audio blocks, pass block_id. Optional text overrides the spoken script; otherwise source text is resolved like create_card. If the block already has media, pass replace_existing: true to regenerate. Same TTS/storage/subscription limits as create_card.",
        inputSchema: {
          type: "object",
          properties: {
            deckId: { type: "string", description: "Deck containing the card" },
            cardId: { type: "string", description: "Card ID" },
            voice_id: {
              type: "string",
              description: "Required. ElevenLabs voice id from list_elevenlabs_voices (after user selects)",
            },
            block_id: {
              type: "string",
              description: "Required when the card has multiple audio blocks: target audio block blockId",
            },
            text: {
              type: "string",
              description: "Optional. Spoken text; if omitted, resolved from card content",
            },
            replace_existing: {
              type: "boolean",
              description: "Default false. Set true to replace audio when mediaIds already exist",
            },
            generate_audio: {
              type: "boolean",
              description: "Default true. Set false to no-op (for symmetry with create_card)",
            },
          },
          required: ["deckId", "cardId", "voice_id"],
        },
      },
      {
        name: "export_deck",
        description:
          "Export a deck’s cards as JSON (deck metadata plus per-card data). Requires hosted MCP with API key. Default export_type is full (blocksSnapshot + values per card). Use values_only to omit blocksSnapshot for smaller payloads. Large decks may be truncated; check truncated in the response.",
        inputSchema: {
          type: "object",
          properties: {
            deckId: { type: "string", description: "Deck ID (from list_decks)" },
            max_cards: {
              type: "number",
              description:
                "Optional max cards to return (default 2000, hard cap 5000). Oldest-first ordering is not guaranteed.",
            },
            export_type: {
              type: "string",
              description:
                'Optional. "full" (default): each card includes blocksSnapshot and values. "values_only": values only (smaller); pair with get_template_schema / list_block_schemas for layout.',
            },
          },
          required: ["deckId"],
        },
      },
      {
        name: "create_template",
        description:
          "Create a flashcard template (block layout for new cards). Requires hosted MCP with API key. Call list_template_block_types first so the user can pick block types; pass the ordered selection as block_types. If the layout includes an audio block, call list_elevenlabs_voices, ask the user which voice to use, then pass voice_id (stored as defaultVoiceId on audio block configJson) unless you already set defaultVoiceId in blocks[]. Alternatively pass full blocks, or omit both for default Question + Answer.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Template display name" },
            description: { type: "string", description: "Optional description" },
            block_types: {
              type: "array",
              description:
                "Ordered list of block type keys (e.g. header1, text, hiddenText) or numeric ids 0–12. Mutually exclusive with blocks. Example: [\"header1\", \"hiddenText\"] or [0, 5]",
            },
            blocks: {
              type: "array",
              description:
                "Optional full block definitions. Mutually exclusive with block_types. Each: blockId (optional), type, label, required (optional), configJson (optional). For audio blocks, include configJson.defaultVoiceId or pass top-level voice_id. Empty or omitted uses header1 Question + hiddenText Answer unless block_types is set.",
              items: { type: "object" },
            },
            voice_id: {
              type: "string",
              description:
                "Required when template includes an audio block and blocks do not already set defaultVoiceId on every audio block. ElevenLabs id from list_elevenlabs_voices (after user selects). Applied to all audio blocks.",
            },
            rendering: {
              type: "object",
              description: "Optional front/back block ids",
              properties: {
                frontBlockIds: { type: "array", items: { type: "string" } },
                backBlockIds: { type: "array", items: { type: "string" } },
              },
            },
            mainBlockId: { type: "string", description: "Optional; defaults from first block" },
            subBlockId: { type: "string", description: "Optional; defaults from second block" },
          },
          required: ["name"],
        },
      },
      {
        name: "update_template",
        description:
          "Update an existing template’s name, description, block layout (blocks or block_types), rendering, main/sub block ids, and/or voice_id for audio blocks. Requires hosted MCP. Omit blocks and block_types to keep layout; version increments when anything changes. Same audio/voice_id rules as create_template.",
        inputSchema: {
          type: "object",
          properties: {
            templateId: { type: "string", description: "Template ID from list_templates" },
            name: { type: "string", description: "New name (optional)" },
            description: { type: "string", description: "New description (optional)" },
            block_types: {
              type: "array",
              description:
                "Ordered block types to replace layout; mutually exclusive with non-empty blocks",
            },
            blocks: {
              type: "array",
              description: "Full block definitions to replace layout; mutually exclusive with block_types",
              items: { type: "object" },
            },
            voice_id: {
              type: "string",
              description:
                "Sets defaultVoiceId on all audio blocks (see create_template). Required if layout has audio without defaultVoiceId.",
            },
            rendering: {
              type: "object",
              properties: {
                frontBlockIds: { type: "array", items: { type: "string" } },
                backBlockIds: { type: "array", items: { type: "string" } },
              },
            },
            mainBlockId: { type: "string" },
            subBlockId: { type: "string" },
          },
          required: ["templateId"],
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

  if (name === "list_template_block_types") {
    return {
      content: [{ type: "text", text: formatMcpTemplateBlockCatalogForChat() }],
    };
  }

  if (name === "list_block_schemas") {
    return {
      content: [{ type: "text", text: formatDeckbaseBlockSchemasForChat() }],
    };
  }

  if (name === "list_elevenlabs_voices") {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(getElevenlabsVoicesMcpPayload(), null, 2),
        },
      ],
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

  if (name === "list_templates") {
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
      const templates = await getTemplatesAdmin(uid);
      const payload =
        templates.length === 0
          ? {
              templates: [],
              message:
                "No templates yet. Use list_template_block_types to show block options, then create_template to add a layout. Call list_templates again before create_card.",
            }
          : { templates };
      return {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error listing templates: ${e?.message || e}` }],
        isError: true,
      };
    }
  }

  if (name === "get_template_schema") {
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
    let templateId = String(args?.templateId ?? args?.template_id ?? "").trim();
    const deckId = args?.deckId?.trim();
    if (!templateId && !deckId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: provide templateId (from list_templates after the user picks a template) or deckId (uses that deck’s default template).",
          },
        ],
        isError: true,
      };
    }
    if (!templateId && deckId) {
      const resolved = await resolveMcpCreateCardTemplate(uid, deckId, "");
      if (!resolved.ok) {
        return { content: [{ type: "text", text: resolved.message }], isError: true };
      }
      templateId = resolved.templateId;
    }
    let templates = [];
    try {
      templates = await getTemplatesAdmin(uid);
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error loading templates: ${e?.message || e}` }],
        isError: true,
      };
    }
    if (templates.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Error: no templates. Create one with create_template first.",
          },
        ],
        isError: true,
      };
    }
    const validIds = new Set(templates.map((t) => t.templateId));
    if (!validIds.has(templateId)) {
      return {
        content: [
          {
            type: "text",
            text: `Error: templateId not found for this account: ${templateId}. Use list_templates.`,
          },
        ],
        isError: true,
      };
    }
    try {
      const schema = await buildMcpTemplateCardSchema(uid, templateId);
      if (!schema) {
        return {
          content: [
            {
              type: "text",
              text: `Error: template has no blocks or could not be loaded: ${templateId}`,
            },
          ],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(schema, null, 2) }],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error: ${e?.message || e}` }],
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

  if (name === "update_deck") {
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
    if (!deckId) {
      return {
        content: [{ type: "text", text: "Error: deckId is required" }],
        isError: true,
      };
    }
    try {
      const out = await updateDeckAdmin(uid, deckId, {
        title: args?.title,
        description: args?.description,
        default_template_id:
          args?.default_template_id ?? args?.defaultTemplateId,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error updating deck: ${e?.message || e}` }],
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
    const explicitTemplateId = String(args?.templateId ?? args?.template_id ?? "").trim();
    if (!deckId) {
      return {
        content: [{ type: "text", text: "Error: deckId is required" }],
        isError: true,
      };
    }
    const resolved = await resolveMcpCreateCardTemplate(uid, deckId, explicitTemplateId);
    if (!resolved.ok) {
      return { content: [{ type: "text", text: resolved.message }], isError: true };
    }
    const { templateId, usedDeckDefault } = resolved;
    try {
      const { cardId } = await createCardFromTemplateAdmin(uid, deckId, templateId, {
        front: args?.front,
        block_text: args?.block_text ?? args?.blockText,
        generate_audio: args?.generate_audio ?? args?.generateAudio,
        voice_id: args?.voice_id ?? args?.voiceId,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              cardId,
              deckId,
              templateId,
              usedDeckDefault,
            }),
          },
        ],
      };
    } catch (e) {
      const msg = e?.message || String(e);
      return {
        content: [
          {
            type: "text",
            text:
              msg.includes("Template not found") || msg.includes("no blocks")
                ? `${msg} Use list_templates and a valid templateId.`
                : `Error creating card: ${msg}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (name === "update_card") {
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
    const cardId = String(args?.cardId ?? args?.card_id ?? "").trim();
    if (!deckId || !cardId) {
      return {
        content: [{ type: "text", text: "Error: deckId and cardId are required" }],
        isError: true,
      };
    }
    try {
      const out = await updateCardContentAdmin(uid, deckId, cardId, {
        values: args?.values,
        blocks_snapshot: args?.blocks_snapshot ?? args?.blocksSnapshot,
        blocksSnapshot: args?.blocksSnapshot,
        front: args?.front,
        block_text: args?.block_text ?? args?.blockText,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error updating card: ${e?.message || e}` }],
        isError: true,
      };
    }
  }

  if (name === "create_cards") {
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
    const explicitTemplateId = String(args?.templateId ?? args?.template_id ?? "").trim();
    const cards = args?.cards;
    if (!deckId) {
      return {
        content: [{ type: "text", text: "Error: deckId is required" }],
        isError: true,
      };
    }
    if (!Array.isArray(cards) || cards.length === 0) {
      return {
        content: [{ type: "text", text: "Error: cards must be a non-empty array" }],
        isError: true,
      };
    }
    if (cards.length > MCP_MAX_BULK_CARDS) {
      return {
        content: [
          {
            type: "text",
            text: `Error: at most ${MCP_MAX_BULK_CARDS} cards per request (got ${cards.length})`,
          },
        ],
        isError: true,
      };
    }
    const resolved = await resolveMcpCreateCardTemplate(uid, deckId, explicitTemplateId);
    if (!resolved.ok) {
      return { content: [{ type: "text", text: resolved.message }], isError: true };
    }
    const { templateId, usedDeckDefault } = resolved;
    const batchGenAudio =
      args?.generate_audio !== false && args?.generateAudio !== false;
    const batchVoiceId = args?.voice_id ?? args?.voiceId;
    const created = [];
    for (let i = 0; i < cards.length; i++) {
      const item = cards[i] && typeof cards[i] === "object" ? cards[i] : {};
      const cardGenAudio =
        batchGenAudio &&
        item.generate_audio !== false &&
        item.generateAudio !== false;
      try {
        const { cardId } = await createCardFromTemplateAdmin(uid, deckId, templateId, {
          front: item.front,
          block_text: item.block_text ?? item.blockText,
          generate_audio: cardGenAudio,
          voice_id: item.voice_id ?? item.voiceId ?? batchVoiceId,
        });
        created.push({ index: i, cardId });
      } catch (e) {
        const msg = e?.message || String(e);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  deckId,
                  templateId,
                  usedDeckDefault,
                  created,
                  failedAt: i,
                  error: msg,
                  partialCount: created.length,
                  hint:
                    "Earlier cards in this batch were written to Firestore; remove duplicates in the app if you retry.",
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            deckId,
            templateId,
            usedDeckDefault,
            count: created.length,
            cards: created,
          }),
        },
      ],
    };
  }

  if (name === "attach_audio_to_card") {
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
    const cardId = String(args?.cardId ?? args?.card_id ?? "").trim();
    if (!deckId || !cardId) {
      return {
        content: [{ type: "text", text: "Error: deckId and cardId are required" }],
        isError: true,
      };
    }
    try {
      const out = await attachAudioToExistingCardAdmin(uid, deckId, cardId, {
        block_id: args?.block_id ?? args?.blockId,
        text: args?.text,
        voice_id: args?.voice_id ?? args?.voiceId,
        replace_existing: args?.replace_existing ?? args?.replaceExisting,
        generate_audio: args?.generate_audio ?? args?.generateAudio,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error: ${e?.message || e}` }],
        isError: true,
      };
    }
  }

  if (name === "export_deck") {
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
    if (!deckId) {
      return {
        content: [{ type: "text", text: "Error: deckId is required" }],
        isError: true,
      };
    }
    const maxRaw = args?.max_cards;
    const maxCards =
      maxRaw != null && maxRaw !== ""
        ? Number(maxRaw)
        : undefined;
    const exportTypeRaw = args?.export_type ?? args?.exportType;
    try {
      const exported = await getDeckExportAdmin(uid, deckId, {
        maxCards: Number.isFinite(maxCards) ? maxCards : undefined,
        exportType:
          exportTypeRaw != null && String(exportTypeRaw).trim() !== ""
            ? String(exportTypeRaw).trim()
            : undefined,
      });
      if (!exported) {
        return {
          content: [
            {
              type: "text",
              text: `Error: deck not found: ${deckId}. Use list_decks to get valid deckIds.`,
            },
          ],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(exported, null, 2) }],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error exporting deck: ${e?.message || e}` }],
        isError: true,
      };
    }
  }

  if (name === "create_template") {
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
    const templateName = args?.name != null ? String(args.name).trim() : "";
    if (!templateName) {
      return {
        content: [{ type: "text", text: "Error: name is required" }],
        isError: true,
      };
    }
    try {
      const result = await createTemplateAdmin(uid, {
        name: templateName,
        description: args?.description,
        blocks: args?.blocks,
        block_types: args?.block_types ?? args?.blockTypes,
        voice_id: args?.voice_id ?? args?.voiceId,
        rendering: args?.rendering,
        mainBlockId: args?.mainBlockId ?? args?.main_block_id,
        subBlockId: args?.subBlockId ?? args?.sub_block_id,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error creating template: ${e?.message || e}` }],
        isError: true,
      };
    }
  }

  if (name === "update_template") {
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
    const templateId = String(args?.templateId ?? args?.template_id ?? "").trim();
    if (!templateId) {
      return {
        content: [{ type: "text", text: "Error: templateId is required" }],
        isError: true,
      };
    }
    try {
      const result = await updateTemplateAdmin(uid, templateId, {
        name: args?.name,
        description: args?.description,
        blocks: args?.blocks,
        block_types: args?.block_types ?? args?.blockTypes,
        voice_id: args?.voice_id ?? args?.voiceId,
        rendering: args?.rendering,
        mainBlockId: args?.mainBlockId ?? args?.main_block_id,
        subBlockId: args?.subBlockId ?? args?.sub_block_id,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error updating template: ${e?.message || e}` }],
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
