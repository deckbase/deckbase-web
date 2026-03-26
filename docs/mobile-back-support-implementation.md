# Mobile Implementation Spec: Back-side Card Support

**Date:** 2026-03-26  
**Audience:** iOS / Android mobile team  
**Goal:** Implement two-sided flashcards on mobile with behavior parity to web.

---

## 1) Product Contract (Non-negotiable)

- `side` is the single source of truth for face assignment.
- Valid values are `"front"` or `"back"`.
- Missing / `null` / unknown `side` must be normalized to `"front"`.
- A card is treated as two-sided if **any** block has `side === "back"` after normalization.
- No legacy "unspecified face" mode.

---

## 2) Data Contract You Can Rely On

## Template blocks

Template block entries include `side`:

```json
{
  "block_id": "uuid",
  "type": 0,
  "label": "Word",
  "required": true,
  "config_json": null,
  "side": "front"
}
```

## Card blocks snapshot

Card documents include `blocks_snapshot` and `blocks_snapshot_json`. Both carry `side`:

```json
{
  "block_id": "uuid",
  "type": 3,
  "label": "Definition",
  "required": false,
  "config_json": null,
  "side": "back"
}
```

## Runtime normalization helper (mobile)

Use one helper and apply it everywhere:

```ts
function effectiveSide(block: { side?: string | null }): "front" | "back" {
  return block?.side === "back" ? "back" : "front";
}
```

---

## 3) API / Backend Status (already updated)

The web/backend side now stamps and preserves `side` through all card creation paths:

- Firestore client transforms (`utils/firestore.js`) preserve `side`.
- Admin card creation (`lib/firestore-admin.js`) stores `side` in `blocks_snapshot`.
- AI parsing (`lib/ai-card-parse.js`) includes `side` in generated `blocksSnapshot`.
- MCP schema/export includes `side` (`get_template_schema`, `export_deck`).
- AI routes now pass template `side` through prompts and generated cards:
  - `POST /api/cards/generate-with-ai`
  - `POST /api/cards/file-to-ai`
  - `POST /api/cards/import-ai-blocks`
  - `POST /api/mobile/cards/add-with-ai`

Mobile should assume `side` is present for new/updated content, and still normalize old records.

---

## 4) Mobile Feature Scope

Implement in this order:

1. **Read-path normalization** (`effectiveSide`) in model layer.
2. **Study screen flip UX** (front first, back after flip).
3. **Card preview** in mobile deck/card details.
4. **Card editor** front/back sections.
5. **Template editor** front/back sections (if mobile owns template editing).
6. **Regression + telemetry checks**.

---

## 5) Study Screen Behavior (Parity Spec)

## Face composition

- Build `frontBlocks = blocks.filter(effectiveSide === "front")`
- Build `backBlocks = blocks.filter(effectiveSide === "back")`
- `hasBackFace = backBlocks.length > 0`

## Rendering rules

- If `hasBackFace === false`: show current one-face behavior.
- If `hasBackFace === true`:
  - Show front face first.
  - "Show back" flips to back face.
  - Back face shows only back blocks.
  - "Show front" flips back.

## Quiz/reveal progression

Maintain existing block-level reveal logic, but scope it by visible face:

- Front face: reveal/quiz completion gates only front blocks.
- Back face: reveal/quiz completion gates back blocks.
- Graduation/SRS actions are available after required reveal flow for visible face is complete (same parity logic as web study page).

---

## 6) Card Preview Behavior

- Use `effectiveSide`.
- Front-only card: current preview.
- Two-sided card:
  - show front preview by default.
  - toggle or swipe to back preview.
  - no mixed-face preview list.

If space is limited (list rows), prefer front-only summary and indicate "Back available".

---

## 7) Card Editor Behavior

## Layout

- Section 1: `Front`
- Section 2: `Back` (hidden until:
  - user taps "Add back of card", or
  - existing back blocks are present)

## Add block behavior

- "Add block" in Front section inserts block with `side: "front"`.
- "Add block" in Back section inserts block with `side: "back"`.

## Reorder behavior

- Reorder within same face is allowed.
- Cross-face move must explicitly set `side` and place into target face section.

## Remove back behavior

- If user removes all back blocks, card becomes front-only immediately.
- Optional UX: confirmation if removing back would discard non-empty content.

---

## 8) Template Editor Behavior (if mobile supports it)

Mirror card editor mechanics:

- Progressive "Add back of card"
- Face-scoped add/reorder/move
- Persist `side` per block
- No writing `rendering` fields to Firestore

Legacy input (`rendering.frontBlockIds/backBlockIds`) may still be accepted by some server handlers, but mobile should not rely on or emit it.

---

## 9) Parsing & Sync Requirements

## Read path

When loading card/template from Firestore:

- Prefer JSON mirrors (`*_json`) if that is current mobile pattern.
- Ensure parser retains unknown fields and explicitly keeps `side`.
- Normalize side once and keep normalized value in app state.

## Write path

When writing `blocks_snapshot` / `blocks_snapshot_json`:

- Keep `side` on every block.
- If app creates blocks locally and side is missing, set to `"front"` before save.

---

## 10) Backward Compatibility

Old cards/templates may have missing `side`. Handle as:

- Runtime: treat as `"front"`.
- Optional migration on write: when user edits/saves, write explicit `side` values.
- Do not create separate legacy rendering branch.

---

## 11) QA Matrix (Minimum)

## A. Data and parsing

- Old card with no `side` loads as front-only.
- New two-sided card preserves side through app restart and sync.
- `blocks_snapshot_json` and in-memory model stay consistent.

## B. Study

- Front-only card behaves unchanged.
- Two-sided card starts on front, flips to back, and can flip back.
- Quiz/reveal gating works on front and back independently.

## C. Editing

- Add back creates `side: "back"` blocks.
- Moving block front->back and back->front updates `side` correctly.
- Removing back blocks returns card to front-only mode.

## D. Cross-surface

- Card created by web with back blocks displays correctly on mobile.
- Card created by mobile with back blocks displays correctly on web.
- AI-generated card with back blocks renders correctly on mobile.

## E. Import/export touchpoints

- APKG-imported cards with mapped back fields appear as two-sided.
- MCP/AI-created cards with `side` are rendered correctly in mobile study and preview.

---

## 12) Telemetry / Debug Logging (recommended)

Add lightweight logs/counters for rollout:

- `% cards loaded with hasBackFace`
- `% blocks missing side on read` (should trend to zero)
- study flip action count
- errors parsing blocks with side

These help detect parser regressions quickly after release.

---

## 13) Rollout Plan

1. Ship model normalization + read support behind feature flag.
2. Enable study flip for internal users.
3. Enable editor/template sections for beta cohort.
4. Remove flag once error and metric thresholds are stable.

Suggested guardrails:

- Crash-free sessions unchanged.
- No increase in card load/parse failures.
- Back-face cards render correctly across at least one full sync cycle.

---

## 14) Implementation Checklist (Mobile Team)

- [ ] Add `effectiveSide()` utility in shared model layer.
- [ ] Normalize `side` on all template/card block reads.
- [ ] Ensure write serializers include `side`.
- [ ] Implement study flip UI and face-separated rendering.
- [ ] Implement preview face toggle.
- [ ] Implement card editor front/back sections.
- [ ] Implement template editor front/back sections (if applicable).
- [ ] Add regression tests for old data (missing side).
- [ ] Run cross-surface QA with web-created and AI-created cards.
- [ ] Validate telemetry and remove rollout flag.

---

## Related Docs

- Web feasibility and rationale: `docs/feasibility-back-side-support.md`
- Web implementation status: `docs/back-support-implementation-checklist.md`
- MCP docs for AI clients: `docs/public/MCP.md`, `docs/public/MCP-AI-CARD-WORKFLOW.md`
