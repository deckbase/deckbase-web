# Spellbook — Expansion Roadmap (Order & Build Implications)

This doc defines **expansion sequence**, **dependencies**, and **how to build today** so we can grow into a global, multi-domain, gamified learning universe without rebranding or big rewrites.

**Principle:** Every current design choice should ask: *Does this make the next expansion easier or harder?*

---

## 1. Expansion Sequence (Recommended Order)

We don’t do everything at once. This order balances traction, reuse, and brand.

| Phase | Expansion | Why this order |
|-------|-----------|----------------|
| **0** | English + dark TCG + cards + battle quiz (MVP) | Prove loop and retention before scaling. |
| **1** | More English content + rarity + daily boss | Deepen engagement in one language; validate rarity and “boss” appeal. |
| **2** | Second language (e.g. Japanese) as “magic school” | Same engine, new content; tests “school” framing and i18n. |
| **3** | First knowledge domain (e.g. Psychology or Economics) | Proves “spell = concept” works beyond language; same card system. |
| **4** | More languages + more domains | Scale what already works; add schools and domains in parallel. |
| **5** | Factions, leaderboards, AI dungeon | Deeper gamification once core loop and content scale are working. |
| **6** | Physical/digital products (prints, packs, merch) | Brand and audience are clear; monetization and reach justify ops. |

**Summary:**  
MVP → English depth + bosses → Second language (school) → First non-language domain → Scale languages/domains → Deeper game modes → Physical/digital products.

---

## 2. What to Build Today So Expansion Is Easy

### 2.1 Data model: “card” is generic from day one

- **Card** = spell/technique/curse/boss; has `type`, `rarity`, `power`, `mastery`, `content` (or structured fields).
- **Do not** hardcode “word” or “English” in the core schema. Use:
  - `card.domain` or `card.school` = `"english"` | `"japanese"` | `"psychology"` | `"economics"` | …
  - `card.type` = `"spell"` | `"technique"` | `"curse"` | `"legendary"` | `"boss"`.
- **Outcome:** Adding a new language or domain = new `school`/`domain` + content; no schema change.

### 2.2 “School” vs “domain” (naming)

- **School** = language (English, Japanese, French, …). One school = one magic school (e.g. Destruction, Spirit, Court).
- **Domain** = non-language knowledge (Psychology, Economics, Biology, …).
- In code/config: treat both as **content namespaces** (e.g. `contentSourceId` or `deckId` that maps to a school or domain). Same card engine, different content sets.

### 2.3 Content and copy

- **Copy and UI:** Prefer “Spell”, “Technique”, “Unlock”, “Power”, “Rarity” from the start. Avoid “vocabulary”, “flashcard”, “lesson” in core product UI so the brand works for languages and domains.
- **Localization:** When we add a second language (e.g. Japanese), we need i18n for **app UI**; card content can stay per-school (e.g. English cards in English, Japanese cards in Japanese). Plan one locale/language config early (e.g. `locale` in user or app config).

### 2.4 AI pipeline

- **Prompt templates** should take `school` or `domain` and `rarity` (and maybe language) as parameters. Same pipeline generates English spells, Japanese spells, or Psychology “spells” with different prompts. Don’t hardcode “English” in the generator.

### 2.5 Progression and XP

- **XP and levels** should be global (or per-user), not “per language” only. Later we can add per-school or per-domain progress, but the core identity is “one character, one spellbook”. Design so we can attach progress to `(user, school)` or `(user, domain)` later without redoing the whole system.

---

## 3. Expansion Triggers (When to Consider Each Step)

| Expansion | Trigger (examples) |
|-----------|---------------------|
| **More English + bosses** | MVP retention/DAU or completion rate above a set bar. |
| **Second language (school)** | Clear demand (comments, DMs, waitlist) or strategic market (e.g. JP). |
| **First knowledge domain** | Same: demand or strategic bet (e.g. “Psychology deck” for exams). |
| **More languages/domains** | Proven engagement in 2+ schools/domains; content pipeline can sustain more. |
| **Factions / dungeon / leaderboards** | Strong retention and willingness to pay; need for deeper engagement. |
| **Physical/digital products** | Recognizable brand; audience size that justifies fulfillment and support. |

Use these as gates: don’t open the next expansion until the previous one is validated enough (or explicitly overridden by strategy).

---

## 4. How to Expand Beyond Language Cards

Same engine, same card format. A **language card** teaches a word/phrase; a **domain card** teaches a concept. The UI and game loop stay the same; only the content and framing change.

### 4.1 Same format, different content

| Language card (e.g. English) | Domain card (e.g. Psychology) |
|-----------------------------|------------------------------|
| **Spell** = word (e.g. “Obliterate”) | **Spell** = concept (e.g. “Cognitive Dissonance”) |
| **Type** = Destruction / Power / … | **Type** = Mind Manipulation / Social / … |
| **Meaning** = definition | **Effect** = what the concept does |
| **Incantation** = example sentence | **Scene** or **Example** = real-world use |
| **Rarity** = by word difficulty | **Rarity** = by concept level (intro → advanced) |

So: **word → concept**, **meaning → effect**, **example sentence → scene/example**. Same fields in the data model; different labels in the domain’s “flavor” (e.g. Psychology uses “Effect” and “Scene”).

### 4.2 One data model for both

Use a **single card schema** with a `domain` (or `school`) field:

- `domain: "english"` → language card (word, meaning, incantation).
- `domain: "psychology"` → concept card (concept name, effect, scene).

Optional: add a `cardSubtype` or `flavor` so the UI can show “Incantation” for English and “Scene” for Psychology. Or keep one set of labels (e.g. “Meaning” and “Example”) for all and only change the domain name and art.

### 4.3 Steps to add a new knowledge domain

1. **Define the domain in config**  
   Add e.g. `psychology` to the list of domains. Give it a display name (“Psychology”), a short theme (e.g. “Mind Magic”), and optional art/color.

2. **Define the card template for that domain**  
   Same structure as language cards, but with domain-specific labels if you want (e.g. Effect, Scene, Class). In code this is one template with optional overrides per domain.

3. **Create an AI prompt for that domain**  
   Prompt takes: `domain`, `rarity`, and optionally `topic`. Output is one card (concept name, type, effect, example). Example prompt idea: *“Generate a dark TCG-style Psychology spell card. Concept: [topic]. Rarity: [rarity]. Return: name, type, effect, scene (one example).”*

4. **Generate an initial batch of cards**  
   Use the prompt to generate 20–50 cards. Review and edit. Ingest into the same store as language cards, with `domain: "psychology"` (or the new domain id).

5. **Expose in the app**  
   Add the domain to the “schools/domains” list. Users can filter or choose “Psychology” and see only those cards. Battle, XP, collection, and rarity work the same; no new game mechanics.

6. **Optional: domain-specific “types”**  
   For Psychology you might have types like “Mind Manipulation”, “Social”, “Bias”. For Economics: “Slow Destruction”, “Market Force”. Store as `card.type` or `card.subtype`; filter/display in UI like you do for language card types.

### 4.4 Example: language card vs domain card

**Language (English) spell:**

```
🔥 SPELL: OBLITERATE
Type: Destruction
Power: 9/10
Meaning: To completely destroy
Incantation: "The storm obliterated the village."
```

**Domain (Psychology) spell:**

```
🧠 SPELL: COGNITIVE DISSONANCE
Type: Mind Manipulation
Power: 8/10
Effect: Mental discomfort from holding conflicting beliefs
Scene: "He quit smoking but still craved it—cognitive dissonance."
```

Same layout; same rarity/XP/battle flow. Only the content and the words “Meaning” vs “Effect”, “Incantation” vs “Scene” differ (and you can keep the same labels for both if you prefer).

### 4.5 What does *not* change when you add domains

- **Rarity system** — Common/Rare/Epic/Legendary (and optionally Boss) for all cards.
- **Battle / quiz mode** — Same mechanics; questions can be “recall meaning/effect” or “choose the right example.”
- **XP and levels** — Same economy; cards from any domain grant XP.
- **Collection UI** — Same “spellbook”; filter or group by domain.
- **AI pipeline** — Same flow: prompt → generate → review → ingest; only the prompt and domain id change.

So expanding beyond language cards is: **new domain id + new prompt template + batch of cards + add domain to app**. No second product and no separate “concept app.”

---

## 5. Long-Term End-State (Reminder)

- **Languages:** Many “magic schools” (EN, JP, KR, LATIN, FR, …).  
- **Domains:** Language + Psychology, Economics, Biology, Coding, Medical, Philosophy, Anime-themed, etc.  
- **Product:** Full app universe — collect, level up, AI custom spells, battle mode, leaderboards, AI dungeon, tiers unlocked by mastery.  
- **Monetization:** Free vs Pro; cosmetics (frames, auras, animations).  
- **Brand:** Optional physical/digital products (prints, packs, merch).  

The **expansion roadmap** above is the path from MVP to that end-state without rebranding and with minimal rework.

---

## 6. One-Page “Build for the future” Checklist

When building a feature now, ask:

- [ ] **Cards:** Is the card model generic (type, rarity, school/domain) so new languages/domains are just new content?
- [ ] **Copy:** Do we use Spellbook terms (Spell, Technique, Unlock, Power) instead of generic “word”/“flashcard” in core UI?
- [ ] **AI:** Do prompts accept school/domain and rarity so we can generate for any future expansion?
- [ ] **Progression:** Is XP/level design ready for per-school or per-domain later (e.g. optional filters, not hardcoded “English only”)?
- [ ] **i18n:** Is there a single place for locale/language so we can add app UI translation when we add a second language?

If we keep these in mind, **future expansion** stays a matter of content and config, not big rewrites.

---

## Document control

- **Purpose:** Define expansion order, dependencies, and how today’s build supports it.  
- **Related:** [SPELLBOOK_FUTURE_VISION.md](./SPELLBOOK_FUTURE_VISION.md), [SPELLBOOK_ENGLISH_PRODUCT_DESIGN.md](./SPELLBOOK_ENGLISH_PRODUCT_DESIGN.md), [SPELLBOOK_ENGLISH_IMPLEMENTATION_PLAN.md](./SPELLBOOK_ENGLISH_IMPLEMENTATION_PLAN.md), [SPELLBOOK_SCHEMA_AND_GAMIFICATION.md](./SPELLBOOK_SCHEMA_AND_GAMIFICATION.md) (how schema supports the game loop).  
- **Review:** Update when we add a new expansion type or change the recommended sequence.
