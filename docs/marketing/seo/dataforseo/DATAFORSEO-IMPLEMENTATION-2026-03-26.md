# DataForSEO Mini Audit + Implementation

Date: 2026-03-26  
Scope: `https://www.deckbase.co/features`, `https://www.deckbase.co/about-us`  
Source: DataForSEO live endpoints (`on_page_instant_pages`, keyword volume/difficulty, ChatGPT scraper)

## Key Findings

### 1) Features heading hierarchy issue (critical)
- The page extracted multiple `h1` entries from testimonial author names.
- Main feature heading was not the single dominant `h1`.
- Impact: weaker topical clarity and lower confidence for indexing/classification.

### 2) Features metadata drift (high)
- `features` description/OG copy referenced old positioning ("learning analytics", "deck sharing") that no longer matches current page content.
- Impact: lower title/description-to-content consistency and weaker snippet relevance.

### 3) Opportunity keywords (high)
- `best flashcard app` has meaningful US demand and moderate difficulty.
- `spaced repetition app` also has meaningful demand and lower relative difficulty.
- `mcp flashcards` is niche and currently low/no measurable volume; better as supporting long-tail.

### 4) AI answer visibility gap (medium)
- ChatGPT scraper response for "best flashcard app for spaced repetition" did not mention Deckbase in sampled result.
- Impact: low GEO citation presence for commercial-comparison prompts.

## Implemented Changes

1. Enforced cleaner heading structure on features:
   - Converted testimonial author name markup from `h1` to non-heading text.
   - Promoted the core feature page heading to a single `h1`.

2. Updated `features` metadata to align with actual capabilities:
   - AI card creation
   - Template-based cards
   - CSV/Excel/Anki import
   - Cross-device workflow
   - Spaced repetition and MCP/API support

3. Adjusted top-of-page feature copy to include stronger intent alignment around:
   - "best flashcard app"
   - "spaced repetition app"

## Recommended Next Iteration

1. Add one concise comparison paragraph on `features`:
   - Why Deckbase vs generic flashcard tools for retention-heavy learners.

2. Add one proof section:
   - "Typical workflow" with 3 steps and expected outcome.

3. Run follow-up DataForSEO checks:
   - `serp_organic_live_advanced` for `best flashcard app`, `spaced repetition app`
   - `on_page_lighthouse` for `/features`
   - `ai_optimization_chat_gpt_scraper` with 2-3 query variants.

