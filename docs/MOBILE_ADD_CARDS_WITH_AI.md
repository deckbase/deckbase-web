# Add Cards with AI – Mobile API

Use this endpoint from the mobile app to generate and add cards to a deck in one request. The server generates card content with AI, optionally generates audio (if the template has an audio block), and creates the cards in Firestore.

**Base URL:** Your deployed Next.js API base (e.g. `https://your-app.com`)

**Auth:** `X-API-Key: <DECKBASE_API_KEY>` (server env). Dashboard API keys are for MCP only; the mobile app uses the shared mobile API key.

---

## Add cards with AI

**POST** `/api/mobile/cards/add-with-ai`  
**Headers:** `X-API-Key: <DECKBASE_API_KEY>`, `Content-Type: application/json`

### Request body

| Field        | Type   | Required | Description                                      |
|-------------|--------|----------|--------------------------------------------------|
| `deckId`    | string | Yes      | Deck ID to add cards to                          |
| `templateId`| string | Yes      | Template ID (user’s template)                   |
| `uid`       | string | Yes      | Current user ID (from your app auth, e.g. Firebase Auth UID) |
| `count`     | number | No       | Number of cards to generate (1–5). Default: 1    |

### Example

```json
{
  "deckId": "8d1120fb-ebfe-464c-8a79-1e8036778789",
  "templateId": "abc-123-template-id",
  "uid": "firebase-user-uid-here",
  "count": 3
}
```

### Response (200)

```json
{
  "created": 3,
  "cardIds": ["card-uuid-1", "card-uuid-2", "card-uuid-3"]
}
```

### Behavior

1. **Auth:** Send `X-API-Key` with the value of `DECKBASE_API_KEY` from your server env. Dashboard API keys (Bearer) are for MCP only.
2. **uid:** Send the logged-in user’s ID so the server can load their deck/template and enforce Pro. Get it from your app auth (e.g. Firebase Auth `user.uid`).
3. **Deck & template:** Deck and template must exist and belong to that user. The template must have at least one block.
4. **AI generation:** Same logic as the web “Add card with AI”. Pro/VIP required in production.
5. **Audio:** If the template has an audio block, the server generates TTS and attaches it to each new card.

### Errors

| Status | Body / cause |
|--------|----------------|
| 401    | `Missing or invalid X-API-Key (mobile API key)` |
| 400    | `deckId, templateId, and uid are required` or invalid JSON |
| 403    | `Active subscription required to use AI features` |
| 404    | `Deck not found` or `Template not found or has no blocks` |
| 502    | `AI returned invalid JSON` |
| 503    | `Server storage not configured` or `ANTHROPIC_API_KEY is not configured` |
| 500    | `Failed to add cards` (server error) |

### Mobile usage

1. Set `DECKBASE_API_KEY` on the server. In the app, send it in the `X-API-Key` header on every request.
2. Get the current user’s `uid` from your auth (e.g. Firebase Auth) and include it in the body.
3. POST to `/api/mobile/cards/add-with-ai` with header `X-API-Key: <DECKBASE_API_KEY>` and body `{ deckId, templateId, uid, count? }`.
4. Use the deck’s **default template** (or “effective default”) for `templateId` when the user doesn’t pick one — see [Default template per deck (mobile)](./MOBILE_DEFAULT_TEMPLATE_PER_DECK.md).
5. On success, use `created` and `cardIds` to update the UI.
