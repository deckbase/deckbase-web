# GEO Analysis — AI Search Readiness

**Date:** 2026-03-27
**Overall GEO Readiness Score: 72/100**

---

## Score Breakdown

| Category | Score | Notes |
|----------|-------|-------|
| robots.txt | 9/10 | Crawler-friendly; API blocked; sitemap declared |
| llms.txt | 8/10 | Present and well-formatted; missing several content pages |
| Metadata | 8/10 | OG, Twitter, keywords present; dates inconsistent across pages |
| Structured Data | 8/10 | SoftwareApplication, Organization, WebSite, FAQPage; missing Article, Person |
| Content / Citability | 9/10 | Comparison pages highly citable; good passage length |
| FAQ Coverage | 8/10 | 10 global FAQs + per-page FAQPage schema; homepage lacks schema wrapper |
| Author / E-E-A-T | 5/10 | No named author; "Deckbase team" is generic |
| Publication Dates | 6/10 | Present on some pages; missing in JSON-LD on homepage and vs-pages |
| Rendering Strategy | 6/10 | Comparison pages server-rendered ✅; homepage client-rendered ⚠️ |
| Image Optimization | 6/10 | Hero images optimized; icons oversized; 3 empty alts |

---

## Platform Breakdown

| Platform | Score | Key Factor |
|----------|-------|------------|
| Google AI Overviews | 7.5/10 | Good comparison pages; client-side homepage hurts signal |
| ChatGPT | 6.5/10 | No Wikipedia presence; limited named-author authority |
| Perplexity | 7/10 | Reddit/community presence unknown; passage quality strong |
| Bing Copilot | 7/10 | Metadata solid; IndexNow not yet active |

---

## AI Crawler Access Status

### `robots.txt` (current)

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /partner
Disallow: /partner/
Disallow: /partnership
Disallow: /developers
Disallow: /api/
Sitemap: https://www.deckbase.co/sitemap.xml
```

| Crawler | Status | Notes |
|---------|--------|-------|
| GPTBot (OpenAI) | ✅ Allowed (via wildcard) | No explicit rule |
| OAI-SearchBot (OpenAI) | ✅ Allowed | No explicit rule |
| ChatGPT-User (OpenAI) | ✅ Allowed | No explicit rule |
| ClaudeBot (Anthropic) | ✅ Allowed | No explicit rule |
| PerplexityBot (Perplexity) | ✅ Allowed | No explicit rule |
| CCBot (Common Crawl) | ✅ Allowed | Consider blocking if training data is unwanted |
| anthropic-ai | ✅ Allowed | Consider blocking if training data is unwanted |

**Recommendation:** All major AI search crawlers are accessible. Optionally add explicit `User-agent` sections for clarity and to block training-only crawlers (CCBot, anthropic-ai) while keeping search-oriented crawlers.

---

## llms.txt Status

**Status: EXISTS** at `/public/llms.txt`

**Current content:**
```
# Deckbase

> AI-powered flashcard app that turns books, notes, and PDFs into spaced-repetition
> flashcards using OCR and the FSRS algorithm.

## Key pages

- [Homepage](https://www.deckbase.co/)
- [Features](https://www.deckbase.co/features)
- [Premium](https://www.deckbase.co/premium)
- [Download](https://www.deckbase.co/download)
- [MCP integration](https://www.deckbase.co/mcp)
- [MCP for flashcards (resources guide)](https://www.deckbase.co/resources/mcp)
- [Documentation](https://www.deckbase.co/docs)

## About

Deckbase is an iOS and Android app with a free tier and Premium plans. It scans
physical books and digital documents to generate flashcard decks and schedules
reviews using FSRS (Free Spaced Repetition Scheduler) for retention.

## Contact

support@deckbase.co
```

**Missing pages:**
- `/deckbase-vs-anki` — high-value comparison page
- `/deckbase-vs-quizlet` — high-value comparison page
- `/anki-alternatives` — roundup page
- `/best-flashcard-apps` — roundup page

**Recommended addition:**
```
## Comparison & resource pages

- [Deckbase vs Anki](https://www.deckbase.co/deckbase-vs-anki): Side-by-side comparison of AI card generation, FSRS vs SM-2 scheduling, pricing
- [Deckbase vs Quizlet](https://www.deckbase.co/deckbase-vs-quizlet): Feature comparison: spaced repetition, AI, offline use
- [Best Anki Alternatives (2026)](https://www.deckbase.co/anki-alternatives): Roundup of top flashcard apps with spaced repetition
- [Best Flashcard Apps (2026)](https://www.deckbase.co/best-flashcard-apps): Practical guide covering AI, FSRS, mobile, and medical use cases
- [MCP for Flashcards Guide](https://www.deckbase.co/resources/mcp): How Deckbase MCP compares to other MCP servers; example workflows
```

---

## Brand Mention Analysis

| Platform | Status | Action |
|----------|--------|--------|
| Twitter/X | ✅ `@DeckbaseApp` in schema + metadata | Maintain active presence |
| App Store | ✅ Listed with link in Organization schema | Keep rating/review count growing |
| Google Play | ✅ Listed with link in Organization schema | Same |
| Wikipedia | ❌ No presence detected | Long-term: consider brand page once notable enough |
| Reddit | ❓ Unknown | Post in r/Anki, r/medicalschool, r/languagelearning |
| YouTube | ❓ Unknown | Tutorial videos would significantly boost AI visibility |
| LinkedIn | ❓ Unknown | Company page with team improves E-E-A-T |

**Critical insight:** YouTube mentions correlate 0.737 with AI citations (Ahrefs Dec 2025). A YouTube tutorial channel would be the single highest-ROI brand mention investment.

---

## Passage-Level Citability

**Optimal passage length for AI citation: 134–167 words**

### High-Citability Passages Found

**`/deckbase-vs-anki` — Card Creation section (~150 words, Server Component)**
> "The biggest practical difference between Deckbase and Anki is how you create cards. Anki is entirely manual — you type each question and answer yourself. For a chapter of 40 key concepts, that's 20+ minutes of data entry before you can even start studying. Deckbase reverses this. Photograph a page, paste an article, or upload a PDF and the AI extracts the key concepts and generates Q&A cards automatically. The same 40 cards take under a minute. This isn't just a convenience feature — it removes the biggest barrier to actually building a study habit."

Score: **9/10** — Self-contained, specific, citable.

**`/deckbase-vs-anki` — FSRS vs SM-2 section (~130 words, Server Component)**
> "Anki originally used the SM-2 algorithm, developed in 1987. It works — decades of users have proven that. In October 2023, Anki added native FSRS (Free Spaced Repetition Scheduler) support, which uses a more modern memory model. Deckbase uses FSRS by default..."

Score: **8/10** — Specific algorithm names, dates, factual.

**`/best-flashcard-apps` — Methodology section (~120 words, Server Component)**
Good: includes evaluation criteria and methodology explanation.
Score: **7/10** — Could be slightly longer.

### Weak-Citability Areas

**Homepage hero text (~50 words)** — Too short, marketing language.
**About page** — Good quality narrative but client-side rendered (may not be indexed fully).

### Recommendations for Citability

1. Add "What is Deckbase?" definition block in the first 60 words of the homepage (server-rendered).
2. Ensure each major section on comparison pages has a self-contained 134–167 word summary.
3. Add a "Key findings" or "Summary" block at the top of each roundup page.

---

## Server-Side Rendering Check

| Page | Rendering | AI Crawler Impact |
|------|-----------|-------------------|
| `/` (homepage) | `"use client"` | ⚠️ Text may not be immediately available |
| `/about-us` | `"use client"` | ⚠️ E-E-A-T content delayed |
| `/features` | `"use client"` | ⚠️ Feature details delayed |
| `/deckbase-vs-anki` | Server Component | ✅ Optimal |
| `/deckbase-vs-quizlet` | Server Component | ✅ Optimal |
| `/anki-alternatives` | Server Component | ✅ Optimal |
| `/best-flashcard-apps` | Server Component | ✅ Optimal |
| `/resources/mcp` | Server Component | ✅ Optimal |

**AI crawlers do NOT execute JavaScript.** The homepage and About page use `"use client"`, which means Framer Motion animations and React state are the cause. The actual text content may be server-rendered via Next.js SSR even with `"use client"` — verify by viewing page source (`curl https://www.deckbase.co`) to confirm text is in the initial HTML response. If not, extract static content into a server component wrapper.

---

## Structured Data Audit

### Current Coverage

| Page | Schema Types | Assessment |
|------|--------------|------------|
| All pages (layout) | SoftwareApplication, Organization, WebSite | ✅ Good global foundation |
| `/deckbase-vs-anki` | WebPage, FAQPage, BreadcrumbList | ✅ Missing dates |
| `/deckbase-vs-quizlet` | WebPage, FAQPage, BreadcrumbList | ✅ Missing dates |
| `/anki-alternatives` | WebPage, FAQPage, BreadcrumbList | ✅ |
| `/best-flashcard-apps` | WebPage, FAQPage, BreadcrumbList + dates | ✅ Best practice |
| `/resources/mcp` | WebPage + dates, BreadcrumbList | ✅ |
| `/about-us` | None | ⚠️ Missing Organization/About schema |

### Missing Schema

1. **`datePublished` / `dateModified`** — Missing from vs-anki, vs-quizlet JSON-LD (present in visible text only)
2. **`Article` type** — Resource/guide pages use `WebPage` instead of `Article`; Article enables `author`, `datePublished`, `publisher` fields
3. **`Person` schema** — No named author anywhere; weakens E-E-A-T attribution
4. **Homepage `FAQPage`** — 10 FAQs rendered via accordion component but no JSON-LD wrapper

### Schema Recommendations

**Add to `/deckbase-vs-anki` and `/deckbase-vs-quizlet`:**
```json
{
  "@type": "WebPage",
  "datePublished": "2026-03-11",
  "dateModified": "2026-03-26",
  "author": {
    "@type": "Organization",
    "@id": "https://www.deckbase.co/#organization"
  }
}
```

**Upgrade `/best-flashcard-apps` and `/resources/mcp` to Article:**
```json
{
  "@type": "Article",
  "headline": "Best Flashcard Apps in 2026",
  "datePublished": "2026-03-21",
  "dateModified": "2026-03-26",
  "author": {
    "@type": "Organization",
    "@id": "https://www.deckbase.co/#organization"
  },
  "publisher": {
    "@id": "https://www.deckbase.co/#organization"
  }
}
```

**Add FAQPage to homepage (wrap existing FAQ data in JSON-LD):**
```json
{
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Deckbase and how does it work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "..."
      }
    }
  ]
}
```

---

## Top 5 Highest-Impact Changes

### 1. Add `datePublished`/`dateModified` to all content page JSON-LD

**Impact: High | Effort: Low**

vs-anki and vs-quizlet show "Updated March 2026" in visible text but not in JSON-LD. Google AI Overviews and ChatGPT prefer recency signals in machine-readable form.

Files to update: `app/deckbase-vs-anki/page.js`, `app/deckbase-vs-quizlet/page.js`

---

### 2. Expand `/public/llms.txt` with comparison and resource pages

**Impact: High | Effort: Low**

The four comparison/roundup pages (`/deckbase-vs-anki`, `/deckbase-vs-quizlet`, `/anki-alternatives`, `/best-flashcard-apps`) are the most citable content on the site. They should be explicitly listed in `llms.txt` so AI crawlers prioritize them.

---

### 3. Wrap homepage FAQs in FAQPage JSON-LD

**Impact: Medium-High | Effort: Low**

The FAQ data already exists in `components/data/faqs.js`. Adding a `FAQPage` JSON-LD block to `app/layout.js` (or `app/page.js`) would make the 10 Q&A pairs eligible for Google's People Also Ask and AI overview extraction.

---

### 4. Add a named author / Person schema

**Impact: High | Effort: Medium**

No named founder or team member is surfaced anywhere in schema or page content. Adding a `Person` schema for the founder(s) and linking it from the Organization schema (`"founders"` field) significantly improves E-E-A-T in AI citation models.

Example addition to layout.js:
```json
{
  "@type": "Person",
  "@id": "https://www.deckbase.co/#founder",
  "name": "Founder Name",
  "url": "https://www.linkedin.com/in/founder",
  "sameAs": ["https://twitter.com/founder"]
}
```

---

### 5. Verify homepage initial HTML contains full text content

**Impact: High | Effort: Low (investigation) or High (fix)**

The homepage uses `"use client"` (Framer Motion animations). Run:
```bash
curl -s https://www.deckbase.co | grep -i "AI-powered"
```
If the hero text is not in the initial HTML, extract static text sections into a server-rendered wrapper and keep only animation wrappers as client components.

---

## Content Reformatting Suggestions

### Homepage — Add definition block (quick win)

Add a server-rendered "What is Deckbase?" section early in the page:

> **What is Deckbase?**
> Deckbase is an AI-powered flashcard app for iOS and Android that converts notes, PDFs, books, and articles into spaced-repetition flashcards. It uses the FSRS (Free Spaced Repetition Scheduler) algorithm to optimize review timing, and supports MCP (Model Context Protocol) integrations for automated card creation workflows.

This is ~60 words, follows the "X is..." definition pattern that AI models extract for featured snippets.

### `/about-us` — Add named author byline

Change the editorial note from:
> "Team: Deckbase product and editorial team | Updated: March 2026"

To something like:
> "By [Founder Name], Co-founder of Deckbase | Updated: March 21, 2026"

### Comparison pages — Add "Quick verdict" summary block

Each comparison page should open with a 2–3 sentence self-contained verdict (~80–100 words) that AI models can extract as a direct answer:

> **Quick verdict:** Deckbase is better for learners who want to create flashcards quickly from existing material — AI generates a deck in under a minute from any PDF or photo. Anki is better for power users who want maximum customization and community-made decks. Both use FSRS scheduling; Anki offers it as an opt-in, Deckbase uses it by default.

---

## Publication Date Consistency Audit

| Page | Visible Text | JSON-LD | Sitemap |
|------|--------------|---------|---------|
| Homepage | ❌ None | ❌ None | 2026-03-21 |
| About Us | ✅ "March 2026" | ❌ None | 2026-03-21 |
| Features | ❌ None | ❌ None | 2026-03-21 |
| vs-anki | ✅ "March 2026" | ❌ None | 2026-03-11 ⚠️ |
| vs-quizlet | ✅ "March 2026" | ❌ None | 2026-03-11 ⚠️ |
| anki-alternatives | ⚠️ Unknown | ⚠️ Unknown | 2026-03-21 |
| best-flashcard-apps | ✅ "March 2026" | ✅ 2026-03-21 | 2026-03-21 |
| resources/mcp | ✅ "March 2026" | ✅ 2026-03-21 | 2026-03-21 |

**Action:** Standardize all pages to include ISO dates in JSON-LD and update sitemap `lastModified` when content is changed.

---

## Files Referenced

**Codebase:**
- `public/robots.txt`
- `public/llms.txt`
- `next.config.mjs`
- `app/layout.js`
- `app/page.js`
- `app/about-us/page.js`
- `app/features/page.js`
- `app/deckbase-vs-anki/page.js`
- `app/deckbase-vs-quizlet/page.js`
- `app/anki-alternatives/page.js`
- `app/best-flashcard-apps/page.js`
- `app/resources/mcp/page.js`
- `app/sitemap.js`
- `lib/sitemap-metadata.js`
- `components/data/faqs.js`

**Related SEO docs:**
- `docs/seo/ACTION-PLAN.md`
- `docs/seo/COMPETITOR-PAGES.md`
- `docs/seo/IMAGE-OPTIMIZATION.md`
- `docs/seo/CLOUDFLARE-AI-BOTS.md`
- `docs/seo/TODO.md`
