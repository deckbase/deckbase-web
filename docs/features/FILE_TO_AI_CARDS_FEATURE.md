# File to AI Cards — Feature Doc & Implementation Plan

Convert **images, PDF, Word, and Excel** into **AI-generated flashcards** that users can review and add to a deck. Content is extracted from the file, sent to an AI model with the user’s template, and cards are returned in the same shape as “Add with AI” for consistency with the existing flow.

---

## 1. Feature overview

| Item | Description |
|------|--------------|
| **Input** | Single file: image (PNG, JPEG, WebP), PDF, or DOCX. For CSV/Excel/Anki use **Import spreadsheet** (mapping or “Use AI instead”). |
| **Flow** | Upload → extract text (or image → vision/OCR) → AI generates cards from content + template → user reviews and adds to deck. |
| **Output** | Same card payload as [Add with AI](./MOBILE_ADD_CARDS_WITH_AI.md): `{ templateId, blocksSnapshot, values, mainBlockId, subBlockId }[]` so the client can call the existing add endpoint. |
| **Where** | Web dashboard — deck detail **AI from file** (next to Add Card with AI); optional later: mobile. |

**User story:** “I have lecture slides (PDF), a textbook page (image), or a vocabulary list (Excel). I upload the file, pick my deck and template, and get draft cards to edit and add.”

### 1.1 Template selection and AI field mapping

- **User chooses the template.** Before or after selecting the file, the user must pick **which template** to use (same templates as in "Add with AI"). That template defines the **card shape**: which blocks exist (e.g. Header 1, Hidden text, Example, Audio) and their `blockId`s and labels.
- **AI figures out which content maps to which fields.** The extracted content (raw text, or structured rows from Excel) is not pre-labeled. The AI receives:
  1. **Template schema** — each block's `blockId`, type, and label (e.g. "Header 1", "Hidden text", "Example").
  2. **Extracted content** — the full text, or for Excel a table with columns/rows.
- **AI's job:** Infer which part of the content corresponds to which template field (e.g. "this segment is the term → Header 1", "this is the definition → Hidden text", "this is the example → Example"). Output one card object per card, with **exact `blockId`s as keys** and string values, so results are **consistent** with the template and the existing add flow.
- **Consistency:** Every generated card must have the same structure: one value per template block (using the same blockIds). No extra keys; no missing keys for required blocks. That way the client can render and save cards without schema guesswork.

---

## 2. Supported formats and extraction

| Format | Extensions | Approach | Notes |
|--------|------------|----------|--------|
| **Image** | `.png`, `.jpg`, `.jpeg`, `.webp` | Vision API (e.g. Claude with image) or OCR (Tesseract / Google Vision) | Prefer vision for “understand and make cards”; OCR for raw text then LLM. |
| **PDF** | `.pdf` | Text extraction (e.g. `pdf-parse`, `pdfjs-dist`, or serverless PDF lib) | No rendering; extract text only for token budget. Option: page-by-page chunking for long PDFs. |
| **Word** | `.doc`, `.docx` | `mammoth` (docx) or text extraction | docx preferred; .doc legacy may need conversion or skip. |
| **Excel** | `.xls`, `.xlsx` | `xlsx` (SheetJS) or similar | Extract sheet(s) as rows; AI turns rows (e.g. term + definition columns) into cards. |

**Constraints**

- **File size:** e.g. max 10–20 MB per file (configurable); reject larger with clear error.
- **Page/sheet limits (v1):** e.g. first 20 pages (PDF) or first 2 sheets (Excel) to cap tokens and cost.
- **Text cap:** Truncate extracted text to a max character limit (e.g. 50k–100k chars) before sending to AI; optionally summarize or chunk and run multiple AI calls.

---

## 3. End-to-end flow

```
[User] Selects file → Chooses deck + template → Uploads
    ↓
[API] Validate file type/size → Store temporarily (GCS / tmp) or process in memory
    ↓
[Extract] Image → Vision or OCR | PDF → text | DOCX → text | XLSX → rows (JSON/CSV-like)
    ↓
[AI] Prompt: "Given this content and the template (blockIds + labels), map content to template fields and generate N cards."
    Input: extracted content (or image URL) + template blocks (blockId, type, label per block)
    Task: AI infers which content segment maps to which template field; outputs one object per card with blockId → value
    Output: array of card objects (same shape as add-with-AI); keys = template blockIds, values = strings
    ↓
[API] Return { cards, source: "file", fileName }
[Client] Show preview; user edits/removes cards; on confirm → POST /api/mobile/cards/add (or web equivalent)
```

- **Auth:** Same as rest of dashboard (Firebase/session); optional API key for mobile later.
- **Pro/VIP:** If “Add with AI” is gated, gate “File to AI cards” the same way (e.g. `isProOrVip`).

---

## 4. API design (proposed)

### Option A: Two-step (recommended for v1)

1. **POST `/api/cards/file-to-ai`** (or `/api/cards/import-from-file`)  
   - **Body:** `multipart/form-data`: `file`, `deckId`, `templateId`, `uid`, optional `maxCards` (e.g. 5–30).  
   - **Response:** `{ cards: [...], fileName, extractedLength }` (same `cards` shape as add-with-AI).  
   - No cards created in DB; client shows preview and then calls add endpoint.

2. **Add cards:** Existing **POST `/api/mobile/cards/add`** (or web createCard flow) with the returned `cards`.

### Option B: Single-step

- **POST** with file + deckId + templateId + uid; server generates cards and **creates** them in the deck in one go.  
- Simpler client but less control (no preview/edit before add). Prefer Option A for v1.

### Errors

| Code | When |
|------|------|
| 400 | Missing file / deckId / templateId / uid; invalid file type; file too large. |
| 413 | File exceeds size limit. |
| 415 | Unsupported file type. |
| 402/403 | Pro/VIP required if gated. |
| 422 | Extraction failed (e.g. corrupted PDF). |
| 502 | AI returned invalid or empty cards. |
| 503 | AI or extraction service unavailable. |

---

## 5. Implementation plan (phased)

### Phase 1 — Foundation (v1)

| # | Task | Owner / notes |
|---|------|----------------|
| 1.1 | **Doc & spec** | This doc; align with product. |
| 1.2 | **File upload API** | `POST /api/cards/file-to-ai`: accept multipart file; validate type (image, pdf, docx, xlsx) and size; return 400/413/415 for bad input. |
| 1.3 | **Text extraction** | Libs: PDF (`pdf-parse` or `pdfjs-dist`), DOCX (`mammoth`), XLSX (`xlsx`). One module e.g. `lib/file-to-text.js`: `extractText(fileBuffer, mimeType)` → `{ text, meta? }`. |
| 1.4 | **Image path** | For images: either (a) send image to Claude vision with “extract key facts and create flashcards” or (b) OCR (Tesseract/Google Vision) then LLM on text. Prefer (a) for v1 if token cost is acceptable. |
| 1.5 | **AI card generation** | Send template (blockId, type, label per block) + extracted content. Prompt: AI must **map** content segments to template fields and output one object per card with **exact blockIds as keys** so results are consistent. Reuse/adapt `lib/card-ai-prompt`; add "content → field mapping" instructions. Cap at e.g. 15–20 cards per request; chunk long text if needed. |
| 1.6 | **Wire to add flow** | Return `cards`; client uses existing “add cards” (e.g. add-with-AI preview UI) so user can edit and add to deck. |
| 1.7 | **Dashboard UI** | On deck detail (or “Add cards” menu): “Import from file” → file picker → choose template → upload → show generated cards → “Add to deck” / “Add selected”. |

### Phase 2 — Robustness and limits

| # | Task | Notes |
|---|------|--------|
| 2.1 | **File size and type config** | Env or config: `MAX_FILE_SIZE_MB`, `ALLOWED_MIME_TYPES`. Reject and message clearly. |
| 2.2 | **Page/sheet limits** | PDF: first N pages; Excel: first M sheets; DOCX: full doc but cap total chars. |
| 2.3 | **Rate limiting** | Per-user or per-IP limit on file-to-ai (e.g. 10/hour) to avoid abuse and cost. |
| 2.4 | **Pro/VIP gating** | If applicable, check subscription before running AI (same as add-with-AI). |

### Phase 3 — UX and polish

| # | Task | Notes |
|---|------|--------|
| 3.1 | **Progress / streaming** | For large files, optional “Extracting…” then “Generating cards…” with progress or streaming status. |
| 3.2 | **Chunking long docs** | Split long PDF/text into chunks; generate cards per chunk; merge and dedupe; cap total cards. |
| 3.3 | **Excel hints** | Let user specify “column A = term, column B = definition” (or auto-detect headers) for better card mapping. |
| 3.4 | **Mobile** | Same API from mobile app: file picker → upload → preview → add. |

---

## 6. Tech stack (recommended)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **PDF** | `pdf-parse` or `pdfjs-dist` | Lightweight text extraction; no rendering. |
| **DOCX** | `mammoth` | Good for .docx; outputs HTML or plain text. |
| **Excel** | `xlsx` (SheetJS) | Widely used; read sheets as JSON. |
| **Image** | Claude vision (Anthropic) or OCR (Tesseract / Google Cloud Vision) | Vision: one call, good for “make cards from this slide.” OCR: cheaper for pure text. |
| **AI** | Same as add-with-AI (e.g. Anthropic Claude) | Consistent card format and behavior. |
| **Storage** | Optional: GCS bucket for temp uploads (or process in memory for v1) | In-memory keeps v1 simple; GCS for large files or audit. |

---

## 7. Cost and limits (summary)

- **Token usage:** Proportional to extracted text length + template + response. Cap input length and max cards per request.
- **File storage:** If temp storage (GCS): set TTL (e.g. 1 hour) and delete after processing.
- **Rate limits:** Per-user limits on `/api/cards/file-to-ai` to avoid runaway cost.
- **Pro/VIP:** Gate behind same subscription as “Add with AI” if product decision is to monetize AI features.

---

## 8. Open questions

1. **Image:** Vision-only vs OCR-only vs “smart” choice (e.g. vision for single slide, OCR for multi-page scan)?  
2. **DOC:** Support legacy `.doc` or only `.docx` in v1?  
3. **Localization:** Same flow for non-English content (e.g. Japanese); any special prompt or model choice?  
4. **Templates (resolved):** Any template (user’s) or restrict to a subset for file-import (e.g. “term + definition” only)?

---

## 9. Success criteria (v1)

- [x] User can upload one file (image, PDF, DOCX, or XLS/XLSX) from the deck UI (**AI from file** — distinct from **Import spreadsheet**).  
- [x] Extracted content (or vision for images) is turned into card-shaped JSON using the user’s template (`POST /api/cards/file-to-ai`).  
- [x] User sees a preview of generated cards and can add (all or selected) to the deck (same flow as Add with AI).  
- [x] File type/size validation and clear errors; no cards created until user confirms.  
- [x] Pro/VIP gating in production (same as generate-with-ai). Legacy `.doc` is not supported in v1 (use DOCX).

---

## 10. References

- [Add Cards with AI – Mobile API](./MOBILE_ADD_CARDS_WITH_AI.md) — card payload shape and add endpoint.  
- [DECKBASE_MVP_TECHNICAL_SPEC.md](../DECKBASE_MVP_TECHNICAL_SPEC.md) — deck/card/template model.  
- Existing: `lib/card-ai-prompt.js`, `app/api/mobile/cards/add-with-ai/route.js`, `app/api/mobile/cards/add/route.js`.
