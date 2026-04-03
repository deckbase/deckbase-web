# Back-side support — implementation checklist

**Purpose:** Track what is implemented for **`side: "front" | "back"`** on template and card blocks, flip behavior in preview/study, and related import/export/AI/MCP paths.

**Related:** Deeper product and architecture notes live in [`feasibility-back-side-support.md`](./feasibility-back-side-support.md). That document may lag the codebase; **this checklist is the status snapshot** — update both when behavior changes.

**Rules (product):**

- Missing or `null` **`side`** is treated as **`"front"`** everywhere.
- Flip UI appears when **any** block is **`"back"`** after normalization.
- Firestore does **not** store legacy **`rendering`**; MCP may accept shorthand input that is normalized to per-block `side` (see `normalizeTemplateBlocksForWrite`).

---

## Legend

| Mark | Meaning |
|------|---------|
| `[x]` | Implemented in `deckbase-web` (verify in git if unsure) |
| `[ ]` | Not done, optional, or tracked outside this repo |

---

## 1. Data model and Firestore (client)

- [x] **`transformBlockFromFirestore`** — reads `side`, default `"front"` (`utils/firestore.js`).
- [x] **`transformBlockToFirestore`** — writes `side` (`utils/firestore.js`).
- [x] **`normalizeTemplateBlocksForWrite`** — per-block `side` only; no `rendering` persisted.
- [x] **`transformTemplateFromFirestore`** — legacy `rendering` on old docs can still be applied on read where applicable; re-save writes `side` only.
- [x] **Seed / default templates** — vocabulary seeds and similar set explicit `side` where needed (`utils/firestore.js`).

---

## 2. Server / admin (`lib/firestore-admin.js`)

- [x] **`cloneTemplateBlockForCard`** — stamps `side` on card `blocks_snapshot`.
- [x] **`normalizeTemplateBlocksForWriteAdmin`** — aligns with client normalization (no `rendering` in Firestore).
- [x] **`getTemplateAdmin`** — template blocks normalized with `side`.
- [x] **`blockToFirestore` / block reads** — `side` preserved where relevant.
- [x] **`blockToExportShape`** — includes `side` for MCP export.
- [x] **`updateCardContent`** — `mainBlockId` / `subBlockId` logic respects effective face (not raw position only).
- [x] **`buildMcpTemplateCardSchema`** — each block includes `side`; `create_card.note` documents front vs back behavior.

---

## 3. AI generation and parsing

- [x] **`parseGeneratedCard`** (`lib/ai-card-parse.js`) — `blocksSnapshot` entries carry `side` from the template.
- [x] **`lib/card-ai-prompt.js`** — block lists sorted front-then-back (`sortBlocksByFace`); `[Front]` / `[Back]` in lines; face hints in `buildCardPrompt`, `buildCardPromptFromContent`, `buildCardPromptFromImage`, `buildImportQuizAudioPrompt`.

---

## 4. Web UI

### Template editor (`app/dashboard/templates/[templateId]/page.js`)

- [x] **Add back of card** — progressive disclosure; front/back sections.
- [x] **Block `side`** — set when adding/moving blocks between faces (with DnD / actions as implemented).

### Card editor (`app/dashboard/deck/[deckId]/card/[cardId]/page.js`)

- [x] **`DEFAULT_BLOCKS`** — explicit `side` on default layout blocks.
- [x] **Front/back sections** — align with template editor patterns (Add back, per-face add block, same-face drag rules).
- [x] **Save** — persist without leaving editor; success feedback (e.g. snackbar) as implemented.

### Preview (`components/CardPreviewContent.js`)

- [x] **Two-sided templates** — 3D flip (or equivalent) when back blocks exist; front vs back block lists.

### Study (`app/dashboard/deck/[deckId]/study/page.js`)

- [x] **Flip** — back face after flip when `side === "back"` blocks exist.
- [x] **Ordering** — quiz / reveal flow respects front-then-back study order.

### Deck table import (`app/dashboard/deck/[deckId]/page.js`)

- [x] **`templateBlocksSnapshot`** — includes `side` from selected template.
- [x] **Step 3 (Map)** — template block chips grouped under **Front** / **Back** when the template has back blocks; face badges when front-only.

### Deck list / thumbnails

- [x] **Previews** — prefer front-face blocks for thumbnails where `getCardPreview` / related helpers were updated (see deck detail page helpers).

---

## 5. Import / export files

- [x] **APKG export** (`utils/apkgExport.js`) — Anki Front/Back collapse uses **`side`** (`effectiveSide` / `collapseToFrontBack`), not legacy positional heuristics.
- [x] **CSV/XLSX** — column headers / mapping awareness where implemented (`[Front]` / `[Back]` and `effectiveBlockSide`-style helpers on import path).

---

## 6. MCP (`lib/mcp-handlers.js`, schemas, public docs)

- [x] **Handlers** — `rendering` removed from persisted payloads; templates/cards use per-block `side`.
- [x] **`get_template_schema`** — response blocks include `side`.
- [x] **`docs/public/MCP-AI-CARD-WORKFLOW.md`** — `side` documented for `get_template_schema` / `block_text` mapping (see “Front vs back”).

---

## 7. Mobile and cross-repo

- [ ] **Native apps** — consume `blocks_snapshot` / `blocks_snapshot_json`; ensure flip UX and `side` parity with web (tracked outside this repo).

---

## 8. Quality and maintenance

- [ ] **Automated tests** — unit tests for `sortBlocksByFace`, transform helpers, and APKG collapse (optional).
- [ ] **Keep in sync** — when closing items here, update [`feasibility-back-side-support.md`](./feasibility-back-side-support.md) status tables if they still reference old gaps.

---

## Quick file index

| Area | Primary files |
|------|----------------|
| Client Firestore | `utils/firestore.js` |
| Admin / MCP / AI parse | `lib/firestore-admin.js`, `lib/ai-card-parse.js`, `lib/mcp-handlers.js` |
| Prompts | `lib/card-ai-prompt.js` |
| Template UI | `app/dashboard/templates/[templateId]/page.js` |
| Card UI | `app/dashboard/deck/[deckId]/card/[cardId]/page.js` |
| Deck import | `app/dashboard/deck/[deckId]/page.js` |
| Preview / study | `components/CardPreviewContent.js`, `app/dashboard/deck/[deckId]/study/page.js` |
| APKG | `utils/apkgExport.js` |
