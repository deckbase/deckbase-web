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
  attachImageToExistingCardAdmin,
  deleteCardAdmin,
  isAvailable as isFirestoreAdminAvailable,
} from "@/lib/firestore-admin";
import { formatMcpTemplateBlockCatalogForChat } from "@/lib/mcp-template-blocks";
import { formatDeckbaseBlockSchemasForChat } from "@/lib/mcp-block-schemas";
import { getElevenlabsVoicesMcpPayload } from "@/lib/elevenlabs-voices";
import { normalizeDeckIconEmoji } from "@/utils/firestore";
import { isBasicOrProOrVip } from "@/lib/revenuecat-server";
import {
  STYLE_PROMPT_LIBRARY_VERSION,
  collectStylePromptTags,
  filterStylePromptEntriesByTag,
  getStylePromptEntries,
} from "@/lib/image-style-prompts";

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
          "List all Deckbase template block types (keys, numeric ids, labels, category). Use this so the user can choose multiple block types in order; then pass that list as block_types to create_template. **Quiz blocks:** category `quiz` — keys `quizMultiSelect` (8), `quizSingleSelect` (9), `quizTextAnswer` (10). Use these when the user wants multiple-choice or typed-answer quizzes, not only `header1`+`hiddenText`. For JSON shapes and required `configJson` per type, call **list_block_schemas** before create_template. Works in local stdio and hosted MCP.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list_block_schemas",
        description:
          "Return JSON structure for each block type: typical blocksSnapshot entry, matching value entry, and **configJson** fields. **Quiz types (`quizSingleSelect`, `quizMultiSelect`, `quizTextAnswer`) require a correct `configJson` on the block** (options, correct answer(s), etc.) — read this response before create_template/create_card with quiz blocks. Same for image/audio. Use when building or parsing cards. Works in local stdio and hosted MCP. Real examples: export_deck.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list_elevenlabs_voices",
        description:
          "List ElevenLabs TTS voice ids (group, label, id, gender, language) from the Deckbase curated catalog for attach_audio_to_card voice_id and template audio block defaultVoiceId. Optional filters: language (ISO 639 code), gender (female|male), search (substring on label/group/id). Response includes voices (filtered), totalVoicesInCatalog, filtersApplied, languageOptions (code+name for all languages), defaultVoiceIdFromEnv, serverFallbackVoiceId, source, optional note, docsUrl.",
        inputSchema: {
          type: "object",
          properties: {
            language: {
              type: "string",
              description:
                "Optional ISO 639 language code to restrict results (e.g. en, uk, fil, zh, ja). See languageOptions in the response for valid codes.",
            },
            gender: {
              type: "string",
              enum: ["female", "male"],
              description: "Optional: only female or male voices.",
            },
            search: {
              type: "string",
              description:
                "Optional case-insensitive substring; matches voice label, language group name, voice id, or language code.",
            },
          },
        },
      },
      {
        name: "list_decks",
        description:
          "List the user's flashcard decks (deckId, title, description, defaultTemplateId, iconEmoji). iconEmoji is optional Unicode emoji for deck list/header; omit/null when unset. Requires hosted MCP with API key. Use with list_templates before create_card.",
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
          "After the user selects a template, returns exact JSON for that template: each blockId, type, label, configJson, category, plus `side` per block (**\"front\"** = shown first in study; **\"back\"** = after the learner flips the card), valuesExample, and create_card hints. **Back-side text:** fill `block_text` in create_card with those blockIds (same as front blocks). **If any block has type quiz*, use the returned configJson and hints so answers/options match the template.** Requires hosted MCP. Pass templateId from list_templates, or deckId only to use the deck’s default template.",
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
          "Create a new flashcard deck for the user. Requires hosted MCP with API key. Returns deckId and icon fields for create_card. **Deck icon:** There is no Deckbase emoji list to fetch—use any standard Unicode emoji (one grapheme). Unless the user asked for no icon or a specific emoji, pass `icon_emoji` (or `iconEmoji`) with one emoji that fits the deck title and optional description. Omit only if the user wants no icon or the topic is too vague.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Deck title" },
            description: { type: "string", description: "Optional deck description" },
            icon_emoji: {
              type: "string",
              description:
                "One emoji for deck list/header (Firestore `icon_emoji`). Prefer inferring from title/description when the user did not specify. Same as iconEmoji.",
            },
            iconEmoji: {
              type: "string",
              description: "Alias for icon_emoji (camelCase).",
            },
          },
          required: ["title"],
        },
      },
      {
        name: "update_deck",
        description:
          "Update an existing deck’s title, description, default template id, and/or deck icon emoji. Requires hosted MCP with API key. Pass only fields to change. To clear the deck icon, pass icon_emoji or iconEmoji as empty string.",
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
            icon_emoji: {
              type: "string",
              description:
                "Optional. Set or change deck list/header emoji (Firestore icon_emoji). Empty string after trim removes the icon. Same as iconEmoji.",
            },
            iconEmoji: {
              type: "string",
              description: "Optional alias for icon_emoji (camelCase).",
            },
          },
          required: ["deckId"],
        },
      },
      {
        name: "update_card",
        description:
          "Update an existing card’s content. Requires hosted MCP with API key. Pass values (full array) and/or blocks_snapshot to replace; or pass front and/or block_text to merge into current values (block_text keys must be blockIds from the card layout — use export_deck or get_template_schema). **Back-face text:** use block_text with the same blockIds as on the template/card (including side \"back\"). Changing blocks_snapshot without values rebuilds empty values then applies front/block_text.",
        inputSchema: {
          type: "object",
          properties: {
            deckId: { type: "string", description: "Deck containing the card" },
            cardId: { type: "string", description: "Card ID" },
            values: {
              type: "array",
              description:
                "Optional full replacement for card values (same shape as export_deck cards[].values)",
              items: { type: "object", additionalProperties: true },
            },
            blocks_snapshot: {
              type: "array",
              description:
                "Optional full replacement for layout (block defs). If set with values, each blockId must have a value entry.",
              items: { type: "object", additionalProperties: true },
            },
            front: {
              type: "string",
              description:
                "Optional text for the main block only (same role as create_card.front)",
            },
            block_text: {
              type: "object",
              description:
                "Optional map blockId → string merged into values, including back-face blocks",
            },
          },
          required: ["deckId", "cardId"],
        },
      },
      {
        name: "delete_card",
        description:
          "Soft-delete one flashcard (sets is_deleted; same as app trash). **DESTRUCTIVE.** Requires hosted MCP. **You MUST ask the human for explicit confirmation before calling.** The server refuses unless `user_confirmed` is exactly true — only set it after the user clearly agreed to delete this card (e.g. they answered yes to a confirmation prompt). Never infer consent.",
        inputSchema: {
          type: "object",
          properties: {
            deckId: { type: "string", description: "Deck containing the card" },
            cardId: {
              type: "string",
              description: "Card ID (from export_deck or list flows)",
            },
            user_confirmed: {
              type: "boolean",
              description:
                "Must be true. Only after the user explicitly confirmed deletion of this card.",
            },
          },
          required: ["deckId", "cardId", "user_confirmed"],
        },
      },
      {
        name: "delete_cards",
        description:
          `Soft-delete multiple cards in one deck (same rules as delete_card). **Ask the user to confirm the exact card IDs before calling.** Refuses unless user_confirmed is true. Max ${MCP_MAX_BULK_CARDS} cards per request. Response lists deleted ids and per-id errors if any fail.`,
        inputSchema: {
          type: "object",
          properties: {
            deckId: { type: "string", description: "Deck containing all listed cards" },
            card_ids: {
              type: "array",
              items: { type: "string" },
              description: "Non-empty list of card IDs to delete",
            },
            user_confirmed: {
              type: "boolean",
              description:
                "Must be true. Only after the user explicitly confirmed bulk deletion.",
            },
          },
          required: ["deckId", "card_ids", "user_confirmed"],
        },
      },
      {
        name: "create_card",
        description:
          "Create a new card from a template’s block layout. Requires hosted MCP with API key. Required: deckId. If templateId is omitted, uses the deck’s default template (defaultTemplateId from list_decks); if the deck has none, pass templateId from list_templates. If no templates exist, create_template first. **Front vs back:** Templates can place blocks on the front (shown first) and/or back (after flip). `front` fills only the template’s **main** block (see get_template_schema `mainBlockId`). **Put answer or back-face text in `block_text`** keyed by each block’s `blockId`, including blocks whose `side` is `\"back\"`. Call get_template_schema for blockIds and `side`. **Templates with quiz blocks:** call get_template_schema first; fill values per block (quiz options/answers per configJson). When generate_audio is true (default) and the template has an audio block, ask the user for voice settings, then pass voice_id from list_elevenlabs_voices OR pass audio_language (ISO 639) and audio_gender (female|male). Set generate_audio: false to skip TTS. Validation: block_text keys must be template blockIds; required text blocks must be non-empty; if the template has any text blocks, at least one must have non-empty content (via front and/or block_text).",
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
              description:
                "Optional text for the template main block only (mainBlockId from get_template_schema). Does not fill other front blocks or back blocks.",
            },
            block_text: {
              type: "object",
              description:
                "Optional map blockId → string for text (and similar) blocks. **Include back-face blocks:** use blockIds where the template has side \"back\" so the card has content after flip.",
            },
            generate_audio: {
              type: "boolean",
              description:
                "Optional. Default true. If true and template includes an audio block, generate ElevenLabs TTS when source text exists. Set false to skip TTS.",
            },
            voice_id: {
              type: "string",
              description:
                "ElevenLabs voice id from list_elevenlabs_voices. Alternative to audio_language + audio_gender.",
            },
            audio_language: {
              type: "string",
              description:
                "ISO 639 language code (e.g. en, uk, fil). Required with audio_gender when voice_id is omitted and generate_audio is true and the template has an audio block.",
            },
            audio_gender: {
              type: "string",
              enum: ["female", "male"],
              description:
                "Required with audio_language when voice_id is omitted (same conditions as audio_language).",
            },
          },
          required: ["deckId"],
        },
      },
      {
        name: "create_cards",
        description:
          `Bulk create cards in one deck using the same template resolution and validation as create_card (deck default or explicit templateId). Requires hosted MCP. Same front/back rules as create_card: use block_text per card for back-side blockIds from get_template_schema. For templates with quiz blocks, follow get_template_schema / list_block_schemas for each card’s values shape. Pass cards: array of objects, each with optional front, block_text, generate_audio, voice_id, audio_language, audio_gender (per-card). Optional top-level voice_id, audio_language, audio_gender, and generate_audio apply to the whole batch when not set per card. Max ${MCP_MAX_BULK_CARDS} cards per request. If one card fails, earlier cards may already exist in Firestore.`,
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
                "Optional default voice id for all cards (see create_card). Per-card voice_id overrides.",
            },
            audio_language: {
              type: "string",
              description: "Optional default ISO 639 code when using language+gender instead of voice_id.",
            },
            audio_gender: {
              type: "string",
              enum: ["female", "male"],
              description: "Optional default gender when using audio_language.",
            },
            generate_audio: {
              type: "boolean",
              description:
                "Optional. Default true. If false, skip ElevenLabs TTS for all cards (each card can still set generate_audio: false when this is true).",
            },
            cards: {
              type: "array",
              description: `Non-empty array of per-card payloads (front?, block_text?, generate_audio?, voice_id?, audio_language?, audio_gender?). Max ${MCP_MAX_BULK_CARDS} items.`,
              items: {
                type: "object",
                properties: {
                  front: { type: "string" },
                  block_text: { type: "object", additionalProperties: true },
                  generate_audio: { type: "boolean" },
                  voice_id: { type: "string" },
                  audio_language: { type: "string" },
                  audio_gender: { type: "string", enum: ["female", "male"] },
                },
                additionalProperties: true,
              },
            },
          },
          required: ["deckId", "cards"],
        },
      },
      {
        name: "attach_audio_to_card",
        description:
          "Generate ElevenLabs TTS audio and attach it to an existing card’s audio block (updates values.mediaIds). Requires hosted MCP with API key. Required: deckId, cardId. Ask the user for voice settings, then pass voice_id from list_elevenlabs_voices OR pass audio_language (ISO 639) and audio_gender (female|male). If the card has multiple audio blocks, pass block_id. Optional text overrides the spoken script; otherwise source text is resolved like create_card. If the block already has media, pass replace_existing: true to regenerate. Same TTS/storage/subscription limits as create_card.",
        inputSchema: {
          type: "object",
          properties: {
            deckId: { type: "string", description: "Deck containing the card" },
            cardId: { type: "string", description: "Card ID" },
            voice_id: {
              type: "string",
              description: "ElevenLabs voice id from list_elevenlabs_voices. Alternative to audio_language + audio_gender.",
            },
            audio_language: {
              type: "string",
              description: "ISO 639 code; use with audio_gender when voice_id is omitted.",
            },
            audio_gender: {
              type: "string",
              enum: ["female", "male"],
              description: "Use with audio_language when voice_id is omitted.",
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
          required: ["deckId", "cardId"],
        },
      },
      {
        name: "list_image_style_prompts",
        description:
          "List curated style presets for AI image generation (id, label, description, snippet, tags). Same catalog as the web app. Subscribers only. Optional tag (kebab-case, e.g. vocabulary, anime, physics) filters presets. Use style_prompt_id with attach_image_to_card.",
        inputSchema: {
          type: "object",
          properties: {
            tag: {
              type: "string",
              description: "Optional. Filter by tag (e.g. stem, watercolor, realistic).",
            },
          },
        },
      },
      {
        name: "attach_image_to_card",
        description:
          "Generate an AI image (fal.ai) and attach it to an existing card’s image block. Requires hosted MCP, FAL_KEY, and subscription with image credits (same limits as the web). Required: deckId, cardId, prompt. Optional model_id (curated T2I ids; default fal-ai/flux/schnell), style_prompt_id from list_image_style_prompts, block_id if multiple image blocks. replace_existing true replaces all images in the block; false (default) appends.",
        inputSchema: {
          type: "object",
          properties: {
            deckId: { type: "string", description: "Deck containing the card" },
            cardId: { type: "string", description: "Card ID" },
            prompt: { type: "string", description: "Subject / scene to render" },
            model_id: {
              type: "string",
              description: "Optional fal text-to-image model id (default fal-ai/flux/schnell)",
            },
            style_prompt_id: {
              type: "string",
              description: "Optional preset id from list_image_style_prompts",
            },
            block_id: {
              type: "string",
              description: "Required when the card has multiple image blocks",
            },
            replace_existing: {
              type: "boolean",
              description:
                "Default false: append generated image to the block. true: replace existing images with this one",
            },
          },
          required: ["deckId", "cardId", "prompt"],
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
          "Create a flashcard template (block layout for new cards). Requires hosted MCP with API key. Call **list_template_block_types** first so the user can pick block types; pass the ordered selection as block_types. **When the user wants quizzes (multiple choice, single choice, or typed answer):** include `quizMultiSelect`, `quizSingleSelect`, or `quizTextAnswer` (or numeric ids 8–10) in block_types, and call **list_block_schemas** first so each quiz block gets a valid **configJson** (questions, choices, correct answer(s)). Do not default to only header1+hiddenText if the user asked for quiz/MCQ behavior. **If block_types or blocks includes audio (type audio / 7): you MUST NOT call this tool until the user has chosen a default TTS voice.** Ask: which language accent and gender (or exact voice from list_elevenlabs_voices), then pass voice_id OR audio_language + audio_gender (same rules as create_card). Do not silently omit voice when the layout includes audio. Alternatively pass full blocks with configJson.defaultVoiceId on each audio block, or omit both block_types and blocks for default Question + Answer only.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Template display name" },
            description: { type: "string", description: "Optional description" },
            block_types: {
              type: "array",
              description:
                "Ordered list of block type keys or numeric ids 0–12. Examples: [\"header1\", \"hiddenText\"] for Q&A; [\"header1\", \"quizSingleSelect\"] or [0, 9] for stem + single-choice quiz. Quiz keys: quizMultiSelect (8), quizSingleSelect (9), quizTextAnswer (10). Mutually exclusive with blocks.",
              items: {
                oneOf: [{ type: "string" }, { type: "integer" }],
              },
            },
            blocks: {
              type: "array",
              description:
                "Optional full block definitions. Mutually exclusive with block_types. Each: blockId (optional), type, label, side (\"front\" | \"back\"; default front), required (optional), configJson (required for quiz/image/audio per list_block_schemas). For quiz blocks, set type to quizSingleSelect | quizMultiSelect | quizTextAnswer and a complete configJson. For audio blocks, include configJson.defaultVoiceId or pass top-level voice_id (or audio_language + audio_gender). Empty or omitted uses header1 Question + hiddenText Answer unless block_types is set.",
              items: { type: "object" },
            },
            voice_id: {
              type: "string",
              description:
                "When template includes an audio block without defaultVoiceId on every audio block: ElevenLabs id from list_elevenlabs_voices after the user chooses. Applied to all audio blocks. Alternatively pass audio_language + audio_gender instead.",
            },
            audio_language: {
              type: "string",
              description:
                "ISO 639 language code (e.g. en, ja, uk). Use with audio_gender when voice_id is omitted and the layout includes audio without per-block defaultVoiceId. Same as create_card.",
            },
            audio_gender: {
              type: "string",
              description: "female | male. Use with audio_language when voice_id is omitted (same conditions as create_card).",
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
          "Update an existing template’s name, description, block layout (blocks or block_types), main/sub block ids, and/or default voice for audio blocks. Set each block’s `side` to \"front\" or \"back\". Requires hosted MCP. When adding or changing **quiz** blocks, use **list_block_schemas** for configJson shapes (same as create_template). Omit blocks and block_types to keep layout; version increments when anything changes. If the layout includes audio without defaultVoiceId, ask the user for voice settings first, then pass voice_id or audio_language + audio_gender (same as create_template).",
        inputSchema: {
          type: "object",
          properties: {
            templateId: { type: "string", description: "Template ID from list_templates" },
            name: { type: "string", description: "New name (optional)" },
            description: { type: "string", description: "New description (optional)" },
            block_types: {
              type: "array",
              description:
                "Ordered block types to replace layout; mutually exclusive with non-empty blocks. Include quiz* keys or ids 8–10 when the user wants MCQ/quiz layout; use list_block_schemas for configJson when building `blocks` instead.",
              items: {
                oneOf: [{ type: "string" }, { type: "integer" }],
              },
            },
            blocks: {
              type: "array",
              description: "Full block definitions to replace layout; mutually exclusive with block_types",
              items: { type: "object" },
            },
            voice_id: {
              type: "string",
              description:
                "Sets defaultVoiceId on all audio blocks (see create_template). Required if layout has audio without defaultVoiceId unless audio_language + audio_gender are passed instead.",
            },
            audio_language: {
              type: "string",
              description: "ISO 639 code with audio_gender when voice_id is omitted (same as create_template).",
            },
            audio_gender: {
              type: "string",
              description: "female | male with audio_language when voice_id is omitted.",
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

const DELETE_CONSENT_REFUSED_MSG =
  "Refused: user_confirmed must be true. Ask the human whether they want to delete (this soft-deletes the card; recovery may be limited). Only call again with user_confirmed: true after they explicitly confirm (e.g. they clearly agreed to delete this card or this list of cards). Do not set user_confirmed true without that consent.";

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
    try {
      const payload = await getElevenlabsVoicesMcpPayload(args ?? {});
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Error listing voices: ${e?.message || e}`,
          },
        ],
        isError: true,
      };
    }
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
      const iconRaw = args?.icon_emoji ?? args?.iconEmoji;
      const normalizedIcon = normalizeDeckIconEmoji(iconRaw);
      const { deckId } = await createDeckAdmin(
        uid,
        title,
        args?.description?.trim() ?? "",
        iconRaw,
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              deckId,
              title,
              description: args?.description?.trim() ?? "",
              icon_emoji: normalizedIcon,
              iconEmoji: normalizedIcon,
            }),
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
        ...(args?.icon_emoji !== undefined || args?.iconEmoji !== undefined
          ? { iconEmoji: args.iconEmoji ?? args.icon_emoji }
          : {}),
      });
      const icon = out.iconEmoji ?? null;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { ...out, icon_emoji: icon, iconEmoji: icon },
              null,
              2,
            ),
          },
        ],
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
        audio_language: args?.audio_language ?? args?.audioLanguage,
        audio_gender: args?.audio_gender ?? args?.audioGender,
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

  if (name === "delete_card") {
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
    if (args?.user_confirmed !== true) {
      return {
        content: [{ type: "text", text: DELETE_CONSENT_REFUSED_MSG }],
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
      const out = await deleteCardAdmin(uid, cardId, deckId);
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

  if (name === "delete_cards") {
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
    if (args?.user_confirmed !== true) {
      return {
        content: [{ type: "text", text: DELETE_CONSENT_REFUSED_MSG }],
        isError: true,
      };
    }
    const deckId = args?.deckId?.trim();
    const rawIds = args?.card_ids ?? args?.cardIds;
    if (!deckId) {
      return {
        content: [{ type: "text", text: "Error: deckId is required" }],
        isError: true,
      };
    }
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Error: card_ids must be a non-empty array",
          },
        ],
        isError: true,
      };
    }
    if (rawIds.length > MCP_MAX_BULK_CARDS) {
      return {
        content: [
          {
            type: "text",
            text: `Error: at most ${MCP_MAX_BULK_CARDS} cards per delete_cards request (got ${rawIds.length})`,
          },
        ],
        isError: true,
      };
    }
    const cardIds = [
      ...new Set(
        rawIds.map((x) => String(x ?? "").trim()).filter(Boolean),
      ),
    ];
    if (cardIds.length === 0) {
      return {
        content: [{ type: "text", text: "Error: card_ids must contain at least one card id" }],
        isError: true,
      };
    }
    const deleted = [];
    const errors = [];
    for (const cid of cardIds) {
      try {
        await deleteCardAdmin(uid, cid, deckId);
        deleted.push(cid);
      } catch (e) {
        errors.push({ cardId: cid, error: e?.message || String(e) });
      }
    }
    const payload = {
      deckId,
      deletedCount: deleted.length,
      deleted,
      errors,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      isError: errors.length > 0,
    };
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
    const batchAudioLang = args?.audio_language ?? args?.audioLanguage;
    const batchAudioGender = args?.audio_gender ?? args?.audioGender;
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
          audio_language: item.audio_language ?? item.audioLanguage ?? batchAudioLang,
          audio_gender: item.audio_gender ?? item.audioGender ?? batchAudioGender,
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
        audio_language: args?.audio_language ?? args?.audioLanguage,
        audio_gender: args?.audio_gender ?? args?.audioGender,
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

  if (name === "list_image_style_prompts") {
    if (!uid) {
      return {
        content: [{ type: "text", text: HOSTED_ONLY_MSG }],
        isError: true,
      };
    }
    try {
      if (process.env.NODE_ENV === "production") {
        if (!(await isBasicOrProOrVip(uid))) {
          return {
            content: [
              {
                type: "text",
                text: "Style library requires Basic or Pro subscription.",
              },
            ],
            isError: true,
          };
        }
      }
      const tag = String(args?.tag ?? "").trim();
      const all = getStylePromptEntries();
      const entries = tag ? filterStylePromptEntriesByTag(all, tag) : all;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                version: STYLE_PROMPT_LIBRARY_VERSION,
                tags: collectStylePromptTags(all),
                entries,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error: ${e?.message || e}` }],
        isError: true,
      };
    }
  }

  if (name === "attach_image_to_card") {
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
      const out = await attachImageToExistingCardAdmin(uid, deckId, cardId, {
        prompt: args?.prompt,
        model_id: args?.model_id ?? args?.modelId,
        style_prompt_id: args?.style_prompt_id ?? args?.stylePromptId,
        block_id: args?.block_id ?? args?.blockId,
        replace_existing: args?.replace_existing ?? args?.replaceExisting,
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
        audio_language: args?.audio_language ?? args?.audioLanguage,
        audio_gender: args?.audio_gender ?? args?.audioGender,
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
        audio_language: args?.audio_language ?? args?.audioLanguage,
        audio_gender: args?.audio_gender ?? args?.audioGender,
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
