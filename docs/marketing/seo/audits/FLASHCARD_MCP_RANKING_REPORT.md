# Flashcard + MCP — SEO ranking report

**Date:** 2026-03-29  
**Goal:** Improve visibility for queries like **“flashcard mcp”** and related terms, with **deckbase.co** as the preferred destination.  
**Data sources:** DataForSEO MCP (live), `deckbase-web` codebase review.

---

## 1. Executive summary

- **Live Google SERP (US, `flashcard mcp`):** deckbase.co was **not in the top 20** organic results at snapshot time. The page is dominated by **GitHub MCP repos**, **MCP directories** (e.g. PulseMCP, MCP Market), **Anki/MCP** integrations, **Reddit**, and **LangDB**-style listings.
- **Search demand:** Keyword databases show **very low or sparse volume** for exact phrases like `flashcard mcp` — typical for long-tail developer queries. **Brand query `deckbase`** has meaningful volume (~480/mo US in Labs); live SERP shows **www.deckbase.co at position 1** for `deckbase`.
- **Product:** Deckbase **ships hosted MCP** (`POST /api/mcp`, Pro/VIP). This matches the intent of the SERP (tools + protocol), not only generic “AI flashcards.”
- **Site:** A **primary setup URL** (`/mcp`) and a **keyword-rich article** (`/resources/mcp`) already exist, are in the sitemap, and are linked internally. **`/mcp` metadata** is setup-oriented and does not repeat **“flashcard”** in the title/description; **`/resources/mcp`** carries **flashcard + MCP** phrasing.

---

## 2. DataForSEO (live) — SERP snapshot

**Query:** `flashcard mcp`  
**Engine / market:** Google organic, United States, English  
**Depth sampled:** top organic results (first page +).

**Observed pattern (illustrative):**

| Rank (organic) | Type | Notes |
|----------------|------|--------|
| 1 | Reddit | UGC, “Model Context Protocol” + Anki |
| 2 | GitHub | Repo named / themed `flash-card` + MCP |
| 3 | Directory | MCP server listing (e.g. PulseMCP) |
| 4 | Marketplace | MCP Market–style listing |
| 5–7 | Anki ecosystem | ankiweb.net, ankimcp.ai, etc. |
| 8+ | Registries / dev tools | LangDB, Augment, mcpservers.org, etc. |

**SERP noise:** Google may inject **Popular products** or unrelated matches where **“MCP”** is confused with **music gear (MPC)** or **MCAT** flashcards. Clear **Model Context Protocol** wording on your own pages reduces ambiguity for blue-link results.

**deckbase.co:** Not observed in the sampled top set for `flashcard mcp`.

---

## 3. DataForSEO (live) — keywords & domain signals

| Signal | Result (snapshot) |
|--------|-------------------|
| `deckbase` (US, Labs overview) | ~**480** monthly searches; **navigational** intent; strong brand |
| `flashcard mcp` / close variants | Often **omitted or near-zero** in Ads/Labs — **niche** |
| Ranked keywords (`deckbase.co`, filter keyword `mcp`) | **No rows** returned — **no established rankings** yet for MCP terms in Labs |
| Live SERP `deckbase` | **#1** — **https://www.deckbase.co/** |

---

## 4. Codebase audit (deckbase-web)

### 4.1 Hosted MCP (product)

- **HTTP MCP:** `app/api/mcp/route.js` — JSON-RPC, Bearer API key or OAuth.
- **Docs (internal reference):** `docs/public/MCP.md`, `lib/mcp-handlers.js`, `mcp-server/`.
- **Subscription:** MCP usage aligned with Pro/VIP (see `docs/subscription/SUBSCRIPTION_FEATURES_CHECK.md`).

### 4.2 Public URLs relevant to SEO

| Path | File(s) | Purpose |
|------|-----------|---------|
| `/mcp` | `app/mcp/page.js`, `app/mcp/layout.js` | Main **setup** page: Cursor, VS Code, Claude Code, API URL, OAuth pointers |
| `/resources/mcp` | `app/resources/mcp/page.js` | **Article:** “Deckbase MCP for Flashcards…”, comparison table, keywords incl. flashcard MCP |
| `/docs/mcp-server` | `app/docs/mcp-server/` | Technical **reference** |

**Metadata (high level):**

- **`/mcp` (`app/mcp/layout.js`):** Title *“MCP — Connect AI tools to Deckbase”*; description mentions **Model Context Protocol**, not **flashcard** in the primary meta line. Canonical `/mcp`, breadcrumb JSON-LD.
- **`/resources/mcp`:** Title and description explicitly include **flashcards**, **MCP**, **Model Context Protocol**; article Open Graph; keywords array includes `flashcard MCP`, `Model Context Protocol flashcards`, etc.

### 4.3 Internal linking & discovery

- **Nav:** `components/NavBar.js` — **MCP** → `/mcp`
- **Footer:** `components/Footer.js` — link to `/resources/mcp`
- **Sitemap metadata:** `lib/sitemap-metadata.js` includes `/mcp`, `/docs/mcp-server`, `/resources/mcp`

### 4.4 Gap vs ranking goal

- **Single canonical “flashcard MCP” landing story:** Nav and many docs point users to **`/mcp`**, but **SEO-heavy “flashcard” phrasing** lives mainly on **`/resources/mcp`**. Consolidating **head term signals** (title/description/H1) on **`/mcp`** or cross-linking prominently can align crawler and user entry points.

---

## 5. Recommendations (prioritized)

1. **Directories & registries** — Ensure Deckbase is listed and up to date on major **MCP directories** (same class as PulseMCP, MCP Market, mcpservers.org) with a consistent description and link to **`https://www.deckbase.co/mcp`** or **`/resources/mcp`** as appropriate.
2. **Align `/mcp` metadata with query** — Optionally update **`app/mcp/layout.js`** `title`, `description`, and Open Graph so the **primary** setup URL explicitly includes **flashcards** + **Model Context Protocol** (without keyword stuffing).
3. **Cross-link** — On **`/mcp`**, add a clear block: “Why Deckbase MCP for flashcards?” linking to **`/resources/mcp`** (and/or key FAQ).
4. **Earn relevant mentions** — Short, useful posts in **r/mcp**, GitHub discussions, or dev threads linking to the setup or article page (natural links, not spam).
5. **Measure** — In **Google Search Console**, monitor queries containing `mcp` and `flashcard` and the performance of **`/mcp`** vs **`/resources/mcp`**.
6. **Expectations** — **#1** for `flashcard mcp` competes with **GitHub**, **Reddit**, and **directories**; aim for **sustained page-one** and **correct brand capture** first, then push position.

---

## 6. Optional follow-ups (not done in this report)

- [ ] Patch **`app/mcp/layout.js`** (and matching OG) for stronger **flashcard + MCP** alignment.
- [ ] Re-run **DataForSEO** SERP after changes (quarterly or after major launches).
- [ ] Add this report to **`docs/seo/README.md`** index table if you want it in the doc hub.

---

## 7. Revision history

| Date | Change |
|------|--------|
| 2026-03-29 | Initial report (DataForSEO live + codebase audit). |
