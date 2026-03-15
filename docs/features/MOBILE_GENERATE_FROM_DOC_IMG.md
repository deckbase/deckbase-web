# Generate from doc/img – Mobile Implementation Guide

This doc describes how to implement **Generate from doc/img** on mobile so it matches the web flow: user picks a document or image → chooses deck and template → API generates draft cards → user reviews, selects, and adds cards to the deck.

**Related:** [Add Cards with AI – Mobile](./MOBILE_ADD_CARDS_WITH_AI.md) (card payload shape and add endpoint). [FILE_TO_AI_CARDS_FEATURE.md](./FILE_TO_AI_CARDS_FEATURE.md) (feature overview). [Import from table – Mobile](./MOBILE_IMPORT_SPREADSHEET.md) (different flow: table → map columns → import).

---

## 1. Overview

| Item | Description |
|------|-------------|
| **Feature name** | Generate from doc/img (web: “Generate from doc/img” button on deck page). |
| **Input** | Single file: **PDF**, **DOCX**, or **image** (PNG, JPEG, WebP). For CSV/Excel/Anki use **Import from table**. |
| **Output** | Same card payload as Add Cards with AI: `{ cards: [{ templateId, blocksSnapshot, values, mainBlockId, subBlockId }, ...] }`. Client shows list, user selects which to add, then calls the add endpoint. |
| **Auth (production)** | **X-API-Key: &lt;DECKBASE_API_KEY&gt;** (same as add-with-ai). Send `uid` in body/form so the server can verify Pro and apply usage limits. |
| **Auth (web)** | Web dashboard uses **Bearer &lt;Firebase ID token&gt;**. Mobile uses X-API-Key. |

**Flow:**

1. User selects a file (document or image) and a deck (and optionally a template).
2. App sends the file to **POST /api/cards/file-to-ai** (multipart or JSON with extracted text).
3. API returns generated cards; app shows them in a list (preview, select/deselect, optional edit).
4. User taps “Add selected to deck”; app calls **POST /api/mobile/cards/add** with the selected cards (same as Add Cards with AI Step 2).

---

## 2. API: Generate cards from file

**POST** `/api/cards/file-to-ai`

**Base URL:** Your deployed Next.js API base (e.g. `https://your-app.com`).

### Auth

| Environment | Auth header | Notes |
|-------------|-------------|--------|
| **Production (mobile)** | `X-API-Key: <DECKBASE_API_KEY>` | Same key as add-with-ai and ElevenLabs. `uid` must be in request body/form. |
| **Production (web)** | `Authorization: Bearer <Firebase ID token>` | Web dashboard. |
| **Development** | Optional | If no auth, server may allow the request; `uid` still required in body/form. |

Pro/VIP is required in production; monthly AI generation limits apply.

### Option A: Multipart (recommended for mobile)

Send the file as multipart form data. Use this when the user picks a PDF, DOCX, or image from the device.

**Headers**

- `X-API-Key: <DECKBASE_API_KEY>` (production)
- `Content-Type: multipart/form-data` (boundary set by client)

**Body (form fields)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | Yes | The document or image file (PDF, DOCX, PNG, JPEG, WebP). Max 20 MB. |
| `deckId` | string | Yes | Deck ID (for context; cards are not created in this step). |
| `templateId` | string | Yes | Template ID. Use deck default if user doesn’t pick one (see [MOBILE_DEFAULT_TEMPLATE_PER_DECK.md](./MOBILE_DEFAULT_TEMPLATE_PER_DECK.md)). |
| `uid` | string | Yes | Current user ID (Firebase Auth UID). |
| `maxCards` | number | No | Max cards to generate (1–30). Default 15. |

**Example (pseudo)**

```http
POST /api/cards/file-to-ai
X-API-Key: <DECKBASE_API_KEY>
Content-Type: multipart/form-data; boundary=----FormBoundary

------FormBoundary
Content-Disposition: form-data; name="file"; filename="notes.pdf"
Content-Type: application/pdf

<binary>
------FormBoundary
Content-Disposition: form-data; name="deckId"

<deck-id>
------FormBoundary
Content-Disposition: form-data; name="templateId"

<template-id>
------FormBoundary
Content-Disposition: form-data; name="uid"

<firebase-uid>
------FormBoundary
Content-Disposition: form-data; name="maxCards"

15
------FormBoundary--
```

### Option B: JSON (pre-extracted text)

If the app extracts text from the file (e.g. PDF/DOCX) on the device and sends text instead of the file, use JSON. **Images cannot be sent as text;** use Option A for images.

**Headers**

- `X-API-Key: <DECKBASE_API_KEY>` (production)
- `Content-Type: application/json`

**Body (JSON)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `extractedContent` | string | Yes | Full text extracted from the document. Max length ~50k chars (server truncates). |
| `deckId` | string | Yes | Deck ID. |
| `templateId` | string | Yes | Template ID. |
| `uid` | string | Yes | Current user ID. |
| `maxCards` | number | No | 1–30. Default 15. |
| `fileName` | string | No | Original file name (e.g. for display). |

**Example**

```json
{
  "extractedContent": "Chapter 1\n\nTerm: break the ice\nDefinition: to start a conversation...",
  "deckId": "deck-uuid",
  "templateId": "template-uuid",
  "uid": "firebase-uid",
  "maxCards": 15,
  "fileName": "vocab.pdf"
}
```

### Response (200)

```json
{
  "cards": [
    {
      "templateId": "template-uuid",
      "blocksSnapshot": [
        { "blockId": "...", "type": 0, "label": "Header 1", "required": false, "configJson": null },
        { "blockId": "...", "type": "hiddenText", "label": "Definition", "required": false, "configJson": null }
      ],
      "values": [
        { "blockId": "...", "type": "header1", "text": "break the ice" },
        { "blockId": "...", "type": "hiddenText", "text": "to start a conversation..." }
      ],
      "mainBlockId": "...",
      "subBlockId": "..."
    }
  ],
  "fileName": "notes.pdf"
}
```

- **cards:** Array of card payloads. Same shape as [Add Cards with AI](./MOBILE_ADD_CARDS_WITH_AI.md) Step 1 response. Pass (a subset of) these to **POST /api/mobile/cards/add** when the user confirms.
- **fileName:** From the uploaded file (multipart) or request (JSON). Use for UI (e.g. “Generated from notes.pdf”).
- **_devPrompt:** Only in development; omit in production. Contains `{ system, user }` prompt strings for debugging.

Quiz blocks (quizSingleSelect, quizMultiSelect, quizTextAnswer) have `configJson` on the corresponding block in `blocksSnapshot` (question, options, correctAnswers, etc.). The matching entry in `values` has empty `text`. Audio blocks have `text` (spoken content) and `mediaIds: []`; TTS can be generated when adding cards (same as add-with-ai if you support it).

### Supported file types

| Type | MIME | Extensions |
|------|------|------------|
| PDF | application/pdf | .pdf |
| Word | application/vnd.openxmlformats-officedocument.wordprocessingml.document | .docx |
| Image | image/png, image/jpeg, image/webp | .png, .jpg, .jpeg, .webp |

- **Max file size:** 20 MB.
- **CSV/Excel/Anki:** Not supported here. Use **Import from table** and map columns (or “Use AI” for quiz).

### Errors

| Status | Body / cause |
|--------|----------------|
| 401 | `Authentication required (Bearer token or X-API-Key)` or `Missing or invalid X-API-Key (mobile API key)` |
| 400 | Missing/invalid body, `file is required`, `deckId, templateId, and uid are required` |
| 403 | `Active subscription required to use AI features`, `User id does not match signed-in user`, or monthly AI limit reached |
| 404 | `Template not found or has no blocks` |
| 413 | `File too large (max 20 MB)` |
| 415 | `Unsupported file type. Use PDF, DOCX, or image (PNG, JPEG, WebP). For CSV/Excel/Anki use Import from table.` |
| 422 | `No content to generate cards from` (JSON path: empty extractedContent) or extraction failed |
| 502 | `AI returned invalid JSON` |
| 503 | `ANTHROPIC_API_KEY is not configured` |
| 500 | Server error |

---

## 3. Step 2: Add selected cards to the deck

Same as [Add Cards with AI – Mobile](./MOBILE_ADD_CARDS_WITH_AI.md) Step 2.

**POST** `/api/mobile/cards/add`  
**Headers:** `X-API-Key: <DECKBASE_API_KEY>`, `Content-Type: application/json`

**Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uid` | string | Yes | Current user ID |
| `deckId` | string | Yes | Deck ID |
| `cards` | array | Yes | Subset of the `cards` returned from file-to-ai (or all). Each item: `{ templateId, blocksSnapshot, values, mainBlockId?, subBlockId? }` |

The server creates cards in Firestore and returns `{ cardIds: [...] }`. If the template has audio blocks and you support TTS, you can generate audio after add (same pattern as add-with-ai / Import from table: TTS → upload → updateCard with mediaIds).

---

## 4. UI flow (suggested)

1. **Entry:** From deck screen, show a “Generate from doc/img” (or “Document/Image”) action (same as web).
2. **Pick file:** Document picker or image picker. Restrict to PDF, DOCX, PNG, JPEG, WebP. Show file name and size; reject if &gt; 20 MB.
3. **Template:** Let user pick template or use deck default (see [MOBILE_DEFAULT_TEMPLATE_PER_DECK.md](./MOBILE_DEFAULT_TEMPLATE_PER_DECK.md)).
4. **Generate:** Call **POST /api/cards/file-to-ai** (multipart with file, deckId, templateId, uid, maxCards). Show loading (“Generating cards…”).
5. **Review:** Show list of generated cards (preview text per card, e.g. first block or question). Allow select all / deselect all; optional in-card edit (match web if needed).
6. **Add:** On “Add selected to deck”, call **POST /api/mobile/cards/add** with selected cards. Show success and optionally navigate to deck or first new card.

---

## 5. Pro/VIP and limits

- **Pro/VIP:** Required in production for file-to-ai (same as other AI features).
- **Monthly AI limit:** Same cap as add-with-ai / import-ai-blocks; counted per generated card. 403 when over limit.
- **File size:** 20 MB max per file.

---

## 6. References

| Doc | Purpose |
|-----|---------|
| [MOBILE_ADD_CARDS_WITH_AI.md](./MOBILE_ADD_CARDS_WITH_AI.md) | Card payload shape, add endpoint, auth. |
| [FILE_TO_AI_CARDS_FEATURE.md](./FILE_TO_AI_CARDS_FEATURE.md) | Feature overview and design. |
| [MOBILE_DEFAULT_TEMPLATE_PER_DECK.md](./MOBILE_DEFAULT_TEMPLATE_PER_DECK.md) | Choosing template when user doesn’t pick one. |
| [MOBILE_IMPORT_SPREADSHEET.md](./MOBILE_IMPORT_SPREADSHEET.md) | Import from table (different flow). |

**Web code (reference):**

- `app/api/cards/file-to-ai/route.js` – file-to-ai API (multipart + JSON, Bearer + X-API-Key).
- `app/dashboard/deck/[deckId]/page.js` – “Generate from doc/img” modal, file pick, progress, card list, add selected.
- `lib/file-to-text.js` – supported MIME types, max size.
- `lib/ai-card-parse.js` – parseGeneratedCard, card shape.
