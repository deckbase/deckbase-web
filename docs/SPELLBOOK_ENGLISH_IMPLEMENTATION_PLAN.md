# Spellbook English — Implementation Plan

This plan turns the [Spellbook English Vision](./SPELLBOOK_ENGLISH_VISION.md) into concrete phases, deliverables, and success criteria. Treat it as the execution roadmap.

**Strategic direction:** We are building a **gamified AI learning universe**, not just a page. See [Spellbook Future Vision](./SPELLBOOK_FUTURE_VISION.md) for expansion paths. See [Spellbook Expansion Roadmap](./SPELLBOOK_EXPANSION_ROADMAP.md) for **expansion order** and how to build today for future scale. See [Spellbook Product Design](./SPELLBOOK_ENGLISH_PRODUCT_DESIGN.md) for core loop, card system, battle mode, and MVP scope.

---

## Overview

| Phase | Focus | Duration (suggested) | Outcome |
|-------|--------|----------------------|--------|
| **0** | Decision & scope | 1–2 weeks | Go/no-go, scope locked |
| **1** | Brand & content system | 2–3 weeks | Visual system + 20+ cards |
| **2** | Web presence | 2–4 weeks | Landing + dark theme live |
| **3** | Social & video | Ongoing | Reels/shorts, hooks, growth |
| **4** | Product (app/features) | 3+ months | Collectible app / quiz / XP |

---

## Phase 0: Decision & Scope (Weeks 1–2)

**Goal:** Confirm the pivot and define what “Spellbook English” v1 includes.

### 0.1 Alignment

- [ ] Stakeholders agree: Spellbook English is the primary direction (or a clear sub-brand).
- [ ] Decide: full rebrand of current product vs. new brand alongside existing (e.g. Deckbase + Spellbook).
- [ ] Document: target audience (age, interests, platforms), primary metric (followers, signups, revenue).

### 0.2 Scope for v1

- [ ] **Content:** Words + phrases as spell/technique cards only, or include idioms/grammar curses from day one?
- [ ] **Channels:** Instagram / TikTok / YouTube Shorts / X — pick 1–2 to start.
- [ ] **Product:** Content-only first, or include app/landing changes in v1?

### 0.3 Risks & dependencies

- [ ] List what “make or break” means concretely (e.g. “X signups by date”, “Y followers”).
- [ ] Identify one main bottleneck (time, design, content, dev) and plan to unblock it.

**Deliverable:** Short written brief: “Spellbook English v1 = [audience] + [channels] + [success metric] by [date].”

---

## Phase 1: Brand & Content System (Weeks 2–5)

**Goal:** Reusable visual system and a batch of spell/technique cards so all content feels consistent.

### 1.1 Visual system

- [ ] **Color palette:** Black/charcoal, deep purple, crimson, gold — exact hex codes.
- [ ] **Typography:** Choose 1–2 serif gothic fonts (headings + body).
- [ ] **Card frame:** Standard layout (gold border, glow, optional smoke/particles) — Figma/Canva template.
- [ ] **Do/don’t:** One-page visual guide (no pastels, no cute emojis, no corporate minimal).

### 1.2 Card content system

- [ ] **Spell card template:** Fields = SPELL name, Type, Power (x/10), Meaning, Incantation (example sentence).
- [ ] **Technique card template:** TECHNIQUE name, Class, Meaning, Scene (example).
- [ ] **Rarity rules:** Map Common/Rare/Epic/Legendary to word difficulty or phrase complexity; document in a simple table.

### 1.3 AI-assisted production

- [ ] **Prompt library:** Prompts that output spell/technique text in the right structure (for ChatGPT/Claude/API).
- [ ] **Rarity assignment:** Rule set (e.g. CEFR, frequency list) so AI suggests rarity.
- [ ] **Batch run:** Generate 20–50 spell cards + 10–20 technique cards; review and fix; store in sheet/DB.

### 1.4 Voice & tone

- [ ] **Hooks doc:** 10–15 lines like “Stop saying ‘very big.’ Use THIS legendary word.” for use in captions and video.
- [ ] **Weekly calendar:** Monday = Destruction Word, Tuesday = Mind Control Phrase, etc. (as in vision doc).

**Deliverables:**  
- Brand one-pager (colors, fonts, card frame).  
- 20+ spell cards + 10+ technique cards, edited and approved.  
- Reusable prompts + rarity rules.

---

## Phase 2: Web Presence (Weeks 4–8)

**Goal:** A Spellbook English presence that looks and feels like the brand (dark TCG), and captures leads.

### 2.1 Strategy

- [ ] Decide: new domain (e.g. spellbookenglish.com) vs. path on current site (e.g. deckbase.com/spellbook).
- [ ] Goal of the page: waitlist, link-in-bio, or full “word of the day” experience.

### 2.2 Design

- [ ] Black/charcoal base; purple/crimson/gold accents; serif gothic headings.
- [ ] Hero: “You’re not teaching vocabulary. You’re summoning it.” + CTA.
- [ ] Sample spell card(s) on the page to show the product.
- [ ] Avoid: bright pastels, cute emojis, generic SaaS look.

### 2.3 Build (this repo)

- [ ] New route or site section for Spellbook (e.g. `/spellbook` or dedicated Next.js app).
- [ ] Dark theme as default for that section (CSS variables: background, accent, gold border).
- [ ] Optional: “Word of the day” or “Spell of the day” block (data from CMS or JSON).
- [ ] CTA: “Unlock more spells” → waitlist or app link.
- [ ] Mobile-friendly; consider subtle motion (glow, fade) only if it doesn’t hurt performance.

### 2.4 SEO & share

- [ ] Meta title/description: “Spellbook English — Summon vocabulary, not memorize it.”
- [ ] OG image: one spell card or logo on dark background.
- [ ] Optional: `/spellbook/[word]` or `/spell/[slug]` for shareable spell pages.

**Deliverables:**  
- Live Spellbook section (or standalone page).  
- Dark theme applied; at least 1–3 spell cards visible.  
- Waitlist or primary CTA working.

---

## Phase 3: Social & Video (Ongoing)

**Goal:** Grow audience and habit with cinematic short-form content and clear hooks.

### 3.1 Content pipeline

- [ ] **Weekly schedule:** Mon–Fri + weekend quiz (see vision doc).
- [ ] **Format:** 1 spell card + 1 technique (or idiom/curse) per week minimum; scale up when possible.
- [ ] **Batching:** Use Phase 1 cards; produce 1 week of posts in one sitting.

### 3.2 Video production

- [ ] **Template:** Dark bg, word with glow, AI voice (slow), whoosh/spark, sentence, hook (“New Spell Unlocked” / “Forbidden Word of the Day”).
- [ ] **Tools:** Pick one (CapCut, Canva, or simple automation) and stick to it for v1.
- [ ] **AI voice:** Select a “deep cinematic” TTS; same voice across videos for brand.
- [ ] **Length:** 15–30 s for Reels/Shorts; 30–60 s if needed for context.

### 3.3 Hooks & captions

- [ ] Use growth hooks from vision (e.g. “Your English is weak without this word”) in first line of caption.
- [ ] End with CTA: follow, link in bio, or “Unlock the full spellbook.”

### 3.4 Metrics

- [ ] Track: views, saves, shares, follows, link clicks (by week).
- [ ] Double down on formats and hooks that get saves/shares; drop what doesn’t.

**Deliverables:**  
- Weekly content calendar filled 2 weeks ahead.  
- At least 2–4 short videos published using the cinematic template.  
- One spreadsheet or dashboard for weekly metrics.

---

## Phase 4: Product (App / Collectible Experience) — 3+ months

**Goal:** Turn Spellbook from content brand into a product. Scope aligns with the **MVP** in [Spellbook Product Design](./SPELLBOOK_ENGLISH_PRODUCT_DESIGN.md): English cards, XP + levels, battle quiz, rarity, dark aesthetic, AI-generated cards (e.g. 5/day to start).

### 4.1 Product definition

- [ ] **Core loop:** Open app → see “Spell of the day” / daily unlock → read card → optional quiz (Word Duel).
- [ ] **Collectibility:** User’s “spellbook” = list of unlocked words/phrases; rarity visible.
- [ ] **Optional:** XP, levels, or streaks to increase retention.

### 4.2 Technical direction

- [ ] Reuse current stack (e.g. Next.js + Firebase) for web; or ship mobile (React Native/Flutter) if that’s the goal.
- [ ] Data model: users, unlocked_spells[], daily_spell, quiz_results; rarity on each card.
- [ ] If same codebase as Deckbase: separate “Spellbook” mode or sub-app with dark theme and card UI.

### 4.3 Content at scale

- [ ] Use Phase 1 AI pipeline to generate hundreds of spell/technique cards.
- [ ] Store in DB or CMS; tag by rarity, topic, CEFR.
- [ ] “Word Duel”: pull 2–4 spells, user picks correct meaning/use → fits “quiz” from vision.

### 4.4 Launch

- [ ] Soft launch: invite-only or waitlist; iterate on retention.
- [ ] Public launch: link from social + landing; “Download the Spellbook” / “Start collecting spells.”

**Deliverables:**  
- Spec or PRD for Spellbook app (web or mobile).  
- MVP: daily spell + spellbook view + simple quiz.  
- 100+ cards in system, with rarity.

---

## Success Metrics (Suggested)

| Stage | Metric | Target (example) |
|-------|--------|-------------------|
| Phase 1 | Cards produced | 30+ approved cards |
| Phase 2 | Web | Dark Spellbook page live, CTA working |
| Phase 3 | Social | 1K followers or 50K total views (adjust to your goal) |
| Phase 4 | Product | 500 signups or 100 DAU (adjust to “make or break”) |

---

## Next Steps (Immediate)

1. **This week:** Complete Phase 0 (alignment + scope + one-page brief).  
2. **Next week:** Lock visual system (colors, fonts, one card template) and produce first 10 spell cards.  
3. **Week 3:** Publish first 2–4 social posts + 1 video using the template; share link to Spellbook page when Phase 2 is live.

---

## Document control

- **Purpose:** Execution plan for Spellbook English; update as phases complete or scope changes.  
- **Related:** [SPELLBOOK_ENGLISH_VISION.md](./SPELLBOOK_ENGLISH_VISION.md) for brand and positioning.  
- **Review:** Revisit plan every 2–4 weeks; adjust timelines and targets as needed.
