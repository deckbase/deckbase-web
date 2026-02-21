# Deckbase — Adaptive TCG Learning Engine  
MVP Technical Specification (v2.0 – Clean Architecture)

**Product:** Deckbase = TCG-inspired adaptive learning system where knowledge concepts become battle cards.  
**Modes:** Study Mode (calm learning) + Wizard Mode (battle mode). Shared engine, separate emotional layers.

---

## 1. Product Identity

- **Deckbase is:** A TCG-inspired adaptive learning system where knowledge concepts become battle cards.
- **Two modes:**
  - **Study Mode** — calm learning (no XP, no ATK/DEF, no timer, no streak).
  - **Wizard Mode** — battle mode (CardInstance ATK/DEF, XP, momentum, challenge types).
- Shared engine. Separate emotional layers.

---

## 2. Core Architectural Principles

| Principle | Meaning |
|-----------|--------|
| Concepts are global and immutable | One canonical concept; no per-user concept content. |
| Mastery is shared across modes | One `UserConceptStats` per (user, concept); Study and Wizard both read/write it. |
| Deck containers are separate | `FlashcardDeck` and `WizardDeck` are distinct; same concept can be in both. |
| Card ATK/DEF are instance-level only | ATK/DEF exist only on `CardInstance` (ephemeral), not on Concept or User. |
| Rarity is intrinsic (AI + exposure) | Rarity from concept’s `ai_complexity_score` and `appearance_count`; no correctness. |
| Momentum is user short-term performance | Streak + rolling accuracy + failure rate → momentum_score; influences battle only. |
| No duplicate difficulty systems | One difficulty/rarity system; momentum and mastery modulate, don’t duplicate. |

---

## 3. Core Data Models

### 3.1 Concept (Global)

Persistent knowledge object. No per-user data.

| Field | Type | Description |
|-------|------|-------------|
| `concept_id` | PK | Unique id. |
| `domain` | string | e.g. english, psychology. |
| `text` | string | Word / concept name. |
| `definition` | string | Meaning / effect. |
| `examples` | JSON | Example sentences or scenes. |
| `ai_complexity_score` | 0–100 | From AI at creation. |
| `appearance_count` | number | Global exposure (for rarity adjustment). |
| `rarity_score` | 0–100 | Computed (see §4). |
| `rarity_tier` | enum | Common \| Rare \| Epic \| Legendary (UI). |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### 3.2 User

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | PK | |
| `xp` | number | Total XP. |
| `level` | number | Derived or stored. |
| `current_streak` | number | Consecutive days with activity. |
| `rolling_accuracy` | number | Last 30 answers (e.g. 0–100). |
| `momentum_score` | 0–100 | Short-term performance (see §5). |
| `created_at` | timestamp | |
| (no `attack_score`) | — | ATK is on CardInstance only. |
| (no `defense_score`) | — | DEF is on CardInstance only. |

### 3.3 UserConceptStats

**Shared between Study & Wizard.** This is the learning truth.

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | FK | |
| `concept_id` | FK | |
| `mastery_percent` | 0–100 | |
| `attempt_count` | number | |
| `correct_count` | number | |
| `last_seen` | timestamp | |

### 3.4 Deck Containers

Two separate containers referencing the same concepts.

**FlashcardDeck** (Study Mode source)

| Field | Type |
|-------|------|
| `user_id` | FK |
| `concept_id` | FK |
| `added_at` | timestamp |

**WizardDeck** (Wizard Mode source)

| Field | Type |
|-------|------|
| `user_id` | FK |
| `concept_id` | FK |
| `added_at` | timestamp |
| `source_type` | manual \| import \| system |

Same concept may exist in both decks.

---

## 4. Rarity System

- Rarity **must not** depend on correctness (if you choose not to store it).
- Rarity **must not** fluctuate wildly.

### 4.1 Initial AI Evaluation

At concept creation, AI produces: abstraction score, reasoning complexity, contextual nuance.  
Result: **`ai_complexity_score`** (0–100).

### 4.2 Exposure Adjustment

Using only **`appearance_count`**:

- `exposure_factor = log10(appearance_count + 1) × 15`
- **`rarity_score`** = `clamp(ai_complexity_score - exposure_factor × 0.15, 0, 100)`

Effects: popular concepts drift slightly down; rare concepts stay near AI estimate; no violent swings.

### 4.3 Tier Mapping

| rarity_score | rarity_tier |
|--------------|-------------|
| 0–30 | Common |
| 31–55 | Rare |
| 56–80 | Epic |
| 81–100 | Legendary |

Tier is stored for UI. Score drives battle math.

---

## 5. Momentum System (User State)

Momentum = current performance energy. Influences battle scaling only.

### 5.1 Inputs

- `current_streak`
- `rolling_accuracy`
- `recent_failure_rate`

### 5.2 Formula

- `StreakFactor = min(current_streak × 5, 40)`
- `AccuracyFactor = rolling_accuracy × 0.5`
- `FailurePenalty = recent_fail_rate × 20`
- **`momentum_score`** = `clamp(StreakFactor + AccuracyFactor - FailurePenalty, 0, 100)`

### 5.3 Momentum States

| momentum_score | State |
|----------------|--------|
| 0–25 | Recovery |
| 26–50 | Stable |
| 51–75 | Empowered |
| 76–100 | Surge |

---

## 6. Card Model (Critical Correction)

Two types:

### 6.1 Base Card (Concept)

Stored permanently. **No ATK/DEF** on Concept.

### 6.2 CardInstance (Generated per battle)

Ephemeral; created when entering Wizard mode.

| Field | Description |
|-------|-------------|
| `card_instance_id` | PK |
| `user_id` | FK |
| `concept_id` | FK |
| `instance_tier` | Combat tier for this battle |
| `atk` | XP reward weight |
| `def` | Challenge intensity |
| `challenge_type` | e.g. MCQ, cloze, typed |
| `momentum_snapshot` | User momentum at generation |
| `rarity_snapshot` | Concept rarity at generation |
| `generated_at` | timestamp |

CardInstance carries game stats. Concept carries content and rarity only.

---

## 7. ATK / DEF Model (TCG Inspired)

- **ATK** = XP reward weight  
- **DEF** = challenge intensity  

### 7.1 ATK Calculation

```
atk = round(10 + 0.4 × rarity_score + 0.2 × momentum_score)
```

### 7.2 DEF Calculation

DEF increases if mastery is low.

```
def = round(10 + 0.5 × rarity_score + 0.3 × (100 - mastery_percent))
```

Effects: hard concepts hit harder; weak mastery increases defense; momentum increases offensive reward, not defense. Clean separation.

---

## 8. Battle Generation Engine

Each Wizard battle = **5 cards**.

### 8.1 Selection Logic

- **WizardDeck** = primary source.
- Weighting: lower mastery → higher weight; balanced rarity mix; avoid recent repetition.
- Example distribution:
  - 1 reinforcement (low mastery)
  - 2 mid-tier
  - 1 high-tier
  - 1 wildcard (momentum-influenced)

### 8.2 Combat Tier for Challenge Mode

- **CombatScore** = `0.7 × rarity_score + 0.3 × momentum_score`
- Tier determines question type (see §9).

---

## 9. Challenge Type Mapping

| Rarity tier | Challenge type |
|-------------|----------------|
| Common | MCQ meaning |
| Rare | MCQ with traps |
| Epic | Cloze sentence |
| Legendary | Typed contextual usage |

DEF may increase strictness: remove hints, require full sentence, reduce answer tolerance.

---

## 10. XP System

- **BaseXP** = 10  
- **RarityMultiplier:** Common 1.0, Rare 1.5, Epic 2.0, Legendary 3.0  
- **MomentumMultiplier:** Recovery 0.8, Stable 1.0, Empowered 1.2, Surge 1.5  

**Final XP** = `BaseXP × RarityMultiplier × MomentumMultiplier`  

ATK can scale XP further if desired: `XP = XP + atk`.  
Failure reduces streak. Optional small XP penalty.

---

## 11. Mastery Updates

- **Correct:** +5–10% mastery  
- **Incorrect:** -3–5% mastery  
- Mastery **shared** across Study and Wizard (single `UserConceptStats`).

---

## 12. Study Mode

- No XP, no ATK/DEF, no timer, no streak.
- Draws only from **FlashcardDeck**.
- Purpose: deep learning, concept review, calm correction.
- Updates **UserConceptStats** (mastery, attempt_count, correct_count, last_seen).

---

## 13. Import / Export Between Decks

- **Flashcard → Wizard:** Send selected concepts / send weakest / send recent.
- **Wizard → Flashcard:** Study mistakes / add selected.
- No duplication: just deck table insert (add row to target deck).

---

## 14. Anti-Exploitation Controls

- XP reduced if mastery > 80%.
- Wizard deck size cap.
- Reinforcement card always included in battle.
- Rarity change capped per update.
- No infinite streak multipliers.

---

## 15. MVP Scope

### Include

- Dual deck system (FlashcardDeck, WizardDeck)
- CardInstance ATK/DEF
- Momentum engine
- Rarity system (AI + exposure)
- XP system
- Study mode
- Wizard mode
- Import/export between decks

### Exclude (post-MVP)

- PvP
- HP life system
- Card trading
- Marketplace
- Permanent card evolution
- Complex statistical modeling

---

## Document control

- **Purpose:** Authoritative MVP technical spec for Deckbase Adaptive TCG Learning Engine (v2.0).  
- **Related:** [SPELLBOOK_SCHEMA_AND_GAMIFICATION.md](./SPELLBOOK_SCHEMA_AND_GAMIFICATION.md) (schema alignment), [SPELLBOOK_ENGLISH_PRODUCT_DESIGN.md](./SPELLBOOK_ENGLISH_PRODUCT_DESIGN.md) (product vision), [SPELLBOOK_EXPANSION_ROADMAP.md](./SPELLBOOK_EXPANSION_ROADMAP.md) (expansion).  
- **Review:** Update when changing core models, rarity, momentum, or battle rules.
