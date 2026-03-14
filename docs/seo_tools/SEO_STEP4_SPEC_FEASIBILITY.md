# Step 4 (SERP Opportunity Mapping) – Spec & Feasibility

This doc maps the business spec for Step 4’s **technical output**, **data structure**, and **strategic report** to what exists today and what needs to be built.

---

## 1. Technical output & data structure

**Spec:** A persistent data table (e.g. in Firebase) that merges DataForSEO keyword volume and ranking results, with:

| Field | Spec | Current state | Action |
|-------|------|----------------|--------|
| **Target keywords** | The terms being analyzed | ✅ In pipeline + UI (keywords list) | None |
| **Monthly search volume** | Live traffic potential | ✅ DataForSEO search volume → `search_volume` | None |
| **Current domain rank** | Where deckbase.co sits in top 100 | ✅ DataForSEO SERP API → `position` | None |
| **Keyword difficulty (KD)** | How hard it is to rank | ⚠️ We have **competition** (Google Ads) in volume response; true **KD** is from DataForSEO Labs `bulk_keyword_difficulty` (0–100) | Optional: add Labs API call or keep competition as proxy |
| **Opportunity flag (Yes/No)** | High volume + not in top 10 (or no rank) | ✅ Computed in pipeline + UI as `isOpportunity` | None |

**Persistent table:**  
- ✅ Keyword volume and rankings are already saved to Firebase (`seo_snapshots`).  
- The **merged** table (keywords + volume + rank + opportunity) is computed at run time in the pipeline and in the UI; it is not yet stored as a single “Step 4 output” document.  
- **Feasible:** Add a new snapshot type (e.g. `serp_opportunity_mapping`) written at the end of Step 4 with the merged rows (keyword, search_volume, position, competition_or_KD, opportunity_flag, optional: intent, quick_win_flag). That becomes the “primary output” table.

**Conclusion:** The data structure is **possible** and mostly in place. Remaining work: (1) optionally add KD from DataForSEO Labs; (2) persist the merged Step 4 table to Firebase.

---

## 2. Strategic analysis & reporting

**Spec:** An interactive report (e.g. HTML) that includes:

### 2.1 Search intent classification (Commercial vs. Informational)

- **Idea:** Tag each keyword so the team can choose “service page” vs “blog post”.
- **Feasible:** Yes.
  - **Option A (no LLM):** Heuristics (e.g. “vs”, “review”, “price”, “best” → Commercial; “how to”, “what is”, “guide” → Informational). Fast and free.
  - **Option B (LLM):** One Claude Haiku call per keyword (or batched) to classify intent. More accurate, small cost.
- **Implementation:** Add an `intent` field to the merged table (and to the Step 4 snapshot). Render in the report as a column or filter.

### 2.2 “Why they win” competitive gap analysis

- **Idea:** Plain-English explanation of why competitors (e.g. Anki, Classmarker) outrank Deckbase for a given keyword (authority, content gaps).
- **Feasible:** Yes, with one new data source.
  - **Today:** We only know “our” position and URL for a keyword. We do **not** have the top 10 SERP results (competitor URLs/titles/snippets).
  - **Need:** For each opportunity keyword, call DataForSEO SERP API **without** `target=domain` (or use a “SERP results” endpoint) to get the top 10 organic results (title, URL, snippet). Then pass that list + keyword to Claude Haiku and ask: “Why do these results outrank [domain]? Authority vs content gaps in 2–3 sentences.”
  - **Output:** Store a `competitive_gap` text (or structured bullets) per opportunity keyword; include in the report.

### 2.3 3‑month content strategy (quick wins + strategic builds)

- **Idea:** Prioritized list: “quick wins” (low difficulty / high volume) and “strategic builds” (longer-term).
- **Feasible:** Yes.
  - **Data we have:** Volume, position, competition (or KD if we add it). So we can compute:
    - **Quick wins:** High volume, low KD/competition, we don’t rank in top 10 (or at all).
    - **Strategic builds:** High volume, higher KD or competitive, long-term plays.
  - **Implementation:** Sort/filter the merged table, add flags `quick_win` and `strategic_build` (e.g. by thresholds). Optionally one LLM call to turn the list into a short narrative “3‑month plan” for the report.

### 2.4 Technical implications

- **Idea:** High-level insights (e.g. loading speed, on-page SEO) from the merge/audit.
- **Feasible:** Yes.
  - We already run a technical audit (title, description, H1/H2, word count, issues). We can:
    - Add a short **summary** (e.g. “3 errors, 5 warnings across N pages”) and/or
    - One LLM call: “Summarize these technical issues in 2–3 bullets for the content/tech team.”
  - If we add multi-URL audit (Phase 1 of the main feasibility doc), we can aggregate and summarize across all audited URLs.

### 2.5 Interactive HTML report

- **Idea:** Single report view that shows the table + intent + competitive gap + content strategy + technical implications, using “front-end design skills.”
- **Feasible:** Yes.
  - **Option A:** A dedicated dashboard route (e.g. `/dashboard/admin/seo/report` or `/report/[runId]`) that renders:
    - The Step 4 table (with intent, opportunity, quick_win, strategic_build).
    - Sections: “Search intent,” “Why they win,” “3‑month content strategy,” “Technical implications.”
  - **Option B:** Same content exported as a single HTML file (e.g. “Download report”) for sharing.
  - **Option C:** Both: in-app report + export.

**Conclusion:** All four strategic elements are **possible**. The only new dependency is **SERP top-10 data** for “Why they win”; the rest uses existing or planned data + optional LLM calls.

---

## 3. Developer implementation note (from spec)

**Spec:** Step 4 output should be actionable and feed Step 5 (Technical Audit) and pSEO builds; focus resources on pages that pass the “Vibe Test” and match searcher intent.

- **Current direction:** We already plan to pass “Yes” opportunities from Step 4 to Step 5 (audit existing URL or trigger pSEO when no page exists). Adding the persistent Step 4 table and the report does not change that; it only makes the output **visible and persistent** so the team can:
  - See the prioritized roadmap (quick wins vs strategic builds).
  - Use intent to decide “service page vs blog.”
  - Use “Why they win” to brief content and pSEO.
  - Use technical implications to prioritize fixes.

So the implementation note is **aligned** with the existing pipeline design; the spec is **possible** and enhances it.

---

## 4. Implementation order (recommended)

| Priority | Item | Effort | Notes |
|----------|------|--------|------|
| 1 | Persist Step 4 merged table to Firebase | Small | New snapshot type `serp_opportunity_mapping` with keyword, volume, position, competition, opportunity_flag. |
| 2 | Add KD (optional) | Small | Call DataForSEO Labs `bulk_keyword_difficulty` and merge into table; or keep competition as proxy. |
| 3 | Search intent (heuristic or LLM) | Small | Add `intent` to table; show in UI/report. |
| 4 | Quick wins / strategic builds flags | Small | Thresholds on volume + KD/competition + position; add to table and report. |
| 5 | Interactive report page | Medium | New route that shows table + intent + strategy + (placeholder for “Why they win” + technical summary). |
| 6 | “Why they win” | Medium | SERP top-10 per opportunity keyword + Claude summary; store and show in report. |
| 7 | Technical implications summary | Small | Aggregate audit issues; optional LLM summary; add to report. |
| 8 | Export report as HTML | Small | Once report page exists, add “Download HTML” (or PDF). |

---

## 5. Summary

| Spec item | Possible? | Depends on |
|-----------|-----------|------------|
| Persistent merged table (keywords, volume, rank, KD, opportunity) | ✅ Yes | Persist Step 4 output; optional KD API |
| Search intent (Commercial / Informational) | ✅ Yes | Heuristics or Claude |
| “Why they win” competitive gap | ✅ Yes | SERP top-10 data + Claude |
| 3‑month content strategy (quick wins + strategic builds) | ✅ Yes | Current data + thresholds (and optional KD) |
| Technical implications summary | ✅ Yes | Existing audit + optional LLM |
| Interactive HTML report | ✅ Yes | New report route + export |

**Overall:** The spec is **possible** and fits the current pipeline. The main new piece is **SERP top-10 data** for “Why they win”; everything else builds on existing or planned data and optional LLM calls.
