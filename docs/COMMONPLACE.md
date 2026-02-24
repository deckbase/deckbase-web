# Commonplace Knowledge Cards — Tags + Reasoning Links Feature Spec (v1)

Owner: Product/Design  
Audience: Engineering (iOS/Android/Web), Backend, QA  
Status: Draft

## 1. Summary

Implement a **knowledge card** system that supports:

1. **Tags/Topics** for classification (navigation, filtering, decks)
2. **Reasoning Links** (typed, directional relationships) for connecting cards into arguments/insight networks

Core principle: **Tags organize notes; Links organize ideas.**  
UI and data model must keep these roles distinct so users don’t “file” using links.

---

## 2. Goals

- Make it effortless to create and maintain **atomic knowledge cards** (one idea per card).
- Provide **typed, directional links** between cards to form reasoning chains (e.g., “A explains B”).
- Keep **topics/tags lightweight** and frictionless at capture time.
- Encourage linking during review/processing with subtle nudges and good defaults.
- Ensure linking is fast (≤ 15 seconds interaction end-to-end for typical case).

---

## 3. Non-goals (v1)

- Full ontology editor or user-defined link type creation (optional later).
- Automatic “graph” visualization as a primary UI (can be v2+).
- AI-based semantic linking (can be v2+; design should allow future hook).
- OCR / transcription features (out of scope unless already planned).

---

## 4. Core Concepts

### 4.1 Card

Atomic unit of knowledge.

**Card should support a “Front / Back” mental model:**

- Front = clip / content
- Back = user interpretation, “why it matters”, example, rewrite

### 4.2 Topics/Tags

Classification tool for browsing/filtering.

- Used to generate Decks and filters.
- Not treated as a relationship between cards.
- Recommended constraint: 1–3 topics per card (soft enforcement).

### 4.3 Reasoning Links

Explicit, typed relationships between two cards.

- Directional for most types (A → B).
- Some are bidirectional (A ↔ B).
- Each link optionally contains a short explanation sentence (“Because…”).

---

## 5. Link Types (Canonical Set)

### 5.1 Core Types (always visible in UI)

These cover ~80% of linking behavior.

1. **Explains** (A explains B) — directional
2. **Supports / Evidence for** (A supports B) — directional
3. **Contrasts with** (A contrasts B) — bidirectional or directional (see note below)
4. **Example of** (A is an example of B) — directional
5. **Leads to / Causes** (A leads to B) — directional
6. **Similar to** (A similar to B) — bidirectional

**Direction rules:**

- Similar to: bidirectional
- Contrasts with: bidirectional (recommended)
- Explains/Supports/Example/Leads to: directional

### 5.2 Advanced Types (hidden behind “More…” in UI; v1 optional)

- Equivalent to (↔)
- Generalizes (A generalizes B)
- Refines (A refines B)
- Depends on (A depends on B)
- Enables (A enables B)
- Reframes (A reframes B)

**Recommendation:** Ship only core types in v1; keep API extensible.

### 5.3 Explicitly excluded as Link Types

These should be implemented as Topics/Tags, not links:

- “Belongs to”
- “In the same group as”
- “In category”

Rationale: these are classification, not reasoning.

---

## 6. Data Model

### 6.1 Card

Required:

- `id: UUID`
- `front: string | richtext`
- `back: string | richtext | null`
- `created_at: timestamp`
- `updated_at: timestamp`

Optional:

- `type: enum {Quote, Concept, Question, Rule, Story, Definition, Note}`
- `topics: string[]` (or topic IDs)
- `tags: string[]` (optional; can be hidden in UI)
- `language: string` (BCP-47; auto-detect + override)
- `source: { title?, author?, url?, page?, publication? } | null`
- `status: enum {Inbox, Filed, Evergreen, Archived}`

### 6.2 Topic

- `id: UUID`
- `name: string`
- `created_at, updated_at`
- (optional) `description`, `color`

### 6.3 Link

A link connects two card IDs and includes a type and optional explanation.

- `id: UUID`
- `from_card_id: UUID`
- `to_card_id: UUID`
- `type: enum` (core + future)
- `direction: enum {Directional, Bidirectional}`
- `note: string | null` (the “Because…” sentence)
- `created_at, updated_at`
- `created_by_user_id` (if multi-user later)
- `deleted_at` (soft delete recommended)

**Normalization:**

- For bidirectional types, store canonical ordering to prevent duplicates:
  - e.g., `min(cardA, cardB)` as `from`, `max` as `to`, with `direction=Bidirectional`.
- Prevent duplicate links of same type between same endpoints (unless explicitly desired).

---

## 7. Key User Flows (UX Requirements)

### 7.1 Capture → Inbox

- Global “+ Card” entry.
- Minimal friction: user can save with **front only**.
- After saving, show a bottom sheet (optional):
  - Add Topic (optional)
  - Set Type (optional)
  - Add Source (optional)
- Default: `status=Inbox`

### 7.2 Process Inbox → Filed / Evergreen

Inbox list supports quick actions:

- Swipe: File (add topic) / Archive
- Tap: Open and edit Back, add link(s)

### 7.3 Create a Reasoning Link

From inside a card, user taps **Connect**:

1. Choose target card:
   - Search by text
   - Recent cards
   - Suggested cards (shared topic, similar keywords; v1 can be simple)
2. Choose link type (core list)
3. Optional: add “Because…” note (1 sentence encouraged)
4. Save

**Speed requirement:** typical link creation should be possible in ≤ 15 seconds.

### 7.4 Review Mode (Link Nudges)

Daily stack of resurfaced cards (v1 minimal):

- A mix of:
  - cards with empty back
  - evergreen cards not seen recently
  - cards saved recently
- CTA prompts:
  - “Add a note?”
  - “Connect to another card?”
- Suggested target cards should be shown here for quick linking.

---

## 8. UI/Interaction Design Requirements

### 8.1 Separation of Classification vs Reasoning

- Topics/tags appear in a distinct UI area (e.g., top metadata chips).
- Links appear in a separate “Connections” area with verb labels + direction.

**Do not:**

- Allow creating “belongs to” as a link type.
- Auto-generate links from shared topics.
- Show topics inside the link-type picker.

### 8.2 Link Rendering

In Card detail view:

- Show as readable statements:
  - `This card` **Explains →** `[Other card title/preview]`
  - include “Because…” note if present
- Provide filters in Connections list:
  - By type
  - Outgoing / incoming (for directional types)

### 8.3 Default Copy (Suggested)

- Button label: **Connect**
- Link note placeholder: **“Because…”** / “Why are these connected?”
- Microcopy: “Add one sentence (optional).”

---

## 9. Validation Rules & Edge Cases

- A card cannot link to itself.
- If a linked card is archived:
  - Keep link, but indicate archived status in UI.
- If a card is deleted:
  - Soft delete card; cascade soft delete links or keep with “missing card” placeholder (choose approach).
- Duplicate prevention:
  - Avoid exact duplicates (same endpoints + type + direction).
- Topic constraints:
  - Soft cap 3 topics per card (prompt user to choose top 3; allow override if desired).
- Offline support:
  - Links and cards should be queueable for sync.

---

## 10. API / Storage (Suggested Endpoints)

(Adjust to existing architecture.)

### Cards

- `POST /cards`
- `GET /cards/:id`
- `PATCH /cards/:id`
- `GET /cards?query=&topic=&type=&status=`

### Topics

- `POST /topics`
- `GET /topics`
- `PATCH /topics/:id`

### Links

- `POST /links`
- `GET /cards/:id/links` (returns incoming + outgoing)
- `PATCH /links/:id`
- `DELETE /links/:id` (soft delete)

### Suggestions (Optional v1)

- `GET /cards/:id/suggestions` (returns candidate cards for linking)
  Heuristic baseline:
- shared topic overlap
- keyword overlap on front/back
- recency

---

## 11. Analytics / Telemetry (to validate success)

Track:

- `card_created`
- `topic_added_to_card`
- `back_filled`
- `link_created` with `type`
- `link_note_added` (whether “Because…” used)
- `review_opened`
- `review_action_taken` (note/link/archive)

Success metrics:

- % of cards with back filled after 7 days
- average links per card after 30 days
- ratio of reasoning links vs classification actions
- retention correlation: users who create ≥ X links/week

---

## 12. QA Checklist

- Create/edit/delete card; ensure links update correctly.
- Directionality displays correctly for each type.
- Bidirectional links do not duplicate in reverse.
- Search target card works and is fast.
- Offline creation of card/link syncs correctly.
- Archived/deleted card handling is sane and non-breaking.
- Topic assignment does not create links.

---

## 13. Future Extensions (v2+)

- AI/semantic suggestions for linking
- Graph view (optional)
- Custom link types (opt-in, limited)
- Spaced repetition (definitions/questions)
- Export to Markdown/PDF with link semantics

---

## Appendix A — Link Type Copy & Icons (Optional)

(Core suggestions; icons are placeholders)

- Explains (🧠 →)
- Supports / Evidence (🧾 →)
- Contrasts (⚖ ↔)
- Example of (🧩 →)
- Leads to / Causes (➡️ →)
- Similar to (🔗 ↔)

---

## Appendix B — “Because…” Note Examples

- “This explains why X happens under Y conditions.”
- “This is evidence that supports the claim.”
- “These disagree on the mechanism, compare assumptions.”
- “This is a concrete instance of the general rule.”
- “This tends to lead to that outcome through Z.”
