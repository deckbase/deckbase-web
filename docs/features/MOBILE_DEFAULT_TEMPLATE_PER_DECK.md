# Default template per deck – mobile implementation

This doc is for the **mobile team**. It describes how to implement **default template per deck** so that when a user adds a card (or uses "Add with AI") in a deck, the app pre-selects the right template without requiring a picker every time.

---

## Data model

Each deck document in Firestore can optionally store a default template:

| Field | Type | Notes |
|-------|------|--------|
| `default_template_id` | string \| null | Template ID to use by default when adding cards to this deck. Omitted or `null` = "no explicit default." |

- **Path:** `users/{userId}/decks/{deckId}` (same as in [STATE_BASED_SYNC_MOBILE.md](./STATE_BASED_SYNC_MOBILE.md)).
- When you **read** a deck (Firestore or any API that returns deck data), include this field. The web app exposes it as `defaultTemplateId`; Firestore stores `default_template_id`. Normalize to whatever your mobile model uses (e.g. `defaultTemplateId`).

---

## Effective default (same logic as web)

The **effective default template** for a deck is, in order:

1. **Explicit default:** If the deck has `default_template_id` set **and** that template still exists in the user's templates → use it.
2. **Most used in deck:** Otherwise, among cards in this deck, count how many use each `template_id`. If there is a template that exists in the user's templates and is used by at least one card → use the most-used one.
3. **First template:** Otherwise use the first template in the user's template list (e.g. first by creation date or name).

So:

- **Explicit default** always wins when set and valid.
- **Most used** is the fallback when the user hasn't set a default (matches web "Most used in deck").
- **First template** is the last fallback so you always have a valid templateId for "Add card" and "Add with AI".

---

## Where to use it

1. **Add card (manual)**  
   When the user opens "Add card" for a deck, pre-select the template in your picker (or skip the picker and go straight to the form) using the **effective default** above. Optionally still allow changing the template.

2. **Add card with AI**  
   When the user taps "Add with AI" for a deck, send the **effective default** as `templateId` in the request to `POST /api/mobile/cards/add-with-ai` (see [MOBILE_ADD_CARDS_WITH_AI.md](./MOBILE_ADD_CARDS_WITH_AI.md)). You can either:
   - Pre-fill the template in a picker and then call the API with that templateId, or  
   - Call the API directly with the effective default and only show a template picker when the user explicitly chooses "Different template."

3. **Deck settings (optional)**  
   If you have a deck settings screen, add a "Default template" control:
   - **Read:** Show current `deck.default_template_id` (or "Most used in deck" when it's null).
   - **Write:** When the user picks a template (or "Most used"), update the deck with `default_template_id`:
     - Path: `users/{uid}/decks/{deckId}`
     - Update: `{ default_template_id: templateId || null, updated_at: <now> }`  
     Use `setDoc(..., data, { merge: true })` or your existing deck update helper so you don't overwrite other fields. The web uses `updateDeck(uid, deckId, { defaultTemplateId: templateId })`; same idea on mobile.

---

## Implementation checklist

- [ ] When loading a deck, read and store `default_template_id` (e.g. as `defaultTemplateId`).
- [ ] Implement **effective default** for a deck: explicit default (if template exists) → most-used template in deck (if exists) → first template.
- [ ] "Add card": pre-select (or use without picker) the effective default template.
- [ ] "Add with AI": send effective default as `templateId` in the API request (and optionally allow user to change template before sending).
- [ ] (Optional) Deck settings: allow setting/clearing default template by updating the deck's `default_template_id` and `updated_at`.

---

## Reference (web behavior)

- Web deck detail: `app/dashboard/deck/[deckId]/page.js`  
  - `effectiveDefaultTemplateId` (lines ~121–141): explicit deck default → most-used in deck → first template.  
  - Used when opening "Add card" and "Add with AI" modals.  
  - Deck settings dropdown (lines ~943–976): `updateDeck(uid, deckId, { defaultTemplateId })`.
- Firestore: `utils/firestore.js`  
  - `updateDeck`: supports `updates.defaultTemplateId` → writes `default_template_id`.  
  - `transformDeckFromFirestore`: maps `default_template_id` → `defaultTemplateId`.

No API changes are required; the add-with-ai endpoint already takes `templateId`. Default template per deck is a **client-side** choice of which templateId to send and which to pre-select in the UI.
