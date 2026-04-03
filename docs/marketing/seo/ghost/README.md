# Ghost blog (content SEO)

The **Ghost** publication is separate from this Next.js app. Use it for **long-form content** and queries that do not map cleanly to a single marketing route. Posts should **link to deckbase.co** (canonical product URLs) using the same origin as production: **`https://www.deckbase.co`** unless you override with `NEXT_PUBLIC_SITE_URL` / `GHOST_DECKBASE_SITE_URL`.

**Related:** [SEO_KEYWORD_ACTION_PLAN.md](../keywords/SEO_KEYWORD_ACTION_PLAN.md) (themes: AI flashcards, PDF, Anki alternatives).

---

## Cursor MCP (`@fanyangmeng/ghost-mcp`)

Configured in **user** MCP settings (not necessarily `.cursor/mcp.json` in this repo). Required environment:

| Variable | Notes |
| -------- | ----- |
| `GHOST_API_URL` | Site origin only, e.g. `https://yourname.ghost.io` — no `/ghost` path. |
| `GHOST_ADMIN_API_KEY` | **Full** Admin API key: `24-hex-id` **`:`** `64-hex-secret`. Not the Content API key; not only the short id segment. |
| `GHOST_API_VERSION` | Optional; e.g. `v5.0` |

If the MCP fails on startup with `@tryghost/admin-api` “key must have format `{A}:{B}`”, the key is incomplete — copy the entire key from Ghost **Settings → Integrations → Custom integration → Admin API key**.

---

## Repo script (Admin API)

For scripted publishes without MCP:

- **Script:** [`scripts/ghost-publish-initial-post.mjs`](../../../scripts/ghost-publish-initial-post.mjs)
- **Command:** `npm run ghost:publish-initial`
- **Env:** `.env.example` — `GHOST_URL`, `GHOST_ADMIN_API_KEY`, optional `GHOST_POST_STATUS` (`draft` default, `published` to go live), optional `GHOST_DECKBASE_SITE_URL`
- **Dry run:** `node scripts/ghost-publish-initial-post.mjs --dry-run`

The script and MCP both use the same Ghost Admin API; avoid duplicating the same slug if you run both.

---

## Publishing cadence (SEO)

Search engines reward **helpful, specific content**, not a fixed daily schedule. **One post per day is not required** and is only sensible if each piece is genuinely distinct and well developed.

- **Default stance:** Prefer **quality over volume**. For a small product blog, **about 1–2 solid posts per week** (or **2–4 per month**) is often more sustainable than daily publishing.
- **When to publish more:** Only when you have **new angles** (new keywords, FAQs, comparisons) and are not recycling the same topic under different titles.
- **Risks of posting too often:** Thin or rushed pages, **keyword cannibalization** (several posts competing for the same query), and ongoing burden to keep facts and links accurate.
- **Measure:** Align topics with [SEO_KEYWORD_ACTION_PLAN.md](../keywords/SEO_KEYWORD_ACTION_PLAN.md) and review **Google Search Console** quarterly—not a fixed posts-per-day quota.

---

## After publishing a post

1. In Ghost: **post settings** — meta title, meta description, canonical (if needed), tags, feature image, social cards.
2. **Search:** Add or verify the **Ghost hostname** in Google Search Console if the blog uses its own domain or subdomain.
3. **Internal links:** From deckbase.co, link to high-value Ghost URLs when you add a Resources / Blog entry (keeps crawl paths clear).

---

## Revision history

| Date | Change |
|------|--------|
| 2026-03-29 | Initial doc (MCP, script, post-publish checklist); publishing cadence (quality vs daily volume, cannibalization, GSC). |
