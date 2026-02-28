/**
 * Build prompt for AI card generation.
 * Template-driven: only "front" (and any other blocks) — no "back" assumption.
 */

const TEXT_OR_AUDIO_NAMES = new Set([
  "header1", "header2", "header3", "text", "example", "hiddenText", "audio",
]);
const BLOCK_TYPE_NAMES = [
  "header1", "header2", "header3", "text", "quote", "hiddenText", "image", "audio",
  "quizMultiSelect", "quizSingleSelect", "quizTextAnswer", "divider", "space",
];

function isContentBlock(block) {
  const t = block.type;
  if (typeof t === "string") return TEXT_OR_AUDIO_NAMES.has(t);
  if (typeof t === "number" && t >= 0 && t <= 12)
    return [0, 1, 2, 3, 4, 5, 6, 7].includes(t);
  return false;
}

/**
 * @param {Object} opts
 * @param {string} opts.deckTitle
 * @param {string} [opts.deckDescription]
 * @param {{ blockId: string, type: string|number, label: string }[]} opts.templateBlocks
 * @param {Record<string, string>[]} opts.exampleCards - each item is blockId -> text
 * @param {number} [opts.count=1] - number of different cards to generate (1-5)
 * @param {string|null} [opts.mainBlockId] - template's main (e.g. front) block id
 * @param {string|null} [opts.subBlockId] - template's sub (e.g. back) block id
 * @param {string|null} [opts.mainBlockLabel] - label for main block
 * @param {string|null} [opts.subBlockLabel] - label for sub block
 * @param {string[]} [opts.avoidMainPhrases] - existing main/front phrases to not duplicate
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
}) {
  const numCards = Math.min(5, Math.max(1, Number(count) || 1));
  const contentBlocks = templateBlocks.filter(isContentBlock);
  const isAudio = (b) => b.type === "audio" || b.type === 7;
  const blockList = (contentBlocks.length ? contentBlocks : templateBlocks)
    .map((b) => `- ${b.blockId} (${b.label || (typeof b.type === "number" ? BLOCK_TYPE_NAMES[b.type] : b.type)}): ${isAudio(b) ? "text to speak for this card" : "content"}`)
    .join("\n");

  const mainSubHint =
    (mainBlockId || subBlockId) && numCards > 1
      ? `\nThe template's main/front field is ${mainBlockId || "—"}${mainBlockLabel ? ` (${mainBlockLabel})` : ""}; the sub/back field is ${subBlockId || "—"}${subBlockLabel ? ` (${subBlockLabel})` : ""}. Each card must have different content in these fields — do not repeat the same main or sub text.`
      : "";

  const mainSubHintSingle =
    mainBlockId || subBlockId
      ? ` Main/front field: ${mainBlockId || "—"}${mainBlockLabel ? ` (${mainBlockLabel})` : ""}. Sub/back field: ${subBlockId || "—"}${subBlockLabel ? ` (${subBlockLabel})` : ""}.`
      : "";

  const avoidText =
    avoidMainPhrases.length > 0
      ? `\n\nDo NOT generate a card whose main/front content is the same as or very similar to any of these existing phrases (generate something different):\n${avoidMainPhrases.map((p) => `- ${p}`).join("\n")}`
      : "";

  const blockIdKeys = contentBlocks.length ? contentBlocks.map((b) => b.blockId) : templateBlocks.map((b) => b.blockId);
  const jsonExampleOne = blockIdKeys.length > 0 ? `{${blockIdKeys.map((id) => `"${id}":"<content>"`).join(", ")}}` : "{}";
  const jsonExampleArr = numCards > 1 ? `[${Array.from({ length: Math.min(2, numCards) }, () => jsonExampleOne).join(", ")}]` : jsonExampleOne;

  const examplesText =
    exampleCards.length > 0
      ? exampleCards
          .slice(0, 5)
          .map((card, i) => {
            const parts = Object.entries(card)
              .filter(([, t]) => t != null && String(t).trim())
              .map(([k, t]) => `${k}: ${String(t).trim().slice(0, 200)}`);
            return `Card ${i + 1}: ${parts.join(" | ")}`;
          })
          .join("\n")
      : "No example cards yet.";

  const system =
    numCards === 1
      ? `You are a flashcard generator. Given a deck's theme and a template (list of blocks), output exactly one new card. Return only a JSON object. Use the exact blockIds from the template as the JSON keys (the UUIDs like c2f060ac-a40c-4acc-bc9e-e8f23efe46ae), not words like "front" or "audio". Each key = blockId, value = string content. No markdown, no code fence, no explanation. For audio block use that blockId and give the text to speak.`
      : `You are a flashcard generator. Given a deck's theme and a template (list of blocks), output exactly ${numCards} different new cards. Use the exact blockIds from the template as the JSON keys (the UUIDs), not words like "front" or "audio". Each card must have distinct content — do not repeat the same phrase, main text, or sub text. Return only a JSON array of ${numCards} objects: each object has one key per block (key = blockId, value = string content). No markdown, no code fence, no explanation. For audio blocks use that blockId and give the text to speak.`;

  const user =
    numCards === 1
      ? `Deck title: ${deckTitle}
${deckDescription ? `Deck description: ${deckDescription}` : ""}

Template blocks (generate content for these):
${blockList}
${mainSubHintSingle}

Example cards from this deck:
${examplesText}
${avoidText}

Generate one new card in the same style. Return only a JSON object. Your keys must be the exact blockIds from the template above (the UUIDs). Example format: ${jsonExampleOne}`
      : `Deck title: ${deckTitle}
${deckDescription ? `Deck description: ${deckDescription}` : ""}

Template blocks (generate content for these):
${blockList}
${mainSubHint}

Example cards from this deck:
${examplesText}
${avoidText}

Generate ${numCards} different new cards in the same style. Each card must be clearly different: different main/front and sub/back content — do not duplicate. Return only a JSON array of ${numCards} objects. Your keys in each object must be the exact blockIds from the template above (the UUIDs). Example format: ${jsonExampleArr}`;

  return { system, user };
}
