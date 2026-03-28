/**
 * Template block catalog for MCP: list_template_block_types + expand block_types → blocks.
 * Self-contained (no @/ imports) so mcp-server/index.js can import via relative path.
 * Numeric ids match utils/firestore BlockType (0–12).
 */

import { v4 as uuidv4 } from "uuid";

const DEFAULT_IMAGE_CROP_ASPECT = 1;

/** Canonical block types in Firestore / mobile order. */
export const MCP_TEMPLATE_BLOCK_CATALOG = [
  { key: "header1", numeric: 0, label: "Header 1", description: "Large heading", category: "text" },
  { key: "header2", numeric: 1, label: "Header 2", description: "Medium heading", category: "text" },
  { key: "header3", numeric: 2, label: "Header 3", description: "Small heading", category: "text" },
  { key: "text", numeric: 3, label: "Text", description: "Regular text", category: "text" },
  { key: "quote", numeric: 4, label: "Quote", description: "Example or quote", category: "text" },
  { key: "hiddenText", numeric: 5, label: "Hidden Text", description: "Hidden until revealed", category: "text" },
  { key: "image", numeric: 6, label: "Image", description: "Image block", category: "media" },
  { key: "audio", numeric: 7, label: "Audio", description: "Audio / text-to-speech", category: "media" },
  { key: "quizMultiSelect", numeric: 8, label: "Multi Choice Quiz", description: "Multiple correct answers", category: "quiz" },
  { key: "quizSingleSelect", numeric: 9, label: "Single Choice Quiz", description: "One correct answer", category: "quiz" },
  { key: "quizTextAnswer", numeric: 10, label: "Text Answer Quiz", description: "Type the answer", category: "quiz" },
  { key: "divider", numeric: 11, label: "Divider", description: "Visual separator", category: "layout" },
  { key: "space", numeric: 12, label: "Space", description: "Vertical space", category: "layout" },
];

const KEY_BY_NUMERIC = new Map(MCP_TEMPLATE_BLOCK_CATALOG.map((b) => [b.numeric, b.key]));
const KEY_BY_NAME = new Map(MCP_TEMPLATE_BLOCK_CATALOG.map((b) => [b.key, b.key]));

/**
 * @returns {{ blockTypes: typeof MCP_TEMPLATE_BLOCK_CATALOG, hint: string }}
 */
export function getMcpTemplateBlockCatalog() {
  return {
    blockTypes: MCP_TEMPLATE_BLOCK_CATALOG,
    hint:
      "Pick block type keys (e.g. header1, hiddenText) or numeric ids (0–12) in order. Pass them as block_types to create_template. **Sides:** index 0 → study front; indices 1+ → back (after flip). For custom face placement, pass a full `blocks` array with explicit `side` instead. You cannot use blocks and block_types together.",
  };
}

/**
 * Human-readable list for assistants to show end users before they choose block_types.
 */
export function formatMcpTemplateBlockCatalogForChat() {
  const { blockTypes, hint } = getMcpTemplateBlockCatalog();
  const lines = blockTypes.map(
    (b) =>
      `  ${String(b.numeric).padStart(2, " ")}. ${b.key.padEnd(18)} ${b.label} — ${b.description} (${b.category})`,
  );
  return [
    "Available template block types — pick multiple in the order they should appear on the card, then pass as block_types to create_template (e.g. [\"header1\", \"hiddenText\"] or [0, 5]):",
    "",
    ...lines,
    "",
    hint,
    "",
    "Full catalog JSON:",
    JSON.stringify(getMcpTemplateBlockCatalog(), null, 2),
  ].join("\n");
}

/** Resolve Firestore/mobile type (string or 0–12) to canonical string key, or null. */
export function resolveMcpBlockTypeKey(raw) {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isInteger(raw) && KEY_BY_NUMERIC.has(raw)) {
    return KEY_BY_NUMERIC.get(raw);
  }
  const s = String(raw).trim();
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (KEY_BY_NUMERIC.has(n)) return KEY_BY_NUMERIC.get(n);
  }
  if (KEY_BY_NAME.has(s)) return KEY_BY_NAME.get(s);
  return null;
}

/** Category: text | media | quiz | layout */
export function getMcpBlockCategory(typeKey) {
  if (!typeKey) return null;
  return MCP_TEMPLATE_BLOCK_CATALOG.find((b) => b.key === typeKey)?.category ?? null;
}

function defaultConfigJsonForKey(key) {
  switch (key) {
    case "image":
      return { cropAspect: DEFAULT_IMAGE_CROP_ASPECT };
    case "quizSingleSelect":
    case "quizMultiSelect":
      return {
        question: "",
        options: ["", "", "", ""],
        correctAnswerIndex: 0,
        correctAnswerIndices: [],
      };
    case "quizTextAnswer":
      return {
        question: "",
        correctAnswer: "",
        caseSensitive: false,
      };
    default:
      return undefined;
  }
}

/**
 * Build block definitions from an ordered list of type keys or numeric ids.
 * Assigns `side`: index 0 → front, indices 1+ → back (classic prompt / reveal). For custom faces pass full `blocks` to create_template instead.
 * @param {Array<string|number>} blockTypes
 * @returns {Array<{ blockId: string, type: string, label: string, required: boolean, configJson?: object }>}
 */
export function expandBlockTypesToTemplateBlocks(blockTypes) {
  if (!Array.isArray(blockTypes) || blockTypes.length === 0) {
    throw new Error("block_types must be a non-empty array of block type keys or numeric ids (0–12)");
  }
  const keys = blockTypes.map(resolveMcpBlockTypeKey);
  const invalid = [];
  blockTypes.forEach((raw, i) => {
    if (!keys[i]) invalid.push(raw);
  });
  if (invalid.length) {
    throw new Error(
      `Unknown block type(s): ${invalid.map((x) => JSON.stringify(x)).join(", ")}. Call list_template_block_types for valid keys.`,
    );
  }
  return keys.map((key, i) => {
    const meta = MCP_TEMPLATE_BLOCK_CATALOG.find((b) => b.key === key);
    const configJson = defaultConfigJsonForKey(key);
    const block = {
      blockId: uuidv4(),
      type: key,
      label: meta?.label || key,
      required: i === 0,
      /** First block = study front; rest = back (after flip). Matches default Q&A seed when using block_types. */
      side: i === 0 ? "front" : "back",
    };
    if (configJson !== undefined) block.configJson = configJson;
    return block;
  });
}
