/**
 * Build prompt for AI card generation.
 * Template-driven: blocks may be tagged `side: "front" | "back"` (default front).
 * Study UI shows front-face content first, then back after flip when back blocks exist.
 */

const BLOCK_TYPE_NAMES = [
  "header1",
  "header2",
  "header3",
  "text",
  "quote",
  "hiddenText",
  "image",
  "audio",
  "quizMultiSelect",
  "quizSingleSelect",
  "quizTextAnswer",
  "divider",
  "space",
];

function blockTypeLabel(b) {
  return b.label || (typeof b.type === "number" ? BLOCK_TYPE_NAMES[b.type] : b.type);
}

function effectiveTemplateFace(b) {
  return b?.side === "back" ? "back" : "front";
}

/** Front blocks first, then back — stable within each group. */
function sortBlocksByFace(blocks) {
  const list = Array.isArray(blocks) ? blocks : [];
  const front = list.filter((b) => effectiveTemplateFace(b) === "front");
  const back = list.filter((b) => effectiveTemplateFace(b) === "back");
  return [...front, ...back];
}

/** Normalize type for quiz detection (Firestore may send 9, "9", or "quizSingleSelect"). */
function isQuizBlock(block) {
  const t = block.type;
  if (t === "quizSingleSelect" || t === "quizMultiSelect" || t === "quizTextAnswer") return true;
  if (t === 8 || t === 9 || t === 10) return true;
  if (t === "8" || t === "9" || t === "10") return true;
  return false;
}

/** Blocks the AI should fill (text, audio, quiz — not image/divider/space). */
function isAiFillableBlock(block) {
  const t = block.type;
  if (t === "image" || t === "divider" || t === "space" || t === 6 || t === 11 || t === 12)
    return false;
  if (typeof t === "string" && /^\d+$/.test(t)) {
    const n = parseInt(t, 10);
    return [0, 1, 2, 3, 4, 5, 7, 8, 9, 10].includes(n);
  }
  if (typeof t === "string") {
    return [
      "header1",
      "header2",
      "header3",
      "text",
      "quote",
      "example",
      "hiddenText",
      "audio",
      "quizSingleSelect",
      "quizMultiSelect",
      "quizTextAnswer",
    ].includes(t);
  }
  if (typeof t === "number") return [0, 1, 2, 3, 4, 5, 7, 8, 9, 10].includes(t);
  return false;
}

function jsonFragmentForBlock(block) {
  const id = block.blockId;
  const t = block.type;
  if (t === "audio" || t === 7 || t === "7") return `"${id}":"<text to speak>"`;
  if (t === "quizSingleSelect" || t === 9 || t === "9") {
    return `"${id}":{"question":"<question>","options":["<opt1>","<opt2>","<opt3>","<opt4>"],"correctIndex":0}`;
  }
  if (t === "quizMultiSelect" || t === 8 || t === "8") {
    return `"${id}":{"question":"<question>","options":["<a>","<b>","<c>","<d>"],"correctIndices":[0,2]}`;
  }
  if (t === "quizTextAnswer" || t === 10 || t === "10") {
    return `"${id}":{"question":"<question>","correctAnswer":"<expected answer>"}`;
  }
  return `"${id}":"<content>"`;
}

function blockListLine(block) {
  const label = blockTypeLabel(block);
  const face = effectiveTemplateFace(block) === "back" ? "Back" : "Front";
  const t = block.type;
  if (t === "audio" || t === 7 || t === "7") {
    return `- [${face}] ${block.blockId} (${label}): string — text to speak for this card`;
  }
  if (t === "quizSingleSelect" || t === 9 || t === "9") {
    return `- [${face}] ${block.blockId} (${label}): object — {"question":"...","options":["≥2 strings"],"correctIndex":0} (0-based index of the one correct option). Alternatively use "correctAnswer":"exact option text" instead of correctIndex.`;
  }
  if (t === "quizMultiSelect" || t === 8 || t === "8") {
    return `- [${face}] ${block.blockId} (${label}): object — {"question":"...","options":["≥2 strings"],"correctIndices":[0,2]} (0-based indices of all correct options). Alternatively "correctAnswers":["opt text",...] matching option strings exactly.`;
  }
  if (t === "quizTextAnswer" || t === 10 || t === "10") {
    return `- [${face}] ${block.blockId} (${label}): object — {"question":"...","correctAnswer":"..."} (correctAnswer = text the learner must type; optional "hint":"..." ).`;
  }
  return `- [${face}] ${block.blockId} (${label}): string — block content`;
}

const QUIZ_RULES = ` Quiz blocks: nested JSON objects only (never a string for those keys).`;

/** Normalize block type to canonical quiz type string or null. */
function normalizeQuizType(block) {
  const t = block.type;
  if (t === "quizSingleSelect" || t === 9 || t === "9") return "quizSingleSelect";
  if (t === "quizMultiSelect" || t === 8 || t === "8") return "quizMultiSelect";
  if (t === "quizTextAnswer" || t === 10 || t === "10") return "quizTextAnswer";
  return null;
}

/** Per-type quiz instruction lines (only include types present in blocks). */
const QUIZ_INSTRUCTIONS = {
  quizSingleSelect:
    'Single-choice: "question" (string), "options" (≥2 strings), and "correctIndex" (0-based) OR "correctAnswer" (exact option text).',
  quizMultiSelect:
    'Multi-choice: "question", "options" (≥2), and "correctIndices" (0-based array) OR "correctAnswers" (strings matching options).',
  quizTextAnswer:
    'Text answer: "question" and "correctAnswer" (short, gradable). Optional "hint".',
};

/** Build quiz section body with only instructions for quiz types present in blocks. */
function buildQuizPromptBody(blocksForList) {
  const quizBlocks = blocksForList.filter(isQuizBlock);
  if (quizBlocks.length === 0) return "";
  const typesPresent = new Set(quizBlocks.map(normalizeQuizType).filter(Boolean));
  const lines = [
    "Quiz blocks — value MUST be a JSON object (never a quoted string):",
    "- For every block marked \"object\" above, use a nested object.",
  ];
  if (typesPresent.has("quizSingleSelect")) lines.push(`- ${QUIZ_INSTRUCTIONS.quizSingleSelect}`);
  if (typesPresent.has("quizMultiSelect")) lines.push(`- ${QUIZ_INSTRUCTIONS.quizMultiSelect}`);
  if (typesPresent.has("quizTextAnswer")) lines.push(`- ${QUIZ_INSTRUCTIONS.quizTextAnswer}`);
  if (typesPresent.has("quizSingleSelect") || typesPresent.has("quizMultiSelect")) {
    lines.push("- Write plausible distractors; do not mark the correct answer in the question text.");
  }
  return lines.join("\n");
}

/** Describe which AI block types we're generating (for import prompt). */
function importAiTaskDescription(blocks) {
  const hasAudio = blocks.some((b) => b.type === "audio" || b.type === 7 || b.type === "7");
  const quizTypes = new Set(blocks.filter(isQuizBlock).map(normalizeQuizType).filter(Boolean));
  const parts = [];
  if (quizTypes.has("quizSingleSelect")) parts.push("single-choice quiz");
  if (quizTypes.has("quizMultiSelect")) parts.push("multi-choice quiz");
  if (quizTypes.has("quizTextAnswer")) parts.push("text-answer quiz");
  if (hasAudio) parts.push("audio (text to speak)");
  if (parts.length === 0) return "quiz and audio";
  return parts.join(" and ");
}


/**
 * Builds the AI prompt with exactly four inputs from the deck:
 * 1. Deck title and description (theme)
 * 2. Deck template (blocks to fill)
 * 3. Example cards from the deck (style/content to match)
 * 4. Avoid list (existing main/front phrases in this deck — do not duplicate)
 *
 * @param {Object} opts
 * @param {string} opts.deckTitle
 * @param {string} [opts.deckDescription]
 * @param {{ blockId: string, type: string|number, label: string }[]} opts.templateBlocks
 * @param {Record<string, string>[]} opts.exampleCards - each item is blockId -> text (or serialized quiz summary)
 * @param {number} [opts.count=1] - number of different cards to generate (1-5)
 * @param {string|null} [opts.mainBlockId] - template's main (e.g. front) block id
 * @param {string|null} [opts.subBlockId] - template's sub (e.g. back) block id
 * @param {string|null} [opts.mainBlockLabel] - label for main block
 * @param {string|null} [opts.subBlockLabel] - label for sub block
 * @param {string[]} [opts.avoidMainPhrases] - existing main/front phrases in this deck; do not generate duplicates
 * @param {string} [opts.exampleCardsLabel] - section label for examples (e.g. "Reference cards (selected for style examples):")
 * @returns {{ system: string, user: string }}
 */
export function buildCardPrompt({
  deckTitle,
  deckDescription,
  templateBlocks,
  exampleCards,
  count = 1,
  mainBlockId = null,
  subBlockId = null,
  mainBlockLabel = null,
  subBlockLabel = null,
  avoidMainPhrases = [],
  exampleCardsLabel = "Example cards from this deck:",
}) {
  const numCards = Math.min(5, Math.max(1, Number(count) || 1));
  templateBlocks.forEach((b, i) => {
    console.log("[buildCardPrompt] block", i, {
      blockId: b.blockId?.slice(0, 8),
      type: b.type,
      typeOf: typeof b.type,
      isAiFillable: isAiFillableBlock(b),
    });
  });
  const aiBlocks = templateBlocks.filter(isAiFillableBlock);
  console.log("[buildCardPrompt] aiBlocks", { total: templateBlocks.length, fillable: aiBlocks.length, dropped: templateBlocks.length - aiBlocks.length });
  const blocksForList = aiBlocks.length ? aiBlocks : templateBlocks;
  const blocksForListSorted = sortBlocksByFace(blocksForList);
  const blockList = blocksForListSorted.map(blockListLine).join("\n");
  const hasQuiz = blocksForListSorted.some(isQuizBlock);
  const hasBackFace = templateBlocks.some((b) => effectiveTemplateFace(b) === "back");
  const studyFaceNote = hasBackFace
    ? "\nFace layout: [Front] blocks are shown first in study; [Back] blocks appear after the learner flips the card. Generate appropriate content for each face."
    : "";

  const mainIsQuiz =
    mainBlockId &&
    templateBlocks.some((b) => b.blockId === mainBlockId && isQuizBlock(b));
  const subIsQuiz =
    subBlockId &&
    templateBlocks.some((b) => b.blockId === subBlockId && isQuizBlock(b));

  const mainSubHint =
    (mainBlockId || subBlockId) && numCards > 1
      ? `\nPrimary fields: main block ${mainBlockId || "—"}${mainBlockLabel ? ` (${mainBlockLabel})` : ""}${mainIsQuiz ? " (quiz — use a different question each card)" : ""}; sub block ${subBlockId || "—"}${subBlockLabel ? ` (${subBlockLabel})` : ""}${subIsQuiz ? " (quiz — vary questions/answers)" : ""}. Use [Front]/[Back] labels above to place content on the correct face. Each card must be clearly different — do not repeat the same prompts or answers across cards.`
      : "";

  const mainSubHintSingle =
    mainBlockId || subBlockId
      ? ` Main block: ${mainBlockId || "—"}${mainBlockLabel ? ` (${mainBlockLabel})` : ""}${mainIsQuiz ? " (quiz object)" : ""}. Sub block: ${subBlockId || "—"}${subBlockLabel ? ` (${subBlockLabel})` : ""}${subIsQuiz ? " (quiz object)" : ""}. Match content to [Front]/[Back] in the list above.`
      : "";

  const avoidSection =
    avoidMainPhrases.length > 0
      ? hasQuiz
        ? `Avoid list (do not duplicate these main/front items — for text blocks: phrases; for quiz main: question text):\n${avoidMainPhrases.map((p) => `- ${p}`).join("\n")}`
        : `Avoid list (do not duplicate these main/front phrases in this deck):\n${avoidMainPhrases.map((p) => `- ${p}`).join("\n")}`
      : "Avoid list: none yet (this deck has no cards, or no main block text to avoid).";

  const jsonExampleOne =
    blocksForListSorted.length > 0
      ? `{${blocksForListSorted.map(jsonFragmentForBlock).join(", ")}}`
      : "{}";
  const jsonExampleArr =
    numCards > 1
      ? `[${Array.from({ length: Math.min(2, numCards) }, () => jsonExampleOne).join(", ")}]`
      : jsonExampleOne;

  const examplesText =
    exampleCards.length > 0
      ? exampleCards
          .slice(0, 5)
          .map((card, i) => {
            const parts = blocksForListSorted.map((b) => {
              const blockId = b.blockId;
              const t = card[blockId];
              const s = t != null ? String(t).trim() : "";
              const display = s ? s.slice(0, 240) : "(empty)";
              const face = effectiveTemplateFace(b) === "back" ? "B" : "F";
              return `[${face}] ${blockId}: ${display}`;
            });
            return `Card ${i + 1}: ${parts.join(" | ")}`;
          })
          .join("\n")
      : "No example cards yet.";

  const valueRules = hasQuiz
    ? `Each key is a blockId. String values for text and audio blocks; object values for every quiz block (nested JSON — see user message section 5).${QUIZ_RULES}`
    : `Each key = blockId, value = string content. For audio blocks give the text to speak.`;

  const system =
    numCards === 1
      ? `You are a flashcard generator. Given a deck's theme and a template (list of blocks), output exactly one new card. Return only a JSON object. Use the exact blockIds from the template as keys (UUIDs), not words like "front". ${valueRules} No markdown, no code fence, no explanation.`
      : `You are a flashcard generator. Given a deck's theme and a template, output exactly ${numCards} different new cards. Use exact blockIds as keys. ${valueRules} Each card must be distinct. Return only a JSON array of ${numCards} objects. No markdown, no code fence, no explanation.`;

  const quizSec = hasQuiz ? `\n5) ${buildQuizPromptBody(blocksForListSorted)}\n` : "";
  const genStepNum = hasQuiz ? 6 : 5;
  const genLineSingle = `${genStepNum})`;
  const genLineMulti = `${genStepNum})`;

  const user =
    numCards === 1
      ? `1) Deck title and description:
Deck title: ${deckTitle}
${deckDescription ? `Deck description: ${deckDescription}` : "(no description)"}

2) Deck template (generate content for these blocks):${studyFaceNote}
${blockList}
${mainSubHintSingle}

3) ${exampleCardsLabel}
${examplesText}

4) ${avoidSection}
${quizSec}
${genLineSingle} Your task: Generate one new card in the same style. Return only a JSON object. You must include every blockId from section 2 as a key (use empty string \"\" for blocks you leave blank). Example shape: ${jsonExampleOne}`
      : `1) Deck title and description:
Deck title: ${deckTitle}
${deckDescription ? `Deck description: ${deckDescription}` : "(no description)"}

2) Deck template (generate content for these blocks):${studyFaceNote}
${blockList}
${mainSubHint}

3) ${exampleCardsLabel}
${examplesText}

4) ${avoidSection}
${quizSec}
${genLineMulti} Your task: Generate ${numCards} different new cards in the same style. Return only a JSON array of ${numCards} objects. Each object must include every blockId from section 2 as a key (use \"\" for blank blocks). Example shape: ${jsonExampleArr}`;

  return { system, user };
}

/**
 * Build prompt for Generate from doc/img (file-to-AI). Content is extracted from
 * the user's document (PDF, Word, etc.) — not a table. AI maps the document
 * content to the template and fills all blocks (text, quiz, audio) per card.
 *
 * @param {Object} opts
 * @param {string} opts.extractedContent - Text extracted from the document
 * @param {{ blockId: string, type: string|number, label: string }[]} opts.templateBlocks
 * @param {number} [opts.maxCards=15]
 * @param {string} [opts.deckTitle]
 * @returns {{ system: string, user: string }}
 */
export function buildCardPromptFromContent({
  extractedContent,
  templateBlocks,
  maxCards = 15,
  deckTitle = "",
  exampleCards = [],
  avoidMainPhrases = [],
  exampleCardsLabel = "Reference cards (style examples):",
}) {
  console.log("[buildCardPromptFromContent] templateBlocks", templateBlocks?.length, templateBlocks?.map((b) => ({ blockId: b.blockId?.slice(0, 8), type: b.type, typeOf: typeof b.type, isAiFillable: isAiFillableBlock(b) })));
  const numCards = Math.min(30, Math.max(1, Number(maxCards) || 15));
  const aiBlocks = templateBlocks.filter(isAiFillableBlock);
  console.log("[buildCardPromptFromContent] aiBlocks after filter", aiBlocks?.length, aiBlocks?.map((b) => ({ blockId: b.blockId?.slice(0, 8), type: b.type, label: b.label?.slice(0, 15) })));
  const blocks = aiBlocks.length ? aiBlocks : templateBlocks;
  const blocksSorted = sortBlocksByFace(blocks);
  const blockList = blocksSorted.map(blockListLine).join("\n");
  const hasQuiz = blocksSorted.some(isQuizBlock);
  const hasAudio = blocks.some((b) => b.type === "audio" || b.type === 7 || b.type === "7");
  const jsonExampleOne =
    blocksSorted.length > 0 ? `{${blocksSorted.map(jsonFragmentForBlock).join(", ")}}` : "{}";
  const jsonExample =
    `[${Array.from({ length: Math.min(2, numCards) }, () => jsonExampleOne).join(", ")}]`;

  const hasExamples = exampleCards.length > 0 || avoidMainPhrases.length > 0;
  const examplesSection =
    exampleCards.length > 0
      ? `\n3) ${exampleCardsLabel}\n${exampleCards.map((o, i) => `Card ${i + 1}: ${JSON.stringify(o)}`).join("\n\n")}\n`
      : "";
  const avoidSection =
    avoidMainPhrases.length > 0
      ? `\n${exampleCards.length > 0 ? "4" : "3"}) Avoid duplicating these main/front phrases already in the deck:\n${avoidMainPhrases.map((p) => `- ${p}`).join("\n")}\n`
      : "";
  const docSectionNum = hasExamples ? (avoidMainPhrases.length > 0 ? "5" : "4") : "3";
  const quizSectionNum = hasQuiz ? (hasExamples ? (avoidMainPhrases.length > 0 ? "6" : "5") : "4") : null;
  const lastStepNum = hasQuiz ? (hasExamples ? (avoidMainPhrases.length > 0 ? "7" : "6") : "5") : (hasExamples ? (avoidMainPhrases.length > 0 ? "5" : "4") : "4");
  const hasBackFaceDoc = templateBlocks.some((b) => effectiveTemplateFace(b) === "back");
  const studyFaceNoteDoc = hasBackFaceDoc
    ? "\nFace layout: [Front] first in study, [Back] after flip. "
    : "";

  let valueRules;
  if (hasQuiz) {
    valueRules = `Map the document content to every template block. For text blocks use the relevant excerpt or summary; for quiz blocks use nested objects (question, options, correct answer — see section ${quizSectionNum}); for audio blocks use the string to speak.${hasExamples ? " Match the style of the reference cards when provided." : ""}${QUIZ_RULES}`;
  } else if (hasAudio) {
    valueRules = `Map the document content to every template block. For text blocks use the relevant excerpt; for audio blocks use the string to speak.${hasExamples ? " Match the style of the reference cards when provided." : ""}`;
  } else {
    valueRules = `Map the document content to every template block. Fill each block with the relevant part of the content (use \"\" only if nothing fits).${hasExamples ? " Match the style of the reference cards when provided." : ""}`;
  }

  const system = `You are a flashcard generator. You receive (1) a template with blockIds and labels, and (2) content extracted from the user's document (e.g. PDF or Word). Your task is to map this document content to the template and generate up to ${numCards} cards. Fill every block from the content: text blocks with relevant excerpts, quiz blocks with question/options/correct answer, audio blocks with text to speak. ${hasExamples ? "When reference cards are provided, match their style and structure. " : ""}Output a JSON array of objects. ${valueRules} Return only JSON. No markdown, no code fence. Use exact blockIds (UUIDs). Each object must include every blockId.`;

  const quizSec = hasQuiz ? `\n${quizSectionNum}) ${buildQuizPromptBody(blocksSorted)}\n` : "";
  const lastStep = lastStepNum;

  const user = `1) Template:${studyFaceNoteDoc}
${blockList}

2) Deck context: ${deckTitle || "(untitled)"}
${examplesSection}${avoidSection}
${docSectionNum}) Document content below (extracted from the user's file). Map this content to the template and generate up to ${numCards} cards. Fill every block from the content.
---
${(extractedContent || "").trim().slice(0, 45000)}
---
${quizSec}
${lastStep}) Generate up to ${numCards} cards. Return a JSON array. Each object: every blockId with content mapped from the document. Example shape: ${jsonExample}`;

  return { system, user };
}

/**
 * Prompt for import "Use AI": generate only quiz and audio block content per row.
 * Caller must pass templateBlocks that are ONLY quiz and audio blocks (no text blocks).
 * Used by POST /api/cards/import-ai-blocks; not used by file-to-ai.
 *
 * @param {Object} opts
 * @param {string} opts.extractedContent - table text (headers + rows)
 * @param {{ blockId: string, type: string|number, label: string }[]} opts.templateBlocks - quiz/audio blocks only
 * @param {number} [opts.maxCards=15]
 * @param {string} [opts.deckTitle]
 * @returns {{ system: string, user: string }}
 */
export function buildImportQuizAudioPrompt({
  extractedContent,
  templateBlocks,
  maxCards = 15,
  deckTitle = "",
}) {
  const numCards = Math.min(30, Math.max(1, Number(maxCards) || 15));
  const blocks = templateBlocks.filter(
    (b) => isQuizBlock(b) || b.type === "audio" || b.type === 7 || b.type === "7"
  );
  if (blocks.length === 0) {
    return {
      system: "Return a JSON array of empty objects.",
      user: "No quiz or audio blocks. Return [].",
    };
  }
  const blocksSorted = sortBlocksByFace(blocks);
  const blockList = blocksSorted.map(blockListLine).join("\n");
  const hasQuiz = blocksSorted.some(isQuizBlock);
  const hasAudio = blocks.some((b) => b.type === "audio" || b.type === 7 || b.type === "7");
  const taskDesc = importAiTaskDescription(blocksSorted);
  const jsonExampleOne =
    `{${blocksSorted.map(jsonFragmentForBlock).join(", ")}}`;
  const jsonExample =
    `[${Array.from({ length: Math.min(2, numCards) }, () => jsonExampleOne).join(", ")}]`;

  let valueRules;
  if (hasQuiz && hasAudio) {
    valueRules = `Nested objects for quiz blocks (see section 4). String for audio (text to speak).${QUIZ_RULES}`;
  } else if (hasQuiz) {
    valueRules = `Nested objects for quiz blocks only (see section 4).${QUIZ_RULES}`;
  } else {
    valueRules = "Audio blocks: string (text to speak for this card).";
  }

  const system = `You are a flashcard generator. You receive (1) a table and (2) block IDs for ${taskDesc} only. The user maps table columns to text blocks elsewhere. Your task is to generate only ${taskDesc} content for each row (one card per row). Output up to ${numCards} cards as a JSON array of objects. Each object has only these blockIds. ${valueRules} Return only JSON. No markdown, no code fence. Use exact blockIds (UUIDs).`;

  const quizSec = hasQuiz ? `\n4) ${buildQuizPromptBody(blocksSorted)}\n` : "";
  const lastStep = hasQuiz ? "5)" : "4)";
  const generateInstruction = hasQuiz && !hasAudio
    ? `Generate ${numCards} cards. One card per row. For each row output one object with the quiz block(s) above (question, options, correct index/answer).`
    : hasAudio && !hasQuiz
      ? `Generate ${numCards} cards. One card per row. For each row output one object with the audio block(s) above (string = text to speak).`
      : `Generate ${numCards} cards. One card per row. For each row output one object with the blockIds above (quiz = object, audio = string).`;

  const hasBackImport = templateBlocks.some((b) => effectiveTemplateFace(b) === "back");
  const faceNoteImport = hasBackImport
    ? "\nFace layout: [Front] blocks first in study, [Back] after flip. "
    : "";

  const user = `1) Blocks to generate (${taskDesc}):${faceNoteImport}
${blockList}

2) Deck context: ${deckTitle || "(untitled)"}

3) Table data below (one row = one card). Generate only the block(s) listed in section 1 for each row.
---
${(extractedContent || "").trim().slice(0, 45000)}
---
${quizSec}
${lastStep} ${generateInstruction} Return a JSON array. Each object has only the blockIds above. Example shape: ${jsonExample}`;

  return { system, user };
}

/**
 * Same as file-to-text prompt but for an attached image (Claude vision).
 */
export function buildCardPromptFromImage({
  templateBlocks,
  maxCards = 15,
  deckTitle = "",
  exampleCards = [],
  avoidMainPhrases = [],
  exampleCardsLabel = "Reference cards (style examples):",
}) {
  console.log("[buildCardPromptFromImage] templateBlocks", templateBlocks?.length, templateBlocks?.map((b) => ({ blockId: b.blockId?.slice(0, 8), type: b.type, typeOf: typeof b.type, isAiFillable: isAiFillableBlock(b) })));
  const numCards = Math.min(30, Math.max(1, Number(maxCards) || 15));
  const aiBlocks = templateBlocks.filter(isAiFillableBlock);
  console.log("[buildCardPromptFromImage] aiBlocks after filter", aiBlocks?.length, aiBlocks?.map((b) => ({ blockId: b.blockId?.slice(0, 8), type: b.type, label: b.label?.slice(0, 15) })));
  const blocks = aiBlocks.length ? aiBlocks : templateBlocks;
  const blocksSorted = sortBlocksByFace(blocks);
  const blockList = blocksSorted.map(blockListLine).join("\n");
  const hasQuiz = blocksSorted.some(isQuizBlock);
  const hasAudio = blocks.some((b) => b.type === "audio" || b.type === 7 || b.type === "7");
  const jsonExampleOne =
    blocksSorted.length > 0 ? `{${blocksSorted.map(jsonFragmentForBlock).join(", ")}}` : "{}";
  const jsonExample =
    `[${Array.from({ length: Math.min(2, numCards) }, () => jsonExampleOne).join(", ")}]`;

  const hasExamples = exampleCards.length > 0 || avoidMainPhrases.length > 0;
  const examplesSection =
    exampleCards.length > 0
      ? `\n3) ${exampleCardsLabel}\n${exampleCards.map((o, i) => `Card ${i + 1}: ${JSON.stringify(o)}`).join("\n\n")}\n`
      : "";
  const avoidSection =
    avoidMainPhrases.length > 0
      ? `\n${exampleCards.length > 0 ? "4" : "3"}) Avoid duplicating these main/front phrases already in the deck:\n${avoidMainPhrases.map((p) => `- ${p}`).join("\n")}\n`
      : "";
  const imageSectionNum = hasExamples ? (avoidMainPhrases.length > 0 ? "5" : "4") : "3";
  const quizSectionNum = hasQuiz ? (hasExamples ? (avoidMainPhrases.length > 0 ? "6" : "5") : "4") : null;
  const lastStepNum = hasQuiz ? (hasExamples ? (avoidMainPhrases.length > 0 ? "7" : "6") : "5") : (hasExamples ? (avoidMainPhrases.length > 0 ? "5" : "4") : "4");
  const hasBackFaceImg = templateBlocks.some((b) => effectiveTemplateFace(b) === "back");
  const studyFaceNoteImg = hasBackFaceImg
    ? "\nFace layout: [Front] first in study, [Back] after flip. "
    : "";

  let valueRules = "Each key = blockId, value = string.";
  if (hasQuiz) {
    valueRules = `String values for text/audio; nested objects for quiz blocks (see section ${quizSectionNum}).${hasExamples ? " Match the style of the reference cards when provided." : ""}${QUIZ_RULES}`;
  } else if (hasAudio) {
    valueRules = `Each key = blockId, value = string. For audio blocks provide spoken text as a string.${hasExamples ? " Match the style of the reference cards when provided." : ""}`;
  } else if (hasExamples) {
    valueRules += " Match the style of the reference cards when provided.";
  }

  const system = `You are a flashcard generator. You receive (1) a template and (2) an image. Read all visible text, diagrams, and key concepts in the image. MAP them to template fields. ${hasExamples ? "When reference cards are provided, match their style and structure. " : ""}Output up to ${numCards} cards as a JSON array of objects. ${valueRules} Return only JSON. No markdown, no code fence. Use exact blockIds (UUIDs).`;

  const quizSec = hasQuiz ? `\n${quizSectionNum}) ${buildQuizPromptBody(blocksSorted)}\n` : "";
  const lastStep = lastStepNum;

  const user = `1) Template:${studyFaceNoteImg}
${blockList}

2) Deck context: ${deckTitle || "(untitled)"}
${examplesSection}${avoidSection}
${imageSectionNum}) Analyze the attached image and generate up to ${numCards} flashcards from its content.
${quizSec}
${lastStepNum}) Return a JSON array. Example shape: ${jsonExample}`;

  return { system, user };
}
