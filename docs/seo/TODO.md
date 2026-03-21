# SEO — tracked TODO

**Purpose:** Single checklist for website SEO work. Source detail lives in [ACTION-PLAN.md](./ACTION-PLAN.md), [FULL-AUDIT-REPORT.md](./FULL-AUDIT-REPORT.md), and [COMPETITOR-PAGES.md](./COMPETITOR-PAGES.md). Update this file when items ship.

**Last reviewed:** 2026-03-21

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

---

## Open — product / content (not automated)

- [ ] **Founder / team** on `/about-us` + optional accurate **`Person`** JSON-LD
- [ ] **`/updates`:** Real changelog → set **`robots: { index: true }`**, add **`/updates`** back to [`lib/sitemap-metadata.js`](../../lib/sitemap-metadata.js)
- [ ] **Comparison & pricing:** Re-verify competitor numbers on a schedule ([COMPETITOR-PAGES.md](./COMPETITOR-PAGES.md))
- [ ] **CSP** — only if you want `Content-Security-Policy` (high regression risk; test all third-party scripts)

## Open — optional engineering

- [ ] **IndexNow ping in CI** after deploy (curl IndexNow API with `INDEXNOW_KEY`)
- [ ] **New landing URLs:** `/anki-alternatives`, `/best-flashcard-apps`, etc. ([COMPETITOR-PAGES.md](./COMPETITOR-PAGES.md) backlog)
- [ ] **Blog / guides** for non-brand queries
- [ ] **hreflang** when real localized pages exist

## Open — other repos

- [ ] Flutter: RevenueCat **`kIsWeb`**, emoji font, **`web/manifest`**, etc. (see [ACTION-PLAN.md](./ACTION-PLAN.md))
- [ ] **Firebase Hosting** headers if Flutter web is hosted there

## Ops (manual; not “done” in code)

- Periodically: **Google Search Console**, **URL Inspection**, GA4 stream host = **www**
- **Cloudflare:** Confirm bot rules match intent ([CLOUDFLARE-AI-BOTS.md](./CLOUDFLARE-AI-BOTS.md))

---

## Quick reference

| Topic | Where |
| ----- | ----- |
| Canonical URL | `lib/site-url.js` |
| Env | `.env.example` (`NEXT_PUBLIC_SITE_URL`, `INDEXNOW_KEY`) |
| Sitemap | `lib/sitemap-metadata.js` → `app/sitemap.js` |
| IndexNow | `middleware.js`, [INDEXNOW.md](./INDEXNOW.md) |
| Regenerate images | `npm run optimize:logo` · `npm run optimize:mock-images` |
