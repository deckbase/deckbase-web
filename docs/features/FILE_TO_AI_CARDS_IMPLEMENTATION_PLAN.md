# File to AI Cards — Implementation Plan (Task List)

Concrete tasks to implement the [File to AI Cards feature](./FILE_TO_AI_CARDS_FEATURE.md). Order for v1: extraction lib → API route → AI wiring → dashboard UI.

---

## Phase 1 — Foundation (v1)

### 1. Extraction layer

| Task | Description | Deps |
|------|-------------|------|
| **1.1** | Add npm deps: `pdf-parse` (or `pdfjs-dist`), `mammoth`, `xlsx`. | — |
| **1.2** | Create `lib/file-to-text.js`: `extractText(buffer, mimeType, options?)` → `{ text: string, meta?: { pageCount?, sheetNames? } }`. Support: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. | 1.1 |
| **1.3** | PDF: extract text only; cap at first N pages (e.g. 20) for v1; truncate total chars (e.g. 50k). | 1.2 |
| **1.4** | DOCX: use mammoth to get plain text; truncate to char cap. | 1.2 |
| **1.5** | XLSX: use xlsx to read first sheet(s); serialize to CSV-like or structured rows; pass to AI as “table” context. Option: detect “term”/“definition” columns. | 1.2 |
| **1.6** | Image: add path A (vision) — send image to Claude vision API with prompt “extract key facts/concepts and suggest flashcards.” Or path B: add Tesseract/Google Vision OCR then use text in existing LLM flow. Document choice in feature doc. | 1.2 |

### 2. API route

| Task | Description | Deps |
|------|-------------|------|
| **2.1** | Create `POST /api/cards/file-to-ai` (or `/api/cards/import-from-file`). Accept `multipart/form-data`: `file`, `deckId`, `templateId`, `uid`, optional `maxCards`. | — |
| **2.2** | Validate: file present; type in allowlist (image, pdf, docx, xlsx); size ≤ MAX_FILE_SIZE (e.g. 20 MB). Return 400/413/415 with clear message. | 2.1 |
| **2.3** | Load deck + template (same as add-with-AI); verify user has access. Return 404 if not found. | 2.1 |
| **2.4** | If Pro/VIP gated: call `isProOrVip(uid)`; return 403 if required and not subscribed. | 2.1 |
| **2.5** | Call `extractText(fileBuffer, mimeType)` (or vision for image). On failure return 422. | 1.2, 1.6 |
| **2.6** | Build AI prompt: (1) template schema (blockId, type, label per block); (2) extracted content; (3) instruction: map content to template fields, output exact blockIds as keys. Then: “generate up to N cards” (from `maxCards` or default 15). Reuse/adapt `buildCardPrompt`; add instruction that AI must **map** content to template fields and use **exact blockIds as keys**. Cap at `maxCards` (default 15). | Existing card-ai-prompt |
| **2.7** | Call Claude (or same model as add-with-AI); parse response to card objects; validate shape (templateId, blocksSnapshot, values keyed by blockId, mainBlockId, subBlockId); reject if keys don't match template. Return 502 if invalid. | 2.6 |
| **2.8** | Return `{ cards, fileName, extractedLength? }`. Do not create cards in DB. | 2.7 |

### 3. Dashboard UI

| Task | Description | Deps |
|------|-------------|------|
| **3.1** | On deck detail: **AI from file** (amber, Sparkles) vs **Import spreadsheet** (Upload) — distinct labels. | — |
| **3.2** | “Import from file” flow: file input (accept image, pdf, docx, xlsx); dropdown or default for template; optional “Max cards” (e.g. 5–30). | 3.1 |
| **3.3** | On submit: upload file to `POST /api/cards/file-to-ai`; show loading (“Extracting…” / “Generating cards…”). | 2.1 |
| **3.4** | On success: show generated cards in same preview UX as “Add with AI” (editable list); “Add to deck” / “Add selected” calls existing add-cards flow (e.g. createCard or mobile add API). | Existing add flow |
| **3.5** | On error: show message (file too big, unsupported type, extraction failed, AI error, or Pro required). | 2.2, 2.4 |

---

## Phase 2 — Robustness

| Task | Description |
|------|-------------|
| **2a** | Env/config: `MAX_FILE_SIZE_MB`, `FILE_TO_AI_MAX_PAGES` (PDF), `FILE_TO_AI_MAX_CHARS`. |
| **2b** | Rate limit: e.g. 10 requests per user per hour for `/api/cards/file-to-ai`. |
| **2c** | Optional: temp store file in GCS with 1h TTL; pass GCS path to extraction if needed for very large files. |

---

## Phase 3 — Polish (later)

| Task | Description |
|------|-------------|
| **3a** | Progress: “Extracting…” then “Generating cards…” (or streaming status). |
| **3b** | Long PDF: chunk by pages; multiple AI calls; merge and dedupe cards; cap total. |
| **3c** | Excel: UI to map “this column = term, this = definition” (or auto-detect). |
| **3d** | Mobile: same API; native file picker → upload → preview → add. |

---

## Order of implementation (suggested)

1. **Extraction (1.1–1.5)** — PDF, DOCX, XLSX only first; no image.
2. **API (2.1–2.8)** — without image; then add image (1.6 + 2.5).
3. **UI (3.1–3.5)** — wire deck detail to new endpoint and existing add flow.
4. **Phase 2** — limits, rate limit, Pro gating if not done in 2.4.

---

## Files to add or touch

| File | Action |
|------|--------|
| `lib/file-to-text.js` | **New** — extraction for PDF, DOCX, XLSX (and optionally image → text or vision). |
| `app/api/cards/file-to-ai/route.js` | **New** — multipart handler, validation, extract → AI → return cards. |
| `lib/card-ai-prompt.js` | **Extend** — optional helper for “content + template → cards” prompt (or new `lib/card-ai-from-content.js`). |
| `app/dashboard/deck/[deckId]/page.js` (or add-cards component) | **Extend** — “Import from file” UI and call to file-to-ai + add flow. |
| `package.json` | **Add** — `pdf-parse` (or `pdfjs-dist`), `mammoth`, `xlsx`. |
| `docs/FILE_TO_AI_CARDS_FEATURE.md` | **Done** — feature spec. |
| `docs/FILE_TO_AI_CARDS_IMPLEMENTATION_PLAN.md` | **Done** — this plan. |
