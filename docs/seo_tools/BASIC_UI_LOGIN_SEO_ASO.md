# Basic UI: Login, SEO, ASO

This doc describes the **basic UI structure** for the app: **Login** and the main product areas **SEO** and **ASO**.

---

## 1. Login

**Purpose:** Authenticate the user before allowing access to SEO/ASO and other features.

| Item | Description |
|------|--------------|
| **Entry** | App root or protected routes redirect to login when the user is not authenticated. |
| **Screen** | Login page: email + password (and/or OAuth: Google, Apple, etc.). Optional “Forgot password” and “Sign up” links. |
| **Success** | On success: store session/token (e.g. Firebase Auth, JWT); redirect to dashboard or last-visited area (e.g. SEO or ASO). |
| **Guard** | All SEO/ASO routes require an authenticated user; unauthenticated requests redirect to login. |
| **Logout** | Clear session and redirect to login (or public home). |

**v1:** Email/password or Firebase Auth; optional “Remember me.” No need for full SSO in v1.

---

## 2. SEO

**Purpose:** Web/search visibility: keywords, Search Console, GA4, and content optimization.

| Item | Description |
|------|--------------|
| **Entry** | After login: nav item “SEO” or “SEO Command Center” opens the SEO area. |
| **Main screens** | Dashboard or list view for SEO assets (e.g. sites, properties, keywords). Detail/editor for a selected property or keyword set. |
| **Key actions** | Connect Search Console / GA4 (if in scope); view rankings, impressions, clicks; run keyword research; optional content suggestions. |
| **Data** | SEO data can come from Google Search Console API, GA4, or internal pipeline; display in tables, charts, or cards. |
| **Docs** | See [SEO Command Center Flow](./SEO_COMMAND_CENTER_FLOW.md), [SEO GA4 Search Console Setup](./SEO_GA4_SEARCH_CONSOLE_SETUP.md), and business/feasibility specs as needed. |

**v1:** One main SEO view (dashboard or list); link to setup docs; minimal “connect property” and “view data” flows.

---

## 3. ASO

**Purpose:** App store optimization: rankings, keywords, metadata, and PDCA cycles for app listings.

| Item | Description |
|------|--------------|
| **Entry** | After login: nav item “ASO” or “ASO Command Center” opens the ASO area. |
| **Main screens** | Dashboard with Plan / Do / Check / Act; list of cases and clients; case detail; competitor gap; pipeline/run status. |
| **Key actions** | Create case; add client; run keyword/ranking pipeline; view rankings and metrics; update metadata drafts; track cycle and decisions. |
| **Data** | ASO data from DataForSEO, store APIs, BigQuery (rankings, metrics); workflow/state in Firestore (cycles, decisions, AI outputs). See [ASO Data Pipeline Architecture](./ASO_DATA_PIPELINE_ARCHITECTURE.md) and [ASO PDCA Improvement Plan](./ASO_PDCA_IMPROVEMENT_PLAN.md). |
| **Single create flow** | One “New Case” (or “Add Client”) popup/modal; created items appear in the list on the same page (e.g. cases list like clients list). |

**v1:** One ASO dashboard with Plan/Do/Check/Act sections; one create-case (and optionally add-client) popup; list of cases (and clients) on the page; link to pipeline/architecture docs.

---

## 4. App shell (high level)

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Logo | Nav (SEO, ASO, …) | User menu (Logout)      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   [If not logged in]  →  Login page                         │
│   [If logged in]      →  SEO or ASO (or default dashboard) │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- **Login** gates access; **SEO** and **ASO** are the main product areas after login.
- Nav and routing: e.g. `/login`, `/seo`, `/aso`, `/aso/cases`, etc., with auth guard on `/seo` and `/aso`.

---

## 5. Cross-references

| Topic | Doc |
|-------|-----|
| ASO data pipeline, v1 scope, API | [ASO Data Pipeline Architecture](./ASO_DATA_PIPELINE_ARCHITECTURE.md) |
| ASO PDCA, gaps, phases | [ASO PDCA Improvement Plan](./ASO_PDCA_IMPROVEMENT_PLAN.md) |
| SEO flow | [SEO Command Center Flow](./SEO_COMMAND_CENTER_FLOW.md) |
| SEO setup (GA4, Search Console) | [SEO GA4 Search Console Setup](./SEO_GA4_SEARCH_CONSOLE_SETUP.md) |
