# Competitor Comparison Pages — Strategy & Reference
**Generated:** 2026-03-11
**Status:** Pages created and ready to deploy

---

## Pages Created

| URL | Target Keyword | File |
|-----|---------------|------|
| `/deckbase-vs-anki` | "deckbase vs anki", "anki alternative with AI" | `app/deckbase-vs-anki/page.js` |
| `/deckbase-vs-quizlet` | "deckbase vs quizlet", "quizlet alternative spaced repetition" | `app/deckbase-vs-quizlet/page.js` |

Both pages are **Next.js server components** (no `"use client"`) with:
- Per-page `metadata` export (title, description, canonical, OG, Twitter)
- Inline JSON-LD (`WebPage` + `FAQPage` + `BreadcrumbList`)
- Feature comparison tables
- 5-item FAQ sections (FAQ schema eligibility)
- CTAs pointing to `/download` and `/premium`
- Cross-links between comparison pages

---

## Keyword Strategy

### Primary Keywords
| Keyword | Intent | Estimated Volume | Difficulty |
|---------|--------|-----------------|------------|
| `deckbase vs anki` | Commercial | Medium | Low (new brand) |
| `anki alternative with AI` | Commercial | High | Medium |
| `anki alternative mobile` | Commercial | High | Medium |
| `deckbase vs quizlet` | Commercial | Medium | Low (new brand) |
| `quizlet alternative spaced repetition` | Commercial | High | Medium |
| `better spaced repetition than quizlet` | Commercial | Medium | Medium |

### Secondary / Long-Tail
| Keyword | Page |
|---------|------|
| `FSRS vs SM-2 comparison` | vs-anki |
| `best flashcard app medical students 2026` | vs-anki, vs-quizlet |
| `AI flashcard generator from PDF` | vs-anki |
| `book scanning flashcard app` | vs-quizlet |
| `free anki alternative ios` | vs-anki |
| `quizlet alternative with real spaced repetition` | vs-quizlet |
| `does quizlet use spaced repetition` | vs-quizlet |

### Title Tag Formulas Used
- `Deckbase vs Anki: AI Flashcards vs Manual SRS (2026)` — differentiator in subtitle
- `Deckbase vs Quizlet: Real Spaced Repetition vs Study Modes (2026)` — differentiator in subtitle

---

## Schema Markup Summary

### Both Pages Include

**WebPage** schema:
```json
{
  "@type": "WebPage",
  "@id": "https://www.deckbase.co/deckbase-vs-[competitor]",
  "breadcrumb": { "@type": "BreadcrumbList", ... }
}
```

**FAQPage** schema (5 questions per page):
- Targets "People Also Ask" rich results
- Questions match commercial intent search queries
- Answers are concise (50–200 words) for AI snippet extraction

**BreadcrumbList** schema:
- Home → [Page Name]
- Enables breadcrumb rich results in SERPs

### What's NOT Included (Intentionally)
- **AggregateRating** — not added per audit finding C1 (no verified reviews yet)
- **Product** schema — comparison pages are not product pages

---

## Content Guidelines for Updates

### Update Trigger Checklist
Review and update these pages when:
- [ ] Competitor changes pricing
- [ ] Anki releases a major version update
- [ ] Quizlet adds/removes features (especially spaced repetition)
- [ ] Deckbase adds desktop app or new major features
- [ ] Real app store ratings become available (add AggregateRating then)

### Accuracy Notes (March 2026)
- **Anki pricing**: Desktop free, iOS $24.99 one-time, AnkiDroid (Android) free
- **Quizlet pricing**: Free tier + Plus at $35.99/yr or $7.99/mo
- **Deckbase pricing**: Free (500 cards) + Premium $4.99/mo or $49.99/yr
- **FSRS**: Anki added native FSRS support in v23.10 (Oct 2023)
- All claims sourced from public product websites — no fake reviews or ratings

---

## Conversion Optimization Notes

### CTA Placement
- Above-fold: Hero badges frame each product's best-fit user
- After comparison table: Download/Features CTA
- After verdict section: Primary conversion CTA

### Social Proof — What's Missing (To-Do)
- Add real G2/App Store testimonials from users who switched from Anki/Quizlet
- Add "X users switched from Anki" stat once app analytics show this

---

## Sitemap

**Status (deckbase-web):** Both routes are listed in `app/sitemap.js` (`/deckbase-vs-anki`, `/deckbase-vs-quizlet`) with `changeFrequency: "monthly"` and `priority: 0.8`.

Reference shape if you add more comparison URLs elsewhere:
```js
{ path: "/deckbase-vs-anki", changeFrequency: "monthly", priority: 0.8 },
{ path: "/deckbase-vs-quizlet", changeFrequency: "monthly", priority: 0.8 },
```

---

## Future Comparison Pages (Backlog)

| URL | Target Keyword | Priority |
|-----|---------------|----------|
| `/deckbase-vs-remnote` | "remnote alternative", "remnote vs deckbase" | Medium |
| `/deckbase-vs-brainscape` | "brainscape alternative" | Low |
| `/anki-alternatives` | "anki alternatives 2026", "best anki alternatives" | High |
| `/best-flashcard-apps` | "best flashcard app 2026" | High |

The `/anki-alternatives` and `/best-flashcard-apps` roundup pages have the highest traffic potential and should be next priority after the two vs-pages are indexed.
