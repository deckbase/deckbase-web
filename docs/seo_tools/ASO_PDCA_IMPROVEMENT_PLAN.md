# ASO Pipeline Improvement Plan — Full PDCA Cycle

This document plans how to improve the admin ASO pipeline so it implements a **full PDCA cycle** aligned with the [ASO Strategy Playbook](/Users/yosukesakurai/Desktop/ASO_STRATEGY_PLAYBOOK.md) (~3‑month optimization cycle).

**Data pipeline:** For a data-lake style architecture (sources → ingestion → GCS → BigQuery → analytics → API → dashboard), see [ASO Data Pipeline Architecture](./ASO_DATA_PIPELINE_ARCHITECTURE.md). That doc describes how Check (rankings, metrics, competitor gap) and optional Plan inputs can be fed from BigQuery while cycles and decisions stay in the app (e.g. Firestore).

---

## 1. Current State vs Playbook PDCA

| Playbook PDCA Step | Current Implementation | Gap |
|--------------------|------------------------|-----|
| **P – Plan** | Keyword research (100–200) | ✅ Pipeline: store listing → Perplexity/DataForSEO → Claude filter → opportunity scoring. **Gap:** No explicit "cycle" or campaign (e.g. "Q1 2025 ASO cycle"); one-off runs only. |
| **D – Do** | Metadata update | ⚠️ We have **metadata drafts** (Claude-generated title/subtitle/keywords). **Gap:** No "applied" state—copy is manual; no record of what was actually published or when. |
| **C – Check** | Measure effectiveness | ⚠️ One-time **DataForSEO App Data** rankings in pipeline. **Gap:** No time-series: no historical rankings, no impressions / product page views / first-time installs from App Store Connect or Play Console. Playbook wants full funnel: ranking → impressions → product page views → installs → retention. |
| **A – Act** | Iterate (every 3 months) | ❌ Opportunity scoring suggests "high/medium/low" but no **iteration decision** (e.g. "Rank ↑ + CV ↑ → Keep", "Rank unchanged → Replace"). No 3‑month cadence; no stored "what we changed and when" for the next cycle. |

---

## 2. Gap Analysis

Structured view of **playbook requirements vs current capability** and **remediation**.

**Severity:** 🔴 Critical (blocks PDCA) · 🟠 High (limits effectiveness) · 🟡 Medium (nice-to-have) · 🟢 Low

### 2.1 Process & Cadence Gaps

| # | Playbook requirement | Current state | Gap | Severity |
|---|----------------------|---------------|-----|----------|
| G1 | ~3 month optimization cycle with clear Plan → Do → Check → Act | Ad-hoc pipeline runs; no cycle concept | No cycle entity, no start/end dates, no phase tracking | 🔴 |
| G2 | Iterate every 3 months with explicit decisions per keyword | One-off opportunity list; no "what we decided" | No iteration decision (Keep/Replace/Reassess/Investigate); no handoff to next cycle | 🔴 |
| G3 | Keyword research 100–200 keywords (standardized scope) | Pipeline can produce &lt;200 via Claude filter; no explicit target | No validation or guidance for 100–200; no checklist in UI | 🟡 |
| G4 | Creative A/B testing (screenshots, icon, preview video) | Not in pipeline | No link to Repro / App Store Connect PPO / Play Experiments; no creative tracking in cycle | 🟠 |

### 2.2 Data & Measurement Gaps

| # | Playbook requirement | Current state | Gap | Severity |
|---|----------------------|---------------|-----|----------|
| G5 | Full funnel: keyword ranking → impressions → product page views → installs → retention | One-time rankings in pipeline (DataForSEO App Data); no store metrics | No time-series rankings; no impressions/product page views/first-time installs; no retention | 🔴 |
| G6 | Measure effectiveness (Step 4) with before/after comparison | Single snapshot of rankings when pipeline runs | No historical rankings; cannot compare "start of cycle" vs "end of cycle" | 🔴 |
| G7 | Store metrics: App Store Connect / Play Console (impressions, product page views, first-time downloads) | Store listing fetch only (metadata); no analytics APIs | No integration with store analytics; no way to track conversion impact | 🟠 |
| G8 | Record what metadata was actually published and when | Only "drafts" (suggested copy); no applied state | Cannot correlate Check metrics with "what was live"; no audit trail of changes | 🔴 |

### 2.3 Tooling & Integration Gaps

| # | Playbook requirement | Current state | Gap | Severity |
|---|----------------------|---------------|-----|----------|
| G9 | Keyword research tools (AppTweak, Sensor Tower) | Perplexity + DataForSEO keyword suggestions | No AppTweak/Sensor Tower; playbook KEI, search volume, competitor keywords are external | 🟡 |
| G10 | A/B testing tools (Repro, App Store Connect PPO, Play Console experiments) | Not integrated | No link or data from A/B tests into admin; creative tests not part of cycle | 🟠 |
| G11 | Attribution / analytics (Adjust, AppsFlyer, Firebase, RAT) | Not in ASO pipeline | No connection between ASO changes and install attribution or in-app behavior | 🟡 |

### 2.4 Per-Phase Gap Summary

| Phase | Gaps | Critical | High | Medium/Low |
|-------|------|----------|------|------------|
| **Plan (P)** | G1, G3, G9 | Cycle concept (G1) | — | Keyword count (G3), external tools (G9) |
| **Do (D)** | G1, G8, G10 | Applied metadata record (G8), cycle (G1) | Creative A/B (G10) | — |
| **Check (C)** | G5, G6, G7 | Time-series rankings (G6), full funnel (G5) | Store metrics (G7) | — |
| **Act (A)** | G1, G2 | Iteration decisions (G2), cycle close (G1) | — | — |

### 2.5 Remediation Mapping (Gap → Plan Section)

| Gap | Addressed in |
|-----|----------------------|
| G1 (cycle, cadence) | §3 Target: ASO cycle entity; §5 Phase 1 & 4 |
| G2 (iteration decisions) | §3 Target: Act phase; §5 Phase 4 |
| G3 (100–200 keywords) | §3 Target: Plan — checklist/validation; §5 Phase 1 |
| G4, G10 (creative A/B) | Out of scope in current plan; link or "Creative" section later |
| G5, G6 (full funnel, time-series) | §3 Target: Check; §5 Phase 3 |
| G7 (store metrics API) | §3 Target: Check — APIs or manual upload; §5 Phase 3 |
| G8 (metadata applied) | §3 Target: Do — "Applied" tracking; §5 Phase 2 |
| G9, G11 (external tools) | Optional: doc links or future integration |

### 2.6 AppFollow API — Optional Integration

[AppFollow API v2](https://docs.api.appfollow.io/reference/overview) is an ASO-focused API that can fill several gaps and align with playbook-style tooling (keyword research, rankings, reports).

| AppFollow API area | Endpoints (from [reference](https://docs.api.appfollow.io/reference/overview)) | PDCA phase | Gaps addressed |
|--------------------|-------------------------------------------------------------------------------|------------|-----------------|
| **ASO Research** | Aso Keyword Research (GET), Aso Search (GET) | **Plan (P)** | G9 — app-store keyword research (search volume, difficulty, competitor keywords) |
| **Keywords** | Keywords (GET), Keywords Edit (POST) | Plan / Do | Track and edit keyword sets per app; can feed pipeline or record applied keywords |
| **Rankings** | Rankings (GET), Public Top Charts (GET) | **Check (C)** | G5, G6 — time-series keyword rankings; periodic capture → `aso_rankings` |
| **ASO Reports** | Aso Reports (GET), Aso Reports (GDC), Aso Reports (Appstore Search Ads) | **Check (C)** | G5, G6 — structured reports for effectiveness; can drive dashboard and Act inputs |
| **ASO Report** | Aso Search Ads Keyword Recommendations By App (GET) | Plan | Keyword ideas aligned with Apple Search Ads (playbook: “paid performance as proxy”) |
| **Reviews / Ratings** | Reviews, Ratings History, etc. | Check (optional) | Indirect ASO signal (ratings/reviews in playbook); not required for core PDCA |

**Use in pipeline:**

- **Plan:** Add an optional “AppFollow keyword research” step: call ASO Keyword Research / Aso Search for the app (and optionally competitors), merge results with Perplexity/DataForSEO, then run Claude filter and opportunity scoring. Reduces reliance on external-only tools (G9).
- **Check:** Use **Rankings** (and optionally **ASO Reports**) in the scheduled measurement job (Phase 3): fetch rankings by keyword/store/date, persist to `aso_rankings`; optionally ingest report data for the “Check” dashboard. Complements or replaces DataForSEO App Data for ranking time-series.
- **Auth & credits:** AppFollow v2 uses [custom tokens per service](https://docs.api.appfollow.io/reference/overview) and has [credit management and method cost](https://docs.api.appfollow.io/reference/overview); factor into API key config and usage.

**Recommendation:** Add AppFollow as an optional integration in Phase 1 (Plan — keyword research step) and Phase 3 (Check — rankings + reports). Env: e.g. `APPFOLLOW_API_TOKEN` or per-service tokens; feature flag to enable/disable.

### 2.7 Competitor gap analysis (AppFollow API)

Use the same [AppFollow API](https://docs.api.appfollow.io/reference/overview) to compare our app vs competitors and surface **keyword gaps** (terms competitors rank for that we don’t, or where we rank worse). Fits into **Plan** (discover opportunities) and **Check** (track vs competitors over time).

**Relevant endpoints:**

| Endpoint | Purpose | Competitor use |
|----------|---------|----------------|
| [Keywords](https://docs.api.appfollow.io/reference/keywords_api_v2_aso_keywords_get-1) `GET /api/v2/aso/keywords` | All keywords an app ranks for (by `ext_id`, country, device, date) | Call for **our app** and for **each competitor app**; diff to find “competitor-only” keywords. |
| [Rankings](https://docs.api.appfollow.io/reference/rankings_api_v2_meta_rankings_get-1) `GET /api/v2/meta/rankings` | App’s rankings by keyword (ext_id, country, device, date) | Call for our app and competitors to get **head-to-head rank** per keyword (e.g. we’re #12, Competitor A #3). |

**Gap logic:**

1. **Competitor set:** Store a list of competitor app external IDs (AppFollow `ext_id`) per cycle or globally — e.g. `competitor_ext_ids: ["123", "456"]` (iOS and/or Android as configured).
2. **Our keywords:** Call Keywords API for our app → set of keywords we rank for (and optionally rank position).
3. **Competitor keywords:** Call Keywords API for each competitor → union of keywords **any** competitor ranks for.
4. **Gap — missing / weak:**
   - **Missing:** Keywords in (competitor union) but not in (our keywords) → “competitors rank for these; we don’t” (candidates for Plan).
   - **Weak:** Keywords we both rank for but our rank is worse (e.g. we’re #25, they’re #5) → “head-to-head loss” (improve placement or replace).
5. **Output:** Persist as `competitor_gap` snapshot: `{ cycle_id, captured_at, our_keywords[], competitor_keywords_union[], missing_keywords[], head_to_head: [{ keyword, our_rank, competitor_rank, competitor_ext_id }] }` for dashboard and Act.

**Implementation outline:**

- **Config:** Competitor list (name + `ext_id` per store) in admin or Firestore, e.g. `aso_competitors` collection or cycle-level field.
- **Plan:** Optional “Competitor gap” step in pipeline (when AppFollow is enabled): fetch our + competitor keywords/rankings, compute gap, merge “missing” keywords into opportunity list and save `competitor_gap` with `cycle_id`.
- **Check:** Periodically re-run competitor gap (or reuse same job as “Capture rankings”) to see how gap and head-to-head change over the cycle; show in Check dashboard.
- **Act:** Use “missing” and “weak” keywords to decide Replace / New keyword set for next cycle.

**Credit note:** Keywords and Rankings are 10 credits per request; N competitors × 2 (Keywords + Rankings) + our app → budget credits for competitor set size and frequency.

---

## 3. Target: Full PDCA in the Admin ASO Pipeline

### 3.1 Plan (P)

- **Keep:** Store listing fetch, keyword derivation, Perplexity seeds, DataForSEO suggestions, Claude filter, opportunity scoring, persistence to Firestore.
- **Add:**
  - **ASO cycle entity:** Each run belongs to a "cycle" (e.g. `cycle_id`, `cycle_label: "2025-Q1"`, `planned_start`, `planned_end`). Enables comparing Plan → Do → Check → Act across cycles.
  - **Cycle-scoped snapshots:** When saving `keyword_shortlist` and `opportunity_mapping`, attach `cycle_id` and optional `phase: "plan"`. Later phases (Do, Check, Act) reference the same cycle.
  - **Playbook alignment:** In UI, show "Keyword research (100–200)" checklist; optionally cap/validate keyword count to match playbook.

### 3.2 Do (D)

- **Keep:** Metadata drafts generation from top opportunities; display in ASO Command Center.
- **Add:**
  - **"Applied" tracking:** When the team updates the store (App Store Connect / Play Console), they record "what was applied" in admin (e.g. paste or confirm title, subtitle, keywords, short description). Save as `metadata_applied` snapshot with `cycle_id`, `applied_at`, and optional diff vs previous.
  - **Optional:** Read-only display of "current live" listing (we already fetch store listings) next to "last applied" so we can see drift.
  - **Versioning:** Store each applied state so we can later correlate "Check" metrics with "what was live" in that period.

### 3.3 Check (C)

- **Keep:** DataForSEO App Data rankings inside the pipeline (one-time).
- **Add:**
  - **Scheduled measurement:** A way to periodically (e.g. weekly or bi-weekly) record:
    - **Keyword rankings** (DataForSEO App Data or manual/Sensor Tower export): store per keyword, per store, per date.
    - **Store metrics** (if available via API): App Store Connect / Play Console — impressions, product page views, first-time installs, sessions. If APIs are not available, support **manual upload** (CSV) or manual entry for key metrics per cycle.
  - **Time-series storage:** New Firestore (or equivalent) structure for:
    - `aso_rankings`: `cycle_id`, `keyword`, `store` (ios | android), `rank`, `date`.
    - `aso_metrics`: `cycle_id`, `store`, `date`, `impressions`, `product_page_views`, `first_time_installs`, `sessions` (optional).
  - **Dashboard:** In ASO Command Center, a "Check" view: for the current cycle, show trend of rankings (e.g. top 10–20 keywords) and funnel metrics over time. Compare "before this cycle" vs "after" when we have multiple cycles.

### 3.4 Act (A)

- **Add:**
  - **Iteration decision rules (playbook):** For each keyword (or keyword set), at end of cycle, decide:
    - Rank ↑ + CV ↑ → **Keep**
    - Rank ↑ but CV ↓ → **Investigate**
    - Rank unchanged → **Replace**
    - Rank ↓ → **Reassess**
    - No improvement → **New keyword set**
  - **Act phase in UI:** A step that:
    1. Loads "Check" data for the cycle (rankings + metrics).
    2. Compares to "Plan" (target keywords and opportunity list) and optionally to "Do" (what was applied).
    3. Lets the user assign a decision per keyword (or bulk): Keep / Replace / Reassess / Investigate.
    4. Optionally generates "next cycle" seed keywords: e.g. "Replaced" keywords removed, "New keyword set" from a new research run.
  - **Cycle close and next cycle:** Mark cycle as "closed", set `closed_at`, and optionally create the next cycle (e.g. "2025-Q2") with seed keywords from Act output. Persist Act decisions in Firestore (`aso_cycle_actions` or inside cycle doc).

---

## 4. Data Model Additions (Summary)

| Concept | Storage | Purpose |
|--------|---------|--------|
| **ASO cycle** | `aso_cycles` collection (or doc per cycle) | `cycle_id`, `label`, `planned_start`, `planned_end`, `closed_at`, `status` (draft \| active \| closed) |
| **Cycle linkage** | Add `cycle_id` to existing `aso_snapshots` (keyword_shortlist, opportunity_mapping, metadata_drafts) | Tie Plan/Do snapshots to a cycle |
| **Metadata applied** | New snapshot type `metadata_applied` with `cycle_id`, `applied_at`, payload (title, subtitle, keywords, etc.) | Do phase record |
| **Rankings over time** | `aso_rankings` (or snapshot type `ranking_snapshot`) | Check: keyword rank by date, cycle, store |
| **Funnel metrics** | `aso_metrics` (or snapshot type `metrics_snapshot`) | Check: impressions, product page views, installs by date, cycle, store |
| **Act decisions** | `aso_cycle_actions` or field in cycle doc | Act: per-keyword or per-cycle decision (Keep/Replace/Reassess/Investigate) |
| **Competitor set** | `aso_competitors` or field in cycle/settings | List of competitor app external IDs (AppFollow `ext_id`) per store for gap analysis |
| **Competitor gap** | Snapshot type `competitor_gap` with `cycle_id` | Missing keywords (competitors rank, we don’t), head-to-head rank comparison; see §2.7 |

---

## 5. Implementation Phases

### Phase 1 — Cycle awareness (Plan improvement)

1. Add **cycle** concept:
   - Firestore: `aso_cycles` collection with `label`, `planned_start`, `planned_end`, `status`.
   - API: `POST/GET /api/aso/cycles` to create and list cycles.
2. When running the pipeline, allow selecting or creating a cycle; save `keyword_shortlist` and `opportunity_mapping` with `cycle_id`.
3. ASO Command Center UI: cycle selector at top; "Run pipeline" assigns current cycle; show "Plan" summary for selected cycle (last shortlist + opportunities).
4. **Optional — AppFollow (Plan):** If `APPFOLLOW_API_TOKEN` (or per-service tokens) is set, add pipeline step "AppFollow ASO Research": call [Aso Keyword Research](https://docs.api.appfollow.io/reference/overview) / Aso Search for the app, merge with existing seeds (Perplexity/DataForSEO), then Claude filter. Surfaces app-store-native keyword data (G9).
5. **Optional — Competitor gap (AppFollow):** If AppFollow is enabled and a **competitor set** is configured (see §2.7), add step "Competitor gap analysis": call [Keywords](https://docs.api.appfollow.io/reference/keywords_api_v2_aso_keywords_get-1) and [Rankings](https://docs.api.appfollow.io/reference/rankings_api_v2_meta_rankings_get-1) for our app and each competitor; compute missing keywords and head-to-head rank; save `competitor_gap` snapshot with `cycle_id`; optionally merge missing keywords into opportunity list for Plan.

**Outcome:** Every pipeline run is tied to a cycle; we can later filter Check/Act by cycle. Optionally richer keyword research and competitor gap via AppFollow.

### Phase 2 — Do: Applied metadata tracking

1. New snapshot type `metadata_applied`: payload with title, subtitle, keywords, short description (and optionally full description hash), `cycle_id`, `applied_at`.
2. API: `POST /api/aso/metadata-applied` to record applied state; `GET` to fetch last applied per cycle.
3. UI: In ASO Command Center, after "Metadata drafts", add "Record applied" section: form or paste fields for what was actually published; submit saves `metadata_applied` for current cycle.

**Outcome:** We know what was "live" for a given cycle and when it was applied.

### Phase 3 — Check: Time-series measurement

1. **Rankings:**
   - Option A: Reuse DataForSEO App Data in a **scheduled job** (e.g. cron or manual "Capture rankings" button) that runs for the current cycle’s keyword list and writes to `aso_rankings` (or `ranking_snapshot`).
   - **Option A':** Use [AppFollow Rankings API](https://docs.api.appfollow.io/reference/overview) (Rankings GET) for keyword rankings; same scheduled job persists to `aso_rankings`. Aligns with ASO-specific tooling and can replace or complement DataForSEO.
   - Option B: Manual upload (CSV) of keyword + rank + date for each store.
2. **Optional — AppFollow ASO Reports:** Ingest [Aso Reports](https://docs.api.appfollow.io/reference/overview) (or GDC / App Store Search Ads variants) for the cycle; display in Check dashboard or use as input for Act (effectiveness summary).
3. **Optional — Competitor gap (Check):** Re-run competitor gap (Keywords + Rankings for our app and configured competitors) on schedule or via "Refresh competitor gap" button; persist to `competitor_gap` with date so Check view shows trend (e.g. "missing keywords" count over time, head-to-head changes). See §2.7.
4. **Funnel metrics:**
   - If App Store Connect / Play Console APIs are available: periodic job to fetch impressions, product page views, first-time installs (and optionally sessions) and store in `aso_metrics`.
   - Else: manual entry or CSV upload for key metrics per period (e.g. weekly).
5. API: `POST/GET /api/aso/rankings`, `POST/GET /api/aso/metrics` (or unified "measurement" endpoint) with `cycle_id` and date range.
6. UI: "Check" tab or section: charts/tables for ranking trend, funnel metrics, and (if AppFollow enabled) competitor gap summary for the selected cycle.

**Outcome:** We have before/after and trend data for the cycle to feed Act.

### Phase 4 — Act: Iteration decisions and next cycle

1. Persist **iteration decisions** (playbook rules):
   - Store per keyword or per "decision set": Keep | Replace | Reassess | Investigate | New keyword set.
   - API: `POST/GET /api/aso/cycle-actions` with `cycle_id`.
2. UI: "Act" step:
   - Load Check data (rankings + metrics) and Plan data (opportunities).
   - Simple view: list of keywords with rank change (↑ / ↓ / unchanged) and optional CV change; dropdown or buttons to set decision.
   - "Close cycle" button: set `closed_at`, optionally create next cycle and pre-fill seed keywords from "Replace" + "New keyword set" (e.g. export list for next pipeline run).
3. Optional: "Next cycle" creation wizard: copy "Replace" and "New keyword set" into a seed list for the next run.

**Outcome:** Full PDCA loop: Plan → Do → Check → Act, with decisions stored and next cycle seeded.

### Phase 5 — Polish and automation

- **Unified ASO dashboard:** Single view with phases P → D → C → A for the current cycle (and past cycles).
- **Reminders / cadence:** Optional reminder or doc that cycles are ~3 months (e.g. "Next cycle start: YYYY-MM-DD").
- **Export:** Export cycle report (Plan snapshot, Applied metadata, Check metrics, Act decisions) for sharing or archival.

---

## 6. Checklist: Playbook Alignment

| Playbook item | After implementation |
|---------------|----------------------|
| Keyword research (100–200) | Plan phase: pipeline produces shortlist; optional validation to 100–200. |
| Metadata update | Do phase: metadata drafts + "applied" recording with cycle. |
| Creative A/B testing | Out of scope in this plan (Repro / App Store Connect PPO / Play Experiments); can add link or section later. |
| Measure effectiveness | Check phase: rankings + impressions / product page views / installs (and optional sessions). |
| Iterate (every 3 months) | Act phase: iteration rules, cycle close, next cycle seed. |
| Full funnel (ranking → impressions → product page views → installs → retention) | Check phase stores rankings and funnel metrics; retention can be added if data source exists. |
| **ASO tooling (playbook: AppTweak, Sensor Tower)** | Optional: [AppFollow API](https://docs.api.appfollow.io/reference/overview) for Plan (keyword research) and Check (rankings, ASO reports); see §2.6. |

---

## 7. Summary

- **Current pipeline** already covers most of **Plan** (keyword research, filtering, opportunity scoring) and supports **Do** via metadata drafts; it lacks cycle awareness, applied-state tracking, time-series measurement, and structured **Act**.
- Implementing **cycle-scoped runs**, **metadata_applied**, **rankings + metrics over time**, and **Act decisions with next-cycle seeding** will give a **full PDCA cycle** in the admin ASO pipeline, aligned with the playbook’s ~3‑month optimization loop.
- **AppFollow API** can be used optionally for Plan (ASO Keyword Research, Aso Search) and Check (Rankings, ASO Reports), reducing gap G9 and strengthening time-series measurement; see §2.6 and Phase 1 / Phase 3.
- **Competitor gap analysis** with AppFollow: [Keywords](https://docs.api.appfollow.io/reference/keywords_api_v2_aso_keywords_get-1) and [Rankings](https://docs.api.appfollow.io/reference/rankings_api_v2_meta_rankings_get-1) for our app + a configured competitor set yield “missing keywords” (competitors rank, we don’t) and head-to-head rank comparison; see §2.7, Phase 1 (Plan) and Phase 3 (Check).
- Phases 1–4 can be implemented incrementally; Phase 5 adds a single-dashboard view and optional automation/export.
