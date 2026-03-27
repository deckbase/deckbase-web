# Competitor Comparison Pages — Audit & Roadmap

**Date:** 2026-03-27

---

## Current Pages (4 live)

| Page | URL | Type | Words | Schema |
|------|-----|------|-------|--------|
| Deckbase vs Anki | `/deckbase-vs-anki` | Direct comparison | ~2,000 | WebPage, FAQPage, BreadcrumbList |
| Deckbase vs Quizlet | `/deckbase-vs-quizlet` | Direct comparison | ~2,100 | WebPage, FAQPage, BreadcrumbList |
| Best Anki Alternatives | `/anki-alternatives` | Roundup | ~1,200 | WebPage, FAQPage, BreadcrumbList |
| Best Flashcard Apps | `/best-flashcard-apps` | Roundup | ~1,100 | Article, Organization, Person, FAQPage, BreadcrumbList |

**Total content:** ~6,400 words, 20 unique FAQ Q&As across all pages.

Internal linking is fully connected — every page links to all other three.

---

## Strengths

- Fully connected internal link graph across all 4 pages
- FAQPage + BreadcrumbList schema on every page
- Complete OG/Twitter/canonical metadata
- 13–15 feature rows per vs-page comparison table
- Modular `ArticleLayout` component system (roundup pages are DRY)
- All 4 pages in sitemap with correct priority gradation (0.8 / 0.78)
- vs-pages are Server Components — optimal for AI crawlers

---

## Gaps by Page

### vs-Anki and vs-Quizlet

| Gap | Impact | Fix |
|-----|--------|-----|
| No `datePublished`/`dateModified` in JSON-LD | High (E-E-A-T, AI citations) | Add to both page.js schemas |
| Sitemap `lastModified` still 2026-03-11 | Medium | Bump to current date in `lib/sitemap-metadata.js` |
| No author byline | High (E-E-A-T) | Add editorial note like roundup pages |
| No dedicated pricing comparison table | High (conversion) | Add 5-row pricing table section |
| No methodology section | Medium (trust/citability) | Add 1 paragraph explaining how features were validated |

### Roundup pages (Anki Alternatives, Best Flashcard Apps)

| Gap | Impact | Fix |
|-----|--------|-----|
| No trust signals or testimonials | Medium | Add once user quotes are available |
| `Article` schema only on best-flashcard-apps | Low | Add to anki-alternatives too |

### All pages

| Gap | Impact | Fix |
|-----|--------|-----|
| No reviews or AggregateRating | Low (intentional — see ACTION-PLAN.md) | Add when App Store rating count is sufficient |
| No video comparison | Low | Add when video assets exist |

---

## Immediate Fixes (< 1 hour total)

### 1. Add dates + author to vs-pages

Both `/deckbase-vs-anki/page.js` and `/deckbase-vs-quizlet/page.js` need:

**In JSON-LD (`@type: "WebPage"`):**
```json
"datePublished": "2026-03-11",
"dateModified": "2026-03-27",
"author": {
  "@type": "Organization",
  "@id": "https://www.deckbase.co/#organization"
}
```

**Visible editorial note (same pattern as roundup pages):**
```jsx
<p>By Deckbase Editorial Team · Updated March 2026</p>
```

### 2. Update sitemap lastModified

In `lib/sitemap-metadata.js`, change vs-page dates from `2026-03-11` to `2026-03-27` (or actual last edit date).

---

## Pricing Table — Recommended Addition

Add a "Pricing at a Glance" section to both vs-pages, after the feature comparison table.

### Deckbase vs Anki

| | Deckbase | Anki |
|--|---------|------|
| Free tier | 500 cards | Full (desktop + AnkiDroid) |
| iOS cost | $4.99/mo or $49.99/yr | $24.99 one-time |
| Android cost | $4.99/mo or $49.99/yr | Free (AnkiDroid) |
| Total cost year 1 (iOS) | $49.99 | $24.99 |
| Total cost year 2+ (iOS) | $49.99/yr | $0 |
| Desktop app | — | Free |

**Note:** Pricing as of March 2026. Check [deckbase.co/premium](https://www.deckbase.co/premium) for current plans.

**Key message:** Anki is cheaper long-term; Deckbase costs more but removes the card creation bottleneck entirely.

### Deckbase vs Quizlet

| | Deckbase | Quizlet |
|--|---------|---------|
| Free tier | 500 cards, FSRS included | Core features |
| Monthly (billed monthly) | $4.99 | ~$7.99 |
| Annual | $49.99 ($4.17/mo) | $35.99 ($3.00/mo) |
| AI features | Included in free tier | Plus plan only |
| Offline access | Included | Plus plan only |
| Anki import | ✅ | ❌ |

**Note:** Pricing as of March 2026.

**Key message:** Quizlet is cheaper per month on annual plan; Deckbase includes AI and offline at lower tiers.

---

## New Pages — Prioritized Roadmap

### Tier 1 — Build next

#### `/quizlet-alternatives`

- **Target keyword:** `quizlet alternatives`, `quizlet alternative 2026`
- **Format:** Roundup (reuse ArticleLayout from `/anki-alternatives`)
- **Apps to cover:** Deckbase (primary), Anki, RemNote, Brainscape
- **Deckbase angle:** FSRS, PDF scanning, Anki import — things Quizlet lacks
- **Estimated effort:** 2 hours
- **Estimated monthly searches:** 400–600

**Outline:**
1. Who looks for a Quizlet alternative? (collaborative learners who want better retention)
2. Apps at a glance (table: App | Best for | FSRS | Free tier)
3. Why Deckbase for spaced repetition (FSRS vs Quizlet's "Long-Term Learning")
4. CTA
5. FAQ (5 questions)
6. Related (vs-Quizlet, Best Flashcard Apps, Anki Alternatives)

#### `/deckbase-vs-remnote`

- **Target keyword:** `remnote alternative`, `deckbase vs remnote`
- **Format:** Direct comparison (reuse vs-Anki structure)
- **Deckbase angle:** Purpose-built for flashcards; RemNote tries to do everything (notes + SRS + knowledge graph)
- **Estimated effort:** 2–3 hours
- **Estimated monthly searches:** 300–500

**Key comparison points:**
| Feature | Deckbase | RemNote |
|---------|----------|---------|
| AI card generation | ✅ Built-in | ✅ Available |
| FSRS scheduling | ✅ Default | ⚠️ Custom SM-style |
| PDF/book scanning (OCR) | ✅ Yes | ⚠️ Limited |
| Note-taking | ❌ No | ✅ Full outliner |
| Anki import | ✅ .apkg | ⚠️ Limited |
| Mobile-first | ✅ Yes | ⚠️ Web-centric |
| Free tier | ✅ 500 cards | ✅ Limited |
| Complexity | ✅ Low | ⚠️ High |

**Verdict angle:** RemNote is powerful if you want notes + cards in one app. Deckbase wins if retention is the only goal — less setup, better scheduling defaults.

---

### Tier 2 — Plan for Q2 2026

#### `/deckbase-for-medical-students` (use-case guide, not vs-page)

- **Target keyword:** `best flashcard app medical school`, `USMLE flashcard app`
- **Format:** Use-case guide (ArticleLayout)
- **Content:** Why FSRS matters for Step 1/Step 2, PDF scanning from First Aid/Pathoma, daily review workflow
- **Effort:** 2–3 hours
- **Monthly searches:** 200–500

#### `/deckbase-vs-brainscape`

- **Target keyword:** `brainscape alternative`, `brainscape vs anki`
- **Effort:** 2 hours
- **Monthly searches:** 100–200

---

### Tier 3 — Backlog

- `/best-study-apps-language-learning` — broad, competitive keyword; useful for top-of-funnel
- `/deckbase-vs-supermemo` — niche, power-user audience
- `/deckbase-vs-mnemosyne` — very niche, very low volume

---

## Schema Recommendations

### Add to `/deckbase-vs-anki` and `/deckbase-vs-quizlet`

Update the `WebPage` block in each page's JSON-LD:

```json
{
  "@type": "WebPage",
  "@id": "https://www.deckbase.co/deckbase-vs-anki",
  "name": "Deckbase vs Anki: AI Flashcards vs Manual SRS (2026)",
  "datePublished": "2026-03-11",
  "dateModified": "2026-03-27",
  "author": {
    "@type": "Organization",
    "@id": "https://www.deckbase.co/#organization"
  },
  "publisher": {
    "@id": "https://www.deckbase.co/#organization"
  },
  "breadcrumb": { ... }
}
```

### Add `Article` type to `/anki-alternatives`

Currently uses only `WebPage`. Add Article schema (same as `/best-flashcard-apps` already has):

```json
{
  "@type": "Article",
  "@id": "https://www.deckbase.co/anki-alternatives#article",
  "headline": "Best Anki Alternatives (2026)",
  "datePublished": "2026-03-21",
  "dateModified": "2026-03-27",
  "author": {
    "@type": "Organization",
    "@id": "https://www.deckbase.co/#organization"
  },
  "publisher": {
    "@id": "https://www.deckbase.co/#organization"
  }
}
```

### Schema for new `/quizlet-alternatives` page

Use same structure as `/anki-alternatives`. Key difference — add `ItemList` for the app roundup:

```json
{
  "@type": "ItemList",
  "name": "Best Quizlet Alternatives 2026",
  "itemListOrder": "https://schema.org/ItemListOrderDescending",
  "numberOfItems": 4,
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Deckbase", "url": "https://www.deckbase.co" },
    { "@type": "ListItem", "position": 2, "name": "Anki", "url": "https://apps.ankiweb.net" },
    { "@type": "ListItem", "position": 3, "name": "RemNote", "url": "https://www.remnote.com" },
    { "@type": "ListItem", "position": 4, "name": "Brainscape", "url": "https://www.brainscape.com" }
  ]
}
```

---

## Keyword Gaps

### Not yet targeted with a dedicated page

| Keyword | Volume signal | Opportunity | Target page |
|---------|---------------|-------------|-------------|
| `quizlet alternatives` | High | ✅ | Build `/quizlet-alternatives` |
| `remnote alternative` | Medium | ✅ | Build `/deckbase-vs-remnote` |
| `best flashcard app medical school` | Medium | ✅ | Build `/deckbase-for-medical-students` |
| `FSRS vs SM-2` | Low-Medium | Could be section on vs-Anki | Expand existing deep-dive |
| `AI flashcard generator from PDF` | Medium | ✅ | `/features` + vs-pages |
| `free anki alternative ios` | Medium | ✅ | Strengthen `/anki-alternatives` |
| `does quizlet use spaced repetition` | Medium | ✅ | Strengthen vs-Quizlet FAQ |
| `brainscape alternative` | Low | Backlog | `/deckbase-vs-brainscape` |

### Long-tail FAQ targeting (add to existing pages)

These questions appear in search but aren't in any FAQ:
- "Is FSRS better than SM-2?" → vs-Anki FAQ
- "Can Deckbase replace Anki for medical school?" → vs-Anki or medical-students page
- "Does Deckbase work without internet?" → vs-Quizlet FAQ (offline study row exists in table but no FAQ)
- "How many cards can I make for free on Deckbase?" → all pages (add to existing FAQs)

---

## Comparison Table — Deckbase Differentiators Summary

Use these consistently across all pages when positioning Deckbase:

| Feature | Deckbase | Anki | Quizlet | RemNote |
|---------|----------|------|---------|---------|
| AI card generation | ✅ Built-in, free tier | ❌ Add-ons only | ✅ Plus plan only | ✅ Available |
| PDF / book scanning (OCR) | ✅ Yes | ⚠️ Add-ons | ⚠️ Limited | ⚠️ Limited |
| FSRS scheduling | ✅ Default, no setup | ✅ Opt-in (2023+) | ❌ Basic LTL only | ⚠️ SRS-style |
| Anki .apkg import | ✅ Yes | ✅ Native | ❌ | ⚠️ Limited |
| Mobile-first | ✅ iOS + Android | ⚠️ AnkiDroid free, iOS $24.99 | ✅ | ⚠️ Web-centric |
| Offline study | ✅ Yes | ✅ Yes | ⚠️ Plus only | ⚠️ Limited |
| Free tier limit | 500 cards | Unlimited (desktop) | Core features | Limited |
| Learning curve | ✅ Minutes | ❌ Hours–days | ✅ Minutes | ❌ Steep |
| Desktop app | ❌ Mobile only | ✅ Free | ✅ Web | ✅ Web |
| Open source | ❌ | ✅ | ❌ | ❌ |
| Community decks | ❌ Limited | ✅ Massive | ✅ Large | ❌ |

---

## Content Architecture

```
/deckbase-vs-anki          ← direct comparison
/deckbase-vs-quizlet       ← direct comparison
/deckbase-vs-remnote       ← [build next]
/deckbase-vs-brainscape    ← [backlog]
/anki-alternatives         ← roundup
/quizlet-alternatives      ← [build next]
/best-flashcard-apps       ← category roundup
/deckbase-for-medical-students  ← use-case guide [plan Q2]
```

All pages should link to all other relevant pages in the "Related" section.

---

## Trust Signals Checklist (for future updates)

Once the following assets exist, add to comparison pages:

- [ ] App Store rating (once > 4.5 with 100+ reviews) — add `AggregateRating` schema
- [ ] User quote: "Switched from Anki after [X]" — add to vs-Anki CTA section
- [ ] User quote: "Replaced Quizlet for med school because..." — add to vs-Quizlet
- [ ] Methodology note on vs-pages: "Features verified from official documentation as of March 2026"
- [ ] "As of [date]" disclaimer on all pricing data

---

## Files Referenced

- `app/deckbase-vs-anki/page.js`
- `app/deckbase-vs-quizlet/page.js`
- `app/anki-alternatives/page.js`
- `app/best-flashcard-apps/page.js`
- `components/resources/ArticleLayout.js`
- `components/resources/ResourcesLayoutClient.js`
- `lib/sitemap-metadata.js`
- `docs/seo/COMPETITOR-PAGES.md`
- `docs/seo/ACTION-PLAN.md`
- `docs/seo/TODO.md`
