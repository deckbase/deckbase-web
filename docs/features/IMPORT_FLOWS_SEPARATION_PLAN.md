# Import Flows Separation — Plan

Separate **table-based import** (CSV, Excel, Anki) from **document/image AI import** (PDF, Word, images) so each flow has a clear purpose and the right tool (mapping vs AI).

---

## 1. Current state

| Flow | File types | How it works |
|------|------------|--------------|
| **Import spreadsheet** | CSV, XLS/XLSX, APKG | Load file → select rows → **map columns to template blocks** → import. No AI. |
| **AI from file** | PDF, DOCX, XLS/XLSX, APKG, PNG, JPEG, WebP | Upload → **AI** maps content to template → review/edit → add. |

**Overlap:** XLS/XLSX and APKG appear in both. That’s confusing: same file type can mean “I’ll map columns” or “AI will figure it out.”

---

## 2. Why separate?

- **Table-based files (CSV, XLSX, APKG)** already have structure (rows/columns). The **mapping** flow gives precise control, no AI cost, and deterministic results. It’s the right default for “I have a spreadsheet/Anki deck.”
- **Documents and images (PDF, DOCX, PNG, etc.)** are unstructured. **AI** is the right tool; there’s no column mapping to do.
- Clear split: **“From table”** = mapping, **“From document or image”** = AI. Fewer wrong choices and less confusion.

---

## 3. Proposed model

### 3.1 Two entry points, no overlap

| Entry point | File types | Primary behavior |
|-------------|------------|------------------|
| **Import spreadsheet** | CSV, XLS, XLSX, APKG only | Map columns to template → import. No AI. |
| **AI from file** | PDF, DOCX, PNG, JPEG, WebP only | Extract / vision → AI maps to template → review → add. |

- Remove **XLS/XLSX and APKG** from the AI-from-file file picker and from drag-and-drop.
- Keep **PDF, DOCX, images** only in AI from file.
- Copy and labels make it explicit: “From table (CSV, Excel, Anki)” vs “From document or image (AI).”

### 3.2 Optional: “Use AI instead” for table files

For users who have CSV/Excel/APKG but prefer “let AI map it”:

- **Option A (recommended):** Inside **Import spreadsheet**, after a file is loaded, show a secondary action: **“Or generate with AI instead”**. If clicked, take the same file and run it through the existing AI-from-file API (client parses APKG/Excel to text and sends `extractedContent`; server already supports this). So table files still get one primary path (mapping), with AI as an explicit choice.
- **Option B:** Do not offer AI for table files at all; they must use mapping. Simpler, but removes the “messy Excel, let AI figure it out” use case.

---

## 4. Implementation plan

### Phase 1 — Separate file types ✅ Implemented

1. **AI from file**
   - Restrict accepted extensions to: `.pdf`, `.docx`, `.png`, `.jpg`, `.jpeg`, `.webp`.
   - Update:
     - `FILE_TO_AI_ACCEPT_EXT` in deck page.
     - `isFileToAIAccepted()`.
     - File input `accept` attribute.
     - Drag-and-drop validation and error message.
   - Copy: e.g. “From document or image — AI drafts cards for your template” and “PDF, Word, or image only”.
   - **API:** Keep `/api/cards/file-to-ai` as-is for multipart (PDF, DOCX, images). JSON body with `extractedContent` can remain for future/optional use (e.g. if we add “Use AI instead” from Import spreadsheet later).

2. **Import spreadsheet**
   - Already CSV, XLS, XLSX, APKG only. No change to file types.
   - Optional copy tweak: “From table (CSV, Excel, Anki). Map columns to your template.”

3. **Docs**
   - Update `FILE_TO_AI_CARDS_FEATURE.md`: supported formats = PDF, DOCX, images only; remove Excel/APKG from the main “AI from file” flow (or note they’re via “Use AI instead” if we add that).

### Phase 2 — Optional: “Use AI instead” in Import spreadsheet

1. In the Import spreadsheet modal, after the user has chosen a file and we have parsed data (e.g. after “File” step or at “Rows” step), add a link/button: **“Or generate with AI instead”**.
2. On click:
   - For **APKG:** use existing client-side parse → `toSpreadsheetData()` → serialize to text → `POST /api/cards/file-to-ai` with `extractedContent` (existing JSON API).
   - For **CSV/XLSX:** either (a) serialize current `importData` (headers + rows) to text and send as `extractedContent`, or (b) send the raw file in multipart and add server-side support for CSV in file-to-ai (if we want to keep one upload path). Prefer (a) to reuse existing JSON endpoint.
3. Then close Import spreadsheet, open the “Add Card with AI” modal with the generated cards (same as current AI-from-file success flow).

### Phase 3 — Optional: small UX polish

- Empty state / header: two clear actions — “Import from table” and “From document or image (AI)” with one-line descriptions.
- Tooltips or short help text under each button describing which file types and which method (mapping vs AI).

---

## 5. Summary

| Action | Scope |
|--------|--------|
| **Separate by file type** | AI from file = PDF, DOCX, images only. Import spreadsheet = CSV, XLS, XLSX, APKG only. |
| **Implement Phase 1** | Restrict AI-from-file accept list and copy; no new APIs. |
| **Implement Phase 2** | Add “Use AI instead” in Import spreadsheet for table files; reuse existing JSON `extractedContent` API. |
| **Docs** | Update feature doc and any in-app copy to reflect the split. |

Result: table-based imports use mapping by default; document/image imports use AI only. Optional “Use AI instead” keeps the power-user path for table files without blurring the two flows.
