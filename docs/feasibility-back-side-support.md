# Feasibility: Back-Side Card Support (Web)

**Date**: 2026-03-26
**Status**: Draft — decisions confirmed
**Scope**: Web app (`deckbase-web`) — adding full front/back card face support

**Implementation status:** See the living checklist: [back-support-implementation-checklist.md](./back-support-implementation-checklist.md).

**Product constraint (pre-release):** We do **not** maintain a separate “legacy” mode for old cards or templates. **`side: null` (or missing) is treated as `"front"`** everywhere — one normalization rule, no third “unspecified” behavior. Flip UI is driven only by the presence of **`"back"`** blocks after normalization.

---

## Executive Summary

Neither mobile nor web currently implements back-side flip logic. The web currently shows all blocks flat.

**Key architectural decisions:**
- **`side: "front" | "back"` embedded directly on each block** in both template `blocks[]` and card `blocks_snapshot[]` — single source of truth
- **`rendering.front_block_ids` / `rendering.back_block_ids` are removed** — they were the old way of grouping blocks by face (two ID arrays on the template), never written to Firestore by the web app and never consumed for flip logic. `applyTemplateSideFromRendering` / `applyTemplateSideFromRenderingAdmin` (dead code) have been deleted. `normalizeTemplateBlocksForWrite` still accepts MCP `rendering` input as a convenience shorthand and translates it to per-block `side` before writing — `rendering` never reaches Firestore.
- **Template editor uses "Add back of card" button** (Option B) — progressive disclosure, front-only by default
- **Block reordering**: drag-and-drop within a section + explicit "Move to back/front" button for cross-section moves; flat array storage, `side` is the only grouping mechanism

**Overall verdict: Highly feasible.** The data migration layer is already in place. The remaining work is the template editor UI refactor, study mode flip animation, and propagating `side` through card creation paths.

---

## Current State

| Area | Front | Back |
|---|---|---|
| Data model (Firestore) | ✅ Stored | ❌ `rendering` arrays exist but unused by either app |
| Template editor | ⚠️ Heuristic only (main+sub = front, rest = back) | ❌ No explicit UI |
| Card editor | ⚠️ Shows all blocks flat | ❌ No front/back visual grouping |
| Card preview | ❌ Renders all blocks flat | ❌ Ignored |
| Study mode | ⚠️ Reveals `hiddenText` only | ❌ No flip animation |
| AI card generation | ⚠️ No concept of side | ❌ Not handled |
| File / table to cards | ⚠️ Blocks mapped flat | ❌ No side assignment |
| Deck list card preview | ⚠️ Uses `mainBlockId` heuristic | ❌ No side awareness |
| CSV/XLSX export | ✅ Exports text | ❌ No front/back column distinction |
| CSV/XLSX import | ⚠️ Maps columns to blocks | ❌ No awareness of front/back |
| APKG export | ⚠️ Positional heuristic for Front/Back | ⚠️ Works but not driven by `side` |
| APKG import | ✅ Reads Anki Front/Back fields | ⚠️ Does not assign `side` to blocks |

---

## Area 1: Data Model

### Decision: `side` embedded per block, `rendering` deprecated

Each block carries a `side` field — the single source of truth for which card face it belongs to. `rendering.front_block_ids` / `rendering.back_block_ids` are treated as legacy input only: never written to Firestore, translated to per-block `side` on read.

---

### Template document (Firestore)

```
users/{uid}/templates/{templateId}

template_id:   string (UUID)
name:          string
description:   string
version:       number
main_block_id: string | null    // primary block for AI/MCP use
sub_block_id:  string | null    // secondary block for AI/MCP use

blocks: [
  {
    block_id:    string (UUID)
    type:        number (0–12)      // BlockType enum
    label:       string
    required:    boolean
    config_json: object | null
    side:        "front" | "back"   // ← NEW; single source of truth
  },
  ...
]

created_at:  Timestamp
updated_at:  Timestamp
deleted_at:  Timestamp | null
is_deleted:  boolean
```

**`rendering` removed.** No existing consumers in either app. Both mobile and web will read `block.side` when implementing back-side support.

**Default**: all blocks have `side: "front"` when no back section has been added.

---

### Card document (Firestore)

```
users/{uid}/cards/{cardId}

card_id:       string (UUID)
deck_id:       string
template_id:   string | null
main_block_id: string | null
sub_block_id:  string | null

blocks_snapshot: [
  {
    block_id:    string (UUID)
    type:        number (0–12)
    label:       string
    required:    boolean
    config_json: object | null
    side:        "front" | "back" | null   // ← NEW; null/missing normalized to "front" on read
  },
  ...
]
blocks_snapshot_json: string               // JSON of blocks_snapshot (mobile sync)

values: [
  {
    block_id:           string
    type:               number
    text:               string
    items:              any[] | undefined
    media_ids:          string[] | undefined
    original_media_ids: string[] | undefined
    correct_answers:    string[] | undefined
  },
  ...
]
values_json: string                        // JSON of values (mobile sync)

srs_state:       number
srs_step:        number | null
srs_stability:   number | null
srs_difficulty:  number | null
srs_due:         Timestamp | null
srs_last_review: Timestamp | null
review_count:    number

source:     object | null
created_at: Timestamp
updated_at: Timestamp
deleted_at: Timestamp | null
is_deleted: boolean
```

**`side: null` or missing** — Semantically **front** (same as `"front"`). Normalize on read (`side = block.side ?? "front"`) or once when hydrating cards so all app logic branches on `"front"` | `"back"` only. Flip appears when **any** block is **`"back"`** after normalization.

**No new top-level fields.** `side` travels inside `blocks_snapshot` / `blocks_snapshot_json`, which mobile already parses.

---

### How `side` flows from template → card

`side` is stamped from template blocks at card creation — cards are independent of future template edits:

```js
const blocksSnapshot = template.blocks.map(b => ({
  ...b,
  side: b.side ?? "front",   // inherited from template; default front
}));
```

---

### Code changes: `utils/firestore.js`

**`transformBlockToFirestore`** — pass `side` through (optional: omit or store `"front"` when unset):
```js
result.side = block.side ?? "front";
```

**`transformBlockFromFirestore`** — read `side`:
```js
return {
  blockId:    data.block_id,
  type:       data.type,
  label:      data.label || "",
  required:   data.required || false,
  configJson,
  side:       data.side ?? "front",   // null/missing → front
};
```

**`normalizeBlockForTransform`** — no change (`side` is the same in both camelCase and snake_case).

**`createTemplate` / `updateTemplate`** — already write only `side` per block via `normalizeTemplateBlocksForWrite`. No `rendering` is written to Firestore. No change needed.

**`transformTemplateFromFirestore`** — already calls `applyTemplateSideFromRendering`: reads `rendering.front_block_ids` / `rendering.back_block_ids` from legacy docs and stamps `side` on blocks. After re-save, blocks carry `side` explicitly and `rendering` is never written again. **Already implemented — no change needed.**

**`createDefaultTemplates`** (`utils/firestore.js:1184`) — the "English Vocabulary" and "Japanese Vocabulary" seed templates should stamp `side: "front"` / `side: "back"` on each block matching the existing `frontBlockIds` / `backBlockIds` groupings. If omitted, normalization still treats missing `side` as front, but explicit `side` keeps seed data clear and avoids relying on normalization for templates.

**`DEFAULT_BLOCKS` in card editor** (`card/[cardId]/page.js:114`) — the fallback block layout used when no template is selected has no `side`:
```js
{ blockId: "front", type: "header1", label: "Front", required: true },   // → side: "front"
{ blockId: "back",  type: "text",    label: "Back",  required: true },   // → side: "back"
{ blockId: "audio", type: "audio",   label: "Audio", required: false },  // → side: "front" or "back" — TBD
```
Add `side` to each entry.

**`importCardsFromSpreadsheet`** (`utils/firestore.js:1330`) — if kept, stamp `side: "front"` on each block (or inherit from template) so it matches the global rule. If unused, can be removed.

**`normalizeBlocks`** in card editor — verify this function passes unknown fields (including `side`) through when normalizing block types on load. If it rebuilds blocks by picking specific fields, `side` will be silently dropped.

---

### Code changes: `lib/firestore-admin.js`

**`blockToFirestore`** — same `side` passthrough as `transformBlockToFirestore`.

**`blockToExportShape`** (`lib/firestore-admin.js:1149`) — used by MCP `export_deck` to shape blocks in the exported card payload. Currently omits `side`. Add `side: data.side ?? "front"` so MCP clients and AI agents see front/back assignment in exported cards.

**`updateCardContent`** (`lib/firestore-admin.js:1403`) — when `blocks_snapshot` is updated via MCP, re-derives `mainBlockId`/`subBlockId` by position fallback (`blocksSnapshot[0]`, `blocksSnapshot[1]`). Once `side` is canonical, derive using normalized side (`null` → `"front"`):
```js
const effectiveSide = (b) => b.side ?? "front";
mainBlockId = blocksSnapshot.find(b => effectiveSide(b) === "front")?.blockId ?? blocksSnapshot[0]?.blockId
subBlockId  = blocksSnapshot.find(b => effectiveSide(b) === "back")?.blockId  ?? blocksSnapshot[1]?.blockId
```

---

## Area 2: Template Editor

### Decision: "Add back of card" button (Option B)

Progressive disclosure — the editor starts with a **Front section only**. An "Add back of card" button at the bottom reveals the Back section. Once visible, it can be dismissed via "Remove back" (with confirmation if back blocks exist).

### UX

```
┌──────────────────────────────┐
│  FRONT                       │
│  [Word]          [→ Back]    │
│  [Pronunciation] [→ Back]    │  ← drag handle + "Move to back" button
│  + Add block                 │
│                              │
│  [ + Add back of card ]      │  ← shown when no back blocks exist
└──────────────────────────────┘

           ↓ after clicking "Add back of card"

┌──────────────────────────────┐
│  FRONT                       │
│  [Word]          [→ Back]    │
│  [Pronunciation] [→ Back]    │
│  + Add block                 │
├──────────────────────────────┤
│  BACK                        │
│  [Definition]    [← Front]   │  ← drag handle + "Move to front" button
│  [Example]       [← Front]   │
│  + Add block                 │
│  [ Remove back ]             │
└──────────────────────────────┘
```

### State

```js
// All derived — no new useState needed (normalize: null/missing → "front")
const frontBlocks = blocks.filter(b => (b.side ?? "front") === "front");
const backBlocks  = blocks.filter(b => b.side === "back");
const hasBack     = backBlocks.length > 0;
```

New blocks added in the front section get `side: "front"`. New blocks added in the back section get `side: "back"`.

### Block reordering logic

**1. Within-section drag-and-drop** — reorders blocks within Front or within Back.

Reuses existing `moveBlock(fromIndex, toIndex)` helper. Each section renders its own drag list; actual indices in the flat `blocks[]` array are resolved before calling `moveBlock`:

```js
const fromActual = blocks.findIndex(b => b.blockId === draggedBlock.blockId);
const toActual   = blocks.findIndex(b => b.blockId === targetBlock.blockId);
moveBlock(fromActual, toActual);   // existing helper, unchanged
```

**2. Cross-section move via button** — flips `block.side`, block visually moves to the end of the target section:

```js
const moveSide = (blockId, targetSide) => {
  setBlocks(prev => prev.map(b =>
    b.blockId === blockId ? { ...b, side: targetSide } : b
  ));
};
```

**Array storage: interleaved** — blocks stay in their drag-drop position in the flat array. `side` is the only grouping mechanism; the array is never force-sorted:

```js
const frontBlocks = blocks.filter(b => (b.side ?? "front") === "front");
const backBlocks  = blocks.filter(b => b.side === "back");
```

### Template duplication (`app/dashboard/templates/page.js:56`)

`handleDuplicateTemplate` calls `getTemplate` then passes `fullTemplate.blocks` to `createTemplate`. Once `transformBlockToFirestore` passes `side` through, duplication inherits `side` automatically — **no separate fix needed**, but this depends on the transform fix landing first.

### Save flow

```js
// side is already on each block — just save blocks as-is, no rendering to derive
await updateTemplate(uid, templateId, { blocks, ... });
```

**Effort**: Medium — editor UI refactor. Schema change is additive.

---

## Area 3: Card Editor

- Visual **Front / Back section headers** in the block list, derived from normalized `block.side` in `blocksSnapshot` (`null`/`missing` → `"front"`).
- **Read-only for side assignment** — side is set by the template, not the card editor.
- No changes to value storage or save logic.

**Effort**: Low-Medium — presentation only.

---

## Area 4: Study Mode (Tap to Flip)

1. Split `blocksSnapshot` into front/back using normalized `side` (`null`/missing → `"front"`).
2. Show only front-side blocks before tap.
3. On `triggerReveal()` (`study/page.js:432`): animate a 3D flip to reveal back-side blocks.
4. Rating buttons appear after flip (same as now).

### Flip animation (Framer Motion — already in project)

```
[perspective: 1000px wrapper]
  └── [card container: animate rotateY 0 → 180deg]
        ├── [front face: backface-visibility: hidden, rotateY: 0]
        │     └── blocks.filter(b => (b.side ?? "front") === "front")
        └── [back face: backface-visibility: hidden, rotateY: 180deg]
              └── blocks.filter(b => b.side === "back")
```

### `hasRevealableBlocks` fix (`study/page.js:362`)

Currently iterates all of `currentCard.blocksSnapshot` to decide whether to show reveal/rating buttons. Must be updated to check only **back-side blocks** — a card with only front-side `hiddenText` blocks should not trigger the flip UI:

```js
// current — checks all blocks
const hasRevealableBlocks = card.blocksSnapshot.some(b => b.type === "hiddenText" || ...);

// fix — only back-side blocks gate the flip
const backBlocks = card.blocksSnapshot.filter(b => b.side === "back");
const hasRevealableBlocks = backBlocks.length > 0;
```

**Note:** With `null` ≡ front, a card whose blocks are all missing/`null`/`"front"` has **no** back face — show front content only (no flip). `hiddenText` on the front face can keep **non-flip** reveal behavior if you still support it for front-only cards; otherwise align product-wise with tap-to-flip only when `back` blocks exist.

**Effort**: Medium.

---

## Area 5: API Endpoints, AI Generation & Import Flows

### Core insight

`side` is **structural metadata inherited from the template** — not content the AI generates. AI route handlers require no changes. The work is in the functions that clone template blocks into a card's `blocksSnapshot`, plus one explicit fix in the import wizard and a UI grouping change in Step 3.

### Functions and locations to change

| Function / Location | File | Used by |
|---|---|---|
| `transformBlockToFirestore` | `utils/firestore.js:1041` | Web card editor |
| `transformBlockFromFirestore` | `utils/firestore.js:1002` | All Firestore card/template reads |
| `cloneTemplateBlockForCard` | `lib/firestore-admin.js:401` | MCP `create_card` / `create_cards` |
| `parseGeneratedCard` | `lib/ai-card-parse.js:175` | All 4 AI generation routes |
| `blockToFirestore` | `lib/firestore-admin.js` | Server-side template/card writes |
| `blockToExportShape` | `lib/firestore-admin.js:1149` | MCP `export_deck` |
| `templateBlocksSnapshot` construction | `page.js:1075` (import wizard) | File to cards — explicit field pick, separate fix |

Each logic change is one line. Everything downstream — API responses, Firestore writes, `blocks_snapshot_json` for mobile sync — picks it up automatically.

---

### AI card generation

Routes: `/api/cards/generate-with-ai`, `/api/cards/file-to-ai`, `/api/cards/import-ai-blocks`, `/api/mobile/cards/add-with-ai`

All funnel through `parseGeneratedCard()` in `lib/ai-card-parse.js:175`.

**Current** — `side` missing from `blocksSnapshot`:
```js
const blocksSnapshot = templateBlocksFull.map((b) => ({
  blockId:    b.blockId,
  type:       b.type,
  label:      b.label || "",
  required:   Boolean(b.required),
  configJson: ...,
  // ❌ side not passed through
}));
```

**Fix**: add `side: b.side ?? "front"`.

**AI prompts (`lib/card-ai-prompt.js`)** — currently describes the template to the LLM using singular `mainBlockId` (as "front field") and `subBlockId` (as "back field"). With multiple front/back blocks this becomes inaccurate. Update prompt builders to group all `side === "front"` blocks as front fields and all `side === "back"` blocks as back fields. This is a quality-of-AI-output concern, not a data correctness issue — lower priority.

---

### MCP `create_card` / `create_cards`

Goes through `createCardFromTemplateAdmin()` → `cloneTemplateBlockForCard()` in `lib/firestore-admin.js:401`.

**Fix**: `out.side = block.side ?? "front";`

MCP tool schema (`create_card`, `create_cards`) — **no change**. Callers never set `side` directly; always inherited from template.

### MCP `get_template_schema`

`buildMcpTemplateCardSchema` in `lib/firestore-admin.js:516` builds the block list returned to AI agents. Currently omits `side`:

```js
// current — side missing ❌
return {
  blockId:   b.blockId,
  type:      b.type,
  typeKey,
  category:  getMcpBlockCategory(typeKey) ?? "unknown",
  label:     b.label || "",
  required:  !!b.required,
  configJson: b.configJson ?? null,
};
```

**Fix**: add `side: b.side ?? "front"`. Without this, AI agents have no way to know which blocks go on the front vs. back face when generating card content.

---

### File to cards — import wizard (`app/dashboard/deck/[deckId]/page.js`)

**Logic fix — `templateBlocksSnapshot` construction (line 1075):**

Explicitly picks fields — does NOT spread `...block`, so `side` is dropped even if the template block carries it:

```js
// current — side is lost ❌
const templateBlocksSnapshot = selectedTemplate.blocks.map((block) => ({
  blockId:    block.blockId,
  type:       block.type,
  label:      block.label,
  required:   block.required,
  configJson: block.configJson,
}));
```

**Fix**: add `side: block.side ?? "front"`. Separate from the `transformBlockToFirestore` fix — both are needed.

**Step 3 mapping UI — group blocks by side:**

Blocks rendered as flat chips (line 4919). Group by side — Front chips first, "Back" divider, then Back chips:

```
Template Blocks:
[ Word ✓ ]  [ Pronunciation ]         ← Front blocks
  — Back —
[ Definition ]  [ Example (AI) ✓ ]    ← Back blocks
```

`columnMappings` shape — **no change**. `side` derivable from `selectedTemplate.blocks` by `blockId`.

---

### Table to cards — MCP `create_cards` bulk

Same path as MCP `create_card`. `cloneTemplateBlockForCard` fix covers all 50-card bulk requests.

---

## MCP Tool Audit

All 17 MCP tools reviewed against back-side support:

| Tool | Change needed | Notes |
|---|---|---|
| `list_docs` | ❌ None | Reads docs, no block data |
| `read_doc` | ❌ None | Reads docs, no block data |
| `list_template_block_types` | ❌ None | `side` is per-block-in-template, not per block type |
| `list_block_schemas` | ⚠️ Doc only | Add note that blocks carry `side: "front" \| "back"` (missing/`null` = front) |
| `list_elevenlabs_voices` | ❌ None | Unrelated |
| `list_decks` | ❌ None | Deck metadata only |
| `list_templates` | ❌ None | Template names only |
| `create_deck` | ❌ None | No blocks |
| `update_deck` | ❌ None | No blocks |
| `attach_audio_to_card` | ❌ None | Operates on specific `blockId`; `side` irrelevant |
| `get_template_schema` | ✅ Handler fix | `buildMcpTemplateCardSchema` omits `side` — AI agents can't see front/back |
| `create_card` | ✅ Handler fix | `cloneTemplateBlockForCard` drops `side` |
| `create_cards` | ✅ Handler fix | Same as `create_card` |
| `update_card` | ✅ Handler fix + schema doc | `updateCardContent` re-derives `mainBlockId`/`subBlockId` by position; schema should document `side` as valid on block items |
| `export_deck` | ✅ Handler fix | `blockToExportShape` omits `side` |
| `create_template` | ✅ Schema + handler change | Has `rendering: { frontBlockIds, backBlockIds }` — needs migration to `side` per block |
| `update_template` | ✅ Schema + handler change | Same as `create_template` |

---

### `create_template` / `update_template` — schema migration

These two tools currently accept `rendering: { frontBlockIds, backBlockIds }`. Since `rendering` is being removed from Firestore, this needs to change. But there is a complication — two input paths exist:

**Path A — `block_types`** (shorthand, just type keys):
```json
{ "block_types": ["header1", "text", "hiddenText"] }
```
No per-block metadata possible here, so `side` can't go on individual items. `rendering` currently fills this gap.

**Path B — `blocks`** (full block definitions):
```json
{
  "blocks": [
    { "type": "header1", "label": "Word",       "side": "front" },
    { "type": "text",    "label": "Definition", "side": "back"  }
  ]
}
```
`side` fits naturally per block.

**Recommended approach — keep `rendering` as an accepted MCP input for Path A, translate to `side` in handler, never store in Firestore:**

```
Path A (block_types + rendering):
  handler stamps side: "front"/"back" on blocks from rendering arrays
  rendering is NOT written to Firestore — only block.side is stored

Path B (blocks with side per block):
  handler uses block.side directly
  rendering param ignored

No rendering and no block.side provided:
  all blocks get side: "front" (front-only template — same as today)
```

This means:
- `rendering` stays in the MCP input schema as a convenience shorthand but is a handler-only concept — never reaches Firestore
- `blocks[]` items gain a documented `side` field
- Existing MCP clients using `rendering` continue to work unchanged

---

### Full change summary

| File | Location | Change | Status |
|---|---|---|---|
| `utils/firestore.js` | `normalizeTemplateBlocksForWrite` | Translates MCP `rendering` input → per-block `side`; never writes `rendering` to Firestore | ✅ Done (`applyTemplateSideFromRendering` removed, logic inlined) |
| `utils/firestore.js` | `transformTemplateFromFirestore` | Dead `renderingLegacy` read path removed | ✅ Done |
| `utils/firestore.js` | `transformBlockToFirestore` | `result.side = block.side ?? "front"` | ❌ Needs change |
| `utils/firestore.js` | `transformBlockFromFirestore` | `side: data.side ?? "front"` in return | ❌ Needs change |
| `utils/firestore.js` | `createDefaultTemplates` line 1184 | Add `side: "front"` / `side: "back"` to each seed block | ❌ Needs change |
| `lib/firestore-admin.js` | `normalizeTemplateBlocksForWriteAdmin` | Same as `utils/firestore.js` counterpart | ✅ Done (`applyTemplateSideFromRenderingAdmin` removed, logic inlined) |
| `lib/firestore-admin.js` | `cloneTemplateBlockForCard` | `out.side = block.side ?? "front"` | ❌ Needs change |
| `lib/firestore-admin.js` | `blockToFirestore` | `side` passthrough | ❌ Needs change |
| `lib/firestore-admin.js` | `blockToExportShape` line 1149 | `side: data.side ?? "front"` | ❌ Needs change |
| `lib/firestore-admin.js` | `updateCardContent` line 1403 | Derive `mainBlockId`/`subBlockId` from `side` not position | ❌ Needs change |
| `lib/firestore-admin.js` | `get_template_schema` ~line 556 | Add `side` per block in schema response | ❌ Needs change |
| `lib/ai-card-parse.js` | `parseGeneratedCard` | `side: b.side ?? "front"` in `blocksSnapshot` map | ❌ Needs change |
| `app/dashboard/deck/[deckId]/page.js` | `templateBlocksSnapshot` line 1075 | `side: block.side ?? "front"` | ❌ Needs change |
| `app/dashboard/deck/[deckId]/page.js` | Step 3 mapping UI line 4919 | Group block chips by side | ❌ Needs change |
| `app/dashboard/deck/[deckId]/card/[cardId]/page.js` | `DEFAULT_BLOCKS` line 114 | Add `side` to each fallback block | ❌ Needs change |
| `lib/card-ai-prompt.js` | prompt builders | Update to describe blocks by `side` grouping instead of singular `mainBlockId`/`subBlockId` | ❌ Needs change |
| `app/api/cards/*/route.js` | all AI routes | **No change** | ✅ No action |

**2 already done, 13 logic/data changes remaining + 1 UI grouping change.**

---

## Area 6: Import / Export

### APKG export

**Current heuristic** in `collapseToFrontBack` (`utils/apkgExport.js:663`):
```js
// Front = first block + all quiz blocks + all audio blocks; Back = everything else.
```

`fields[i]` and `blocks[i]` are index-aligned — `block.side` can be read directly at index `i`.

**Fix — branch on normalized `side` (`null`/missing → front); optional positional heuristic only if you still need it for ancient exports without any `side` field:**
```js
for (let i = 0; i < fields.length; i++) {
  const html = (fields[i] || "").trim();
  const face = blocks[i]?.side ?? "front";
  if (face === "back") backParts.push(html);
  else frontParts.push(html);
}
```

Everything else — `buildCollectionDb`, Anki card templates, quiz script, media ZIP — **no changes**.

| | Current | After `side` |
|---|---|---|
| Front | position 0 + quiz + audio blocks | `(block.side ?? "front") === "front"` |
| Back | everything else | `block.side === "back"` |
| Missing `side` | n/a | treated as front |

**Effort**: Low — one function, ~15 lines.

---

### APKG import

Assign `side` when parsing Anki's Front / Back fields in `apkgParser.js`:
- Anki `Front` field block → `side: "front"`
- Anki `Back` field block → `side: "back"`

**Effort**: Low.

---

### CSV / XLSX export
Prefix column headers with side label: `[Front] Word`, `[Back] Definition`.

**Effort**: Low.

---

### CSV / XLSX import
Show a Front / Back badge next to each block label in the column mapping dropdown. No logic change.

**Effort**: Low.

---

## Area 7: Card Preview & Deck List Previews

### Card preview page + card editor preview panel + file-to-AI preview modal

Three places use `CardPreviewContent` to render cards flat:

| Location | File | Line |
|---|---|---|
| Dedicated preview page | `card/[cardId]/preview/page.js` | 145 |
| Preview panel in card editor | `card/[cardId]/page.js` | 1438 |
| File-to-AI generated card preview modal | `deck/[deckId]/page.js` | 4613 |

All three must switch to the shared `FlipCard` component:

```jsx
<FlipCard
  frontBlocks={blocks.filter(b => (b.side ?? "front") === "front")}
  backBlocks={blocks.filter(b => b.side === "back")}
  values={values}
  mediaCache={mediaCache}
  isFlipped={isFlipped}
  onFlip={() => setIsFlipped(true)}
/>
```

**Effort**: Low-Medium — component extraction + 3 usage sites.

---

### Deck list card previews (`app/dashboard/deck/[deckId]/page.js`)

Two functions generate the one-line text summary shown in the card list row:

- **`getCardPreview`** (line 2767) — resolves the main summary text via `card.mainBlockId ?? template.mainBlockId`. Should prefer the first front-face block's value text using normalized `side` (`(b.side ?? "front") === "front"`).
- **`getGeneratedCardPreview`** (line 2542) — shows a summary of AI-generated cards before they are saved; picks the first value with text regardless of side.

Both should be updated to derive the front summary from front-face blocks. Low priority — these are display hints only, incorrect summary text is not a data issue.

**Effort**: Low.

---

## Summary: Effort Estimates

| Area | Effort | Risk | Notes |
|---|---|---|---|
| Data model (`side` on blocks + seed templates + DEFAULT_BLOCKS) | Low | Low | ~8 one-line changes; fully additive |
| Template editor ("Add back" + sections + reorder) | Medium | Low | UI refactor; no schema change beyond `side` |
| Card editor (front/back section headers) | Low-Medium | Low | Presentation only |
| Study mode (tap to flip + `hasRevealableBlocks` fix) | Medium | Medium | New animation; `null` side normalized to front |
| API / AI generation / import flows | Low-Medium | Low | 13 logic changes + Step 3 UI grouping |
| Import/export (APKG) | Low | Low | Replace heuristic; assign `side` on import |
| Import/export (CSV/XLSX) | Low | Low | Header labels + dropdown badge |
| Card preview (3 instances + FlipCard extraction) | Low-Medium | Low | Shared component, 3 usage sites |
| Deck list card preview summaries | Low | Low | Display hint only; `mainBlockId` → `side` derivation |

**Total estimated complexity**: Medium (2–3 sprint weeks for a single developer).

---

## Dependencies & Risks

1. **`side: null` / missing**: Treated as **`"front"`** everywhere — document one helper (e.g. `effectiveSide(b)`) so filters stay consistent.
2. **Old templates (no `side` on blocks)**: `transformTemplateFromFirestore` already handles this — reads `rendering` if present and stamps `side`. Pre-release: easier to just reset/re-seed dev data and skip the migration path.
3. **Mobile (after web)**: Mobile reads `block.side` from `blocks_snapshot_json` when implementing back-side support. Same rule: **`null`/missing → `"front"`**.
4. **`normalizeBlocks` in card editor**: Verify this function passes `side` through when normalizing block types on load. If it rebuilds blocks by picking specific fields, `side` will be silently dropped — check before shipping.
5. **`FlashcardContent` duplication**: Study mode's `FlashcardContent` duplicates `BlockDisplay`. Good opportunity to consolidate when extracting `FlipCard`.
6. **Template duplication**: Inherits `side` automatically once `transformBlockToFirestore` is fixed — no separate fix needed, but depends on that landing first.

---

## Recommended Implementation Order

1. **Data model**: Add `side` to remaining block clone/transform functions (`transformBlockToFirestore`, `transformBlockFromFirestore`, `cloneTemplateBlockForCard`, `blockToFirestore`). Fix `createDefaultTemplates` and `DEFAULT_BLOCKS`. (Template write/read migration already done.)
2. **Template editor**: "Add back of card" button, front/back sections, reordering.
3. **Study mode**: Tap-to-flip animation + `hasRevealableBlocks` fix.
4. **Card editor**: Front/back section headers.
5. **Card preview**: Extract `FlipCard` component; update all 3 usage sites.
6. **Import/export**: `side`-aware APKG; CSV/XLSX header labels; Step 3 UI grouping.
7. **MCP / AI prompts**: Update `get_template_schema`, `blockToExportShape`, `updateCardContent`, and prompt builders.
8. **Deck list previews**: Update `getCardPreview` / `getGeneratedCardPreview` to use `side`.
