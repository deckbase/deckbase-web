# SEO — tracked TODO

**Purpose:** Single checklist for website SEO work. Source detail lives in [ACTION-PLAN.md](./ACTION-PLAN.md), [FULL-AUDIT-REPORT.md](./FULL-AUDIT-REPORT.md), and [COMPETITOR-PAGES.md](./COMPETITOR-PAGES.md). Update this file when items ship.

**Last reviewed:** 2026-04-04  
**Keyword universe:** [keywords/KEYWORD_UNIVERSE_2026-04.md](./keywords/KEYWORD_UNIVERSE_2026-04.md)

---

## Done (deckbase-web / production)

- [x] Remove misleading **`aggregateRating`** from global JSON-LD (`app/layout.js`)
- [x] **Canonical host:** `lib/site-url.js`, default `https://www.deckbase.co`, `NEXT_PUBLIC_SITE_URL` override ([README](./README.md))
- [x] Apex → **www** redirect verified; sitemap + `robots.txt` use **www**
- [x] Fix duplicate **`| Deckbase`** in segment titles (root `title.template`)
- [x] Footer **©** year (no hydration `null`)
- [x] **`Organization`** enrichment (`sameAs`, stores, `contactPoint`)
- [x] **FAQPage** + **BreadcrumbList** JSON-LD on key marketing routes; docs routes have breadcrumbs
- [x] **`public/llms.txt`**
- [x] Sitemap includes **/mcp**, **/docs**, **/docs/mcp-server**, **/resources**; uses `SITE_URL`
- [x] Comparison pages **`/deckbase-vs-anki`**, **`/deckbase-vs-quizlet`** live + in sitemap
- [x] **Firebase Functions** runtime: `functions/package.json` uses **`node >= 20`**
- [x] **Logo WebP** + **`npm run optimize:logo`**
- [x] **Mock hero WebP** (`public/mock/mock1.webp` … `mock5.webp`) + **`npm run optimize:mock-images`**; components use **`.webp`**
- [x] **Security headers** in `next.config.mjs` (no duplicate **HSTS** — rely on Vercel)
- [x] **`/updates`:** `noindex` until real changelog; excluded from sitemap
- [x] **Testimonial** headings (no “expected feedback” placeholder tone)
- [x] **Sitemap `lastmod`:** [`lib/sitemap-metadata.js`](../../lib/sitemap-metadata.js)
- [x] **`/download`:** visible **Download FAQ** + matching **FAQPage** JSON-LD ([`lib/download-faq.js`](../../lib/download-faq.js), [`DownloadFaq.js`](../../components/DownloadFaq.js))
- [x] **Citations:** FSRS GitHub link in global FAQ + Benefits copy ([`faqs.js`](../../components/data/faqs.js), [`Benefits.js`](../../components/Benefits.js))
- [x] **IndexNow:** [`middleware.js`](../../middleware.js) serves `/{INDEXNOW_KEY}.txt` when **`INDEXNOW_KEY`** is set — [INDEXNOW.md](./INDEXNOW.md)
- [x] **Cloudflare AI bots** checklist — [CLOUDFLARE-AI-BOTS.md](./CLOUDFLARE-AI-BOTS.md)
- [x] **Doc hygiene:** Banners on [ACTION-PLAN.md](./ACTION-PLAN.md) / [FULL-AUDIT-REPORT.md](./FULL-AUDIT-REPORT.md); www in [COMPETITOR-PAGES.md](./COMPETITOR-PAGES.md) schema example
- [x] **Programmatic SEO quality gate script:** add `scripts/pseo-quality-gate.mjs` + `npm run seo:pseo-gate` for uniqueness, thin-content, and batch-size hard-stop checks
- [x] **Vercel production build gate:** run `npm run seo:pseo-gate` before `npm run build` via [`vercel.json`](../../vercel.json)
- [x] **`/anki-alternatives` update:** Expanded import/export migration angle and operational decision framework for `anki alternative` intent
- [x] **`/download` page optimization:** Expanded keyword coverage and free-tier/platform CTA content (`free flashcard app`, `best flashcard app`, iOS, Android)
- [x] **Competitor pages — user quotes:** Added user quote blocks to vs-Anki and vs-Quizlet CTA sections
- [x] **Competitor pages — methodology note:** Added "features verified from official documentation as of March 2026" notes on all vs-pages
- [x] **Competitor pages — pricing disclaimer:** Added explicit "as of March 2026" pricing verification note on vs-page pricing tables
- [x] **`/ai-flashcards` copy + FAQ:** Updated keyword-theme coverage (maker/generator/PDF/free/app/Anki bridge) and expanded FAQ intent coverage
- [x] **`app/mcp/layout.js`:** Strengthened flashcard + MCP keyword alignment in metadata/OG
- [x] **README index:** Added [FLASHCARD_MCP_RANKING_REPORT.md](./audits/FLASHCARD_MCP_RANKING_REPORT.md) to [README.md](./README.md)
- [x] **New resources pages:** Added `/resources/anki-migration-playbook` and `/resources/pdf-to-flashcards-workflow`; linked from `/resources` and added to sitemap metadata
- [x] **CodeYourReality publish:** Published `How to Use MCP for Flashcard Automation (Cursor + Claude)` — https://www.codeyourreality.com/blog/mcp-flashcard-automation-cursor-claude
- [x] **CodeYourReality publish:** Published `Flashcard Automation Quality Checklist: 12 Gates Before You Scale` — https://www.codeyourreality.com/blog/flashcard-automation-quality-checklist
- [x] **CodeYourReality publish:** Published `MCP vs API for Study Automation: Which Should You Use?` — https://www.codeyourreality.com/blog/mcp-vs-api-study-automation
- [x] **CodeYourReality publish:** Published `Deckbase vs Quizlet for Serious Learners (2026)` — https://www.codeyourreality.com/blog/deckbase-vs-quizlet-serious-learners-2026
- [x] **CodeYourReality publish:** Published `How to Build a Flashcard QA Workflow in 30 Minutes` — https://www.codeyourreality.com/blog/flashcard-qa-workflow-30-minutes

---

## Open — product / content (not automated)

- [ ] **Founder / team** on `/about-us` + optional accurate **`Person`** JSON-LD
- [ ] **`/updates`:** Real changelog → set **`robots: { index: true }`**, add **`/updates`** back to [`lib/sitemap-metadata.js`](../../lib/sitemap-metadata.js)
- [ ] **Comparison & pricing:** Re-verify competitor numbers on a schedule ([COMPETITOR-PAGES.md](./competitor-pages/COMPETITOR-PAGES.md))
- [ ] **CSP** — only if you want `Content-Security-Policy` (high regression risk; test all third-party scripts)
- [x] **Blog: AI flashcard generator** — "How AI Flashcard Generators Work (and How to Use One)" → targets `ai flashcards generator` (1,000/mo, KD 14). Cross-link to `/ai-flashcards` *(published: https://www.codeyourreality.com/blog/how-ai-flashcard-generators-work-and-how-to-use-one; source: [`ghost/AI-FLASHCARD-GENERATOR-BLOG-DRAFT.md`](./ghost/AI-FLASHCARD-GENERATOR-BLOG-DRAFT.md), [`ghost/BLOG-DRAFTS-GHOST-HTML.md`](./ghost/BLOG-DRAFTS-GHOST-HTML.md))*
- [x] **Blog: Spaced repetition app** — "Best Spaced Repetition Flashcard App in 2026" → targets `spaced repetition app` (1,000/mo, KD 29, +171% YoY) + `best spaced repetition app` (KD 12). Lead with FSRS as Deckbase differentiator *(published: https://www.codeyourreality.com/blog/best-spaced-repetition-flashcard-app-in-2026; source: [`ghost/SPACED-REPETITION-APP-BLOG-DRAFT.md`](./ghost/SPACED-REPETITION-APP-BLOG-DRAFT.md), [`ghost/BLOG-DRAFTS-GHOST-HTML.md`](./ghost/BLOG-DRAFTS-GHOST-HTML.md))*
- [x] **Blog: Anki import guide** — "How to Import Your Anki Decks into Deckbase (CSV, Excel, and More)" → targets `anki import` / `anki import csv` (KD 6). Unique positioning — no competitor targets this *(published: https://www.codeyourreality.com/blog/how-to-import-your-anki-decks-into-deckbase-csv-excel-and-more; source: [`ghost/ANKI-IMPORT-BLOG-DRAFT.md`](./ghost/ANKI-IMPORT-BLOG-DRAFT.md), [`ghost/BLOG-DRAFTS-GHOST-HTML.md`](./ghost/BLOG-DRAFTS-GHOST-HTML.md))*
- [x] **Blog: PDF to flashcards** — "How to Convert PDF to Flashcards with AI" → targets `pdf to flashcards free` (110/mo, KD 34) + `flashcard maker from pdf` (210/mo) *(published: https://www.codeyourreality.com/blog/how-to-convert-pdf-to-flashcards-with-ai; source: [`ghost/PDF-TO-FLASHCARDS-BLOG-DRAFT.md`](./ghost/PDF-TO-FLASHCARDS-BLOG-DRAFT.md), [`ghost/BLOG-DRAFTS-GHOST-HTML.md`](./ghost/BLOG-DRAFTS-GHOST-HTML.md))*

## Open — optional engineering

- [ ] **IndexNow ping in CI** after deploy (curl IndexNow API with `INDEXNOW_KEY`)
- [ ] **New landing URLs:** `/anki-alternatives`, `/best-flashcard-apps`, etc. ([COMPETITOR-PAGES-AUDIT.md](./competitor-pages/COMPETITOR-PAGES-AUDIT.md) backlog)
- [ ] **Publishing cadence:** Maintain 2 posts/week for 8 weeks, then 1 new post/week + 1 refresh/week
- [x] **Week 1 backlog:** `How to Build a Flashcard QA Workflow in 30 Minutes`
- [ ] **Week 2 backlog:** `Best AI Flashcard Apps in 2026: What Actually Matters` + `PDF to Flashcards: 7 Mistakes That Hurt Retention`
- [ ] **Week 3 backlog:** `Anki vs Deckbase for Fast-Moving Study Workflows` + `Cursor MCP Setup for Flashcards: Step-by-Step`
- [ ] **Week 4 backlog:** `Quizlet Alternative for Long-Term Retention: What to Choose` + `How to Reduce Flashcard Review Time Without Forgetting More`
- [ ] **hreflang** when real localized pages exist
- [ ] **`/ai-flashcards` internal links:** Verify links to `/anki-alternatives`, `/deckbase-vs-anki`, `/download` are present
- [ ] **GSC query filters:** Add filter for `flashcard`, `anki`, `pdf`, `quizlet` — review monthly
- [ ] **Quarterly keyword refresh:** Re-run DataForSEO for seeds `ai flashcards`, `anki alternative`, `spaced repetition app`, `anki import` (US, en, depth 2); update [KEYWORD_UNIVERSE_2026-04.md](./keywords/KEYWORD_UNIVERSE_2026-04.md)
- [ ] **Quarterly SERP re-run:** DataForSEO SERP check after MCP/layout changes or major launches
- [ ] **Competitor pages — `AggregateRating` schema:** Add once App Store rating > 4.5 with 100+ reviews ([COMPETITOR-PAGES-AUDIT.md](./competitor-pages/COMPETITOR-PAGES-AUDIT.md))

## Open — other repos

- [ ] Flutter: RevenueCat **`kIsWeb`**, emoji font, **`web/manifest`**, etc. (see [ACTION-PLAN.md](./action-plans/ACTION-PLAN.md))
- [ ] **Firebase Hosting** headers if Flutter web is hosted there
- [ ] Flutter: Audit all `onSnapshot` / `StreamSubscription` for missing `dispose()` — accumulated listeners degrade INP (ACTION-PLAN L7)
- [ ] Flutter: Move APKG import, batch card creation, and image OCR to `compute()` / `Isolate.spawn()` — keep main thread free (ACTION-PLAN L8)

## Ops (manual; not “done” in code)

- Periodically: **Google Search Console**, **URL Inspection**, GA4 stream host = **www**
- **Cloudflare:** Confirm bot rules match intent ([CLOUDFLARE-AI-BOTS.md](./technical/CLOUDFLARE-AI-BOTS.md))
- **Competitor page triggers:** Review/update vs-pages when — competitor pricing changes · Anki major version · Quizlet adds/removes spaced repetition · Deckbase ships desktop app or major feature · App Store rating crosses 4.5 / 100+ reviews

---

## Quick reference

| Topic | Where |
| ----- | ----- |
| Canonical URL | `lib/site-url.js` |
| Env | `.env.example` (`NEXT_PUBLIC_SITE_URL`, `INDEXNOW_KEY`) |
| Sitemap | `lib/sitemap-metadata.js` → `app/sitemap.js` |
| IndexNow | `middleware.js`, [INDEXNOW.md](./INDEXNOW.md) |
| Regenerate images | `npm run optimize:logo` · `npm run optimize:mock-images` |
