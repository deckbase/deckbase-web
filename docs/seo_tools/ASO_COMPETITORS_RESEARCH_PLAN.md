# ASO Competitors Research — Plan

Plan for adding a **competitors research** feature to the ASO Command Center: discover and compare apps that compete with yours for the same keywords on Google Play and the App Store.

---

## 1. Goal

- **Discover competitors** — Apps that rank for many of the same keywords as your app (keyword overlap).
- **Compare at a glance** — Intersections (shared keywords), average position, search volume on those keywords, and how often they rank #1 vs #4–10.
- **Use in strategy** — Prioritize outranking strong competitors on high-volume keywords; spot gaps where they rank and you don’t.

This fits with the existing ASO flow: we already have **our** rankings and opportunities; competitors research adds **who we’re competing with** and **how they perform** on the same keywords.

---

## 2. Data source: DataForSEO Labs App Competitors

DataForSEO exposes two **live** endpoints (same credentials as existing DataForSEO usage):

| Store        | Endpoint | Purpose |
|-------------|----------|---------|
| **Google Play** | `POST /v3/dataforseo_labs/google/app_competitors/live` | Competitors that intersect with your app on its ranking keywords. |
| **App Store**   | `POST /v3/dataforseo_labs/apple/app_competitors/live`  | Same for App Store. |

**Request (per store):**

- `app_id` — **Google:** package name (e.g. `com.tkg.deckbase`). **Apple:** numeric app id (e.g. `6755723338`).
- `location_code` (e.g. `2840` = US), `language_code` (e.g. `en`).
- Optional: `limit` (default 100, max 1000), `offset`, `filters`, `order_by` (e.g. `["intersections","desc"]`).

**Response (per store):**

- `tasks[0].result[0].items[]` — one entry per competitor:
  - `app_id` — competitor app id (package or numeric).
  - `intersections` — number of keywords where both your app and this app rank.
  - `avg_position` — competitor’s average position on those intersecting keywords.
  - `sum_position` — sum of positions (for sorting).
  - `competitor_metrics.google_play_search_organic` / `competitor_metrics.app_store_search_organic`:
    - `pos_1`, `pos_2_3`, `pos_4_10`, `pos_11_100` — count of SERPs where competitor ranks in that bucket.
    - `count` — total SERPs (intersecting keywords) where competitor appears.
    - `search_volume` — total search volume of those intersecting keywords.

**Note:** Response does **not** include competitor app **name** or icon. Only `app_id` and metrics. We can link to the store (e.g. `https://play.google.com/store/apps/details?id=...` or `https://apps.apple.com/app/id...`) so users can open the app page. Enrichment with app name (e.g. via DataForSEO App Data “app info” or similar) can be a later phase.

---

## 3. Scope

### MVP (Phase 1)

- **Trigger:** “Competitors” section on ASO page with a **“Fetch competitors”** (or “Run competitor research”) button.
- **Backend:**
  - New helper in `lib/dataforseo-app.js` (or a small `lib/dataforseo-labs.js`): `fetchAppCompetitors({ appIdApple, packageNameAndroid, locationCode, languageCode, limit })`:
    - Calls Labs Apple app_competitors with `app_id` = Apple app id.
    - Calls Labs Google app_competitors with `app_id` = Android package name.
    - Returns `{ ok, apple: { items }, google: { items }, error? }`.
  - New API route: e.g. `POST /api/aso/competitors` (or `GET` with query params). Uses env `APPSTORE_APP_ID` and `ANDROID_PACKAGE_NAME` if not in body. Returns competitors for both stores.
- **Persistence:** Save result in Firestore under existing `aso_snapshots` with a new type, e.g. `competitor_research`, payload e.g. `{ apple: [], google: [], run_at }`. On ASO page load, optionally load latest `competitor_research` so “last run” is visible without refetch.
- **UI:**
  - Section **“Competitors”** (e.g. below “Current store listing” or above “Run ASO pipeline”).
  - When no data: short explanation + “Fetch competitors” button.
  - When loading: spinner + “Fetching competitors…”.
  - When data exists: two tables (or one table with a “Store” column): **Google Play** and **App Store**, columns e.g.:
    - Competitor (app_id, optionally link to store).
    - Intersections.
    - Avg position.
    - Search volume (intersecting).
    - #1 / #2–3 / #4–10 (optional, from competitor_metrics).
  - Optional: “Last run at …” and “Fetch again” to refresh.

### Phase 2 (later)

- **App names:** Use DataForSEO App Data (e.g. app info/listings by app_id) to resolve competitor `app_id` → name (and optionally icon) for display.
- **Pipeline integration:** Optional checkbox “Fetch competitors when running pipeline” so every pipeline run also refreshes competitor snapshot.
- **Keyword overlap:** For each competitor, list (or count) the actual intersecting keywords. This may require an extra Labs endpoint (e.g. “keywords for app”) if available; otherwise we could approximate from our opportunity list + their presence in our SERP data when “App Data (rankings)” is on.
- **Trends:** Store snapshots over time and show “intersections up/down” or “avg position change” for top competitors (30–90 day deltas).

---

## 4. API design

- **Route:** `POST /api/aso/competitors`
  - Body (optional): `{ app_id_apple?, android_package?, location_code?, language_code?, limit? }`.
  - Uses `process.env.APPSTORE_APP_ID` and `process.env.ANDROID_PACKAGE_NAME` when not in body.
  - Calls DataForSEO Labs for both stores; returns `{ apple: { items }, google: { items }, run_at }` and optionally writes to Firestore `aso_snapshots` with type `competitor_research`.
  - Errors: missing app ids, DataForSEO auth/rate limit, invalid response → return 4xx/5xx and message.

Alternatively:

- **GET /api/aso/competitors** — same but no body; always use env for app ids. Slightly simpler for “Fetch competitors” button.

Recommendation: **POST** so we can later pass `limit`/`location_code` from the UI without changing the URL.

---

## 5. Firestore

- **Collection:** `aso_snapshots` (existing).
- **Document:** New snapshot with `type: "competitor_research"`, payload e.g.:
  - `apple: { items: [...], total_count? }`
  - `google: { items: [...], total_count? }`
  - `run_at: ISO string`
- **Read:** Reuse `getLatestAsoSnapshots("competitor_research", 1)` so the ASO page can show “last run” and the latest competitor tables without refetching.

---

## 6. Implementation steps (MVP)

1. **Labs client**  
   In `lib/dataforseo-app.js` (or new `lib/dataforseo-labs.js`), add:
   - `fetchAppCompetitors({ appIdApple, packageNameAndroid, locationCode, languageCode, limit })`:
     - POST to `dataforseo_labs/apple/app_competitors/live` and `dataforseo_labs/google/app_competitors/live` (same auth as existing DataForSEO).
     - Normalize and return `{ ok, apple: { items, total_count }, google: { items, total_count }, error? }`.

2. **API route**  
   Add `app/api/aso/competitors/route.js`:
   - POST handler: read body, resolve app ids from body or env, call `fetchAppCompetitors`, save to Firestore as `competitor_research` snapshot, return JSON.

3. **Firestore**  
   In `lib/aso-firestore.js`, ensure `getLatestAsoSnapshots` supports type `"competitor_research"` (and that `saveAsoSnapshot` accepts it). No schema change needed if snapshot payload is free-form.

4. **ASO page**  
   - Add state: `competitorsLoading`, `competitorsError`, `competitorResearch` (last result).
   - On load: fetch latest `competitor_research` from `/api/aso/snapshots` (extend snapshot response to include `competitor_research` when present) or a dedicated GET that returns latest from Firestore.
   - New section “Competitors”:
     - “Fetch competitors” button → POST `/api/aso/competitors` → set `competitorResearch`, clear error.
     - When `competitorResearch`: render two tables (Apple / Google) with columns above; show “Last run at …” and “Fetch again”.

5. **Snapshots API**  
   If we want “load last competitors” from the same place as other ASO data: in `GET /api/aso/snapshots`, include latest `competitor_research` in the payload (e.g. `competitor_research: snapshot || null`). Page then uses that for initial state and after “Fetch again”.

6. **Docs**  
   Update `docs/ANDROID_IOS_ASO.md` or `docs/ASO_LISTING_ANALYSIS_FLOW.md` with a short “Competitors research” subsection pointing to this plan and the Labs endpoints.

---

## 7. Summary

| Item | Choice |
|------|--------|
| **Feature** | Competitors research: who competes with our app on the same keywords (per store). |
| **Data** | DataForSEO Labs `app_competitors` (Apple + Google), same credentials. |
| **Trigger** | Button “Fetch competitors” on ASO page; optional later: run with pipeline. |
| **Storage** | Firestore `aso_snapshots` with `type: "competitor_research"`. |
| **UI** | Section “Competitors” with tables (Apple / Google): app_id (link), intersections, avg position, search volume, optional pos_1/2_3/4_10. |
| **MVP** | No app names (only app_id + store link); no keyword list yet. |
| **Later** | App name enrichment, pipeline checkbox, keyword overlap, trends. |

This plan keeps the first version small and shippable, with a clear path to richer competitor analysis later.
