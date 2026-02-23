# Add Cards with AI – Mobile API

Use this endpoint from the mobile app to generate and add cards to a deck in one request. The server generates card content with AI, optionally generates audio (if the template has an audio block), and creates the cards in Firestore.

**Base URL:** Your deployed Next.js API base (e.g. `https://your-app.com`)

---

## Add cards with AI

**POST** `/api/mobile/cards/add-with-ai`  
**Authorization:** `Bearer <Firebase ID token>`  
**Content-Type:** `application/json`

### Request body

| Field        | Type   | Required | Description                                      |
|-------------|--------|----------|--------------------------------------------------|
| `deckId`    | string | Yes      | Deck ID to add cards to                          |
| `templateId`| string | Yes      | Template ID (user’s template)                   |
| `count`     | number | No       | Number of cards to generate (1–5). Default: 1    |

### Example

```json
{
  "deckId": "8d1120fb-ebfe-464c-8a79-1e8036778789",
  "templateId": "abc-123-template-id",
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

1. **Auth:** The server verifies the Firebase ID token and uses the token’s `uid` to load the deck and template and to create cards under that user.
2. **Deck & template:** Deck and template must exist and belong to the user. The template must have at least one block.
3. **AI generation:** The server uses the deck title/description, template blocks, and up to 5 example cards from the deck to generate new card content (same logic as the web “Add card with AI”).
4. **Audio:** If the template includes an audio block, the server generates TTS from the main block text (using the template’s default voice if set), uploads the audio to Firebase Storage, and attaches it to each new card.

### Errors

| Status | Body / cause |
|--------|----------------|
| 401    | `Missing Authorization: Bearer <token>` or `Invalid or expired token` |
| 400    | `deckId and templateId are required` or invalid JSON |
| 404    | `Deck not found` or `Template not found or has no blocks` |
| 502    | `AI returned invalid JSON` |
| 503    | `Server auth not configured`, `Server storage not configured`, or `ANTHROPIC_API_KEY is not configured` |
| 500    | `Failed to add cards` (server error) |

### Mobile usage

1. Get a fresh Firebase ID token: `FirebaseAuth.getInstance().currentUser?.getIdToken(true)` (Android) or equivalent on iOS.
2. POST to `/api/mobile/cards/add-with-ai` with header `Authorization: Bearer <idToken>` and body `{ deckId, templateId, count? }`.
3. On success, use `created` and `cardIds` to update the UI (e.g. refresh the deck’s card list or navigate to the first new card).
