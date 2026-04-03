# SEO — tracked TODO

**Purpose:** Single checklist for website SEO work. Source detail lives in [ACTION-PLAN.md](./ACTION-PLAN.md), [FULL-AUDIT-REPORT.md](./FULL-AUDIT-REPORT.md), and [COMPETITOR-PAGES.md](./COMPETITOR-PAGES.md). Update this file when items ship.

**Last reviewed:** 2026-04-03  
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

---

## Open — product / content (not automated)

- [ ] **Founder / team** on `/about-us` + optional accurate **`Person`** JSON-LD
- [ ] **`/updates`:** Real changelog → set **`robots: { index: true }`**, add **`/updates`** back to [`lib/sitemap-metadata.js`](../../lib/sitemap-metadata.js)
- [ ] **Comparison & pricing:** Re-verify competitor numbers on a schedule ([COMPETITOR-PAGES.md](./competitor-pages/COMPETITOR-PAGES.md))
- [ ] **CSP** — only if you want `Content-Security-Policy` (high regression risk; test all third-party scripts)
- [ ] **Blog: AI flashcard generator** — "How AI Flashcard Generators Work (and How to Use One)" → targets `ai flashcards generator` (1,000/mo, KD 14). Cross-link to `/ai-flashcards`
- [ ] **Blog: Spaced repetition app** — "Best Spaced Repetition Flashcard App in 2026" → targets `spaced repetition app` (1,000/mo, KD 29, +171% YoY) + `best spaced repetition app` (KD 12). Lead with FSRS as Deckbase differentiator
- [ ] **Blog: Anki import guide** — "How to Import Your Anki Decks into Deckbase (CSV, Excel, and More)" → targets `anki import` / `anki import csv` (KD 6). Unique positioning — no competitor targets this
- [ ] **Blog: PDF to flashcards** — "How to Convert PDF to Flashcards with AI" → targets `pdf to flashcards free` (110/mo, KD 34) + `flashcard maker from pdf` (210/mo)

## Open — optional engineering

- [ ] **IndexNow ping in CI** after deploy (curl IndexNow API with `INDEXNOW_KEY`)
- [ ] **New landing URLs:** `/anki-alternatives`, `/best-flashcard-apps`, etc. ([COMPETITOR-PAGES-AUDIT.md](./competitor-pages/COMPETITOR-PAGES-AUDIT.md) backlog)
- [ ] **Blog / guides** for non-brand queries
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
