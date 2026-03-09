# SEO Command Center: How the tools work together

This doc explains how each part of the SEO Command Center connects and how to run a semi-autonomous flow periodically.

---

## The big picture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  WHERE YOU ARE NOW (traffic & search)                                        │
│  Overview (GA4 + Search Console) → Content decay watchlist                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                        ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  WHAT TO TARGET (opportunities)                                              │
│  Keyword discovery: Perplexity (conceptual) + DataForSEO Labs (suggestions)  │
│  → Keyword search volume (DataForSEO) → Keyword rankings (DataForSEO)        │
│  → SERP opportunities table → Step 4 report (intent, quick win, audit)      │
└─────────────────────────────────────────────────────────────────────────────┘
                                        ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  EXECUTION & HEALTH                                                          │
│  Keyword→URL mapping → Technical audit (Firecrawl, multi-URL)                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## How each tool fits

| Tool | What it does | Feeds into |
|------|----------------|------------|
| **Overview (GA4 + Search Console)** | Live traffic (users, sessions, page views) and search performance (clicks, impressions, position). | Content decay watchlist (same GSC data), and your sense of “what’s working.” |
| **Content decay watchlist** | Lists top pages by search clicks from GSC. | Prioritize which pages to refresh or fix (period-over-period decay can be added later). |
| **Keyword research (Perplexity)** | Asks the web for keyword ideas and seed terms for your niche. | You copy the best ideas into the pipeline; pipeline merges them with **DataForSEO suggestions** and then **Keyword search volume** / **Rankings**. |
| **Keyword suggestions (DataForSEO Labs)** | For each seed keyword, returns long-tail suggestions with search volume (from DataForSEO’s keyword database). | Expands your list with real search-based ideas; merged with Perplexity seeds for **Keyword search volume** and **Rankings**. |
| **Keyword search volume (DataForSEO)** | Gets monthly search volume and competition for a list of keywords. | **SERP opportunities** (merged with rankings). Stored in Firestore. |
| **Keyword rankings (DataForSEO)** | Checks where your domain ranks in Google (top 100) for each keyword. | **SERP opportunities** (merged with volume). Stored in Firestore. |
| **SERP opportunities** | Merges volume + rankings: “opportunity” when you don’t rank in top 10. Includes intent, quick_win, strategic_build. | Step 4 report; content plan. Persisted as `serp_opportunity_mapping` in Firestore. |
| **Keyword→URL mapping** | Maps opportunity keywords to existing pages. | Pipeline runs technical audit on those URLs when they’re opportunities. Stored in Firestore. |
| **Step 4 report** | Table: keyword, volume, rank, intent, quick_win, strategic_build, competition; audit summary; download HTML. | `/dashboard/admin/seo/report`. |
| **Site scraping (Firecrawl)** | Turns any URL into clean markdown. | Competitor or own-page analysis; input for AI or manual review. |
| **Technical audit (Firecrawl)** | Scrapes URL(s); checks title, meta description, H1/H2, word count. | Run on homepage + up to 4 mapped opportunity URLs per pipeline run. |

---

## Data flow in one sentence

**Traffic and search data (GA4/GSC) show what’s working; Perplexity + DataForSEO (suggestions + volume + rankings) find and validate high-value keywords; SERP opportunities tell you what to create or improve; Firecrawl helps you analyze pages and run a quick technical check.**

---

## Semi-autonomous flow you can run periodically

### Option 1: “Run full pipeline” (one click)

Use **Run full pipeline** on the SEO page. It will:

0. **Perplexity seed discovery (recommended)** — With “Discover keywords with Perplexity first” **on** (default), the pipeline asks Perplexity for 5–10 high-intent keyword ideas (comparisons, use cases, alternatives). Those seeds are merged with your list.
1. **DataForSEO suggestions (recommended)** — With “Expand with DataForSEO suggestions” **on** (default), the pipeline calls DataForSEO Labs for long-tail keyword suggestions for each seed (up to 5 seeds, ~50 suggestions per seed). This adds search-based discovery: real queries that contain your seed terms. Merged list is capped at 20 keywords. **Together with Perplexity, this is what makes the pipeline improve SEO autonomously** — two discovery sources (conceptual + data-driven).
2. **Refresh Overview** — GA4 + Search Console (last 30 days).
3. **Fetch keyword search volume** — for the full keyword list (DataForSEO).
4. **Check rankings** — for your domain and that same list (DataForSEO).
5. **SERP mapping + technical audit** — Merge volume + rankings into opportunities (with intent, quick_win, strategic_build), persist Step 4 to Firestore, run technical audit on homepage and on any keyword→URL mapped pages (up to 5 URLs total).

Results are shown in the same dashboard (Overview, SERP opportunities, pipeline analysis, Technical audit). Keyword and ranking snapshots plus Step 4 report are saved to Firestore. You can open **View Step 4 report** for the full table and download-as-HTML.

**Suggested frequency:** weekly (e.g. every Monday). You can run it manually or later wire it to a cron job (e.g. Vercel Cron) so it runs automatically.

### Option 2: Manual workflow (when you want full control)

1. **Keyword research (Perplexity)** — Run a query like “Keyword ideas for [your product] targeting [audience].” Copy 5–10 keywords from the answer.
2. **Paste the same keywords** into both “Keyword search volume” and “Keyword rankings” (and set your domain for rankings). Run both.
3. **Open SERP opportunities** — Sort by volume; focus on “Yes” opportunities (high volume, you’re not in top 10).
4. **Overview + Content decay** — Refresh Overview; use Content decay to see which existing pages are getting search traffic and may need updates.
5. **Technical audit** — Run on your homepage or key pages after changes.

### Option 3: Automate the pipeline (cron)

- Add a **Vercel Cron** (or similar) that calls `POST /api/seo/pipeline` with a JSON body: `{ "keywords": ["kw1", "kw2"], "domain": "yoursite.com", "auditUrl": "https://yoursite.com", "use_perplexity_seeds": true, "use_dataforseo_suggestions": true }`. Use both flags so each run discovers new keyword ideas; without them the pipeline only re-validates the same list.
- The dashboard uses `POST /api/seo/pipeline/stream` for **Run full pipeline** so you see live step progress (Perplexity, DataForSEO suggestions, Overview, Keywords, Rankings, Audit) and then the full result plus analysis.

---

## Checklist for “connect the dots”

- [ ] **Overview** shows GA4 + GSC (credentials and property/URL set).
- [ ] **Content decay** shows your top GSC pages (same data as Overview).
- [ ] **Keyword research** returns ideas; pipeline can use them with Perplexity + DataForSEO suggestions.
- [ ] **Keyword search volume** and **Keyword rankings** use the **same keyword list** and **your domain** (pipeline keeps them in sync).
- [ ] **SERP opportunities** table is filled from a run (volume + rankings merged); **Step 4 report** shows full opportunities + audit summary at `/dashboard/admin/seo/report`.
- [ ] **Keyword→URL mapping** is set for opportunity keywords so the pipeline audits those pages; save mapping on the SEO page.
- [ ] **Technical audit** runs on your site URL and mapped URLs; fix any errors/warnings.
- [ ] Run **Run full pipeline** weekly (or on a schedule) to refresh data and re-check opportunities and health.

---

## File and API reference

| What | Where |
|------|--------|
| SEO dashboard | `app/dashboard/admin/seo/page.js` |
| Step 4 report page | `app/dashboard/admin/seo/report/page.js` |
| Pipeline logic | `lib/seo-pipeline-runner.js` |
| Firestore snapshots + keyword→URL mapping | `lib/seo-firestore.js` |
| Pipeline (JSON response) | `POST /api/seo/pipeline` |
| Pipeline (streaming progress + result) | `POST /api/seo/pipeline/stream` — body: `keywords`, `domain`, `auditUrl`, optional: `use_perplexity_seeds`, `use_dataforseo_suggestions`, `location_code`, `language_code` |
| Step 4 report (latest) | `GET /api/seo/report` |
| Keyword→URL mapping | `GET /api/seo/keyword-url-mapping` (read), `POST /api/seo/keyword-url-mapping` (replace mappings) |
| Flow doc (for modal) | `GET /api/seo/docs/flow` |
| Overview | `GET /api/seo/overview` |
| Keywords (volume) | `POST /api/seo/keywords` |
| Rankings | `POST /api/seo/rankings` |
| Audit | `POST /api/seo/audit` |
| Snapshots (saved data) | `GET /api/seo/snapshots` — returns latest `search_volume`, `rankings`, `serp_opportunity_mapping` from Firestore |
| Research (Perplexity) | `POST /api/seo/research` |
| Scrape (Firecrawl) | `POST /api/seo/scrape` |
| Integrations status | `GET /api/seo/integrations` |

---

## Related

- **ASO Command Center** (App Store Optimization for mobile apps): [ANDROID_IOS_ASO.md](./ANDROID_IOS_ASO.md), [ASO_LISTING_ANALYSIS_FLOW.md](./ASO_LISTING_ANALYSIS_FLOW.md). Dashboard: `/dashboard/admin/aso`.
