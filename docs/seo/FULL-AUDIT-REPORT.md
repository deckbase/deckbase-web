# SEO Full Audit Report — deckbase.co
**Audit Date:** 2026-03-11
**URL Audited:** https://www.deckbase.co/
**Business Type:** SaaS / Mobile App (EdTech — AI Flashcard App)
**Stack:** Marketing site (Next.js/separate repo) + Flutter Web app (this repo)
**Pages Crawled:** 9 (all sitemap pages + homepage)

---

## Architecture Note

Two distinct layers serve `deckbase.co`:

1. **Marketing website** (`www.deckbase.co`) — appears to be a Next.js site hosted separately. This is what search engines primarily index. It has proper HTML, structured data, and meta tags.
2. **Flutter Web app** (`deckbase-mobile` — this repo) — compiled Flutter app with a `web/` build target. If deployed at the same domain or a subdomain, it has significant SEO concerns.

This report covers both layers. Marketing site findings are from live page analysis; Flutter app findings are from source code analysis.

---

## Overall SEO Health Score: **50 / 100** ⚠️

| Category | Score | Weight | Weighted |
|---|---|---|---|
| Technical SEO | 50/100 | 25% | 12.5 |
| Content Quality | 38/100 | 25% | 9.5 |
| On-Page SEO | 60/100 | 20% | 12.0 |
| Schema / Structured Data | 45/100 | 10% | 4.5 |
| Performance (CWV signals) | 45/100 | 10% | 4.5 |
| Images | 55/100 | 5% | 2.75 |
| AI Search Readiness | 15/100 | 5% | 0.75 |
| **Total** | | | **46.5 → 47** |

> Score updated downward after deep source analysis revealed Flutter Web performance issues and E-E-A-T gaps.

---

## Top 5 Critical Issues

1. **Fake AggregateRating schema** — All pages claim 4.8/5 from 500 reviews, but the /updates page shows the product as "Coming Soon." This violates Google's rich results guidelines and risks a sitewide manual penalty.
2. **www vs non-www canonical mismatch** — Every canonical tag and all sitemap URLs use `https://deckbase.co` (non-www) while the site is served on `https://www.deckbase.co`. Link equity is split.
3. **Flutter Web app: RevenueCat SDK runs on web without `kIsWeb` guard** — `_configurePurchaseSDK()` is called unconditionally in `main()` before `runApp()`, potentially hanging the entire app startup on web.
4. **10MB emoji font bundled** — `NotoColorEmoji.ttf` (10MB) is a bundled Flutter asset. On web, this alone can push LCP beyond 10s on mobile connections.
5. **All major AI crawlers blocked** — `robots.txt` explicitly disallows GPTBot, ClaudeBot, Google-Extended, and 4 others — eliminating AI Overview and AI-powered search citation potential entirely.

## Top 5 Quick Wins

1. Remove `AggregateRating` schema blocks until real App Store/Play Store reviews exist
2. Fix www/non-www consistency across canonicals and sitemap (1–2 hours)
3. Fix duplicate `| Deckbase` in 3 page titles (15 min template fix)
4. Fix `©null` copyright bug in footer
5. Guard `_configurePurchaseSDK()` with `if (!kIsWeb)` in `main.dart`

---

## 1. Technical SEO

### 1.1 robots.txt

```
User-agent: *
Content-Signal: search=yes, ai-train=no
Allow: /
Disallow: /admin, /partner, /developers, /api/

# Cloudflare-managed AI blocks:
User-agent: ClaudeBot    → Disallow: /
User-agent: GPTBot       → Disallow: /
User-agent: Google-Extended → Disallow: /
User-agent: Amazonbot    → Disallow: /
User-agent: Applebot-Extended → Disallow: /
User-agent: Bytespider   → Disallow: /
User-agent: CCBot        → Disallow: /
User-agent: meta-externalagent → Disallow: /

Sitemap: https://deckbase.co/sitemap.xml
```

| Issue | Severity |
|---|---|
| All major AI search crawlers blocked — no AI Overviews, ChatGPT, Perplexity, Apple Intelligence | High |
| Sitemap declared as `https://deckbase.co/sitemap.xml` (non-www) — inconsistent with served domain | Medium |

### 1.2 Canonical Tags

| Page | Canonical | Served URL | Match? |
|---|---|---|---|
| Homepage | `https://deckbase.co` | `https://www.deckbase.co/` | ❌ No |
| /features | `https://deckbase.co/features` | `https://www.deckbase.co/features` | ❌ No |
| /premium | `https://deckbase.co/premium` | `https://www.deckbase.co/premium` | ❌ No |
| /about-us | `https://deckbase.co/about-us` | `https://www.deckbase.co/about-us` | ❌ No |
| /download | `https://deckbase.co/download` | `https://www.deckbase.co/download` | ❌ No |
| /contact-us | `https://deckbase.co/contact-us` | `https://www.deckbase.co/contact-us` | ❌ No |

**Severity: Critical** — Every page has a canonical mismatch. If `www.deckbase.co` is the preferred domain, all canonicals must be updated. If `deckbase.co` is preferred, a 301 redirect from www → non-www must be confirmed and active.

### 1.3 Sitemap

- **Location:** `https://deckbase.co/sitemap.xml`
- **Total URLs:** 9
- **Sitemap index:** 404 (does not exist)

| Check | Status |
|---|---|
| Valid XML format | ✅ |
| Declared in robots.txt | ✅ |
| All lastmod dates identical (`2026-03-09T10:44:43.393Z`) | ⚠️ Artificial — all 9 pages same timestamp |
| All URLs use non-www | ❌ Inconsistent with served domain |
| /mcp page (in nav) missing from sitemap | ❌ |
| /refunds page (in footer) missing from sitemap | ❌ |
| No sitemap index | ⚠️ Fine now, plan for growth |

### 1.4 Security Headers

`firebase.json` has **no `"hosting"` block**, meaning no custom security headers are configured via Firebase Hosting:

| Missing Header | Impact |
|---|---|
| `Content-Security-Policy` | Security + Lighthouse score |
| `X-Frame-Options` | Clickjacking protection |
| `X-Content-Type-Options` | MIME sniffing protection |
| `Strict-Transport-Security` | HTTPS enforcement |
| `Referrer-Policy` | Privacy signal |

**Severity: High**

### 1.5 hreflang

`main.dart` declares `supportedLocales: [Locale('en', 'US'), Locale('ja', 'JP')]` — the app supports Japanese. However:
- No `hreflang` tags exist on any page
- No locale-specific URLs (`/ja/`, `?lang=ja`)
- Japanese-speaking users will get the same English content

**Severity: Medium** — If the app/content differs by locale, implement hreflang. If not, confirm all content is English-only.

### 1.6 IndexNow

No IndexNow key file exists in `/web/`. Google, Bing, and Yandex are not notified of content changes.

**Severity: High** — Especially important for an early-stage site where crawl budget is limited.

### 1.7 Infrastructure Health

| Issue | File | Severity |
|---|---|---|
| Firebase Functions running Node.js 16 (EOL Sept 2023) | `functions/package.json` | Medium |
| `firebase.json` has no `"hosting"` block (no CDN/cache config) | `firebase.json` | High |
| `web/manifest.json` is effectively empty (1 byte) | `web/manifest.json` | High |

---

## 2. Content Quality

### 2.1 E-E-A-T Assessment

**Overall E-E-A-T Score: 38 / 100**

| Dimension | Score | Key Gap |
|---|---|---|
| **Experience** | 15/20 | No founder story, no first-hand use demonstrations |
| **Expertise** | 18/25 | FSRS named correctly, but "scientifically proven" with no citations |
| **Authoritativeness** | 10/25 | No named team, no press mentions, no verified social proof |
| **Trustworthiness** | 22/30 | Legal pages exist; contact email present; but `©null` bug and fake ratings undermine trust |

**No individual team members or founders are identified anywhere on the site.** All testimonials use generic role labels ("Medical Student", "Language Learner") with no real names, photos, or verifiable identities. For an EdTech product where trust is critical, this is the single biggest E-E-A-T gap.

### 2.2 Content Depth by Page

| Page | Content Status | Issues |
|---|---|---|
| Homepage | ✅ Good | Solid hero, features overview, testimonials |
| /features | ⚠️ Medium | Placeholder sections: "What We Expect to Hear", "Expected User Feedback" |
| /premium | ✅ Good | Clear pricing table, feature comparison |
| /about-us | ⚠️ Medium | No named team; no origin story; generic values only |
| /download | ✅ Good | Clear CTA, platform details |
| /contact-us | ✅ Good | Working form, email addresses |
| /updates | ❌ Empty | "Coming Soon" placeholder — no content |
| /privacy-policy | Not audited | Legal page |
| /terms-and-conditions | Not audited | Legal page |

### 2.3 Thin Content

- **/updates** — Zero real content. "Coming Soon" with signup form provides no SEO value.
- **/features** — "Expected User Feedback" and "What We Expect to Hear" are obviously placeholder sections published by mistake.

### 2.4 Missing Citations

The phrase "scientifically proven study method" appears without any link to:
- The Ebbinghaus forgetting curve research
- The FSRS algorithm paper by Jarrett Ye
- Any cognitive science backing

**Severity: Medium** — Google's QRG flags unsubstantiated expertise claims.

### 2.5 AI Citation Readiness

**Score: 28 / 100**

| Factor | Score |
|---|---|
| Structured, quotable factual claims | 3/20 |
| Clear entity definition | 8/15 |
| FAQ-style content | 0/15 (no FAQ schema despite FAQ sections) |
| Comparison claims (vs Anki) | 4/15 |
| Statistical/data claims | 0/10 |
| Named author attribution | 0/10 |

---

## 3. On-Page SEO

### 3.1 Title Tags

| Page | Title | Issues |
|---|---|---|
| Homepage | `Deckbase — Scan. Build. Remember.` | ✅ |
| /features | `Features — AI Flashcards... \| Deckbase \| Deckbase` | ❌ Duplicate brand |
| /premium | `Deckbase Premium — Unlimited AI... \| Deckbase` | ✅ |
| /about-us | `About Deckbase — Our Story... \| Deckbase` | ✅ |
| /download | `Download Deckbase — iOS & Android \| Scan. Build. Remember. \| Deckbase` | ✅ |
| /contact-us | `Contact Us — Support & Inquiries \| Deckbase \| Deckbase` | ❌ Duplicate brand |
| /updates | `What's New — Updates & Changelog \| Deckbase \| Deckbase` | ❌ Duplicate brand |

3 titles have duplicate `| Deckbase` — a template rendering bug.

### 3.2 Meta Descriptions

All pages have unique, relevant meta descriptions under 160 characters. ✅

### 3.3 Heading Structure

| Page | H1 | Issue |
|---|---|---|
| /features | "Features & Benefits" | H4 used for feature names, skipping H3 |
| /premium | "Unlock Advanced AI Learning Tools..." | ✅ |
| /about-us | "Helping You Remember Everything You Learn" | ✅ |

### 3.4 Internal Linking Gaps

- No blog or content hub = no contextual internal links
- Navigation is the only linking mechanism (no body copy cross-links)
- `/mcp` in navigation but not in sitemap
- `/refunds` in footer but not in sitemap

### 3.5 Missing SEO Pages

| Missing | Opportunity |
|---|---|
| Blog / Learning Hub | High — keyword ranking, topical authority |
| Comparison pages | High — "Deckbase vs Anki", "vs Quizlet" |
| Use case pages | High — "AI flashcards for medical students" |
| /mcp content | Medium — already linked |

---

## 4. Schema & Structured Data

### 4.1 Current Implementation (Live Site)

Three JSON-LD blocks are present on all pages: `SoftwareApplication`, `Organization`, `WebSite`.

```json
// Present on all pages:
{
  "@type": "SoftwareApplication",
  "aggregateRating": {
    "ratingValue": "4.8",
    "reviewCount": "500"
  }
}
```

### 4.2 Critical Schema Issue — False AggregateRating

**Severity: Critical**

500 ratings claimed for an app whose /updates page advertises it as "Coming Soon." Google's documentation explicitly states ratings must be from real users. False ratings in structured data = potential manual action penalty.

### 4.3 Missing Schemas

| Schema Type | Priority | Opportunity |
|---|---|---|
| `FAQPage` | High | FAQ sections exist on 4+ pages — just needs JSON-LD |
| `PriceSpecification` | High | /premium has pricing but minimal schema |
| `BreadcrumbList` | Medium | SERP breadcrumb trail display |
| `ContactPage` + `ContactPoint` | Medium | /contact-us |
| `Organization.logo` | Medium | Missing from Organization schema |
| `Organization.sameAs` (App Store URLs) | Medium | Once app is live |
| `MobileApplication` (iOS/Android split) | Low | More specific than SoftwareApplication |

### 4.4 Schema Validation Issues

| Issue | Severity |
|---|---|
| `aggregateRating.reviewCount: 500` — unverifiable/false | Critical |
| `Organization` missing `logo`, `address` | Medium |
| `WebSite.potentialAction` (SearchAction) — verify search endpoint exists | Low |

---

## 5. Performance (Core Web Vitals)

### 5.1 Flutter Web Architecture — Structural LCP Risk

**Severity: Critical**

The Flutter app (`deckbase-mobile` repo) compiles to a monolithic JavaScript bundle. If served at the same domain as the marketing site, the boot sequence is:
1. Download + parse Flutter engine JS (render-blocking)
2. Download + parse `main.dart.js` (typically 2–6MB)
3. Flutter initializes its rendering pipeline
4. First frame paints to `<canvas>`

Nothing is visible until step 4. **Estimated LCP: 5–15s on mobile connections without optimization.**

### 5.2 Critical Performance Issues (Source Code Analysis)

| Issue | File | Impact | Severity |
|---|---|---|---|
| `NotoColorEmoji.ttf` — 10MB bundled font | `pubspec.yaml` / `assets/fonts/` | +10MB transfer on first load | Critical |
| `app_logo.png` — 188KB PNG, no WebP version | `assets/app_logo.png` | LCP image weight | High |
| `_configurePurchaseSDK()` (RevenueCat) called before `runApp()` without `kIsWeb` guard | `lib/main.dart` | Potential startup hang on web | Critical |
| `GoogleFonts.montserrat()` used for all 14 text styles | `lib/core/ui/theme/fontstyle.dart` | Runtime HTTP to `fonts.gstatic.com` on every first text render | High |
| No `"hosting"` block in `firebase.json` — no cache headers, no Brotli | `firebase.json` | No CDN optimization for JS bundle | High |
| Pre-`runApp()` await chain: Firebase + RevenueCat + Hive + SharedPrefs + AppLinks | `lib/main.dart` | All blocking first paint | High |

### 5.3 CLS (Cumulative Layout Shift)

**Severity: Medium**

Flutter Web renders to `<canvas>` — DOM-level CLS will score near 0.0. However:
- `SizedBox.shrink()` → full CTA card replacement when async data loads = visible layout jump
- Splash-to-Flutter-canvas transition creates a visual pop
- Google Fonts FOUT causes text re-render

### 5.4 INP (Interaction to Next Paint)

**Severity: High**

- Firestore `onSnapshot` listeners compete with interaction handlers on the main thread
- `dispose()` cancellation of listeners must be verified — accumulated listeners degrade INP over session duration
- Heavy batch operations (APKG import, bulk card creation) run on main thread — should use Dart `Isolate`

### 5.5 Key Performance Recommendations

| Fix | Expected Impact | Effort |
|---|---|---|
| Subset `NotoColorEmoji.ttf` → ~100KB | Removes 9.9MB from payload | Low (pyftsubset tool) |
| Convert `app_logo.png` → WebP (target <20KB) | Reduces LCP image by ~90% | Low |
| Guard `_configurePurchaseSDK()` with `if (!kIsWeb)` | Removes potential startup hang | 5 min |
| Move non-critical init to post-first-frame | Unblocks `runApp()` | Medium |
| Add `firebase.json` hosting block with Brotli + cache headers | Faster repeat visits | Low |
| Self-host Montserrat font (already have NotoSans in assets) | Eliminates external font request | Medium |

---

## 6. Images

### 6.1 Marketing Site Alt Text

Feature images on /features have descriptive alt text ✅ — "AI-Powered Card Generation", "Spaced Repetition System", etc.

### 6.2 App Assets

| Asset | Issue | Severity |
|---|---|---|
| `assets/app_logo.png` (188KB) | No WebP equivalent; used as LCP image in web build | High |
| `assets/fonts/NotoColorEmoji.ttf` (10MB) | Oversized font treated as asset bundle | Critical |
| App Store / Play Store badge alt text | Likely generic | Low |

---

## 7. AI Search Readiness

**Score: 15 / 100**

| Factor | Status |
|---|---|
| GPTBot | ❌ Blocked |
| Google-Extended | ❌ Blocked |
| ClaudeBot | ❌ Blocked |
| Applebot-Extended | ❌ Blocked |
| Perplexity/Bytespider | ❌ Blocked |
| `llms.txt` | ❌ Missing |
| Structured, citable content | ⚠️ Partial |
| FAQ structured data | ❌ Missing |
| Named author attribution | ❌ Missing |

The `Content-Signal: ai-train=no` protects against training data use. But the specific user-agent `Disallow: /` rules also block **real-time grounding** (used by ChatGPT search, AI Overviews, Perplexity). These are separate use cases — blocking training is reasonable, blocking search grounding removes all AI search visibility.

---

## 8. Mobile App — Specific Issues

### 8.1 Tap Target Sizes (Login Page)

| Element | Size | Minimum | Status |
|---|---|---|---|
| "Forgot password?" button | ~16px | 48px | ❌ Critical |
| "Sign up" GestureDetector | text height | 48px | ❌ |
| `ElevatedButton` minimum | 44px | 48px | ⚠️ |

`tapTargetSize: MaterialTapTargetSize.shrinkWrap` and `minimumSize: Size.zero` are explicitly set on the "Forgot password?" link — this is a Google Mobile-Friendly Test failure.

### 8.2 Font Sizes

| Style | Size | Recommended | Status |
|---|---|---|---|
| `bodyMedium` | 14px | 16px | ⚠️ |
| `bodySmall` | 13px | 13px+ | ⚠️ |
| Time-ago stamps | 11px | 12px min | ❌ |

### 8.3 Other Mobile Issues

- `manifest.json` is empty (1 byte) — PWA installability signals absent
- Portrait-only lock (`SystemChrome.setPreferredOrientations`) — intentional and acceptable
- Dark theme only (light theme commented out) — no system preference respect

---

## 9. Additional Issues

### 9.1 Copyright Bug

**Severity: High** — `©null Deckbase AI. All Rights Reserved` on every page. The `new Date().getFullYear()` call fails on SSR/hydration.

### 9.2 Pre-Launch Inconsistency

The site markets itself as a live product with ratings, but `/updates` says "Coming Soon: AI-Powered Flashcards." This is a trust risk for both users and Google's quality raters.

### 9.3 Node.js 16 (EOL)

**File:** `functions/package.json` — `"node": "16"` is End-of-Life since September 2023. Google Cloud Functions has deprecated this runtime. Upgrade to Node 20.

---

## Appendix: Pages Audited

| URL | Status |
|---|---|
| https://www.deckbase.co/ | ✅ Fetched |
| https://www.deckbase.co/features | ✅ Fetched |
| https://www.deckbase.co/premium | ✅ Fetched |
| https://www.deckbase.co/about-us | ✅ Fetched |
| https://www.deckbase.co/download | ✅ Fetched |
| https://www.deckbase.co/contact-us | ✅ Fetched |
| https://www.deckbase.co/updates | ✅ Fetched |
| https://www.deckbase.co/robots.txt | ✅ Fetched |
| https://www.deckbase.co/sitemap.xml | ✅ Fetched |
| https://www.deckbase.co/sitemap_index.xml | 404 |
| Source code (deckbase-mobile repo) | ✅ Analyzed |
