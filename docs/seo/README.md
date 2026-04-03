# SEO docs — deckbase.co

Website SEO for deckbase.co (Next.js, `deckbase-web` repo).

> **Start here:** [TODO.md](./TODO.md) — living checklist of open/done items.

---

## Repo scope

**`deckbase-web`** = Next.js app (`app/`, `components/`, `lib/`). Items referencing `lib/main.dart`, `pubspec.yaml`, or Flutter-specific files belong to the **mobile repo**, not here.

**Canonical URL** — set in `lib/site-url.js` (`https://www.deckbase.co`). Override via `NEXT_PUBLIC_SITE_URL` for staging.

---

## Folder map

| Folder / File | What's inside |
|---|---|
| [TODO.md](./TODO.md) | **Living checklist** — open and completed SEO tasks |
| [action-plans/](./action-plans/) | Strategic action plans (historical snapshots) |
| [audits/](./audits/) | Point-in-time audit reports and ranking analyses |
| [keywords/](./keywords/) | Keyword research reports and keyword action plans |
| [technical/](./technical/) | Technical SEO configs (images, IndexNow, Cloudflare AI bots) |
| [competitor-pages/](./competitor-pages/) | Competitor comparison pages (`/deckbase-vs-anki`, etc.) |
| [dataforseo/](./dataforseo/) | DataForSEO MCP prompts and implementation notes |
| [competitive/](./competitive/) | Deep competitive intelligence (battle cards, matrix, review mining) |
| [ghost/](./ghost/) | Ghost CMS blog — MCP setup, publish workflow, SEO checklist |
| [mobile/](./mobile/) | App store listings (iOS, Android) |

---

## Quick links by task

**Running an audit** → [audits/FULL-AUDIT-REPORT.md](./audits/FULL-AUDIT-REPORT.md)

**Keyword strategy** → [keywords/SEO_KEYWORD_ACTION_PLAN.md](./keywords/SEO_KEYWORD_ACTION_PLAN.md) · [keywords/KEYWORD_RESEARCH_RELATED_KEYWORDS_REPORT.md](./keywords/KEYWORD_RESEARCH_RELATED_KEYWORDS_REPORT.md)

**AI/GEO readiness** → [audits/GEO-ANALYSIS.md](./audits/GEO-ANALYSIS.md)

**Competitor pages** (`/deckbase-vs-*`) → [competitor-pages/COMPETITOR-PAGES.md](./competitor-pages/COMPETITOR-PAGES.md) · [competitor-pages/COMPETITOR-PAGES-AUDIT.md](./competitor-pages/COMPETITOR-PAGES-AUDIT.md)

**Using DataForSEO MCP** → [dataforseo/DATA_FOR_SEO_MCP_PROMPTS.md](./dataforseo/DATA_FOR_SEO_MCP_PROMPTS.md)

**Publishing a blog post** → [ghost/README.md](./ghost/README.md)

**Technical configs** → [technical/](./technical/) (image optimization, IndexNow, Cloudflare AI bots)

**Competitive intelligence** → [competitive/deckbase/](./competitive/deckbase/) (battle cards, pricing, review mining)
