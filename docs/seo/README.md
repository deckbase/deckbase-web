# SEO (website) docs

Docs in this folder cover **website SEO** for deckbase.co: action plans, audits, competitor pages, and DataForSEO MCP.

**Full index:** [../README.md](../README.md)  
**Tracked checklist:** [TODO.md](./TODO.md) · [IndexNow](./INDEXNOW.md) · [Cloudflare AI bots](./CLOUDFLARE-AI-BOTS.md)

---

## Repo scope (read this first)

**This repository (`deckbase-web`)** is the **Next.js** app (`app/`, `components/`). Several items in [ACTION-PLAN.md](./ACTION-PLAN.md) and [FULL-AUDIT-REPORT.md](./FULL-AUDIT-REPORT.md) apply here (e.g. `app/layout.js` schema, canonicals, `app/sitemap.js`, marketing routes).

**Other items in those files** refer to the **Flutter / mobile app repo** (e.g. `lib/main.dart`, `pubspec.yaml`, `assets/fonts/`, Flutter `web/manifest.json`, RevenueCat `kIsWeb` guards). Treat those as **mobile-track** tasks unless you merge repos.

| Doc | Notes |
| --- | --- |
| [ACTION-PLAN.md](./ACTION-PLAN.md) | Mixed Next.js + Flutter; use the table above to filter. |
| [FULL-AUDIT-REPORT.md](./FULL-AUDIT-REPORT.md) | Audit date 2026-03-11; “Stack” line conflates repos—prefer this README for scope. |
| [COMPETITOR-PAGES.md](./COMPETITOR-PAGES.md) | `/deckbase-vs-anki` and `/deckbase-vs-quizlet` exist under `app/`; `app/sitemap.js` already lists them. |
| [DATA_FOR_SEO_MCP_PROMPTS.md](./DATA_FOR_SEO_MCP_PROMPTS.md) | Prompt library for DataForSEO MCP; not repo-specific. |

---

## Canonical site URL (implementation)

Marketing URLs, `metadataBase`, sitemap, and JSON-LD use **`lib/site-url.js`**. Default is **`https://www.deckbase.co`**. Override with **`NEXT_PUBLIC_SITE_URL`** (see `.env.example`) for preview/staging hosts.
