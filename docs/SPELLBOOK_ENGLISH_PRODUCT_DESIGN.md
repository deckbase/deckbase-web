# Spellbook — Gamified AI Learning Product Design

We are building **an AI-powered knowledge RPG**, not “flashcards with points.” Users don’t study — they **unlock spells.**

This doc defines core loop, card system, AI moat, battle mode, progression, monetization, and MVP. It aligns with the [Future Vision](./SPELLBOOK_FUTURE_VISION.md) expansion paths.

---

## Core Concept

**Not:** “Flashcards with points.”  
**But:** “An AI-powered knowledge RPG.”

---

## 1. Core Game Loop

Every successful gamified app has a loop. Ours:

1. **Learn** — battle a card  
2. **Win XP**  
3. **Unlock new rarity**  
4. **Level up**  
5. **Face harder concepts**  
6. **AI adapts difficulty**  

Repeat. Add **streak rewards** and **daily quests**.

---

## 2. Card System

Everything is a **card.**

### Card types

| Type | Represents |
|------|------------|
| 🔥 **Spell** | Word / concept |
| 🧠 **Technique** | Phrase / strategy |
| 🩸 **Curse** | Common mistake |
| 👑 **Legendary** | Advanced topic |
| ⚔️ **Boss** | Major exam / milestone concept |

### Card attributes

- Rarity (Common → Legendary)  
- Power level  
- Mastery %  
- AI difficulty rating  
- Visual dark frame  

**Collectibility = retention.**

---

## 3. AI as the Moat

AI should:

- **Auto-generate** new cards  
- **Detect weak concepts**  
- **Create “counter-cards”** to fix weaknesses  
- **Generate micro-stories**  
- **Create quizzes dynamically**  
- **Adjust difficulty in real time**  

Instead of static decks, we offer an **adaptive dungeon.**

---

## 4. Battle Mode

User enters **Knowledge Arena.**

### Mechanics

- Timed recall  
- Multiple choice  
- Type answer  
- Explain verbally (AI scores explanation)  

**Win → XP.** **Lose → AI generates reinforcement card.**

Experience should feel like **combat.**

---

## 5. Progression System

Levels unlock:

- New card packs  
- Harder boss battles  
- Darker aesthetic themes  
- Profile badges  
- Titles (e.g. “Word Conqueror”)  

We want **status signaling.**

---

## 6. Expansion Paths (Same Engine)

After English:

- Psychology deck  
- Economics deck  
- Coding deck  
- Medical deck  
- Philosophy deck  
- Anime-themed learning deck  

Same engine; different **content universe.**

---

## 7. Monetization Structure

### Free tier

- Basic cards  
- Limited AI generations  
- Daily quest access  

### Pro tier

- Unlimited AI card creation  
- Boss battles  
- Advanced analytics  
- Custom decks  
- Dark premium skins  
- AI explain-back evaluation  

### Cosmetic monetization

- Card frame skins  
- Profile aura  
- Rare pack animations  

**Gamers pay for cosmetics.**

---

## 8. Competitive Positioning

| Feature | Anki | Duolingo | Spellbook |
|--------|------|----------|-----------|
| AI auto card creation | ❌ | ❌ | ✅ |
| Dark TCG aesthetic | ❌ | ❌ | ✅ |
| Adaptive difficulty | Basic | Yes | Advanced |
| Collectible system | ❌ | Limited | Deep |
| Multi-domain expansion | Manual | Language only | Infinite |

We sit between **Anki** (hardcore), **Duolingo** (gamified), and **AI tutor** (smart). That is the positioning.

---

## 9. MVP (Lean Phase 1)

**Do not build everything first.**

### MVP scope

- English words as cards  
- XP + levels  
- AI auto-generate ~5 new cards/day  
- Battle quiz mode  
- Rarity tiers  
- Dark aesthetic  

That alone is enough to **test traction.**

### MVP out of scope (for later)

- Multiple languages  
- Full knowledge domains (psych, econ, etc.)  
- Physical merch  
- Faction system  
- AI dungeon story mode  
- Verbally explain + AI score  

---

## 10. Alignment With Implementation Plan

- **Current [Implementation Plan](./SPELLBOOK_ENGLISH_IMPLEMENTATION_PLAN.md) Phase 4** (Product) should deliver an MVP that matches this doc: English cards, XP/levels, battle quiz, rarity, dark theme.  
- **AI “5 cards/day”** can start as curated batch, then become dynamic generation once the loop is validated.  
- **Progression (levels, unlocks)** can be v1.1 after first working battle mode.

---

## Document control

- **Purpose:** Single product spec for the gamified AI learning app.  
- **Related:** [SPELLBOOK_FUTURE_VISION.md](./SPELLBOOK_FUTURE_VISION.md), [SPELLBOOK_ENGLISH_VISION.md](./SPELLBOOK_ENGLISH_VISION.md), [SPELLBOOK_ENGLISH_IMPLEMENTATION_PLAN.md](./SPELLBOOK_ENGLISH_IMPLEMENTATION_PLAN.md).  
- **Review:** Update when we change core loop, card types, or MVP scope.
