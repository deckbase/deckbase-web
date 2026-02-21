# Spellbook — Schema and Gamification Context

This doc explains **what schema (data model) plays into our gamifying context**: which entities and fields power the game loop, how they relate to the current Deckbase Firestore structure, and what to add so we can ship Spellbook (cards as spells, XP, levels, battles, domains) without fighting the existing app.

---

## 1. What “schema” means in our gamifying context

In a gamified Spellbook product, **schema** is the set of stored facts that let us:

- Show **which cards exist** and their **rarity, type, domain, power** (so we can render “spell cards” and filter by school/domain).
- Know **what the user has unlocked / collected** and **how well they know each card** (mastery, last review).
- Compute **XP, level, streak** and **what is unlocked next** (progression).
- Run **battles** (quiz sessions) and record **wins/losses** and **XP earned** (combat loop).
- Support **daily quests, bosses, and later factions** (optional extensions).

So schema touches:

1. **Card catalog** — the “spells” (and optionally shared/global cards vs user-created).
2. **User’s cards and progress** — which cards they have, SRS state, and eventually per-card mastery.
3. **User progression** — XP, level, streak, last active date.
4. **Battle/quiz sessions** — optional explicit “battle” records for history and analytics.
5. **Domains/schools** — which content namespace a card belongs to (english, psychology, etc.).

Below we map these to **current** Deckbase schema and then **additions** for Spellbook.

---

## 2. Current schema (Deckbase) vs gamification needs

### 2.1 Current Firestore layout (simplified)

```
flashcards/{uid}/data/main/
  decks/{deckId}     → deck_id, title, description, timestamps, is_deleted
  cards/{cardId}     → card_id, deck_id, template_id, blocks_snapshot, values,
                       SRS: srs_state, srs_step, srs_stability, srs_due, review_count, ...
  templates/{templateId}
users/{uid}/
  profile            → email, display_name, ...
  media/{mediaId}
```

- **Decks** = containers; no gamification fields.
- **Cards** = content + SRS (when to review, stability, etc.); no **rarity, type, domain, power**.
- **Users** = profile only; no **XP, level, streak**.

### 2.2 What gamification needs from schema

| Need | Current schema | Gap |
|------|----------------|-----|
| “This is a spell card with rarity/type” | Card has template + values only | No `domain`, `type`, `rarity`, `power` (or equivalent). |
| “Card belongs to English vs Psychology” | Deck is the only grouping | No `domain`/`school` on card or deck. |
| “User has X XP and level Y” | — | No user progression doc. |
| “User’s streak and last active day” | — | No streak / last_active. |
| “User unlocked this card / mastered it” | Card exists in user’s cards; SRS gives “how well” | Unlock can be “has card”; mastery can come from SRS or a separate mastery %. |
| “Battle happened; user won/lost; XP earned” | — | Optional: battle/session records. |

So the **schema that plays into gamifying context** is:

- **Card (or deck) level:** add fields (or derive from template) for **domain, type, rarity, power** so the app can show spell cards and filter by domain.
- **User level:** add **progression** (XP, level, streak, last_active).
- **Optional:** **battle/session** collection for battle history and analytics.

---

## 3. Proposed schema additions for Spellbook

### 3.1 Card-level: Spellbook metadata

Add to **card** (or to a “card metadata” object if you want to keep core card schema unchanged). Prefer **one card schema** for both “language” and “domain” cards (see [SPELLBOOK_EXPANSION_ROADMAP.md](./SPELLBOOK_EXPANSION_ROADMAP.md)).

| Field | Type | Purpose in gamification |
|-------|------|--------------------------|
| `domain` or `school` | string | Content namespace: `"english"`, `"psychology"`, `"economics"`, etc. Drives filters and “magic school” UI. |
| `card_type` or `spell_type` | string | `"spell"` \| `"technique"` \| `"curse"` \| `"legendary"` \| `"boss"`. Drives card frame and behavior. |
| `rarity` | string | `"common"` \| `"rare"` \| `"epic"` \| `"legendary"`. Drives collectibility and unlock logic. |
| `power` | number (e.g. 1–10) | “Power level” for display and optional difficulty. |

Existing `template_id` + `values` (and blocks) still hold the actual content (word/concept, meaning/effect, example). So **schema’s role in gamification** here is: these few fields turn a generic flashcard into a **spell card** the UI can rank, filter, and present with the right frame and rarity.

**Where to store:**  
- **Option A:** Add these fields directly to the existing card document (simplest; works if all cards can be “spell” cards).  
- **Option B:** New subcollection or doc per card for “spellbook_metadata” if you must keep current card schema untouched for mobile/sync.

### 3.2 Deck-level: Domain for whole deck

If cards in a deck share one domain/school, you can add:

| Field | Type | Purpose |
|-------|------|----------|
| `domain` or `school` | string | e.g. `"english"`, `"psychology"`. Default for cards in this deck; can override on card. |

Then UI can “filter by domain” by deck or by card.

### 3.3 User-level: Progression (XP, level, streak)

Add a **user progression** doc (e.g. `users/{uid}/progress` or `flashcards/{uid}/data/main/progress`).

| Field | Type | Purpose in gamification |
|-------|------|--------------------------|
| `xp` | number | Total XP; drives level. |
| `level` | number | Derived from XP or stored; gates unlocks and status. |
| `streak_days` | number | Current streak (e.g. days with at least one review). |
| `last_active_date` | string (e.g. YYYY-MM-DD) or timestamp | To compute streak and “daily” quests. |
| `total_reviews` or `battles_won` | number | Optional; for badges or leaderboards. |

**Schema’s role:** This is the single place the app reads “how strong” the user is and whether they kept streak; level can drive “unlock next tier” and cosmetics.

### 3.4 Optional: Battle / session history

If you want explicit “battle” records (for history, analytics, or “daily boss”):

| Field | Type | Purpose |
|-------|------|----------|
| `user_id` | string | Who fought. |
| `session_type` | string | e.g. `"battle"`, `"daily_boss"`, `"word_duel"`. |
| `outcome` | string | e.g. `"win"`, `"lose"`. |
| `xp_earned` | number | XP granted this session. |
| `card_ids` or `deck_id` | array / string | What was reviewed. |
| `completed_at` | timestamp | When the battle ended. |

Store in e.g. `flashcards/{uid}/data/main/battles/{battleId}` or `users/{uid}/battles/{battleId}`. This supports “battles won” and replay/analytics.

---

## 4. How this fits the game loop (recap)

- **Learn (battle a card):** Card comes from **cards** (with spellbook metadata); quiz uses existing card content (values/blocks).
- **Win XP:** After a session, **progress** doc is updated: `xp` += earned, optionally `level` and `streak_days`, `last_active_date`.
- **Unlock new rarity:** Driven by **level** (and optionally `progress`) and card **rarity**; “unlock” can mean “can now draw from rare pool” or “this card is now visible.”
- **Level up:** Computed or stored in **progress.level** from `xp`.
- **Face harder concepts:** Filter **cards** by `domain` and optionally `rarity`/`power`; SRS already handles “when to show again.”
- **AI adapts:** AI generates cards with the right `domain`, `rarity`, `card_type`; schema stays the same.

So **the schema that plays into our gamifying context** is:

1. **Card (or deck) spellbook fields** — domain, type, rarity, power.  
2. **User progression** — xp, level, streak, last_active (and optional battle stats).  
3. **Optional battle/session docs** — for history and “battles won.”

Existing **decks, cards, templates, SRS** stay; we **add** these fields/collections so the same app can run the Spellbook loop and later support multiple domains and schools without another big schema change.

---

## 5. Summary table: schema ↔ gamification

| Gamification concept | Schema that supports it |
|----------------------|-------------------------|
| Spell card with rarity/type | Card (or deck): `domain`, `card_type`, `rarity`, `power` |
| “English vs Psychology” | Card/deck: `domain` |
| User level & XP | User: `progress` doc with `xp`, `level` |
| Streak & daily quests | User: `progress.streak_days`, `last_active_date` |
| Unlock by level | `progress.level` + card `rarity` (e.g. level 5 → can see “rare”) |
| Battle / quiz | Existing cards + SRS; optional `battles` collection |
| Collectibility | Cards in user’s collection + `rarity`/`card_type` for display |
| Multiple domains later | Same card schema; new `domain` values and content |

---

## 6. Alignment with MVP Technical Spec (v2.0)

The **authoritative technical spec** for the adaptive TCG engine is [DECKBASE_MVP_TECHNICAL_SPEC.md](./DECKBASE_MVP_TECHNICAL_SPEC.md). That spec defines:

| This doc (generic Spellbook) | MVP Spec (v2.0) |
|------------------------------|------------------|
| “Card catalog” with domain, rarity, type | **Concept** (global): domain, text, definition, examples, ai_complexity_score, appearance_count, rarity_score, rarity_tier |
| User’s cards + mastery | **UserConceptStats** (shared Study + Wizard): mastery_percent, attempt_count, correct_count, last_seen |
| User XP, level, streak | **User**: xp, level, current_streak, rolling_accuracy, **momentum_score** (no atk/def on user) |
| “Battle” / spell card with ATK/DEF | **CardInstance** (ephemeral per Wizard battle): atk, def, challenge_type, momentum_snapshot, rarity_snapshot |
| Decks | **FlashcardDeck** (Study) and **WizardDeck** (Wizard); same concept can be in both |
| Rarity | AI complexity + exposure adjustment; tier Common/Rare/Epic/Legendary; no correctness in formula |
| Short-term “energy” | **Momentum** (Recovery / Stable / Empowered / Surge); influences battle scaling and XP multiplier only |

When implementing, **prefer the MVP spec** for: Concept vs CardInstance split, dual decks, rarity formula, momentum formula, ATK/DEF formulas, XP and mastery rules. This schema doc remains the “why schema matters for gamification” and how it maps to current Firestore; the spec is the source of truth for field names and formulas.

---

## Document control

- **Purpose:** Define which schema (data model) supports Spellbook gamification and how it fits current Firestore.  
- **Related:** [DECKBASE_MVP_TECHNICAL_SPEC.md](./DECKBASE_MVP_TECHNICAL_SPEC.md) (authoritative MVP spec v2.0), [SPELLBOOK_EXPANSION_ROADMAP.md](./SPELLBOOK_EXPANSION_ROADMAP.md) (card model for domains), [SPELLBOOK_ENGLISH_PRODUCT_DESIGN.md](./SPELLBOOK_ENGLISH_PRODUCT_DESIGN.md) (game loop), [FSRS_AND_FIREBASE_ADDENDUM.md](../FSRS_AND_FIREBASE_ADDENDUM.md) (current Firestore structure).  
- **Review:** Update when we add or change progression, battle, or card metadata; keep aligned with MVP spec.
