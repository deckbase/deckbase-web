# Add Cards with AI – Mobile API

Two-step flow (like the web): the API **generates** card content first; the **client** shows the cards and lets the user choose which to add or cancel. Only when the user confirms does the client call the add endpoint to create cards in Firestore.

**Base URL:** Your deployed Next.js API base (e.g. `https://your-app.com`)

**Auth:** `X-API-Key: <DECKBASE_API_KEY>` (server env). Dashboard API keys are for MCP only; the mobile app uses the shared mobile API key.

---

## Step 1: Generate cards (no creation)

**POST** `/api/mobile/cards/add-with-ai`  
**Headers:** `X-API-Key: <DECKBASE_API_KEY>`, `Content-Type: application/json`

### Request body

| Field        | Type   | Required | Description                                      |
|-------------|--------|----------|--------------------------------------------------|
| `deckId`    | string | Yes      | Deck ID (for context and avoid list)             |
| `templateId`| string | Yes      | Template ID (user’s template)                    |
| `uid`       | string | Yes      | Current user ID (e.g. Firebase Auth UID)         |
| `count`     | number | No       | Number of cards to generate (1–5). Default: 1    |

### Response (200)

Returns generated cards only; **does not create** any cards in Firestore.

```json
{
  "cards": [
    {
      "templateId": "abc-123-template-id",
      "blocksSnapshot": [{ "blockId": "...", "type": 0, "label": "Header 1", "required": false }, "..."],
      "values": [{ "blockId": "...", "type": "header1", "text": "break the ice" }, { "blockId": "...", "type": "hiddenText", "text": "to start a conversation..." }, "..."],
      "mainBlockId": "...",
      "subBlockId": "..."
    }
  ]
}
```

- **cards:** Array of card payloads ready to be added. Each has `templateId`, `blocksSnapshot`, `values` (with TTS `mediaIds` if the template has an audio block), `mainBlockId`, `subBlockId`. Pass these as-is to the add endpoint when the user confirms.
- Duplicates (within batch or matching existing deck content) are omitted from `cards`.

### Behavior

1. **Auth:** Send `X-API-Key` with `DECKBASE_API_KEY`. Send `uid` for deck/template access and Pro check.
2. **Deck & template:** Must exist and belong to the user. Template must have at least one block.
3. **AI:** Generates content; uses deck’s existing cards for avoid list and examples. Pro/VIP required in production.
4. **Audio:** If the template has an audio block, the server generates TTS and attaches `mediaIds` to the corresponding value in `values`. No cards are written to Firestore in this step.

### Errors (Step 1)

| Status | Body / cause |
|--------|----------------|
| 401    | `Missing or invalid X-API-Key (mobile API key)` |
| 400    | `deckId, templateId, and uid are required` or invalid JSON |
| 403    | `Active subscription required to use AI features` |
| 404    | `Deck not found`, `Template not found` (code: `template_not_found`), or `Template has no blocks` (code: `template_no_blocks`) |
| 502    | `AI returned invalid JSON` |
| 503    | `Server storage not configured` or `ANTHROPIC_API_KEY is not configured` |
| 500    | `Failed to add cards` (server error) |

---

## Step 2: Add selected cards to the deck

Call this only when the user confirms they want to add (some or all of) the generated cards. If the user cancels, do not call this.

**POST** `/api/mobile/cards/add`  
**Headers:** `X-API-Key: <DECKBASE_API_KEY>`, `Content-Type: application/json`

### Request body

| Field   | Type  | Required | Description |
|--------|-------|----------|-------------|
| `uid`  | string| Yes      | Current user ID |
| `deckId` | string | Yes    | Deck ID to add cards to |
| `cards` | array | Yes     | Array of card objects from Step 1 (or subset). Each: `{ templateId, blocksSnapshot, values, mainBlockId?, subBlockId? }` |

### Example

```json
{
  "uid": "firebase-user-uid-here",
  "deckId": "8d1120fb-ebfe-464c-8a79-1e8036778789",
  "cards": [
    {
      "templateId": "abc-123-template-id",
      "blocksSnapshot": [...],
      "values": [...],
      "mainBlockId": "...",
      "subBlockId": "..."
    }
  ]
}
```

### Response (200)

```json
{
  "created": 1,
  "cardIds": ["card-uuid-1"]
}
```

### Errors (Step 2)

| Status | Body / cause |
|--------|----------------|
| 401    | `Missing or invalid X-API-Key (mobile API key)` |
| 400    | `uid and deckId are required` or `cards array is required and must not be empty` |
| 404    | `Deck not found` |
| 503    | `Server storage not configured` |
| 500    | `Failed to add cards` |

---

## Mobile usage (two-step flow)

1. **Generate:** POST `/api/mobile/cards/add-with-ai` with `{ deckId, templateId, uid, count? }`. Use the deck’s default template when the user doesn’t pick one — see [Default template per deck (mobile)](./MOBILE_DEFAULT_TEMPLATE_PER_DECK.md).
2. **Show:** Display the returned `cards` in your UI (e.g. list with previews). Let the user select which to add or cancel.
3. **Add or cancel:**
   - If the user **adds:** POST `/api/mobile/cards/add` with `{ uid, deckId, cards }` where `cards` is the array (or subset) from Step 1. Use the response `cardIds` to update the UI.
   - If the user **cancels:** Do not call add; discard the generated cards.

This matches the web flow: generate → show in modal → user chooses → add selected to deck.
