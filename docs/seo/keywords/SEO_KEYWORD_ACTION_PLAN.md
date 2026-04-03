# SEO keyword action plan (Deckbase web)

**Date:** 2026-03-29  
**Inputs:** [KEYWORD_RESEARCH_RELATED_KEYWORDS_REPORT.md](./KEYWORD_RESEARCH_RELATED_KEYWORDS_REPORT.md) (DataForSEO `related_keywords`), existing marketing routes in `deckbase-web`.

---

## Goals

1. **Capture high-intent queries** around AI flashcard creation (maker, generator, PDF, free, app).
2. **Support Anki/alternative journeys** with clear landing pages and internal links — not duplicate thin URLs.
3. **Measure** in Google Search Console and iterate quarterly.

---

## Priority matrix

| Priority | Theme | Action | Primary surfaces | Success signal |
|----------|--------|--------|------------------|----------------|
| **P0** | AI flashcard head terms | Ensure `/ai-flashcards` titles, H1, lead, and FAQ mention **flashcard maker / generator**, **PDF**, **app**, **free tier** where accurate | `/ai-flashcards`, homepage meta (already broad) | Impressions for queries containing “flashcard” + “ai” / “pdf” |
| **P1** | PDF + free long-tail | Add FAQ entries: PDF to flashcards, free vs paid limits, best-for-students framing (honest vs competitors) | `/ai-flashcards`, `/features`, `/premium` as needed | Clicks on long-tail FAQ queries |
| **P2** | Anki & alternatives | Keep `/anki-alternatives`, `/deckbase-vs-anki`, `/deckbase-vs-remnote` internally linked from `/ai-flashcards` and Resources | Those routes + `/resources` | Impressions for “anki alternative*”, “deckbase vs” |
| **P3** | Reddit / forum modifiers | Optional: one **community** FAQ (“what do people use for…”) linking to official docs — no astroturfing | Blog/FAQ only if you add a real piece | Brand + reddit queries (low volume) |
| **P4** | MCP + flashcards | Already covered on `/mcp` + `/resources/mcp`; keep cross-links from AI page | `/mcp`, `/resources/mcp` | MCP-related queries in GSC |

---

## Concrete tasks (checklist)

- [ ] **Review `/ai-flashcards`** copy against related-keyword themes: *maker, generator, PDF, free, app, Anki bridge* (factual only).
- [ ] **Expand FAQ** on `/ai-flashcards` with 2–4 questions drawn from related strings (e.g. PDF, free generator, mobile/app) — unique answers, no stuffing.
- [ ] **Internal links:** From `/ai-flashcards` → `/anki-alternatives`, `/deckbase-vs-anki`, `/download` (already partially present — verify).
- [ ] **GSC:** Add filter for queries containing `flashcard`, `anki`, `pdf`, `quizlet` — monthly review.
- [ ] **Quarterly:** Re-run `dataforseo_labs_google_related_keywords` for seeds `ai flashcards` and `anki alternatives` (US, en, depth 2); append summary to this doc or a dated addendum.

---

## What not to do

- Do not **keyword-stuff** meta keywords tags or duplicate city-style doorway pages.
- Do not claim **“best”** or **“free unlimited”** without matching product reality and legal/compliance review.

---

## Owners and tooling

- **Content / SEO:** Marketing + engineering review for factual accuracy (AI limits, plans, MCP availability).
- **Tools:** Google Search Console, DataForSEO MCP (credit-conscious), optional IndexNow for large net-new URLs only.

---

## Revision history

| Date | Change |
|------|--------|
| 2026-03-29 | Initial plan from related_keywords research. |
