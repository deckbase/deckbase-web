# ASO Listing-Based Analysis: Plan & Research

This doc outlines the flow and research for **doing ASO analysis based on current store listing data** (Google Play + App Store Connect), and how it connects to the existing pipeline.

---

## 1. Current State Summary

| Component | Status | Notes |
|-----------|--------|--------|
| **Store listing fetch** | ✅ Done | Google Play (title, short/full description) + App Store (app name, description, keywords, promotionalText) per locale. Shown on ASO dashboard; also passed into pipeline as `currentListingText`. |
| **Keyword discovery** | ✅ Done | Perplexity seeds → DataForSEO keyword suggestions (with search volume) → merged list. |
| **Claude filter** | ✅ Done | Filters to &lt;200 terms; uses `currentListingText` so Claude prefers keywords **not** already clearly in the listing. |
| **Opportunity scoring** | ✅ Done | Listing-based: placement (title/short/full, subtitle/keywords/description) + optional DataForSEO App Data rank → priority + note per store. |
| **DataForSEO App Data** | ✅ Integrated | Optional pipeline step: App Searches (Apple + Google) for app store SERP per keyword; rank merged into opportunity notes ("Rank #5" or "Not in top 30"). Enable "DataForSEO App Data (rankings)" when running. |
| **Metadata drafts (Step 5)** | ✅ Done | Claude-generated title, subtitle, and keywords from top opportunities; stored as `metadata_drafts` in Firestore. Generate/Regenerate on ASO page. |
| **Analysis history** | ✅ Done | Past pipeline runs loaded from Firestore; "Past analysis results" section with expandable runs. |
| **Competitors research** | 📋 Planned | DataForSEO Labs app_competitors; see [ASO_COMPETITORS_RESEARCH_PLAN.md](./ASO_COMPETITORS_RESEARCH_PLAN.md). |

Listing-based analysis is implemented: we analyze the listing (presence + placement per store) and score opportunities (high/medium/low with notes). Optional App Data adds rank per keyword; metadata drafts and history are available.

---

## 2. What “Listing-Based Analysis” Should Do

Goal: for each keyword in the shortlist, answer:

1. **Is it already in the listing?** (yes/no, and where)
2. **Where does it appear?** (title, subtitle, keywords field, short description, full description, promotional text)
3. **Is it an opportunity?** (e.g. high intent + not in listing, or only in description and could be moved to title/subtitle/keywords)
4. **What action to suggest?** (e.g. “Add to iOS keywords”, “Add to Android short description”, “Consider for subtitle”)

Store-specific context:

- **Google Play**  
  - Title (30 chars), Short description (80 chars), Full description (4000 chars).  
  - All are searchable; title and short description have highest impact.
- **App Store**  
  - Subtitle (30 chars), Keywords (100 chars comma-separated, no spaces), Description, Promotional text.  
  - Subtitle and keywords are heavily weighted for search; description less so.

So “analysis” = **keyword-in-listing check** + **placement detection** + **opportunity flag** + **actionable suggestion**, using the listing text we already have.

---

## 3. Proposed Flow (Listing-Based Analysis)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. INPUTS (already available)                                           │
│    • Current listing text (Android + iOS, en-US or first locale)        │
│    • Shortlist keywords (after Perplexity + DataForSEO + Claude filter) │
│    • Optional: search volume per keyword (from DataForSEO suggestions)   │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. NORMALIZE LISTING TEXT (per store)                                   │
│    • Android: title, shortDescription, fullDescription (concatenate)    │
│    • iOS:    appName, subtitle, keywords, description, promotionalText  │
│    • Lowercase, normalize spaces; keep separate fields for “where” check │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. KEYWORD PRESENCE & PLACEMENT (per keyword)                            │
│    • For each shortlist keyword:                                        │
│      - Normalize: lowercase, trim, collapse spaces                       │
│      - Check presence in each listing field (substring or word-boundary) │
│      - Record: inAndroidTitle, inAndroidShort, inAndroidFull,           │
│                inIosSubtitle, inIosKeywords, inIosDescription, etc.    │
│    • Derive: inListing (any), bestPlacement (highest-impact field used)  │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. OPPORTUNITY SCORING (rules-based + optional volume)                   │
│    • Opportunity = (not in listing) OR (only in low-impact field)        │
│    • Priority:                                                          │
│      - High: not in listing + has search volume                          │
│      - Medium: only in description (suggest move to title/subtitle/kw)   │
│      - Low: already in title/subtitle/keywords (maintain or A/B test)   │
│    • Optional: sort by search volume when available from DataForSEO     │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. OUTPUT (per keyword)                                                 │
│    • keyword, inListing, placement (e.g. "android_title", "ios_keywords")│
│    • opportunity (boolean), priority (high|medium|low)                    │
│    • note / suggestion (e.g. "Add to iOS keywords"; "Already in title") │
│    • search_volume (if available)                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

This can run **without** DataForSEO App Data. When App Data is added later, we can add a second dimension: “ranking outside top 10” for a keyword → extra signal for opportunity.

---

## 4. Research Notes

### 4.1 Keyword matching

- **Exact phrase vs. token:** Store search is typically token-based; “flashcard app” matches “flashcards” and “app” in description. For “presence” we can:
  - **Strict:** keyword phrase as substring (or word-boundary) in a field.
  - **Relaxed:** all words in keyword appear in the field (order-independent).
- Recommendation: start with **substring (case-insensitive)** in the concatenated field; then optionally check per-field for placement. Relaxed (all-words) can be a second pass to avoid false “missing” for variants.

### 4.2 Store limits (for later Step 5: metadata execution)

| Store    | Field           | Limit        |
|----------|-----------------|--------------|
| Google Play | Title          | 30 chars     |
| Google Play | Short description | 80 chars |
| App Store   | Subtitle       | 30 chars     |
| App Store   | Keywords       | 100 chars, comma-separated, no spaces |

These matter when we suggest “add to subtitle” or “add to keywords” so we don’t suggest impossible text.

### 4.3 DataForSEO App Data (implemented)

- **Purpose:** DataForSEO's [App Data API](https://dataforseo.com/apis/app-data-api) provides **App Searches** (SERP per keyword: which apps rank) for Google Play and App Store. We use it for live rankings for our app per keyword in app store search.
- **Benefit:** “High volume + not in top 10” = strong opportunity; “already top 3” = maintain.
- **Current:** Integrated in `lib/dataforseo-app.js`. Optional pipeline step: enable “DataForSEO App Data (rankings)” when running; fetches rank for up to 25 keywords (Apple + Google), merges into opportunity notes (“Rank #5 on Play” / “Not in top 30 on Play”). Same credentials as main DataForSEO (DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD).

### 4.4 SEO pipeline analogy

- **SEO:** Domain + keywords → fetch rankings (SERP) → opportunity = position &gt; 10 + volume.
- **ASO (listing-based):** Listing text + keywords → presence/placement → opportunity = not in listing or only in low-impact field.
- **ASO (with App Data):** Same as above + app ranking per keyword (DataForSEO App Searches) → opportunity = (not in listing OR rank &gt; 10) and volume. Enable “DataForSEO App Data (rankings)” in the pipeline.

---

## 5. Implementation Plan

### Phase 1 (current scope): Listing-based analysis

1. **Structured listing in pipeline**  
   In `runAsoPipeline`, keep fetching both stores but pass **structured** listing (per store, per field) into the new step, not only `currentListingText` string.  
   - e.g. `listingAndroid: { title, shortDescription, fullDescription }`, `listingIos: { appName, subtitle, keywords, description, promotionalText }` (en-US or first locale).

2. **Keyword presence + placement function**  
   New helper (e.g. in `lib/aso-pipeline-runner.js` or `lib/aso-listing-analysis.js`):
   - Input: one keyword, Android listing fields, iOS listing fields.
   - Output: `{ inListing, inAndroid, inIos, placementAndroid, placementIos, inAndroidTitle, inIosKeywords, ... }` (booleans / enum for placement).

3. **Opportunity scoring step**  
   Replace the stub:
   - For each keyword in `filteredList`, run the presence/placement helper.
   - Classify: **high** = not in listing (and optionally has volume), **medium** = only in description/long text, **low** = in title/subtitle/keywords.
   - Build `opportunities[]` with `keyword`, `inListing`, `placement`, `priority`, `note`, `search_volume` (if we carry it from DataForSEO step).

4. **Carry search volume**  
   DataForSEO suggestion step already gets volume per keyword; merge that into the shortlist (e.g. `Map<keyword, search_volume>`) and attach to each opportunity so we can sort by volume.

5. **Persist and UI**  
   Save `opportunity_mapping` with the new shape. ASO dashboard already shows “Opportunities” table; extend columns to show placement, priority, and note.

### Phase 2 (done)

- **DataForSEO App Data API:** Implemented in `lib/dataforseo-app.js`. App Searches (task_post → poll tasks_ready → task_get/advanced) for Apple and Google; rank merged into opportunity scoring and notes.
- Step 5 (metadata drafts): Done; Claude-generated title/subtitle/keywords from top opportunities; stored as `metadata_drafts`.

---

## 6. Summary

- **Analysis** = for each shortlist keyword: (1) is it in the listing? (2) where? (3) is it an opportunity? (4) what to do?
- **Flow:** Listing data (already fetched) → normalize per store → keyword presence & placement → opportunity scoring (rules + optional volume) → output with note/suggestion.
- **No new APIs required** for this; we only need to use the existing listing payload in a structured way and add the presence/placement + scoring logic.
- **Competitors:** See [ASO_COMPETITORS_RESEARCH_PLAN.md](./ASO_COMPETITORS_RESEARCH_PLAN.md) for the planned competitors research feature (DataForSEO Labs app_competitors).
