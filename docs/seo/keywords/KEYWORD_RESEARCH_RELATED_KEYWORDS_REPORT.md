# Keyword research report — Related Keywords (DataForSEO live)

**Date:** 2026-03-29  
**Tool:** `dataforseo_labs_google_related_keywords` (DataForSEO Labs)  
**Market:** United States · English (`en`)  
**Purpose:** Surface **“Searches related to”** style terms for Deckbase positioning (AI flashcards, Anki migration, alternatives).

---

## 1. Why this endpoint

| Endpoint | What it returns | Best for |
|----------|-----------------|----------|
| **`dataforseo_labs_google_keyword_ideas`** | Keywords in **similar product categories** to seeds | Category expansion — can be **noisy** when seeds include broad tokens like “AI” |
| **`dataforseo_labs_google_related_keywords`** | Keywords found via **depth-first crawl** of Google’s **related searches** graph | **Lexical / SERP-adjacent** discovery — usually **closer to real user queries** for a seed |

This report focuses on **related keywords** only. For a prior note on **keyword ideas** noise with seeds like `ai flashcards` + `anki`, see [FLASHCARD_MCP_RANKING_REPORT.md](./FLASHCARD_MCP_RANKING_REPORT.md).

---

## 2. API parameters (this run)

| Parameter | Seed A: `ai flashcards` | Seed B: `anki alternatives` |
|-----------|-------------------------|----------------------------|
| `location_name` | United States | United States |
| `language_code` | en | en |
| `depth` | 2 | 2 |
| `limit` | 60 | 60 |
| `order_by` | `keyword_data.keyword_info.search_volume,desc` | same |

**Status:** `20000` OK for both requests.

---

## 3. Results — seed: `ai flashcards`

**Rows returned:** 26 (after deduplication in the response graph; top of list sorted by US monthly search volume).

These terms are **directly about flashcard creation and AI**, unlike many **keyword ideas** runs that drift into generic “AI tools.”

| Related keyword (idea) | US volume / mo | KD | Depth | Sample “related” strings (subset) |
|-------------------------|----------------:|----|-------|-----------------------------------|
| flashcard maker | 33,100 | 48 | 1 | flashcard maker free; … from pdf; … ai; … printable |
| flash card generator | 33,100 | 43 | 2 | … free; ai flashcard generator free; … ai |
| free flashcard maker | 8,100 | 28 | 2 | … online; … from pdf; best free … |
| flashcard maker free | 8,100 | 27 | 2 | ai flashcard maker free; … printable; … from pdf |
| flashcard maker online | 2,400 | 50 | 2 | free … online; flash card generator; ai flashcard maker |
| **ai flashcards** (seed) | **1,600** | **38** | — | ai flashcards generator; ai flashcard generator free; … from pdf free; … from pdf |
| flashcard maker printable | 1,600 | 26 | 2 | … pdf; … free; editable template |
| ai flashcards generator | 1,000 | 14 | 1 | … free; … from pdf free; … online |
| ai flashcard generator free | 390 | 31 | 1 | best … free; … pdf; … unlimited |
| anki flashcard maker | 390 | 45 | 2 | … free; … online; … from pdf; … app |
| flashcard maker ai | 320 | 32 | 2 | … free; … online free |
| flashcard maker app | 260 | 63 | 2 | … free; … iphone |
| ai flashcard maker free | 260 | 37 | 2 | … online; … pdf; … reddit |
| flashcard maker from pdf | 210 | 33 | 2 | free … from pdf; … online |
| best ai flashcard generator | 140 | 26 | 2 | … free; … reddit; … online |
| pdf to flashcards free | 110 | 34 | 2 | ai flashcard generator from pdf free; … reddit; … ai |
| ai flashcard generator from pdf free | 70 | 28 | 1 | … reddit; … free |

**Competitor names appearing in the graph (for positioning / comparison content):** e.g. Revisely, NoteGPT — useful for honest comparison tables, not for trademark misuse in meta keywords.

**Takeaways**

- **Head terms** cluster on **flashcard maker / generator** + **free** + **pdf** + **ai** — aligns with Deckbase’s product story.
- **Modifier** opportunities: **reddit**, **free unlimited**, **from pdf**, **iphone/app**, **anki flashcard maker** (bridge to Anki page).

---

## 4. Results — seed: `anki alternatives`

The crawl surfaces **Anki ecosystem** and **comparison** language; volumes are smaller but **intent is strong** for Deckbase’s existing comparison content.

| Related keyword | US volume / mo | Notes |
|-----------------|----------------:|--------|
| anki download | 12,100 | Nav/commercial — not “alternatives” but same user journey |
| **anki alternatives** (seed) | **140** | Commercial / informational |
| anki vs remnote | 50 | Informational — you have `/deckbase-vs-remnote` |
| anki alternatives reddit | 40 | Informational / forums |
| anki alternative ios | 20 | Commercial |
| anki alternatives free | 10 | Commercial |
| anki alternative ios reddit | 10 | Informational |

**Sample “related” strings** attached to seeds in the response included:  
`anki alternatives reddit`, `anki alternatives free`, `anki alternative ios`, `alternatives to anki medical school`, `anki vs remnote`, `anki vs notion`, `free alternative to anki reddit`, etc.

**Takeaways**

- **“Anki alternatives”** is low volume but **high relevance** — support with `/anki-alternatives`, `/deckbase-vs-anki`, and FAQs.
- **Medical school** and **iOS** variants are explicit long-tail FAQ opportunities.

---

## 5. Comparison: related vs keyword ideas (same topic)

For seeds like **`ai flashcards`**, **`dataforseo_labs_google_keyword_ideas`** often returns **generic AI head terms** (e.g. “character ai”, “ai image generator”) when sorted by volume. **`related_keywords`** stayed **on-topic** for the same theme.

**Recommendation:** Use **`related_keywords`** + **`keyword_suggestions`** for copy and FAQ expansion; use **`keyword_ideas`** with **strict filters** or **narrow seeds** only when you need category expansion.

---

## 6. Data source and refresh

- **Source:** DataForSEO (live), March 2026.
- **Refresh:** Re-run quarterly or after major product launches; align with **Google Search Console** query report.

---

## 7. Related docs

- [SEO_KEYWORD_ACTION_PLAN.md](./SEO_KEYWORD_ACTION_PLAN.md) — prioritized next steps from this research.
- [FLASHCARD_MCP_RANKING_REPORT.md](./FLASHCARD_MCP_RANKING_REPORT.md) — MCP + flashcard SERP context.
