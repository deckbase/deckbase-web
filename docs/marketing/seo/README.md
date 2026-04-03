# SEO docs — deckbase.co

Website SEO for deckbase.co (Next.js, `deckbase-web` repo).

> **Start here:** [TODO.md](./TODO.md) — living checklist of open/done items.

> **Rule:** Only `README.md` and `TODO.md` live directly in this folder. Every other file must go inside a named subfolder.

---

## STRICT RULE — for all AI agents and contributors

**`TODO.md` is the single source of truth for all SEO tasks. This rule is non-negotiable.**

- **NEVER create a new `TODO*.md` file** anywhere under this directory tree.
- **NEVER create a new `ACTION-PLAN*.md`** or any file whose primary content is a task list or prioritised work list.
- When an audit, keyword report, ranking analysis, or any research produces open tasks → **add them to `TODO.md`**, not to a new file.
- Research output (reports, battle cards, keyword universes, etc.) may be saved as new files in the appropriate subfolder. Only the *task list* extracted from that research belongs in `TODO.md`.
- If you find an existing file in a subfolder that duplicates tasks already in `TODO.md`, consolidate into `TODO.md` and remove the duplicate — never maintain two task lists in parallel.

**Why:** Multiple scattered TODO/action-plan files caused tasks to be lost or duplicated. One file, one list.

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

**MCP ranking analysis** → [audits/FLASHCARD_MCP_RANKING_REPORT.md](./audits/FLASHCARD_MCP_RANKING_REPORT.md)

**Competitor pages** (`/deckbase-vs-*`) → [competitor-pages/COMPETITOR-PAGES.md](./competitor-pages/COMPETITOR-PAGES.md) · [competitor-pages/COMPETITOR-PAGES-AUDIT.md](./competitor-pages/COMPETITOR-PAGES-AUDIT.md)

**Using DataForSEO MCP** → [dataforseo/DATA_FOR_SEO_MCP_PROMPTS.md](./dataforseo/DATA_FOR_SEO_MCP_PROMPTS.md)

**Publishing a blog post** → [ghost/README.md](./ghost/README.md)

**Technical configs** → [technical/](./technical/) (image optimization, IndexNow, Cloudflare AI bots)

**Competitive intelligence** → [competitive/deckbase/](./competitive/deckbase/) (battle cards, pricing, review mining)
