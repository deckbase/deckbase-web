# Add Card with AI – Feature Plan

## Summary

**Goal:** Let users generate a new flashcard using AI, with:
- **Deck context:** deck title and optional description (and optionally override in the UI)
- **Existing cards:** used as examples so the AI matches topic, style, and difficulty
- **Template:** defines the card format (which blocks: front, back, audio, etc.) so the output fits the template

**Feasibility:** Yes. You already have Anthropic (Wizard), deck/card/template data, and createCard. This feature is a new API + UI that composes them.

---

## 1. Data flow

| Input | Source | Purpose |
|-------|--------|--------|
| Deck title | Deck (or user override) | Tells AI the topic/subject |
| Deck description | Deck (optional, or override) | Extra context (e.g. "English vocabulary for travel") |
| Existing cards | Up to N cards from the same deck | Examples for style, level, and format |
| Template | User-selected or deck default | Block structure (blockId, type, label) and which blocks need text |

**Output:** One new card: `blocksSnapshot` from template + `values` (blockId → text) from AI. Optionally open in card editor for review before saving.

---

## 2. API: Generate card content

**Endpoint:** `POST /api/cards/generate-with-ai`

**Request body:**
```json
{
  "deckId": "uuid",
  "templateId": "uuid",
  "deckTitleOverride": "optional",
  "deckDescriptionOverride": "optional",
  "contextCardLimit": 5
}
```

**Server flow:**
1. Resolve deck (title, description), optionally overridden by request.
2. Load template (blocks: blockId, type, label); identify “text” blocks (header1, header2, text, example, hiddenText, etc.).
3. Load up to `contextCardLimit` cards from the deck; for each, extract text per block (or at least main/sub) for the prompt.
4. Build prompt:
   - Deck: title, description.
   - Template: list of blocks that need content, e.g. “Block ‘front’ (Header 1), Block ‘back’ (Text), Block ‘audio’ (Audio – provide text to speak).”
   - Example cards: 2–5 cards as “Front: … Back: …” (or per-block if simple).
   - Instruction: “Generate one new card. Return only valid JSON: { \"blockId\": \"content\", ... } for each block that has text. For audio block use key ‘audio’ and give the text to speak.”
5. Call Anthropic (e.g. Claude), parse JSON from response.
6. Map response to template blocks: build `values` array (blockId, type, text; audio block gets text only, no mediaIds yet).
7. Return `{ blocksSnapshot, values }` (and optionally `templateId`). Client can create the card or open editor with this payload.

**Dependencies:** `ANTHROPIC_API_KEY`. No auth in the plan; you can add auth (e.g. require Firebase ID token or session) in the same route.

---

## 3. Prompt design (sketch)

**System:**  
You are a flashcard generator. Given a deck’s theme, a template (list of blocks), and example cards, output exactly one new card. Return only a JSON object with one key per block that has text content; key = blockId, value = string content. No markdown, no explanation.

**User (example):**
```
Deck title: Travel vocabulary
Deck description: Common English words and phrases for travel.

Template blocks (generate content for these):
- front (Header 1): one short phrase or term
- back (Text): definition or translation, 1–2 sentences
- audio (Audio): same as back, or phrase to speak

Example cards from this deck:
1. Front: book a flight  Back: To reserve a seat on an airplane.  Audio: To reserve a seat on an airplane.
2. Front: boarding pass  Back: Document that allows you to board the plane.  Audio: Document that allows you to board the plane.

Generate one new card in the same style. Return only JSON, e.g. {"front":"...","back":"...","audio":"..."}.
```

**Response handling:** Parse JSON, validate keys against template blockIds, default missing blocks to `""`. For quiz blocks (single/multi choice, text answer), v1 can skip or ask AI for a simple JSON shape (e.g. question + options + correct index) and map later.

---

## 4. UI (web)

**Entry:** Deck detail page → button “Add card with AI” (next to “Add Card”).

**Flow:**
1. **Modal or slide-over** (or small page):
   - Deck title / description: pre-filled from deck; optional editable overrides.
   - Template: dropdown of user’s templates (default = first or “Basic”); shows block list.
   - Optional: “Number of example cards” (e.g. 3 / 5 / 10).
   - Button: “Generate card”.
2. **Loading:** Call `POST /api/cards/generate-with-ai`; show spinner.
3. **Result:**
   - **Option A:** Create card immediately with `createCard(uid, deckId, blocksSnapshot, values, templateId)` and show success + link to edit or to deck.
   - **Option B (recommended):** Open card editor with `blocksSnapshot` and `values` pre-filled (e.g. navigate to `/deck/.../card/new` with state or query, or a dedicated “preview” route that then saves). User can edit and click Save.

**Recommendation:** Option B so the user can fix the AI output and add audio (TTS) if the template has an audio block.

---

## 5. Template and block handling

- **Text blocks (header1, header2, header3, text, example, hiddenText):** AI returns one string per blockId; map to `value.text`.
- **Audio block:** AI returns text to speak; store in `value.text` or a dedicated field; client can later run “Generate audio” (ElevenLabs) from that text.
- **Image block:** Leave empty or skip in v1.
- **Quiz blocks:** v1 can skip (no AI output) or add a second prompt/response shape later; leave configJson empty or default.

Block type list can live in shared config (e.g. `blockTypes.js` or template’s block definitions) so the API knows which blocks need text.

---

## 6. Implementation order

| Step | Task | Notes |
|------|------|--------|
| 1 | **Shared:** List of “text” block types + optional “audio text” block | Used by API and prompt builder |
| 2 | **API** `POST /api/cards/generate-with-ai` | Fetch deck, template, cards; build prompt; call Anthropic; return { blocksSnapshot, values } |
| 3 | **API** Prompt builder: deck + template blocks + example cards → user message | Keep under token limit (e.g. 5 cards, truncate long text) |
| 4 | **Web** Deck page: “Add card with AI” button | Opens modal or navigates to “generate” flow |
| 5 | **Web** Generate form: deck title/desc (editable), template select, Generate | Call API, handle loading/error |
| 6 | **Web** On success: open card editor with pre-filled data (or create card then redirect to edit) | Reuse existing card editor; pass initial state (e.g. via location state or a new “draft” card id) |
| 7 | (Optional) Auth on API | Ensure only the deck owner can generate (e.g. require Firebase ID token and verify deckId belongs to user) |

---

## 7. Edge cases

- **Empty deck:** No example cards; prompt uses only deck title/description and template.
- **Deck has no template / template not found:** Use default blocks (e.g. front + back + audio from `DEFAULT_BLOCKS` or a built-in template).
- **AI returns invalid JSON:** Retry once with “Return only valid JSON”; then show error and ask user to try again.
- **Very long deck title/description or cards:** Truncate in the prompt (e.g. 200 chars per card, 500 for deck description).
- **Template with many blocks:** Include all in the prompt; if response is too long, cap number of blocks or tokens.

---

## 8. Out of scope for v1

- Generating images for image blocks.
- Full quiz block generation (question + options + correct).
- Mobile-specific UI (API is reusable from mobile once auth is in place).
- “Generate N cards” in one call (can be a later loop over the same API).

---

## 9. Files to add / touch

| File | Purpose |
|------|--------|
| `lib/card-ai-prompt.js` (or inside route) | Build prompt from deck, template, example cards |
| `app/api/cards/generate-with-ai/route.js` | New API route |
| `app/dashboard/deck/[deckId]/page.js` | Add “Add card with AI” button |
| New modal or page: e.g. `app/dashboard/deck/[deckId]/add-with-ai/page.js` or modal in deck page | Form + call API + redirect to editor with payload |
| `app/dashboard/deck/[deckId]/card/[cardId]/page.js` | Accept initial state (e.g. from router state or query) when opening “new” card with AI-generated content |
| `components/blocks/blockTypes.js` or similar | Export TEXT_BLOCK_TYPES or “blocks that need text” for the API |

This plan is enough to implement the feature end-to-end; you can adjust the prompt or UI details as you build it.
