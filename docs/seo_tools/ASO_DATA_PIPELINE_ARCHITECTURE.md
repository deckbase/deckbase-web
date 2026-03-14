# ASO Data Pipeline Architecture

This document describes the **data-lake + analytics** architecture for the ASO pipeline: raw ingestion into Google Cloud Storage, analytics in BigQuery, and the ASO web app API + dashboard on top. It complements the [ASO PDCA Improvement Plan](./ASO_PDCA_IMPROVEMENT_PLAN.md) by defining where **observability and time-series data** live (GCS + BigQuery) and how the **dashboard** is fed.

**Design review:** This doc incorporates feedback from an internal architecture review: strengths (separation of concerns, raw-first, PDCA as product), design risks and mitigations (aggregation tables, ELT, event tracking, pipeline observability), schema and GCS layout improvements, cost control, and the product direction of a **decision engine** (suggest → rank opportunities → track outcomes). A follow-up pass addressed: correct competitor-gap SQL and cross-service rule (competitor_app_ids from API); explicit aso_events schema; multi-tenancy (org_id); data quality layer; API pagination and BQ cold latency (route-level caching); environment separation; data retention; section order (9 before 9a); and operational notes (Firestore 1MB limit, secrets, run-now trigger, local dev). A second review pass added: section renumbering (§0a/§0b before §1); GCS-first ingestion order fix in §9a (GCS is primary raw store, BQ loads from GCS); competitor-gap SQL DISTINCT fix and parameterized binding; org_id added to all analytics table schemas; active alerting guidance in §5.5; rate limiting for BQ-backed API routes; BigQuery BI Engine as intermediate latency option; schema versioning/migration rules; aso_events idempotency (MERGE on event_id); Firestore 1MB mitigation with concrete split strategy; DuckDB as the recommended local dev backend; DataForSEO cost worked example; and a Firestore vs BigQuery checkpoint boundary table in §5.6.

**v1 vs later:** The doc describes the full target architecture. For a **first working version** (especially solo/small team), build only what’s in **§0a v1 scope**; treat everything in **§0b Later, not v1** as backlog so the blueprint stays implementable.

---

## 0a. v1 scope (build this first)

**Required for v1:**

| Component | What to build |
|-----------|----------------|
| **Ingestion** | DataForSEO (and/or store APIs) ingestion job → writes raw payloads to GCS. |
| **GCS** | Raw storage with a simple layout (e.g. `source=dataforseo/entity=rankings/date=...`). |
| **BigQuery** | **Raw** (payload JSON): e.g. `raw_dataforseo_rankings`. **Staging**: e.g. `stg_dataforseo_rankings`. **Final**: `aso_rankings`, `aso_metrics`. That’s enough to query rankings and funnel metrics. |
| **Firestore** | Cycles, decisions, competitor list, metadata applied. Optionally Perplexity outputs (keyword_ideas, competitor_research, review_digests) — **use Firestore for AI outputs in v1** (app-facing notes/history). |
| **Observability** | `aso_events` (change→impact) and `pipeline_runs` (freshness/failures). |
| **API + Dashboard** | Next.js API routes that read from BigQuery (aso_rankings, aso_metrics) and Firestore (cycles, decisions); dashboard Plan / Do / Check / Act. |

**Firestore vs BigQuery boundary:** Anything **time-series** (rankings over date, metrics over date) → **BigQuery**. Anything **workflow/state** (cycles, decisions, competitor list, metadata applied, AI outputs) → **Firestore**. This avoids accidentally putting large or append-heavy data in Firestore.

**Multi-tenancy:** If deckbase serves **multiple customers** (SaaS), every analytics table should include an **org_id** or **tenant_id** column from day one. Adding it later forces schema migration, partition changes, and IAM/data isolation work. Even if **v1 is single-tenant**, document the decision explicitly: “v1 single-tenant; add org_id to all BQ tables and Firestore when moving to multi-tenant.”

**Optional after v1** (add when you need them): competitor-gap precompute, **one** summary table (e.g. cycle_summary) when live queries hurt, Perplexity API routes (keyword ideas, competitor summary), keyword opportunity scoring.

**Do not build in v1:** Multiple summary tables, keyword clustering, recommendation engine, Redis, export flows, advanced observability. See §0b.

---

## 0b. Later, not v1

Keep these in the doc as **target state**, but do not implement for the first working version. They distract from the minimum useful product.

| Item | Why later |
|------|-----------|
| **All four summary tables** (daily_keyword_rankings, daily_app_metrics, weekly_keyword_summary, cycle_summary) | Start with one `aso_rankings` and one `aso_metrics` table; use views or simple SQL until you feel query pain. Add at most one summary (e.g. cycle_summary) when needed. |
| **Keyword clustering** (embeddings, synonym groups) | Nice for coverage; not required to ship. |
| **Keyword opportunity scoring service** | Improves Plan; can use simple heuristics first. |
| **Redis / API caching** | Add when traffic or BQ cost justifies it. |
| **Export flows** (CSV, reports) | Add when users ask. |
| **Decision engine** (suggest → rank → track) | Product direction; implement after core pipeline and dashboard work. |
| **Advanced observability** (beyond pipeline_runs) | pipeline_runs is enough for v1; expand when you run many jobs. |
| **Perplexity in BigQuery** | v1: store Perplexity outputs in **Firestore**. Move to BigQuery only if you need to join AI output with analytics. |

---

## 1. Pipeline Overview

**Spine (facts):** DataForSEO / Store APIs / Scrapers → ingestion → GCS → BigQuery → API → Dashboard.  
**Sidecar (insight):** Perplexity API → enrichment tables (Firestore or BigQuery) → API → Dashboard. BigQuery stores facts; Perplexity generates insight.

```
┌─────────────────────────────────────────────────────────────────┐
│  DATA SOURCES (spine)                                             │
│  DataForSEO API · App Store APIs · Google Play APIs · Scrapers     │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  INGESTION JOBS (scheduled / trigger-based)                       │
│  Fetch, normalize, write raw payloads with source + timestamp     │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  GOOGLE CLOUD STORAGE (raw data lake)                            │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  BIGQUERY (facts: aso_rankings, aso_metrics, competitor gap via SQL, listings)     │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  NEXT.JS API ROUTES  ←───────────────────────────────────────────┤
│  /api/aso/rankings, /api/aso/metrics, /api/aso/competitor-gap,   │
│  /api/aso/cycles, /api/aso/ai/keyword-ideas, …                   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  DASHBOARD UI (ASO Command Center)                               │
│  Plan · Do · Check · Act views; charts, tables, exports           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PERPLEXITY API (sidecar — insight, not spine)                    │
│  keyword ideas · competitor summaries · review/theme digests ·   │
│  metadata draft support                                           │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  FIRESTORE (v1: Perplexity outputs — §0a)                         │
│  keyword_ideas · competitor_research · review_digests             │
│  BigQuery only if you need to join AI output with analytics       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                └──────────────────────────────────→ API → Dashboard
```

---

## 2. Data Sources → Ingestion

| Source | What to ingest | Frequency (example) | Output (raw) |
|--------|----------------|---------------------|--------------|
| **DataForSEO API** | Raw app data: App Store/Play search rankings, keywords an app ranks for, competitor apps, reviews, app listing metadata. Pay-as-you-go; no dashboard — designed for building tools | Daily or on “Capture” | JSON per endpoint (e.g. app rankings, keyword rankings, reviews), keyed by app id, country, device, date |
| **App Store APIs** | App Store Connect: metadata (versions, what’s new), analytics (impressions, product page views, first-time installs, sessions) if available | Daily / weekly | JSON per app, locale, date |
| **Google Play APIs** | Play Developer API: store listing, installs, ratings, (and if available) store performance metrics | Daily / weekly | JSON per package, track, date |
| **Scrapers** | Public store pages (fallback for metadata or rankings when APIs are limited); optional | On-demand or weekly | HTML or parsed JSON, with source URL and scrape_ts |

**Perplexity** is not part of the main ingestion spine; it is a **sidecar AI enrichment** layer (§2a). Use it for keyword ideation, competitor research, review/theme summarization, and metadata draft assistance — not for KPI charts or warehouse truth.

**DataForSEO cost guard:** DataForSEO is pay-as-you-go; daily ingestion for N apps × M keywords × K countries × iOS + Android compounds quickly. Before enabling scheduled ingestion: **estimate API credits per run** and **set a monthly budget cap** in DataForSEO (or in your job logic) so you avoid surprise bills. Revisit the estimate when you add apps, keywords, or regions.

**Example cost estimate:** App Store keyword rankings endpoint costs ~$0.0001–$0.002 per task depending on depth. A rough daily run: 5 apps × 100 keywords × 3 countries × 2 platforms (iOS + Android) = 3,000 tasks/day. At $0.001/task that's ~$3/day or ~$90/month just for keyword rankings — before adding reviews, competitor apps, or other endpoints. Start narrow (1–2 apps, 1 country) and expand once you confirm data quality and spending is in budget. Check DataForSEO's live pricing calculator for current rates per endpoint.

Ingestion jobs should:

- **Idempotency:** Use deterministic paths (e.g. `source/date/entity_id`) so re-runs overwrite or append safely.
- **Schema:** Write **raw** payloads (full API response or normalized envelope) so we can reprocess later without re-fetching.
- **Metadata:** Add `ingestion_ts`, `source`, `app_id` / `ext_id` / `package_name`, `country`, `device`, `date` where applicable.

---

## 2a. Perplexity as sidecar intelligence

Perplexity is **sidecar intelligence, not the spine** of the system. It fits **Plan** (keyword and competitor discovery) and **Do** (metadata draft assistance). Charts and KPIs come from BigQuery; Perplexity generates **insight** (ideas, summaries, drafts) that can be stored and shown in the dashboard.

**Rule:** *BigQuery stores facts. Perplexity generates insight.*

### Where Perplexity fits

| Use case | Example | PDCA phase |
|----------|---------|------------|
| **Keyword research assistant** | Generate/expand keyword candidates from prompts like “Find long-tail ASO keywords for a budgeting app in Japan”, “What phrases do people use for calorie tracking apps in the US?”, “What related intents appear around habit tracker apps?” | **Plan** — ideas and market-language discovery, not hard KPI reporting. Perplexity’s search-grounded models suit this. |
| **Competitor research summaries** | Summarize competitor positioning, common value props, feature themes, review complaints, messaging on websites/product pages/press/blogs/Reddit. Preserve **citations** for later review. | **Plan** — feeds a lightweight competitor_research store (Firestore or BigQuery). |
| **Review / theme summaries** | Summarize review themes and user complaints. Chunk input if summarizing many reviews to avoid huge prompts. | **Plan / Check** — qualitative context alongside rankings/metrics. |
| **Metadata draft support** | Assist with title, subtitle, short description, keyword suggestions (e.g. for the “Generate metadata drafts” flow). | **Do** — advisory only; human review before applying. |

### Lean architecture with Perplexity

- **Spine unchanged:** DataForSEO / Store APIs / Scrapers → scheduled jobs → GCS → BigQuery → API → Dashboard.
- **Perplexity path:** Perplexity API → **Firestore (v1)** or BigQuery (only if you need to join AI output with analytics). See §0a: use Firestore for Perplexity outputs in v1.
- Do **not** use Perplexity for main ingestion or as source of truth for rankings/metrics.

### Implementation options

| Option | When to use | Flow |
|--------|-------------|------|
| **A: On-demand from Next.js API** | v1; user-triggered actions | Dashboard button → Next.js API route → Perplexity API → save result to enrichment store → return/show in UI. Good for “Generate keyword ideas”, “Summarize competitor”, “Draft metadata”. |
| **B: Scheduled enrichment job** | Once you have regular usage | Cloud Run job / GitHub Action → (optionally read app/competitor list from BigQuery or Firestore) → call Perplexity → store summary (e.g. weekly competitor digest, weekly review digest). |

Start with **Option A**; add Option B for recurring digests when needed.

### Data model for Perplexity outputs

**Pick one.** For v1, use **Firestore** (app-facing notes/history; no need to join with BQ analytics). Use BigQuery only if you truly need to join AI output with rankings/cycles.

**Firestore (v1 recommendation — §0a):**

- `ai_runs` — log of each Perplexity (or other AI) run: prompt, model, status, cost_estimate, created_at.
- `keyword_ideas` — app_id, prompt, response_text, citations[], created_at.
- `competitor_research` — app_id, competitor_or_topic, prompt, response_text, citations[], created_at.
- `review_digests` — app_id, prompt, response_text, citations[], created_at.

**BigQuery (only if joining with analytics):** `ai_keyword_ideas`, `ai_competitor_research`, `ai_review_digests` with same logical fields (app_id, prompt, response_text, citations, created_at, model, cost_estimate, status). Skip in v1 unless you have a concrete join use case.

### Cost guidance

- Use Perplexity for **high-value, non-daily** tasks (keyword ideation, competitor summaries, occasional digests). Avoid running on every dashboard load.
- **Cache** outputs (e.g. by prompt + app_id + date); summarize once, read many times.
- Prefer **basic search-oriented** calls for keyword ideas and competitor summaries; reserve **deep research** for rare “full market report” actions (deeper models have higher per-request cost: input, output, search, citation, reasoning).
- Log `cost_estimate` (or token/usage) per run to monitor spend.

### Caveats

1. **Advisory, not authoritative** — Even with citations, treat outputs as input to human judgment. Use a human review step for strategic outputs and metadata suggestions before applying to store listings.
2. **Do not power hard KPI charts** — Charts (rankings, impressions, installs, conversion) must come from BigQuery, not from Perplexity-generated prose.
3. **Save citations** — Keep returned citation URLs with each insight so users can check evidence. Perplexity’s Sonar/Agent-style outputs support cited, grounded responses.
4. **Watch prompt size** — For large inputs (e.g. many reviews), chunk before sending; avoid dumping everything into one request.
5. **Firestore 1MB document limit** — Perplexity responses with many citations and long `response_text` (e.g. review digests over many reviews) can approach 1MB per document. Mitigation strategy: (a) store only the **summary** in the Firestore doc (truncate `response_text` to ~50KB), (b) if full content is needed, write it to a GCS object and store only the `gs://` URI in Firestore (keep a `full_response_gcs_uri` field), (c) for very large outputs, split into a parent metadata doc + N chunk sub-documents (e.g. `review_digests/{id}/chunks/{n}`). Do not blindly store the full Perplexity response without a size check.

### Summary

Use Perplexity for: **keyword ideation**, **competitor research**, **review/theme summarization**, **metadata draft assistance**. Do not use it for main ingestion or warehouse truth. That keeps the product smarter without inflating the core architecture.

---

## 3. Google Cloud Storage (Raw Data Lake)

**Bucket layout (recommended):** Use `source=`, `entity=`, `date=` style paths so partitioning, filtering, and ETL are straightforward.

```
gs://<project>-aso-datalake/
  aso/
    raw/
      source=dataforseo/
        entity=keywords/    date=2026-03-09/app_id=123_country=US_device=iphone.json
        entity=rankings/   date=2026-03-09/app_id=123_country=US_device=iphone.json
        entity=aso_reports/ date=2026-03-09/app_id=123.json
      source=appstore/
        entity=metadata/   date=2026-03-09/app_id=123_locale=en-US.json
        entity=analytics/  date=2026-03-09/app_id=123.json
      source=googleplay/
        entity=listing/    date=2026-03-09/package=com.example.app.json
        entity=metrics/    date=2026-03-09/package=com.example.app.json
      source=scrapers/
        entity=store_page/ date=2026-03-09/store=appstore_id=123.json
```

- **Benefits:** Easy partition pruning when loading into BigQuery (e.g. `date=*`), clear filtering by source/entity, and consistent ETL patterns.
- **Naming:** Include `app_id` / `ext_id` / `package`, `country`, `device`, and optional `ts` in the object name for idempotency and overwrites.

---

## 4. BigQuery

**Dataset (example):** `aso` or `deckbase_aso`.

**Environment separation:** Use separate **datasets** (BigQuery) and **buckets** (GCS) per environment: e.g. `aso_dev`, `aso_staging`, `aso_prod` (or `deckbase_aso_prod`). Do not share one dataset/bucket across dev, staging, and production; shared infra is a common source of production data corruption.

**Layer pattern (ELT, schema-drift safe):** Raw (full payload) → Staging (parsed/normalized) → Analytics (business tables). APIs and external schemas change often; keep **raw** as `payload JSON` and transform in staging so ingestion never breaks.

**v1 minimum (§0a):** For the first working version, build only: `raw_dataforseo_rankings`, `stg_dataforseo_rankings`, `aso_rankings`, `aso_metrics`, `aso_events`, `pipeline_runs`. Keep cycles, decisions, competitor list, and Perplexity outputs in **Firestore**. Add other tables when you need them.

**Schema versioning:** BigQuery allows adding nullable columns to existing tables but does **not** allow changing column types or removing columns without recreating the table (losing partition history). Follow these rules to avoid painful migrations:
- Always add new columns as **NULLABLE** (never REQUIRED after initial creation).
- Use **views** (`stg_*` → analytics) as a stable interface so you can change underlying table layout without breaking API queries.
- For breaking changes (type change, rename, remove), create a new table, backfill, cut over, then drop the old one.
- **Never add partitioning to an existing table** — create a new partitioned table and reload. Do this once at creation (see §4.3).

### 4.1 Raw tables (payload-first)

| Table | Purpose | v1? |
|-------|---------|-----|
| `raw_dataforseo_rankings` | Full API response per load | **Yes** |
| `raw_dataforseo_keywords` | Full keyword response | After v1 |
| `raw_appstore_metadata` | Full metadata/analytics payload | After v1 (or when adding App Store) |
| `raw_googleplay_listing` | Full listing payload | After v1 (or when adding Play) |

Load from GCS; do **not** flatten in raw. Key columns: `ingestion_ts`, `source`, `payload` (JSON), optional `app_id`, `date`.

### 4.2 Staging tables

| Table | Purpose | v1? |
|-------|---------|-----|
| `stg_dataforseo_rankings` | Parsed rankings: app_id, keyword, rank, date, country, device | **Yes** |
| `stg_dataforseo_keywords` | Parsed keyword list per app | After v1 |
| `stg_appstore_metrics`, `stg_googleplay_*` | Parsed store metrics/listing | When you add those sources |

Staging absorbs schema changes; analytics tables depend on staging, not raw. Between staging and analytics, add a **data quality** step: e.g. row-count check per run, NOT NULL assertions on key columns (app_id, date, rank), and log results (or failures) in **pipeline_runs** (or a small `dq_checks` table). DataForSEO can return null ranks, duplicates, or malformed payloads; without validation, bad data would silently corrupt `aso_rankings`.

### 4.3 Analytics tables (core schema)

| Table | Purpose | v1? |
|-------|---------|-----|
| **aso_rankings** | One row per (date, app_id, store, country, keyword, rank) | **Yes** |
| **aso_metrics** | Funnel metrics per app/store/date | **Yes** |
| **aso_events** | Product actions for change→impact | **Yes** |
| **pipeline_runs** | Ingestion job health (freshness/failures) | **Yes** |

**aso_rankings schema (v1):**

| Column | Type | Purpose |
|--------|------|---------|
| `date` | DATE | Partition key; ranking snapshot date |
| `org_id` | STRING | Tenant identifier — include from day one; v1 can use a constant value if single-tenant (see §0a multi-tenancy note) |
| `app_id` | STRING | App (or store entity) |
| `store` | STRING | e.g. `ios`, `android` |
| `country` | STRING | Store country / locale |
| `keyword` | STRING | Search term |
| `rank` | INT64 | Position in search results (1-based); NULL if not in top N |
| `device` | STRING | Optional: e.g. `iphone`, `ipad` |

**aso_metrics schema (v1):**

| Column | Type | Purpose |
|--------|------|---------|
| `date` | DATE | Partition key; metrics snapshot date |
| `org_id` | STRING | Tenant identifier — include from day one (see §0a) |
| `app_id` | STRING | App (or store entity) |
| `store` | STRING | e.g. `ios`, `android` |
| `impressions` | INT64 | Optional; product page / search impressions |
| `page_views` | INT64 | Optional; product page views |
| `installs` | INT64 | Optional; first-time installs (or equivalent from store) |
| `sessions` | INT64 | Optional; sessions or other funnel metric |

Create both with `PARTITION BY date` and appropriate `CLUSTER BY` (§4.3). Add columns as you add sources (e.g. conversion_rate when available).

**aso_events schema (minimum for change→impact):**

| Column | Type | Purpose |
|--------|------|---------|
| `event_id` | STRING | Unique event identifier |
| `org_id` | STRING | Tenant identifier (see §0a) |
| `event_type` | STRING | e.g. `metadata_updated`, `keyword_added`, `keyword_removed`, `screenshot_changed` |
| `cycle_id` | STRING | Links to ASO cycle |
| `app_id` | STRING | App (or store entity) the event applies to |
| `timestamp` | TIMESTAMP | When the action occurred |
| `metadata` | JSON | Event-specific data (e.g. keyword text, field changed); optional |

**aso_events idempotency:** Use `MERGE ON event_id` (or `INSERT IF NOT EXISTS`) when writing events so retries or duplicate emissions do not create duplicate rows. The emitter should generate a deterministic `event_id` (e.g. `SHA256(cycle_id + event_type + app_id + timestamp)`) so the same event always maps to the same ID.

| Table | Purpose | v1? |
|-------|---------|-----|
| **aso_cycles**, **apps**, **competitor_mapping** | Cycle definition, app registry, competitor set | Firestore in v1; BQ later if you want one analytics story |
| **keywords** | Keyword catalog (volume, difficulty) | After v1 |
| **ai_* (Perplexity)** | AI outputs | **Firestore in v1** (§0a, §2a); BQ only if joining with analytics |

Partition **aso_rankings** and **aso_metrics** by `date`, cluster by `app_id`, `keyword` / `app_id`, `store` when you create them.

**Partitioning and clustering (cost + performance):**

- **aso_rankings:** `PARTITION BY date` (or DATE(partition_ts)), `CLUSTER BY app_id, keyword`. Reduces scan for “rankings by app by date.”
- **aso_metrics:** `PARTITION BY date`, `CLUSTER BY app_id, store`.
- **aso_events:** `PARTITION BY DATE(timestamp)`, `CLUSTER BY cycle_id, event_type`. Schema: event_id, event_type, cycle_id, app_id, timestamp, metadata (JSON) — see table above.

### 4.4 Aggregation / summary tables (add when you feel query pain)

**Risk:** At scale, live queries on full `aso_rankings`/`aso_metrics` can be slow and expensive. **v1:** Do **not** build all summary tables at once. Start with one normalized `aso_rankings` and one `aso_metrics` table; use **views or simple SQL** until dashboards or API latency hurt. When they do, add **at most one** summary (e.g. `cycle_summary` for “baseline vs end of cycle”) and a small aggregation job.

| Table | Purpose | When to add |
|-------|---------|-------------|
| `cycle_summary` | Per cycle: baseline vs end rankings, metrics deltas | When cycle-level reporting is slow or heavy |
| `daily_keyword_rankings` / `daily_app_metrics` | Daily rollups for dashboard | When daily queries on `aso_rankings`/`aso_metrics` scan too much |
| `weekly_keyword_summary` | Weekly trend rollup | Later (§0b) |

**API pattern once you have a summary:** e.g. `SELECT * FROM cycle_summary WHERE cycle_id = ?` instead of scanning full `aso_rankings`/`aso_metrics`. Until then, query `aso_rankings` and `aso_metrics` with date filters and partitioning.

### 4.5 Cycle linkage and app state

- **Cycle linkage:** Attach `cycle_id` to events and to cycle_summary; for date-bounded queries, join `aso_cycles` to get `start_date`/`end_date`.
- **App state (cycles, decisions, metadata applied):** Can stay in **Firestore** for the ASO Command Center and be joined in the API by `cycle_id`; or replicate into BigQuery (`aso_cycles`, `aso_events`) for a single analytics story.

---

## 5. Design risks and mitigations

These address the main architectural risks identified in design review.

### 5.1 Too many live BigQuery queries

**Risk:** API → run BQ query → return data will become expensive and slow with multiple dashboards, many apps, and many keywords (e.g. rankings by date by keyword by app by country can scan millions of rows).

**Mitigation:** When live queries hurt, add **one** summary table (§4.4), e.g. `cycle_summary`, and a small aggregation job. Until then, query `aso_rankings`/`aso_metrics` with date filters and partitioning; avoid building all four summary tables in v1.

### 5.2 Competitor gap: v1 = dynamic SQL, no snapshot

**Risk:** Precomputed competitor-gap snapshots limit flexible comparisons (e.g. “competitor gap for last 30 days” or “vs new competitor set”).

**v1 recommendation:** Do **not** create a snapshot table. Store normalized ranking data in `aso_rankings` (one row per app_id, keyword, rank, date). Compute competitor gap in SQL when the API or dashboard needs it.

**Cross-service rule:** `competitor_mapping` lives in **Firestore** in v1, not in BigQuery. The API layer must **pass competitor app IDs as query parameters** (from Firestore) into the BigQuery job. Do **not** join to `competitor_mapping` inside BigQuery.

Example (competitor_app_ids and our_app_id bound by the API):

```sql
-- Missing keywords: competitors rank, we don’t
-- Use DISTINCT to avoid duplicate rows when multiple competitor apps rank for the same keyword.
SELECT DISTINCT competitor.keyword
FROM aso_rankings competitor
LEFT JOIN aso_rankings ours
  ON competitor.keyword = ours.keyword
  AND ours.app_id = @our_app_id
  AND ours.date = competitor.date
WHERE competitor.app_id IN UNNEST(@competitor_app_ids)
  AND competitor.date = @date
  AND ours.rank IS NULL;
```

> **Note:** `competitor_app_ids` and `our_app_id` are bound by the API layer (fetched from Firestore) and passed as query parameters — do not join `competitor_mapping` inside BigQuery.

**When to add snapshots:** Only when dashboards become slow or data volume grows (e.g. “current gap” widget). Until then, dynamic SQL is simpler and consistent.

### 5.3 Schema drift (upstream API changes)

**Risk:** DataForSEO, App Store Connect, and Google Play change response shapes; flattening too early breaks ingestion.

**Mitigation:** **Raw tables = payload JSON** (§4.1). Transform in **staging** (stg_*) and then into analytics. Classic ELT: load raw, then transform. When upstream schema changes, only staging/analytics SQL changes; raw load stays the same.

### 5.4 Missing event tracking (change → impact)

**Risk:** We measure ASO results (rank, installs) but not **product actions** (metadata update applied, keyword added/removed, screenshot changed). Without that, we can’t correlate change → impact.

**Mitigation:** Add **aso_events** (§4.3). Emit events from the ASO Command Center (and/or ingestion) when: `metadata_updated`, `keyword_added`, `keyword_removed`, `screenshot_changed`, etc., with `cycle_id` and `timestamp`. Analytics can then show “rank improved after metadata change” and attribute impact to actions.

### 5.5 Pipeline observability

**Risk:** No visibility into pipeline health (last ingestion, failures, coverage) → debugging blindly.

**Mitigation:** Add **pipeline_runs** (or equivalent):

| Column | Purpose |
|--------|---------|
| `run_id` | Unique run identifier |
| `job_name` | e.g. ingest_dataforseo_rankings |
| `source`, `entity` | e.g. dataforseo, rankings (for scope) |
| `app_id`, `country`, `date` | Scope (optional per job) |
| `start_time`, `end_time` | Duration |
| `status` | running / success / failed |
| `current_step`, `last_successful_step` | For resumability (§5.6) |
| `checkpoint_payload` | Optional JSON: page, cursor, objects_written, etc. |
| `rows_written` | Optional |
| `error_message` | On failure |

Ingestion jobs write a row at start and update on completion (and optionally update `current_step` / `checkpoint_payload` during the run for resumability; see §5.6). Dashboard shows **data freshness** (e.g. last successful run per job) and alerts if no successful run for N days.

**Alerting (required — do not rely on manual checks):** Recording failures in `pipeline_runs` is not enough on its own. Add an active alert so failures surface immediately:

- **Cloud Monitoring (recommended):** Cloud Run jobs emit logs automatically. Create a log-based metric on `status=failed` (or on error patterns in logs) and set a Cloud Monitoring alert policy to notify via email or a Slack webhook channel. This requires no extra infrastructure.
- **Simpler fallback:** A Cloud Scheduler cron that queries `SELECT COUNT(*) FROM pipeline_runs WHERE status = 'failed' AND start_time > TIMESTAMP_SUB(...)` and sends an email/webhook if count > 0.
- Alert on **staleness** too (no `status = 'success'` for a job in the last N hours/days), not just failures — a job that silently stops running is as bad as one that errors.

**Retry strategy:** APIs fail often. For each ingestion step that calls an external API: **retry up to 3 times** with **exponential backoff**; on final failure, **log the failure in `pipeline_runs`** (status = failed, error_message = reason). Do not silently skip; observability depends on recording failures.

### 5.6 Checkpointing and resumable ingestion

**Feasibility:** Yes. You can add **checkpoints** so that if a job fails mid-run (e.g. after fetching page 2 of 3, or after writing raw but before staging), the next run **resumes from the last successful step** instead of restarting from scratch. This works with GCS + BigQuery + Firestore; you do **not** need Airflow or a workflow engine.

**What to checkpoint:** Track progress per **step**, per **source/entity**, per **scope** (app_id, country, device, date). On retry, continue from the last successful checkpoint.

**Checkpoint levels (natural boundaries):**

| Level | Example | Use |
|-------|---------|-----|
| **Source/entity** | dataforseo_rankings, appstore_metrics | One failed source doesn’t rerun others. |
| **Scope** | app_id + country + device + date | One failed US sync doesn’t rerun Japan. |
| **Pagination / cursor** | page number, next_cursor, offset | Resume from the page that failed (most important for paginated APIs). |
| **Write/load** | raw written, BQ raw loaded, staging done, final done | Skip steps that already completed. |

**Pipeline state machine (per run):** Use states such as `PENDING` → `FETCHING` → `RAW_WRITTEN` → `BQ_RAW_LOADED` → `STAGING_DONE` → `FINAL_DONE`, or `FAILED`. Retries resume from the last completed state (e.g. if `RAW_WRITTEN` is done, don’t fetch again; continue with BQ load).

**Extend `pipeline_runs` (or add checkpoint store):**

- **pipeline_runs** (existing): add `current_step`, `last_successful_step`, and optionally `checkpoint_payload` (JSON).
- **checkpoint_payload** example: `{ "page": 3, "cursor": "abc123", "objects_written": ["gs://bucket/.../page1.json", "..."], "raw_loaded": true, "staging_done": false }`.

**Resume behavior:** On job start: (1) look for the latest failed or running run for the same scope (same source, entity, app_id, country, date); (2) read checkpoint; (3) resume from the saved step/cursor; (4) continue until completed or failed again; (5) mark run completed or update failure in `pipeline_runs`.

**Idempotency (required):** Checkpointing only works if each step is **idempotent**. Rerunning the same step must not corrupt data. Use: **deterministic GCS paths** (overwrite same object), **MERGE or replace partition** in BigQuery, **unique keys** for inserts. Do **not** blindly append on retry (no duplicate rows).

**Checkpoint key (scope):** Use a unique scope key per job run, e.g. `source + entity + app_id + country + device + date`. Example: `dataforseo_rankings:app123:US:iphone:2026-03-09`. Store checkpoint state against that key so retries know which run to resume.

**Where to store checkpoint state:**

- **Firestore** — recommended for **live checkpoint state** (current_step, cursor, page, which files written). Easy JSON updates and good for frequent small writes.
- **BigQuery `pipeline_runs`** — for **historical run history** (started_at, ended_at, status, error_message). Optionally store a copy of final checkpoint here for debugging.

**Simpler option: file-based checkpointing**

- Write one GCS object per completed unit (e.g. one file per fetched page). Use **marker files** to indicate completion: e.g. `gs://bucket/checkpoints/dataforseo_rankings/app123/US/2026-03-09/page_1.done`, `page_2.done`, `bq_loaded.done`. On restart: skip pages that have a `.done` file; run BQ load only when all expected pages exist; skip load if `bq_loaded.done` exists. Very simple and robust for a solo builder.

**Recommendation for this pipeline:** Use **Firestore** for checkpoint state (per run or per scope), **pipeline_runs** in BigQuery for run history, **idempotent** GCS paths and BigQuery loads (overwrite/MERGE), and checkpoint at **page/cursor + step** level. Do **not** checkpoint every individual row; checkpoint by page, cursor, step, or partition. That gives resumability without heavy infrastructure.

**Firestore vs BigQuery — clear boundary:**

| Store | Holds | Do NOT store here |
|-------|-------|-------------------|
| **Firestore** | Live checkpoint state (current step, cursor, page number, which files written) — updated frequently during a run | Historical run logs, analytics, time-series data |
| **BigQuery `pipeline_runs`** | Historical run log (started_at, ended_at, status, error_message, final checkpoint snapshot for debugging) — append-only, written once per run | Live mutable checkpoint state (high-write frequency → BQ streaming costs add up) |

This split prevents the two stores from drifting out of sync. Write checkpoint state only to Firestore during a run; on completion or failure, write a summary row (including a snapshot of the final checkpoint) to `pipeline_runs`.

---

## 6. Analytics Queries

**Prefer summary tables** for dashboard and high-traffic API routes (§4.4, §5.1); use full `aso_rankings` / `aso_metrics` only for ad-hoc or parameterized analysis.

Examples:

- **Rankings over time:** Read from `daily_keyword_rankings` (or `weekly_keyword_summary`) filtered by app_id, date range. Avoid scanning raw or full `aso_rankings`.
- **Funnel metrics over time:** Read from `daily_app_metrics` by app, store, date range.
- **Competitor gap:** Use **SQL on `aso_rankings`** for flexible windows (e.g. last 30 days) and competitor sets (§5.2); optionally cache result or use precomputed snapshot for “current gap” widget.
- **Before/after by cycle:** Read from `cycle_summary` when available; otherwise query `aso_rankings` / `aso_metrics` for cycle start_date and end_date (partitioned by date to limit scan).
- **Change → impact:** Join `aso_events` (event_type, timestamp) with `aso_rankings` / `aso_metrics` by date to correlate “metadata_updated” with rank/install deltas.

Implement as **parameterized SQL** or **saved queries** called from the Next.js API; add **caching** (e.g. Redis) for popular queries (§9).

---

## 7. ASO Web App API

- **Existing routes** that today read from Firestore or run live pipeline steps (e.g. run ASO pipeline, metadata drafts) can stay as-is; they orchestrate **plan** and **do** (and optional DataForSEO/competitor steps).
- **New or updated routes** that serve **Check** and **Act** data should read from **BigQuery** (and optionally Firestore for cycle/list/decisions):
  - `GET /api/aso/rankings` — query `aso_rankings` by cycle_id or date range, app. **Pagination required:** support `limit`, `offset` or cursor; enforce a sensible default cap (e.g. 1000 rows). Unbounded queries on millions of rows cause cost and latency issues.
  - `GET /api/aso/metrics` — same: pagination and result limits.
  - `GET /api/aso/competitor-gap` — compute gap via SQL on `aso_rankings`; pass competitor_app_ids from API (Firestore), not join in BQ (§5.2). Apply LIMIT / pagination.
  - `GET /api/aso/cycles` — can remain Firestore (or BQ if cycles are stored there).
- **BigQuery cold latency (v1):** Querying BigQuery per interactive request adds ~1–3 s even on small result sets. Use **route-level caching** in v1: e.g. Next.js `cache: 'force-cache'` or React Query **stale-while-revalidate** so the dashboard does not hit BigQuery on every page render. As an intermediate step before adding Redis, consider **BigQuery BI Engine** — it provides in-memory acceleration for repeated queries on a dataset at low cost (~$40/GB/month reserved) and can cut latency to under 200 ms for dashboard queries without application-level changes. Add Redis later for full throughput; caching at the route or client reduces BQ load and improves UX.
- **Rate limiting:** API routes that trigger BigQuery queries (rankings, metrics, competitor gap) must be rate-limited to prevent runaway clients or dashboard bugs from generating unbounded BQ spend. Use middleware-level rate limiting (e.g. `next-rate-limit`, Upstash Redis rate limiter, or Vercel edge middleware) with a per-user or per-IP limit. Even a simple in-memory token bucket is better than no limit.
- **Perplexity / AI enrichment (Option A, §2a):** On-demand routes such as `POST /api/aso/ai/keyword-ideas`, `POST /api/aso/ai/competitor-research`, `POST /api/aso/ai/review-digest` (or similar) call Perplexity, save to `ai_keyword_ideas` / `ai_competitor_research` / `ai_review_digests` (Firestore or BQ), and return response + citations to the UI.
- **Auth:** Ensure only your app (or authenticated admin users) can call these APIs; BigQuery credentials stay server-side (e.g. service account used by Next.js API). Use short-lived tokens (e.g. Firebase Auth ID tokens verified server-side) rather than long-lived API keys for user-facing routes.

---

## 8. Dashboard UI

- **Data source change:** Charts and tables for rankings, funnel metrics, competitor gap, and before/after are fed by API routes that read from **BigQuery** (and Firestore where applicable), instead of only Firestore or on-the-fly pipeline runs.
- **Exports:** Optionally add “Export” that calls an API route that runs a BigQuery export (e.g. CSV to GCS signed URL or streamed response).

### 8.1 Navigation structure

**PDCA is the organizing principle for the menu.** Every tab maps to one phase of the cycle. The current implementation is a single long-scroll page with no navigation; the target is tab-based with a persistent cycle selector in the header.

**Top-level layout:**

```
ASO Command Center
│
├── [Cycle selector: “Cycle 3 · Jan–Mar 2026 ▼”]   ← persistent header
│
├── Overview      — cycle health at a glance
├── Plan          — keyword discovery, opportunities, competitor research
├── Do            — metadata drafts & applied changes
├── Check         — rankings, funnel metrics, competitor gap over time
├── Act           — per-keyword decisions & cycle close
│
└── Settings      — integrations, app config, competitor list
```

### 8.2 Tab content

**Overview**
- Active cycle name, date range, % of cycle elapsed.
- Quick stats: # keywords tracked, last pipeline run date, # opportunities identified.
- Integration health indicators (moved here from top of page).
- CTA: “Start new cycle” or “Resume current cycle.”

**Plan**
- Run ASO pipeline (main form + streaming progress).
- Keyword opportunities table (current “Last run” section).
- Run history / past analyses (expandable list).
- **Competitors sub-section** *(Plan — discovery)*
  - Perplexity-powered research summary per competitor: positioning, value props, feature themes, review complaints, citations.
  - “Generate summary” button per competitor → calls `/api/aso/ai/competitor-research` → saves to Firestore `competitor_research`. Shows last generated summary + date; “Regenerate” to refresh.
  - Keyword gap discovery table: keywords competitors rank for that we don't (or rank lower on) — driven by `aso_rankings` SQL (§5.2). Feeds directly into the opportunity list above.
  - **v1 placeholder for gap table:** “Keyword gap available once ranking data is captured — add competitors in Settings to enable.”

**Do**

Do has two jobs: **apply** the metadata changes planned in Plan, and **record** that they were applied. The record step is what makes Check's before/after analysis possible — without it, Check sees a rank change with no explanation of what caused it.

*Apply:*
- Side-by-side view: metadata draft (from Plan) alongside current live listing (Google Play + App Store) so differences are obvious before publishing.
- Copy-to-clipboard per field (title, subtitle, keywords, short description) for manual paste into App Store Connect / Google Play Console.
- *(future)* Publish directly via App Store Connect API / Play Developer API.

*Record (critical — missing in v1):*
- **”Mark as applied” button** → writes `metadata_applied` to Firestore with `applied_at` timestamp, `cycle_id`, and the exact text that went live. This is the join key between Do and Check: Check queries `metadata_applied.applied_at` to split rankings into before/after windows.
- **Applied changes log** — history of every `metadata_applied` record in this cycle: what field changed, what the text was, when it went live. Makes the cycle auditable.

*What Do is NOT:*
- Not where you discover keywords (Plan) or measure results (Check) or decide next steps (Act).
- Not a publishing tool in v1 — copy-paste is fine; direct API publishing is a later addition.

*Minimum viable Do tab:*

| Feature | v1? | Notes |
|---------|-----|-------|
| Side-by-side draft vs live listing | Yes | Simple UI, data already available |
| Copy draft field to clipboard | Yes | Simple UI addition |
| Mark as applied (saves record + date) | **Critical** | Missing — blocks Check before/after |
| Applied changes log | After mark-as-applied | History of what was live per cycle |
| Direct publish via App Store / Play API | Later | Not required for v1 |

**Check** *(stub in v1; fill as backend is built)*
- Keyword rankings over time chart — reads from `aso_rankings` (BigQuery). *(future)*
- Funnel metrics: impressions → product page views → first-time installs — reads from `aso_metrics`. *(future)*
- Before / after cycle comparison — baseline (first 1–2 weeks) vs end (last 1–2 weeks). *(future)*
- **Competitor gap sub-section** *(Check — measurement)*
  - Head-to-head rank comparison over time: our rank vs competitor rank per keyword (line chart). *(future)*
  - Share of missing keywords closed: % of competitor keywords we now rank for vs cycle start. *(future)*
  - **v1 placeholder:** “Competitor gap tracking available once ranking data is captured.”
- **v1 placeholder (overall):** “Rankings tracking coming soon — run the pipeline to capture a baseline snapshot.”

**Act** *(stub in v1; fill after Check is live)*
- Per-keyword decision table with actions: **Keep** / **Replace** / **Reassess** / **Investigate** — writes to `aso_cycle_actions` in Firestore.
- Cycle summary: how many keywords improved, stayed flat, or dropped.
- Close cycle → archive current cycle → open next cycle.
- **v1 placeholder:** “Decisions will appear here once ranking data is available.”

**Settings**
- Integration status: App Store Connect, Google Play, DataForSEO, Perplexity, Claude — with per-integration error detail.
- App config: package name, App Store app ID / bundle ID.
- Cycle management: create, rename, archive cycles.
- **Competitor list:** add / remove competitors (app name, package name / App Store ID, store). Stored in Firestore `competitor_mapping`. Shared config used by both Plan (research + gap discovery) and Check (gap tracking). Manage here rather than in Plan/Check to avoid duplication.

### 8.3 Where BigQuery fits in the PDCA cycle

BigQuery is not just a Check-phase concern — it touches every phase, but plays a different role in each. The key principle: **BigQuery stores facts (time-series rankings and metrics); Firestore stores workflow state (cycles, decisions, metadata applied, AI outputs).**

```
Ingestion jobs (daily/scheduled)
  └── GCS raw → BigQuery (aso_rankings, aso_metrics, aso_events, pipeline_runs)
        │
        ├── Plan ──────── reads aso_rankings (historical) to score keyword opportunities
        │                 reads aso_rankings (SQL) to power keyword gap table in Competitors
        │
        ├── Do ─────────  writes aso_events ("metadata_applied", cycle_id, applied_at, field, text)
        │                 ← this is the change record Check joins against
        │
        ├── Check ──────  reads aso_rankings over time → rankings chart, before/after
        │                 reads aso_metrics over time → funnel chart (impressions → installs)
        │                 joins aso_events × aso_rankings → change→impact attribution
        │                 reads aso_rankings (SQL) → competitor gap, head-to-head
        │
        └── Act ────────  reads aso_rankings rank deltas (and cycle_summary when added)
                          → drives Keep / Replace / Reassess / Investigate decisions
```

**Per-phase detail:**

| Phase | BigQuery reads | BigQuery writes | Firestore (complement) |
|-------|---------------|-----------------|------------------------|
| **Plan** | `aso_rankings` — historical rank per keyword to score opportunities; competitor gap SQL (§5.2) | — | `keyword_shortlist`, `opportunity_mapping`, `competitor_research` (AI outputs) |
| **Do** | — | `aso_events` — one row per metadata change: `event_type=metadata_applied`, `cycle_id`, `app_id`, `applied_at`, `metadata` JSON (field, old text, new text) | `metadata_applied` (v1 lightweight record; BQ aso_events is the durable analytics record) |
| **Check** | `aso_rankings` (before/after by cycle dates, trend over time, competitor gap); `aso_metrics` (funnel); `aso_events` (join to rank delta) | — | `aso_cycles` (start/end dates used as query bounds) |
| **Act** | `aso_rankings` rank delta (end − baseline per keyword); `cycle_summary` (when added, §4.4) | — | `aso_cycle_actions` (Keep/Replace/Reassess decisions — workflow state, not analytics) |

**Why Do writes to BigQuery (aso_events), not just Firestore:**
The `metadata_applied` record in Firestore is fine for displaying "what did we apply" in the Do tab. But for Check's **change→impact** query — "did rank improve after we changed the title on March 1st?" — you need to join the change event against `aso_rankings` rows in BigQuery. That join requires the change record to also be in BigQuery as an `aso_events` row. Write to both: Firestore for the UI, BigQuery for analytics.

**What unlocks each tab:**

| Tab | Unlocked by |
|-----|-------------|
| Plan (keyword scoring) | First `aso_rankings` data in BigQuery (even one day's snapshot) |
| Plan (competitor gap table) | `aso_rankings` rows for competitor app IDs |
| Do (mark as applied) | `aso_events` write capability (simple BQ insert) + Firestore write |
| Check (rankings chart) | `aso_rankings` with ≥2 date snapshots (need time-series, not just one day) |
| Check (funnel metrics) | `aso_metrics` populated (requires App Store Connect / Play metrics integration) |
| Check (before/after) | `aso_rankings` + `aso_events` (need both the change record and rank history) |
| Act (decisions) | Check tab live — decisions are only meaningful once there's ranking data to act on |

### 8.5 Current page → target mapping

| Current page section | Target tab |
|----------------------|------------|
| Connection status | Settings (+ small indicator in header) |
| Current store listing | Do |
| Last run / Past analyses | Plan |
| Metadata drafts | Do |
| Run ASO pipeline form | Plan |
| Competitor research summaries (new) | Plan → Competitors sub-section |
| Keyword gap table (new) | Plan → Competitors sub-section |
| Competitor list management (new) | Settings → Competitor list |
| Head-to-head rank charts (new, future) | Check → Competitor gap sub-section |
| Share of missing keywords (new, future) | Check → Competitor gap sub-section |

### 8.6 Build order

1. **Now (UI restructuring only, no backend changes):** Add PDCA tab navigation; move existing content into Plan, Do, Settings tabs. Stub Check and Act with placeholder cards.
2. **Next — competitor list + research (Firestore + Perplexity, no BigQuery needed):** Add competitor list management to Settings (`competitor_mapping` Firestore collection). Add Competitors sub-section in Plan: per-competitor Perplexity research summary (on-demand, cached in Firestore `competitor_research`). This also unblocks the BigQuery gap SQL later since `competitor_app_ids` come from Firestore.
3. **Next — cycles (requires `aso_cycles` Firestore collection):** Add cycle selector to header; scope all Plan and Do data to the active cycle.
4. **Later (requires BigQuery pipeline):** Fill keyword gap table in Plan → Competitors sub-section (`aso_rankings` SQL). Fill Check tab with rankings chart, funnel metrics, and competitor gap sub-section. Fill Act tab once Check data is available.

---

## 9. Ingestion Jobs (Where and How)

Use the **ingestion job pattern** in §9a (call API → receive JSON → write raw → staging SQL → analytics tables). **Retry:** up to 3 times with exponential backoff; log failure in `pipeline_runs` (§5.5). For v1 competitor gap: no snapshot table; API computes from `aso_rankings` (§5.2).

| Option | Pros | Cons |
|--------|------|------|
| **Cloud Scheduler + Cloud Run** | Serverless, scale-to-zero; run a container that reads config (e.g. our app + competitors), calls DataForSEO/App Store/Play, writes GCS, then loads BQ | Need to build and maintain container images |
| **Cloud Scheduler + Cloud Functions (2nd gen)** | Same idea with functions; each source can be a function | Cold starts; size limits for dependencies |
| **Scheduled jobs in repo (e.g. GitHub Actions or cron)** | Logic in repo; use same env (API keys) as app | Need a runner (VM or serverless) and secure secrets |
| **BigQuery Data Transfer / Airflow / Composer** | Managed orchestration | Heavier setup |

- **Secrets / API keys:** Inject `DATAFORSEO_API_KEY`, GCP service account, and other secrets via **Secret Manager** (or env vars in Cloud Run/Cloud Functions). Do not hardcode; document how ingestion jobs receive credentials (e.g. Workload Identity, secret access at runtime).
- **Run-now / on-demand trigger:** The dashboard will need a “Fetch latest rankings” (or “Run ingestion now”) button. Support **on-demand invocation** of the same ingestion job (e.g. HTTP endpoint or Cloud Run job trigger) in addition to scheduled runs; record the run in `pipeline_runs` the same way.

**Recommendation:** Start with **scheduled Cloud Run jobs** (or Cloud Functions) per source: e.g. `ingest-dataforseo`, `ingest-appstore`, `ingest-googleplay`, `ingest-scrapers`. Each writes to GCS under `aso/raw/<source>/...` and optionally triggers a **BigQuery load** (or a single “sync” job that loads all new GCS files into raw tables). As you add competitor gap logic, one job can read competitor list (from Firestore or config), call DataForSEO for our app + competitors, write raw JSON to GCS, then compute gap and write to `competitor_gap_snapshots` or to GCS for BQ load.

---

## 9a. Ingestion job pattern (explicit flow)

Each ingestion job should follow the same pattern so implementation is consistent:

1. **Call DataForSEO (or store) endpoint** — e.g. app rankings, keyword rankings, reviews.
2. **Receive JSON** — full response from the API.
3. **Write raw payload to GCS** — write the full JSON response to GCS under a deterministic path (e.g. `aso/raw/source=dataforseo/entity=rankings/date=.../app_id=..._country=..._device=....json`). GCS is the **primary durable raw store**; re-runs overwrite the same object (idempotent). Do not skip this step — GCS is the source of truth for raw and enables reprocessing without re-fetching.
4. **Load GCS file into BigQuery raw table** — load (or stream) the GCS object into `raw_dataforseo_rankings` with `payload` (JSON), `ingestion_ts`, `source`, `app_id`, `date`. Use a MERGE or replace-partition load so retries do not duplicate rows.
5. **Staging SQL transforms** — run a transform (scheduled or triggered) that reads from raw, parses payload, and writes to `stg_dataforseo_rankings` (or equivalent).
6. **Analytics tables update** — from staging into `aso_rankings` (and `aso_metrics` when you have store metrics). Partition by date, cluster by app_id/keyword.

Record **pipeline_runs** at job start and on completion (or failure after retries). See **retry strategy** in §5.5. For **resumability**, update checkpoint state (e.g. in Firestore or in `pipeline_runs.checkpoint_payload`) after each step; on start, look for a failed or running run for the same scope and **resume from the last successful step** (§5.6). Use **idempotent** writes (deterministic paths, MERGE/replace) so retries do not duplicate data.

---

## 10. How This Fits the PDCA Plan

| PDCA / doc | Role of this architecture |
|------------|---------------------------|
| **Plan** | Pipeline (keyword research, opportunity scoring) can still run in the app; **ingestion** fills the data lake with DataForSEO keywords/rankings and (optionally) competitor data so Plan can use “last known” state from BQ or run live. |
| **Do** | Metadata drafts and “metadata applied” stay in **Firestore** (or in BQ if you prefer); dashboard and API unchanged. Tool costs logged per cycle to `aso_cycle_costs` (Firestore) for ROI calculation (§17). |
| **Check** | **Rankings and funnel metrics** come from **BigQuery** (sourced by ingestion from DataForSEO, App Store, Google Play, scrapers). Time-series and before/after by cycle are analytics queries. ROI calculated from incremental installs × ARPU − cycle cost (§17). |
| **Act** | Cycle and iteration decisions stay in **Firestore**; **Check** data (rankings, metrics, competitor gap, ROI) comes from **BigQuery** via the ASO web app API. |
| **Competitor gap** | Ingestion writes our + competitor rankings into `aso_rankings`. API/dashboard **compute gap in SQL** (competitor keywords LEFT JOIN our keywords); no snapshot table in v1. Add snapshots only when dashboards are slow or data volume grows (§5.2). |
| **Perplexity (sidecar)** | **Plan:** keyword ideation, competitor research, review digests → **Firestore in v1** (keyword_ideas, competitor_research, review_digests). **Do:** metadata draft assistance (advisory; human review). Not used for KPI charts or warehouse truth (§0a, §2a). |
| **ROI** | Calculated in **Check** from `aso_metrics` (incremental installs) × user-supplied ARPU − `aso_cycle_costs` (tool + time cost). Displayed as a summary card in **Overview**. See §17. |

So: **yes, you can build like this.** The pipeline (sources → ingestion → GCS → BigQuery → analytics queries → ASO web app API → dashboard UI) is the right shape; ingestion jobs and table design can be implemented incrementally per source and per PDCA need.

---

## 11. Implementation Order (Suggested)

**v1 (required — §0a):**

1. **GCS raw** — Bucket + layout (§3), IAM; one source (e.g. DataForSEO) writing raw payloads.
2. **BigQuery** — raw_dataforseo_rankings → stg_dataforseo_rankings → **aso_rankings**, **aso_metrics**. Add **aso_events** and **pipeline_runs**.
3. **Firestore** — cycles, decisions, competitor list, metadata applied. (Optionally Perplexity outputs: keyword_ideas, competitor_research, review_digests.)
4. **Next.js API** — Routes that read from BigQuery (aso_rankings, aso_metrics) and Firestore (cycles, decisions).
5. **Dashboard** — Plan, Do, Check, Act wired to API.

**Optional after v1:** Competitor-gap precompute; one summary table (e.g. cycle_summary) when queries hurt; Perplexity API routes (keyword ideas, competitor summary); keyword opportunity scoring. **Checkpointing/resumable ingestion** (§5.6): add when ingestion jobs are paginated or long-running (e.g. DataForSEO multi-page); use Firestore for checkpoint state and idempotent writes so retries resume from the last successful step.

**Local development:** Use **[DuckDB](https://duckdb.org/)** as the local dev backend — it runs in-process, supports nearly identical SQL (window functions, CTEs, PARTITION BY syntax in queries), and requires zero setup. Pattern: wrap BigQuery client calls in a thin adapter that switches on `NODE_ENV`; in dev it runs the same SQL against a local DuckDB file seeded with sample data. Note: DuckDB does not support BigQuery DDL (PARTITION BY at table creation, CLUSTER BY); run those only against real BQ in staging. Use real BigQuery for integration tests and for any performance profiling. Avoid the BigQuery emulator unless you specifically need to test BQ-specific DDL behavior.

---

## 12. Missing system components — Later, not v1 (§0b)

These improve the product but are **not required for v1**. Build them when the core pipeline and dashboard are in place.

| Component | Purpose |
|-----------|---------|
| **Keyword opportunity scoring service** | Model: `opportunity_score = f(search_volume, competitor_rank - our_rank, install_conversion)`. Plan phase: rank which keywords to add or improve. |
| **Keyword clustering** | Group synonyms (e.g. "budget tracker", "expense tracker") using embeddings. Rank and topic coverage. |
| **Store listing version history** | Table `listing_versions`: version_id, app_id, title, subtitle, keywords, description, screenshots, timestamp. A/B evaluation and change→impact. |

---

## 13. Cost optimization — Later, not v1 (§0b)

Apply when traffic or BQ cost justifies it:

- **Partitioning and clustering** are **already applied at table creation** (§4.3) — do not defer them; in BigQuery you cannot add partitioning to an existing table without recreating it. When scan cost still grows, add **one summary table** (§4.4) (e.g. cycle_summary or daily rollups).
- **API caching** (e.g. Redis) for popular queries — not in v1.
- **Data retention / partition expiry:** BigQuery supports **partition expiration** (TTL per partition). Define a policy for raw and analytics tables (e.g. keep raw 90 days, analytics 2 years; archive or drop older partitions). Daily ingestion across many apps × countries × keywords grows quickly; without retention, storage and scan cost grow unbounded.

---

## 14. Design review summary

**Strengths:** Separation of concerns; raw data lake first; BigQuery for analytics; API layer (caching, auth, abstraction); PDCA as workflow product.

**Ratings:** Architecture ⭐⭐⭐⭐⭐ · Scalability ⭐⭐⭐⭐ · Observability ⭐⭐⭐ · Cost control ⭐⭐⭐ · Product potential ⭐⭐⭐⭐⭐

---

## 15. Product direction: decision engine — Later, not v1 (§0b)

Target state: turn the system **from analytics into a decision engine** — system suggests (keywords to add/remove, competitor gaps), system ranks opportunities (opportunity scoring, cycle_summary), system tracks outcomes (aso_events + aso_rankings/aso_metrics → change→impact). Implement **after** v1 pipeline and dashboard; that’s where the real product value is.

---

## 16. Evaluating effectiveness

How to judge whether ASO is working: **what to measure**, **where the data lives**, and **how to interpret** so Plan → Do → Check → Act stays evidence-based.

### 16.1 What “effectiveness” means

| Dimension | Meaning | Example question |
|-----------|--------|-------------------|
| **Visibility** | More users see the app in search/charts | Did our keyword rank improve? Are we ranking for more terms? |
| **Conversion (store)** | More store visitors install | Did product page views → first-time installs improve? |
| **Funnel** | Full path from impression to install to retention | Did impressions ↑ and installs ↑ without a drop in install rate? |
| **Competitive** | We gain vs competitors on shared keywords | Did our rank vs Competitor A improve for target keywords? |
| **Cycle** | This cycle’s changes moved the needle | Before vs after this cycle: rank, impressions, installs? |

Effectiveness = **visibility** and **conversion** improving over time and vs prior cycle (and optionally vs competitors), without gaming that breaks policy.

### 16.2 Metrics to track (full funnel)

Aligned with the playbook and App Store Connect / Play Console:

| Metric | Definition | Source (this pipeline) | Use for evaluation |
|--------|------------|------------------------|--------------------|
| **Keyword rank** | Our position for term X (by store, country, device) | `aso_rankings` (DataForSEO or scrapers) | Visibility; before/after; trend |
| **Impressions** | App icon shown in search/browse | App Store Connect / Play Console → `aso_metrics` | Visibility; trend |
| **Product page views** | User opened our store listing | Same → `aso_metrics` | Interest; funnel step |
| **First-time installs** | New installs in period | Same → `aso_metrics` | Conversion; business impact |
| **Sessions / active devices** | Opens or active devices (optional) | Same → `aso_metrics` | Retention proxy |
| **Conversion rate (store)** | First-time installs ÷ product page views (or ÷ impressions) | Derived from `aso_metrics` | Quality of listing; creative/metadata impact |
| **Competitor gap** | Missing keywords, head-to-head rank | Computed from `aso_rankings` (SQL; no snapshot in v1) | Competitive effectiveness |

Store metrics (impressions, product page views, installs) may come from **APIs** (if available) or **manual/CSV** until you have a stable source; rankings come from **DataForSEO** (or scrapers) via ingestion.

### 16.3 How to measure

**1. Before/after by cycle**

- For each **cycle**, define:
  - **Baseline:** First 1–2 weeks (or first snapshot) after cycle start.
  - **End:** Last 1–2 weeks (or last snapshot) before cycle end.
- Compare baseline vs end for:
  - **Rank:** Average rank (or median) for target keywords; share of keywords in top 5 / 10 / 20.
  - **Impressions, product page views, first-time installs:** Sum or average per week.
  - **Conversion rate:** (installs / product page views) baseline vs end.
- **Data:** BigQuery queries over `aso_rankings` and `aso_metrics` filtered by `cycle_id` or by date range; optionally a materialized view or saved query “cycle_summary(cycle_id)”.

**2. Trend over time**

- Time-series of the same metrics (e.g. weekly): rank distribution, impressions, product page views, installs, conversion rate.
- **Data:** Same tables; dashboard or API that returns series by app, store, (optional) country.
- Use to see if a change (metadata update, new keywords) is followed by improvement and to spot seasonality.

**3. Keyword-level effectiveness**

- Per **keyword** (or per keyword group): rank at start vs end of cycle; impressions or installs attributed to that term (if the store or DataForSEO gives it).
- **Data:** `aso_rankings` joined with `aso_metrics` if you have keyword-level attribution; otherwise rank change is the main signal.
- Feeds **Act:** Rank ↑ + CV ↑ → Keep; Rank ↑ but CV ↓ → Investigate; Rank unchanged → Replace; Rank ↓ → Reassess.

**4. Competitor comparison**

- **Our rank vs competitor rank** for shared keywords (from `aso_rankings` via SQL; no snapshot in v1).
- **Share of “missing” keywords** we’ve closed (we now rank for X% of keywords competitors rank for).
- **Data:** Compute from `aso_rankings` (SQL) per request or cache in API; no snapshot table in v1.

**5. Conversion quality**

- **Store conversion rate** (installs / product page views) and **impression-to-install rate**.
- If rank ↑ and impressions ↑ but conversion rate ↓, listing or creative may need work (Do: screenshots, icon, video).
- **Data:** Derived from `aso_metrics`; show in Check dashboard next to rankings.

### 16.4 Where the data lives and who uses it

| Evaluation need | Data in BigQuery (or Firestore) | Consumed by |
|-----------------|---------------------------------|------------|
| Before/after by cycle | `aso_rankings`, `aso_metrics`, cycle date ranges | ASO API → “Cycle summary” or “Check” view; Act view |
| Trend over time | Same; time range + app/store | ASO API → charts in Check dashboard |
| Keyword-level | `aso_rankings` (+ `aso_metrics` if keyword-level exists) | ASO API → keyword table with rank delta; Act decisions |
| Competitor gap | SQL on `aso_rankings` (no snapshot in v1) | ASO API → competitor gap widget / export |
| Conversion rate | Derived from `aso_metrics` | ASO API → KPI card or chart in Check |

So: **effectiveness is evaluated by querying BigQuery (and optionally Firestore for cycle boundaries)** and exposing the results via the ASO web app API and dashboard.

### 16.5 Interpret and act (link to Act phase)

Use evaluation to drive **Act** decisions (see [PDCA plan](./ASO_PDCA_IMPROVEMENT_PLAN.md)):

- **Rank ↑ and conversion ↑ (or stable)** → **Keep** keyword/creative.
- **Rank ↑ but conversion ↓** → **Investigate** (e.g. wrong intent, creative mismatch).
- **Rank unchanged** → **Replace** with new keyword or creative test.
- **Rank ↓** → **Reassess** (competition, seasonality, or drop that term).
- **No improvement over several cycles** → **New keyword set** or new creative strategy.

Dashboard can show **effectiveness summary per cycle** (e.g. “Rank improved for 12/20 keywords; impressions +15%; installs +8%; conversion rate stable”) and link to the list of keywords with suggested Act decision (Keep/Replace/Reassess/Investigate).

### 16.6 Optional: Evaluating the pipeline itself

- **Data freshness:** Last successful ingestion per source (e.g. last GCS object or BQ row per source/table). Alert if no new data for N days.
- **Coverage:** % of expected apps/countries/devices with non-null rankings or metrics. Track gaps (e.g. Play metrics missing).
- **Usage:** Are Check/Act views and exports used? (Analytics or simple logging on ASO API routes.)
- **Cycle discipline:** Are cycles closed on time and Act decisions recorded? (Firestore or BQ cycle/action tables.)

This keeps the pipeline and PDCA process itself accountable, not only ASO outcomes.

---

## 17. ROI Calculation

ASO ROI answers: **was this cycle's investment worth it?** It requires two inputs — the return (incremental installs → revenue) and the cost (tools + time) — and is displayed as a summary card in **Overview** and a breakdown in **Check**.

### 17.1 Formula

```
Incremental installs = installs_end_of_cycle − installs_baseline
Incremental revenue  = incremental_installs × ARPU
ASO cost             = tool_cost + time_cost
ROI                  = (incremental_revenue − aso_cost) / aso_cost × 100%
```

Where:
- `installs_baseline` = average weekly installs in the first 1–2 weeks of the cycle (same window as Check's before/after baseline).
- `installs_end_of_cycle` = average weekly installs in the last 1–2 weeks of the cycle.
- `ARPU` = average revenue per install; user-supplied per app (not available from ASO APIs directly).
- `tool_cost` = DataForSEO + Perplexity + Claude API spend logged during the cycle.
- `time_cost` = hours spent on ASO work × hourly rate; user-supplied.

### 17.2 Data sources

| Input | Source | Available when |
|-------|--------|----------------|
| `installs_baseline`, `installs_end_of_cycle` | `aso_metrics` (BigQuery) | After BigQuery pipeline + App Store / Play metrics integration |
| `ARPU` | User input (Settings or cycle config) | Always — manual entry |
| `tool_cost` (DataForSEO, Perplexity, Claude) | Logged to `aso_cycle_costs` (Firestore) per cycle as API calls are made | After cost logging is added to API routes |
| `time_cost` | User input (cycle config or Do tab) | Always — manual entry |
| Organic search installs (more accurate) | App Store Connect download source breakdown — separates "App Store Search" installs from browse / referral | After ASC analytics integration |

**Attribution caveat:** App stores do not tell you which installs came from which keyword. Incremental installs are inferred by before/after comparison — external factors (seasonality, marketing campaigns, viral events) can inflate or deflate the number. Flag this in the UI: "Incremental installs are estimated from before/after cycle comparison and may include non-ASO factors."

### 17.3 Accuracy levels

| Level | How | What's required |
|-------|-----|-----------------|
| **Simple (v1)** | Total installs before/after × user-supplied ARPU | `aso_metrics` installs + ARPU input |
| **Better** | Organic search installs only (ASC download source: "App Store Search") × ARPU | ASC analytics source breakdown integration |
| **Full** | Actual revenue from ASC / Play financial reports × incremental organic search installs | Financial API integration (separate from ASO APIs) |

Start with **Simple (v1)** — it gives a directionally correct ROI without requiring financial API integration. The main value is showing the cycle paid for itself; exact precision matters less than trend across cycles.

### 17.4 Data model — `aso_cycle_costs` (Firestore)

Store cost inputs per cycle in Firestore (workflow state, not analytics):

| Field | Type | Purpose |
|-------|------|---------|
| `cycle_id` | STRING | Links to `aso_cycles` |
| `tool_costs` | MAP | `{ dataforseo: number, perplexity: number, claude: number }` — logged incrementally as API calls are made |
| `time_hours` | NUMBER | User-supplied hours spent on ASO this cycle |
| `hourly_rate` | NUMBER | User-supplied hourly rate (or org default from Settings) |
| `arpu` | NUMBER | User-supplied average revenue per install for this app |
| `updated_at` | TIMESTAMP | Last update |

Tool costs are logged incrementally: each API call to DataForSEO / Perplexity / Claude records an estimated cost (from known per-call pricing or usage tokens) and adds it to `tool_costs[service]`. At cycle end the total is available without manual entry.

### 17.5 Where ROI appears in the dashboard

| Location | What's shown |
|----------|-------------|
| **Overview** | ROI summary card: "Cycle 3: +{N} installs → ~${revenue} incremental revenue / ${cost} spend = {X}x ROI" |
| **Check** | ROI breakdown section: installs gained (chart: baseline vs end), ARPU input, tool cost breakdown, time cost, net incremental revenue, ROI % |
| **Act** | ROI trend across cycles — "Is ASO improving cycle-over-cycle?" Informs whether to continue, expand, or change strategy |

### 17.6 Build order

1. **v1 (Simple ROI):** Add `arpu`, `time_hours`, `hourly_rate` fields to cycle config in Settings. Calculate ROI in Check from `aso_metrics` installs before/after + user inputs. Show summary card in Overview.
2. **After v1:** Add incremental cost logging to API routes (`aso_cycle_costs` Firestore writes per DataForSEO / Perplexity / Claude call). Remove need for manual tool cost entry.
3. **Later:** Integrate ASC download source breakdown to isolate organic search installs for more accurate attribution.
