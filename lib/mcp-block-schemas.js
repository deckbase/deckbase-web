/**
 * Deckbase block type → JSON shapes for MCP and API clients.
 * `type` may be string (e.g. "header1") or numeric 0–12 (mobile / Firestore); both are valid.
 * Firestore stores snake_case on writes (block_id, config_json, media_ids); clients often use camelCase.
 */

const REFERENCE =
  "Each card has blocksSnapshot (block definitions) and values (one entry per blockId). Keys align by blockId. For real examples, call export_deck on a deck that uses the template.";

/** @type {Array<object>} */
const BLOCK_SCHEMAS = [
  {
    key: "header1",
    numeric: 0,
    category: "text",
    block: {
      blockId: "<uuid>",
      type: "header1",
      label: "string",
      required: "boolean (optional)",
    },
    value: {
      blockId: "<same as block>",
      type: "header1",
      text: "string",
    },
    configJson: null,
  },
  {
    key: "header2",
    numeric: 1,
    category: "text",
    block: { blockId: "<uuid>", type: "header2", label: "string", required: "optional" },
    value: { blockId: "<uuid>", type: "header2", text: "string" },
    configJson: null,
  },
  {
    key: "header3",
    numeric: 2,
    category: "text",
    block: { blockId: "<uuid>", type: "header3", label: "string", required: "optional" },
    value: { blockId: "<uuid>", type: "header3", text: "string" },
    configJson: null,
  },
  {
    key: "text",
    numeric: 3,
    category: "text",
    block: { blockId: "<uuid>", type: "text", label: "string", required: "optional" },
    value: { blockId: "<uuid>", type: "text", text: "string" },
    configJson: null,
  },
  {
    key: "quote",
    numeric: 4,
    category: "text",
    block: { blockId: "<uuid>", type: "quote", label: "string", required: "optional" },
    value: { blockId: "<uuid>", type: "quote", text: "string" },
    configJson: null,
    notes: "UI may label as Example/Quote; same as type quote in Firestore.",
  },
  {
    key: "hiddenText",
    numeric: 5,
    category: "text",
    block: { blockId: "<uuid>", type: "hiddenText", label: "string", required: "optional" },
    value: { blockId: "<uuid>", type: "hiddenText", text: "string" },
    configJson: null,
  },
  {
    key: "image",
    numeric: 6,
    category: "media",
    block: {
      blockId: "<uuid>",
      type: "image",
      label: "string",
      required: "optional",
      configJson: {
        cropAspect: "number (optional, e.g. 1 for 1:1, 1.91, 0.8)",
      },
    },
    value: {
      blockId: "<uuid>",
      type: "image",
      text: "string (often empty)",
      mediaIds: ["<uuid>", "..."],
    },
    configJson: "on block definition only",
    notes: "mediaIds reference users/{uid}/media/{id}. Upload via app or APIs that create media docs.",
  },
  {
    key: "audio",
    numeric: 7,
    category: "media",
    block: {
      blockId: "<uuid>",
      type: "audio",
      label: "string",
      required: "optional",
      configJson: "object — voice / source text block refs; see lib/audio-block-config.js (parseAudioBlockConfig)",
    },
    value: {
      blockId: "<uuid>",
      type: "audio",
      text: "string (optional caption or TTS source text)",
      mediaIds: ["<uuid>"],
    },
    configJson: "on block; TTS/voice settings",
    notes: "See docs/features/MOBILE_IMPORT_SPREADSHEET.md (audio blocks) and lib/audio-block-config.js.",
  },
  {
    key: "quizMultiSelect",
    numeric: 8,
    category: "quiz",
    block: {
      blockId: "<uuid>",
      type: "quizMultiSelect",
      label: "string",
      required: "optional",
      configJson: {
        question: "string",
        options: "string[] (at least 2 non-empty for validation)",
        correctAnswerIndices: "number[] (indices into options)",
        correctAnswers: "string[] (alternative to indices)",
      },
    },
    value: {
      blockId: "<uuid>",
      type: "quizMultiSelect",
      text: "string (often empty; UI may store selection state elsewhere)",
      items: "optional array for UI state",
      correctAnswers: "optional",
    },
    configJson: "required on block for quiz to work",
  },
  {
    key: "quizSingleSelect",
    numeric: 9,
    category: "quiz",
    block: {
      blockId: "<uuid>",
      type: "quizSingleSelect",
      label: "string",
      configJson: {
        question: "string",
        options: "string[]",
        correctAnswerIndex: "number (index into options)",
        correctAnswers: 'string[] (optional single-element alias, e.g. ["B"]) ',
      },
    },
    value: { blockId: "<uuid>", type: "quizSingleSelect", text: "string" },
    configJson: "required on block",
  },
  {
    key: "quizTextAnswer",
    numeric: 10,
    category: "quiz",
    block: {
      blockId: "<uuid>",
      type: "quizTextAnswer",
      label: "string",
      configJson: {
        question: "string",
        correctAnswer: "string",
        caseSensitive: "boolean (optional)",
      },
    },
    value: { blockId: "<uuid>", type: "quizTextAnswer", text: "string (user answer when filled)" },
    configJson: "required on block",
  },
  {
    key: "divider",
    numeric: 11,
    category: "layout",
    block: { blockId: "<uuid>", type: "divider", label: "string", required: "optional" },
    value: { blockId: "<uuid>", type: "divider", text: "string (usually empty)" },
    configJson: null,
    notes: "No user content; layout only.",
  },
  {
    key: "space",
    numeric: 12,
    category: "layout",
    block: { blockId: "<uuid>", type: "space", label: "string", required: "optional" },
    value: { blockId: "<uuid>", type: "space", text: "string (usually empty)" },
    configJson: null,
    notes: "No user content; vertical spacing.",
  },
];

/**
 * Full schema payload for MCP / HTTP clients.
 */
export function getDeckbaseBlockSchemas() {
  return {
    reference: REFERENCE,
    typeEncoding:
      "Block `type` may be string key (e.g. quizSingleSelect) or number 0–12 matching the catalog order in list_template_block_types.",
    firestoreNote:
      "Written fields often use snake_case: block_id, config_json, media_ids, correct_answers. JSON in API responses may be camelCase after transforms.",
    blockSchemas: BLOCK_SCHEMAS,
    createCardMcpNote:
      "create_card / create_cards accept block_text: { [blockId]: string } for text fields only. Image/audio need mediaIds set in-app unless you extend the API.",
    docsPaths: [
      "docs/features/MOBILE_EXPORT.md — blocksSnapshot + values overview",
      "docs/features/MOBILE_IMPORT_SPREADSHEET.md — values, media, audio/quiz notes",
      "docs/public/MCP.md — MCP tools summary",
    ],
  };
}

/**
 * Text + JSON for assistants (MCP tool result).
 */
export function formatDeckbaseBlockSchemasForChat() {
  const data = getDeckbaseBlockSchemas();
  const lines = data.blockSchemas.map((s) => {
    const cfg = s.configJson === null ? "none" : typeof s.configJson === "string" ? s.configJson : "see block.configJson";
    return `  ${String(s.numeric).padStart(2, " ")} ${s.key.padEnd(18)} [${s.category}]  value: ${JSON.stringify(s.value)}  block.config: ${cfg}`;
  });
  return [
    "Deckbase block JSON shapes (blocksSnapshot entry + matching value entry).",
    "",
    data.reference,
    "",
    ...lines,
    "",
    `create_card note: ${data.createCardMcpNote}`,
    "",
    "Full JSON:",
    JSON.stringify(data, null, 2),
  ].join("\n");
}
