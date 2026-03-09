# ASO Command Center: Android & iOS Growth Engine

This document outlines the architecture for the ASO (App Store Optimization) Command Center, designed to operate within the web application using the Claude API. By mirroring the logic of the SEO pipeline, this system automates mobile app visibility on the Apple App Store and Google Play Store using a pay-as-you-go API stack.

**Designated for the development team.**

---

## 1. Core Infrastructure (Claude API)

- **API Model:** Utilize Haiku 4.5 for high-volume keyword filtering and sentiment analysis. It is cost-effective for routine data processing and large-scale ASO audits.
- **Data Persistence:** All ASO pipeline runs, keyword shortlists, and competitor metadata snapshots must be stored in Firebase (Firestore) to track ranking deltas over 30–90 day periods.

---

## 2. Integration Layer (External APIs)

Instead of expensive monthly subscriptions, the ASO pipeline connects to these data sources:

| Source | Purpose |
|--------|--------|
| **DataForSEO App Data API** | Live rankings for your app and competitors, app search suggestions, and detailed app info. |
| **DataForSEO Reviews API** | User reviews from Google Play and the App Store for sentiment analysis and feature request identification. |
| **Apple Search Ads (ASA) API** | Official "Search Popularity" scores to gauge true user demand on iOS. |
| **Firecrawl** | Scrapes competitor app landing pages (web version) to detect metadata updates and visual changes. |
| **Perplexity** | Initial niche research to discover seed keywords and user pain points (e.g., "best AI flashcard app for med students"). |

---

## 3. The ASO Pipeline Flow (current)

The dashboard trigger **Run** (or **`POST /api/aso/pipeline/stream`**) executes the following sequential steps:

1. **Store listing** — Fetch current listing from Google Play (title, short/full description) and App Store Connect (subtitle, keywords, description, promotional text). Used as baseline for opportunity scoring. Optional: derive seed keywords from listing when none are entered.
2. **Keyword discovery** — Optional Perplexity seeds; DataForSEO keyword suggestions (with search volume); merged list.
3. **Claude filter** — Filter to &lt;200 terms; prefer keywords not already clearly in the listing.
4. **App rankings (optional)** — DataForSEO App Data App Searches: app store SERP per keyword for Apple + Google; our app’s rank merged into opportunity notes (e.g. “Rank #5 on Play”, “Not in top 30”). Enable “DataForSEO App Data (rankings)” when running.
5. **Opportunity scoring** — Listing-based: presence/placement (title, short/full, subtitle, keywords, description) + optional rank → priority (high/medium/low) and note per store. Results saved to Firestore (`opportunity_mapping`, `keyword_shortlist`).
6. **Metadata drafts (Step 5)** — Separate action on dashboard: generate title, subtitle, and keywords from top opportunities (Claude); stored as `metadata_drafts` in Firestore. Copy into store listing as needed.

**Not yet implemented:** Overview/sentiment from Reviews API; ASA Search Popularity; store console download trends; automatic “run competitors” in pipeline. **Competitors research** is planned (see [ASO_COMPETITORS_RESEARCH_PLAN.md](./ASO_COMPETITORS_RESEARCH_PLAN.md)).

---

## 4. Connecting Step 4 (Mapping) to Step 5 (Execution)

The transition from Opportunity Mapping to Metadata Build is the core of the ASO growth engine:

- **Data hand-off:** When Step 4 identifies a high-volume gap, it passes the target keyword and current metadata to Step 5.
- **Contextual fix:** Step 5 uses Claude to rewrite the metadata, balancing algorithm optimization (keyword placement) with user experience (readability and "vibe test").
- **A/B test trigger:** For Android, Step 5 can output JSON configurations for Store Listing Experiments to validate which keyword-rich description drives the best conversion.

---

## 5. Feasibility & Implementation Notes

**Can we create an ASO page in admin?** **Yes.** The following applies relative to the current codebase:

### Implemented

| Component | Status | Notes |
|-----------|--------|--------|
| **ASO dashboard** | Done | `app/dashboard/admin/aso/page.js` — connection status, store listing, last run, past analysis, metadata drafts, run pipeline. |
| **Pipeline runner** | Done | `lib/aso-pipeline-runner.js` — store listings, Perplexity, DataForSEO suggestions, Claude filter, App Data rankings (optional), opportunity scoring; Firestore. |
| **Streaming pipeline** | Done | `POST /api/aso/pipeline/stream` — live progress and result. |
| **Firestore** | Done | `aso_snapshots` types: `keyword_shortlist`, `opportunity_mapping`, `metadata_drafts`. `lib/aso-firestore.js`. |
| **Store listings** | Done | `lib/google-play-listings.js`, `lib/appstore-connect-listings.js`; `GET /api/aso/store-listings`. |
| **Listing analysis** | Done | `lib/aso-listing-analysis.js` — placement and scoring; optional rank in notes. |
| **DataForSEO App Data** | Done | `lib/dataforseo-app.js` — App Searches (Apple + Google); optional step "DataForSEO App Data (rankings)". |
| **Metadata drafts** | Done | `lib/aso-metadata-drafts.js`; `POST /api/aso/metadata-drafts`; `metadata_drafts` snapshot. |
| **Snapshots and history** | Done | `GET /api/aso/snapshots` with `?list=1` for past runs; expandable history on dashboard. |
| **Integrations** | Done | `GET /api/aso/integrations` — App Store Connect, Google Play, Perplexity, DataForSEO, Anthropic. |

### Not yet implemented

| Component | Notes |
|-----------|--------|
| **DataForSEO Reviews API** | Reviews for sentiment; would feed overview step. |
| **Competitors research** | DataForSEO Labs app_competitors; see [ASO_COMPETITORS_RESEARCH_PLAN.md](./ASO_COMPETITORS_RESEARCH_PLAN.md). |
| **Apple Search Ads API** | Search Popularity; requires ASA account. |
| **Store console (downloads)** | No public API; manual or partner (e.g. Data.ai). |
| **A/B export** | Store Listing Experiments JSON from metadata drafts; optional. |

### File and API reference (ASO)

| What | Where |
|------|--------|
| ASO dashboard | `app/dashboard/admin/aso/page.js` |
| Pipeline logic | `lib/aso-pipeline-runner.js` |
| Listing analysis | `lib/aso-listing-analysis.js` |
| App Data (rankings) | `lib/dataforseo-app.js` |
| Metadata drafts | `lib/aso-metadata-drafts.js` |
| Firestore | `lib/aso-firestore.js` |
| Pipeline (stream) | `POST /api/aso/pipeline/stream` — body: `keywords`, `use_perplexity_seeds`, `use_dataforseo_suggestions`, `use_claude_filter`, `use_app_rankings`, optional `location_code`, `language_code` |
| Snapshots | `GET /api/aso/snapshots` — latest shortlist, opportunity_mapping, metadata_drafts; `?list=1` adds `past_runs` (last 20). |
| Store listings | `GET /api/aso/store-listings` |
| Metadata drafts | `POST /api/aso/metadata-drafts` |
| Integrations | `GET /api/aso/integrations` |

---

## 6. Connecting to Google Play and App Store Connect for listing data

**Yes — we can connect to both stores and read your app’s current listing metadata** (title, short/full description, subtitle, keywords). That gives the ASO pipeline a baseline for opportunity scoring and for Step 5 (metadata execution).

### Google Play (Android Publisher API)

- **API:** [Google Play Android Publisher API v3](https://developers.google.com/android-publisher) (REST).
- **Listing resource:** `edits.listings` — **list** / **get** return per-language listing: `title`, `fullDescription`, `shortDescription`, `video`.
- **Endpoint example:** `GET .../applications/{packageName}/edits/{editId}/listings` and `.../listings/{language}`.
- **Auth:** **Service account.** Create in Google Cloud, enable “Google Play Android Developer API,” then in **Play Console** (Settings → API access) link the project and grant the service account access to the app. Reuse `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS` if the same project as GA4/GSC; scope is `https://www.googleapis.com/auth/androidpublisher`.
- **Note:** The API uses “edits” (draft model). To read listing data you insert an edit, read `edits.listings.list`, then discard the edit. No separate read-only listing endpoint.

**Implementation:** `lib/google-play-listings.js` — service-account JWT, create edit → list listings; used by ASO dashboard and pipeline.

### App Store Connect (Apple)

- **API:** [App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi) (REST, JWT).
- **Listing data:** **App Store Version Localizations** — `description`, `keywords`, `subtitle`, `promotionalText` per locale. Flow: `GET /v1/apps` → `GET /v1/apps/{id}/appStoreVersions` → `GET /v1/appStoreVersions/{versionId}/appStoreVersionLocalizations`.
- **Auth:** **API key** (no service account). In App Store Connect → Users and Access → Integrations → App Store Connect API: create key, download `.p8` once, note **Key ID** and **Issuer ID**. Sign a JWT with the `.p8` private key; use as Bearer token.
- **Env:** e.g. `APPSTORE_CONNECT_ISSUER_ID`, `APPSTORE_CONNECT_KEY_ID`, `APPSTORE_CONNECT_PRIVATE_KEY` (contents of .p8). Key needs at least “App Manager” (or role that can read app/version data).
- **Note:** Only **your** app’s data. For competitors use DataForSEO App Data or scraping.

**Implementation:** `lib/appstore-connect-listings.js` — JWT, calls App Store Connect API, returns locale → { description, keywords, subtitle }; used by ASO dashboard and pipeline.

### Summary

| Store | Can read our listing? | Auth |
|-------|------------------------|------|
| **Google Play** | Yes — title, short/full description per language | Service account (Play Console + Cloud project) |
| **App Store Connect** | Yes — description, keywords, subtitle per locale | API key (.p8 + Key ID + Issuer ID) |

These integrations are implemented; the ASO pipeline uses them for listing-based opportunity scoring and metadata drafts. For the SEO Command Center (website), see [SEO_COMMAND_CENTER_FLOW.md](./SEO_COMMAND_CENTER_FLOW.md); dashboard: `/dashboard/admin/seo`.
