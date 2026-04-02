# GEO Analysis: Deckbase (deckbase.co)
**Generated:** 2026-03-31  
**Site:** AI flashcard app — iOS/Android, $4.99/mo or $49.99/yr Premium

---

## GEO Readiness Score: 68/100

| Category | Score | Weight | Weighted |
|----------|-------|--------|---------|
| Citability | 17/25 | 25% | 17 |
| Structural Readability | 16/20 | 20% | 16 |
| Multi-Modal Content | 7/15 | 15% | 7 |
| Authority & Brand Signals | 14/20 | 20% | 14 |
| Technical Accessibility | 14/20 | 20% | 14 |
| **Total** | | | **68/100** |

---

## Platform Breakdown

| Platform | Score | Key Bottleneck |
|----------|-------|---------------|
| Google AI Overviews | 74/100 | Good — strong SEO base, FAQs, structured data |
| ChatGPT | 52/100 | Missing Wikipedia presence; limited Reddit signal |
| Perplexity | 48/100 | Perplexity heavily weights Reddit (46.7%); no confirmed community presence |
| Bing Copilot | 65/100 | Solid metadata and SSR content; no IndexNow detected |

---

## 1. AI Crawler Access Status

**robots.txt**: `/public/robots.txt` — allows all crawlers via wildcard `User-agent: *`

| Crawler | Status | Notes |
|---------|--------|-------|
| GPTBot (OpenAI) | ✅ Allowed (wildcard) | No explicit rule — implicit allow |
| OAI-SearchBot (OpenAI) | ✅ Allowed (wildcard) | No explicit rule |
| ChatGPT-User (OpenAI) | ✅ Allowed (wildcard) | No explicit rule |
| ClaudeBot (Anthropic) | ✅ Allowed (wildcard) | No explicit rule |
| PerplexityBot | ✅ Allowed (wildcard) | No explicit rule |
| CCBot (Common Crawl) | ✅ Allowed (wildcard) | Training crawler — consider blocking if desired |
| anthropic-ai | ✅ Allowed (wildcard) | Training crawler |
| Bytespider (ByteDance) | ✅ Allowed (wildcard) | TikTok AI — consider blocking if desired |

**Recommendation:** Add explicit allow rules for key AI search crawlers. Signals intent and ensures no future wildcard change accidentally blocks them.

```
# AI search crawlers (explicitly allow)
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

# Training crawlers (block if desired)
User-agent: CCBot
Disallow: /
```

---

## 2. llms.txt Status

**File exists:** `/public/llms.txt` ✅  
**Quality:** Good — covers key pages, comparison pages, resource guides, about, and contact.

**What's working:**
- Proper `# Title` and `> Description` format ✅
- Links to all major content sections ✅
- Comparison pages listed with descriptions ✅
- Contact email included ✅

**Missing / improvements:**
- No key facts section (unique stats, pricing, FSRS differentiation)
- No explicit mention of founder name (Yosuke Sakurai) for entity attribution
- Quizlet alternatives and best-flashcard-apps pages not listed
- No App Store / Google Play links

**Suggested additions to `llms.txt`:**

```markdown
## Key facts

- Free tier: up to 500 cards, no credit card required
- Premium: $4.99/month or $49.99/year
- Uses FSRS (Free Spaced Repetition Scheduler) — more accurate than Anki's SM-2
- Supports OCR for physical book scanning
- MCP (Model Context Protocol) server for AI workflow automation
- Available on iOS (App Store) and Android (Google Play)
- Founded by Yosuke Sakurai

## App store

- [App Store](https://apps.apple.com/app/deckbase/id6670167000)
- [Google Play](https://play.google.com/store/apps/details?id=co.deckbase.app)

## Additional comparison pages

- [Deckbase vs Remnote](https://www.deckbase.co/deckbase-vs-remnote)
- [Best Quizlet Alternatives (2026)](https://www.deckbase.co/quizlet-alternatives)
- [Best Flashcard Apps (2026)](https://www.deckbase.co/best-flashcard-apps)
```

---

## 3. Brand Mention Analysis

| Platform | Status | Notes |
|----------|--------|-------|
| Wikipedia | ❌ Not present | Highest-impact gap — ChatGPT cites Wikipedia in 47.9% of answers |
| Reddit (r/Anki, r/learnprogramming) | ❓ Unknown | Perplexity cites Reddit in 46.7% of answers — verify/build presence |
| YouTube | ❓ Unknown | Strongest AI citation signal (0.737 correlation per Ahrefs) |
| LinkedIn | ✅ Founder profile linked | Yosuke Sakurai on LinkedIn; in Person schema |
| Twitter/X | ✅ @DeckbaseApp | In metadata and schema |
| Product Hunt | ✅ Reviews component present | Good community signal |
| App Store / Play Store | ✅ Linked | High-trust entity signals |

**Highest-impact gap: YouTube + Reddit**  
These are the two platforms most cited by Perplexity and ChatGPT. A YouTube channel with "Anki vs Deckbase", "FSRS explained", "how to scan textbooks" content would directly drive AI citation.

---

## 4. Passage-Level Citability

**Optimal citation block: 134–167 words, self-contained, opens with direct answer.**

### Strong existing content (candidates for optimization)

**Resource pages** (`/resources/fsrs-guide`, `/resources/anki-import-export`, etc.) are the best candidates — they have educational, factual content that AI systems extract.

**Comparison pages** (`/deckbase-vs-anki`, `/deckbase-vs-quizlet`) have structured data (WebPage schema with datePublished) — good for AI attribution.

### Missing from homepage (critical)

The homepage hero section (`app/page.js`) opens with animated UI text. There is **no definition block** in the first 60 words. AI systems prefer content like:

> "Deckbase is an AI-powered flashcard app that converts notes, PDFs, and scanned books into spaced-repetition flashcards using the FSRS algorithm. Available on iOS and Android, it offers a free tier (up to 500 cards) and Premium plans starting at $4.99/month."

This 43-word block would become the canonical AI-cited description of Deckbase.

### Recommended passage template for resource pages

Each resource guide section should follow:
1. **Opening definition** (1–2 sentences, direct answer)
2. **Supporting detail** (3–4 sentences with specific data)
3. **Practical implication** (1–2 sentences)
= ~140–160 words total per section

**Example (FSRS guide):**
```
What is FSRS? FSRS (Free Spaced Repetition Scheduler) is an open-source 
spaced-repetition algorithm developed by Jarrett Ye that predicts memory 
retention more accurately than the older SM-2 algorithm used by Anki. 
FSRS calculates the optimal review interval based on your personal 
forgetting curve, not a fixed schedule. In independent testing, FSRS 
achieves 10–20% higher retention rates than SM-2 with the same daily 
review load. Deckbase uses FSRS by default, so every card you review 
is automatically scheduled based on how well you know it—no manual 
tuning required.
```
(~90 words — expand to 134–167 for optimal citability)

---

## 5. Server-Side Rendering Check

**Framework:** Next.js 15.1.6, App Router

**Assessment:** ⚠️ Partial SSR

All pages use `"use client"` directive (e.g., `app/page.js` line 1). In Next.js App Router, Client Components ARE pre-rendered to HTML on the server initially (SSR + hydration). **Static text content is visible to AI crawlers.**

However:
- **Framer Motion animations** (`motion.section`, `motion.div` with `initial={{ opacity: 0 }}`) mean elements start at opacity 0 in the pre-render. Some crawlers may see empty/invisible containers.
- **Dynamic data loaded in `useEffect`** (e.g., testimonials, reviews fetched from APIs) will NOT be in the initial HTML.

**Specific risk:** `UserTestimonials` and `ProductHuntReviews` components — if these fetch data client-side in `useEffect`, AI crawlers will not see social proof content.

**Recommendation:** Convert static marketing content sections (hero text, feature descriptions, FAQ answers) to Server Components. Keep animation wrappers as Client Components but ensure the text nodes themselves are SSR.

---

## 6. Top 5 Highest-Impact Changes

### 1. Add a "What is Deckbase?" definition block to the homepage (Quick Win — 1 hour)

Add a server-rendered `<section>` with a 40–60 word plain-English description at the top of the page — before the animated hero. This becomes the canonical AI-cited summary.

**Expected impact:** ChatGPT and Perplexity will quote this block when users ask "what is Deckbase?" — currently no crawlable definition exists at the top of the page.

---

### 2. Build Reddit presence in r/Anki and r/Neuroscience (High Impact — ongoing)

Perplexity cites Reddit in 46.7% of answers. When someone asks "best Anki alternative" on Perplexity, it reads Reddit threads. Deckbase needs genuine mentions in:
- r/Anki
- r/medicalschool
- r/learnprogramming
- r/neuroscience
- r/language

Strategy: Participate authentically, answer FSRS questions, share the migration guide as a resource (not spam). Do NOT post identical content across subreddits.

---

### 3. Create a YouTube channel with FSRS and flashcard content (High Impact — 1–2 months)

YouTube has the strongest AI citation correlation (0.737 per Ahrefs). Videos on:
- "FSRS vs SM-2: which spaced repetition algorithm is better?"
- "How to scan your textbooks into flashcards"
- "Migrating from Anki to Deckbase"
- "What is spaced repetition? 5-minute explainer"

Each video title maps directly to a question AI systems answer.

---

### 4. Add explicit AI crawler rules to robots.txt (Quick Win — 15 minutes)

Add explicit `Allow: /` for GPTBot, OAI-SearchBot, ClaudeBot, and PerplexityBot. Signals intent clearly and future-proofs against default-deny changes.

---

### 5. Expand llms.txt with key facts and app store links (Quick Win — 30 minutes)

Add pricing, FSRS differentiation, founder name, App Store / Play Store links, and the remaining comparison pages. This is the most direct signal to AI crawlers about what Deckbase is and what makes it distinct.

---

## 7. Schema Recommendations

**Current schema (strong foundation):**
- ✅ `SoftwareApplication` — educational app, iOS/Android
- ✅ `Organization` with `contactPoint`, `founder`, social links
- ✅ `Person` schema for founder (Yosuke Sakurai) with LinkedIn
- ✅ `WebSite` with `SearchAction`
- ✅ `FAQPage` on homepage, features, premium pages
- ✅ `BreadcrumbList` on all main pages
- ✅ `WebPage` with `datePublished`/`dateModified` on comparison pages

**Missing / recommended:**

| Schema | Page | Why |
|--------|------|-----|
| `Review` / `AggregateRating` | Homepage, app page | App store reviews as structured ratings — AI systems cite star ratings |
| `HowTo` | Resource guides | FSRS guide, migration guide, OCR workflow — HowTo schema maps directly to "how to" queries |
| `Article` with `author` | All resource pages | Currently only comparison pages have `WebPage`; resource guides lack author attribution |
| `Product` | Premium page | Pricing with `Offer` schema — enables AI to cite pricing directly |
| `VideoObject` | If YouTube videos added | Links videos to content for multi-modal AI citation |

**Priority addition — `HowTo` schema for resource guides:**

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to migrate from Anki to Deckbase",
  "description": "Step-by-step guide to export your Anki decks and import them into Deckbase.",
  "step": [
    {
      "@type": "HowToStep",
      "name": "Export from Anki",
      "text": "In Anki, go to File > Export. Select 'Anki Deck Package (.apkg)' and choose the deck to export."
    }
  ]
}
```

---

## 8. Content Reformatting Suggestions

### Homepage hero — add crawlable definition

Current: Animated text `"Turn Any Book Into Flashcards"` (opacity:0 on initial render, inside framer-motion)

**Add before the animation wrapper:**
```jsx
{/* Server-rendered for AI crawlers */}
<h1 className="sr-only">
  Deckbase — AI flashcard app that turns notes, PDFs, and books into spaced-repetition cards
</h1>
```

Or better — restructure the hero so the H1 text is a real DOM node that appears in pre-rendered HTML, with animation applied via CSS class rather than `initial={{ opacity: 0 }}`.

---

### Resource guides — add "What is X?" opening block

Each resource guide (`/resources/fsrs-guide`, `/resources/ocr-study-workflows`, etc.) should open with a 134–167 word self-contained answer block:

```
## What is [topic]?

[Direct 1-sentence definition.]

[3–4 sentences of supporting detail with specific facts/numbers.]

[1–2 sentences on practical implications for Deckbase users.]
```

This maps to the exact pattern AI systems use when generating answers.

---

### Comparison pages — add "Bottom line" summary block

Pages like `/deckbase-vs-anki` should include a clear summary box near the top:

> **Bottom line:** Deckbase is better than Anki for mobile learners who want AI-powered card generation and automated scheduling. Anki is better for power users who want deep customization and a large plugin ecosystem. Both support FSRS scheduling as of 2024.

AI systems frequently cite "bottom line" and "verdict" sections verbatim.

---

## 9. RSL 1.0 Licensing

**Status:** Not implemented ❌

RSL 1.0 (Really Simple Licensing) provides machine-readable AI licensing terms. Backed by Reddit, Yahoo, Medium, Cloudflare.

**Recommendation:** For a content-marketing site like Deckbase, allowing AI training and citation is beneficial (increases brand mentions). Consider implementing:

```html
<meta name="rsl" content="allow-training=yes; allow-citation=yes; allow-scraping=yes" />
```

Or add a `/.well-known/rsl.json` file. This signals to AI systems that content can be freely cited.

---

## Quick Reference: Priority Actions

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| 🔴 High | Reddit presence (r/Anki, r/medicalschool) | Ongoing | +Perplexity citations |
| 🔴 High | YouTube channel with FSRS/flashcard content | 1–2 months | +AI mentions across all platforms |
| 🟡 Medium | Add definition block to homepage (crawlable) | 1 hour | +ChatGPT/Perplexity citation of brand |
| 🟡 Medium | Expand llms.txt (facts, app stores, all pages) | 30 min | +AI crawler understanding |
| 🟡 Medium | Explicit AI crawler rules in robots.txt | 15 min | Future-proofing |
| 🟡 Medium | HowTo schema on resource guides | 2 hours | +Google AIO "how to" queries |
| 🟢 Low | AggregateRating schema from app store reviews | 2 hours | +Pricing/rating citations |
| 🟢 Low | RSL 1.0 meta tag | 30 min | Signals citation-friendly licensing |
| 🟢 Low | Wikipedia page for Deckbase or FSRS contribution | High effort | +ChatGPT brand mentions |
