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
 * @returns {{ system: string, user: string }}
 */
export function buildCardPrompt({ deckTitle, deckDescription, templateBlocks, exampleCards, count = 1 }) {
  const numCards = Math.min(5, Math.max(1, Number(count) || 1));
  const contentBlocks = templateBlocks.filter(isContentBlock);
  const isAudio = (b) => b.type === "audio" || b.type === 7;
  const blockList = (contentBlocks.length ? contentBlocks : templateBlocks)
    .map((b) => `- ${b.blockId} (${b.label || (typeof b.type === "number" ? BLOCK_TYPE_NAMES[b.type] : b.type)}): ${isAudio(b) ? "text to speak for this card" : "content"}`)
    .join("\n");

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
      ? `You are a flashcard generator. Given a deck's theme and a template (list of blocks), output exactly one new card. Return only a JSON object: one key per block that needs content; key = blockId, value = string content. No markdown, no code fence, no explanation. For audio block use that blockId and give the text to speak.`
      : `You are a flashcard generator. Given a deck's theme and a template (list of blocks), output exactly ${numCards} different new cards. Each card must have distinct content — do not repeat the same phrase or idea. Return only a JSON array of ${numCards} objects: each object has one key per block that needs content (key = blockId, value = string content). No markdown, no code fence, no explanation. For audio blocks use that blockId and give the text to speak.`;

  const user =
    numCards === 1
      ? `Deck title: ${deckTitle}
${deckDescription ? `Deck description: ${deckDescription}` : ""}

Template blocks (generate content for these):
${blockList}

Example cards from this deck:
${examplesText}

Generate one new card in the same style. Return only JSON, e.g. {"front":"...","audio":"..."}.
Use the exact blockIds from the template above.`
      : `Deck title: ${deckTitle}
${deckDescription ? `Deck description: ${deckDescription}` : ""}

Template blocks (generate content for these):
${blockList}

Example cards from this deck:
${examplesText}

Generate ${numCards} different new cards in the same style. Each card must be clearly different (different phrases, examples, or angles). Return only a JSON array of ${numCards} objects, e.g. [{"front":"...","audio":"..."},{"front":"...","audio":"..."}]. Use the exact blockIds from the template above.`;

  return { system, user };
}
