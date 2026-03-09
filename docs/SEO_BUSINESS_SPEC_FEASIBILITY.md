# Feasibility: Business SEO Pipeline & pSEO Spec

**Short answer: Yes, it’s feasible.** The doc aligns with the current stack; the main work is wiring Step 4 → Step 5 and adding the pSEO build/report layer.

---

## 1. What Already Matches the Doc

| Doc requirement | Current state |
|-----------------|----------------|
| **Zero-subscription stack** | ✅ DataForSEO (volume, rankings), GSC + GA4, Firecrawl, Perplexity |
| **Data persistence** | ✅ Firebase (`seo_snapshots`) for keyword volume and rankings |
| **Click-to-run pipeline** | ✅ `POST /api/seo/pipeline` with Overview → Keyword pulse → Rankings → (mapping) → Audit |
| **Overview refresh** | ✅ 30-day GA4 + GSC |
| **Keyword pulse** | ✅ DataForSEO search volume (+ difficulty/CPC in response) |
| **Rankings pulse** | ✅ DataForSEO SERP API, top 100, domain + keyword list |
| **SERP opportunity mapping** | ✅ Done in UI: merge volume + rankings, flag “Yes” (high volume, not top 10) |
| **Technical audit** | ✅ Firecrawl scrape + title, description, H1/H2, word count, issues |
| **Claude in codebase** | ✅ `@anthropic-ai/sdk` used elsewhere (cards, wizard); can add Haiku for SEO |

---

## 2. Gaps to Implement (in order)

### A. Step 4 → Step 5 hand-off (high impact, medium effort)

**Doc:** Step 4 flags “Yes” opportunities; Step 5 audits the **associated URL** for that keyword (or triggers pSEO if no page exists).

**Current:** Pipeline runs one global `auditUrl` (e.g. homepage). SERP opportunities are computed in the UI only; no keyword→URL or keyword→“no page” hand-off.

**Needed:**

1. **Keyword → URL mapping**  
   - Store in Firestore or config: e.g. `"deckbase vs anki"` → `https://deckbase.co/compare/anki`.  
   - If a keyword has no mapping → treat as “no page” and feed into pSEO trigger.

2. **Pipeline change**  
   - After rankings (Step 3), compute “Yes” opportunities in the pipeline (same logic as UI).  
   - For each “Yes” opportunity:  
     - If mapped URL exists → add to “audit list”.  
     - If no mapping → add to “pSEO list” (keyword + optional seed URL).  
   - Step 5:  
     - Run Firecrawl technical audit for each URL in the audit list (existing audit logic).  
     - For each item in the pSEO list → call “pSEO build” (see below).

3. **Optional: performance / “significant lags”**  
   - Doc mentions slow loading. Can add later via PageSpeed/Lighthouse API or a simple timing check; not required for first version.

**Feasibility:** ✅ Straightforward: one mapping store + pipeline logic + loop over audits.

---

### B. pSEO trigger & content generation (high impact, higher effort)

**Doc:** When there’s no page for a keyword, generate a “high-utility” page (Comparison Hub, Pricing Calculator, Persona page, etc.) using a PRD and Claude.

**Needed:**

1. **Model choice**  
   - Use **Claude 3.5 Haiku** (or 4.5 Haiku when available) for bulk SEO/pSEO generation to keep cost down.  
   - Already have Anthropic SDK; add a small `lib/claude-seo.js` (or similar) that calls Haiku with a fixed system prompt + PRD + keyword.

2. **Page registry / templates**  
   - Define **template types**: e.g. Comparison Hub, Pricing Calculator, Persona Landing, FAQ-only.  
   - Each type has a **Next.js route** (e.g. `/compare/[slug]`, `/for/[persona]`, `/pricing-calculator`) and a **content shape** (title, meta, sections, FAQ, etc.).  
   - Store generated content in Firestore (e.g. `pseo_pages`): `keyword`, `slug`, `templateType`, `content` (JSON), `generatedAt`, `sourceRunId`.

3. **Generation flow**  
   - Input: keyword (e.g. “Deckbase vs Anki”) + template type (e.g. comparison).  
   - Prompt: PRD + “Generate content for this keyword and template; output JSON with title, description, sections, FAQ, comparison rows, etc.”  
   - Claude Haiku returns structured JSON → save to Firestore; front-end reads from Firestore (or a generated static payload) and renders the existing template.  
   - No need to generate raw HTML in the first version; JSON + existing React components is enough.

**Feasibility:** ✅ Feasible. Main work: template definitions, prompt design, and Firestore schema. No new infra.

---

### C. pSEO output layer (comparison tables, calculators, FAQ, schema)

**Doc:** Interactive comparison tables, pricing calculators, FAQ with schema markup, persona landings.

**Current:** Not built for SEO yet; can reuse existing UI patterns (tables, forms, accordions).

**Needed:**

1. **Comparison Hub**  
   - Dynamic route + component: e.g. `/compare/[competitor]`.  
   - Data from Firestore (or API) for that slug; table + prose.  
   - Claude fills rows (e.g. “Deckbase vs Anki” comparison points).

2. **Pricing calculator**  
   - Route + component: inputs (e.g. study hours saved), output “ROI” or time saved.  
   - Copy and defaults can be Claude-generated; logic is fixed in code.

3. **FAQ + schema**  
   - Reusable FAQ component; JSON-LD (FAQPage schema) from the same content.  
   - Claude generates Q&A pairs; component renders them and the script.

4. **Persona pages**  
   - e.g. `/for/medical-students`.  
   - Template + content from Firestore; same pattern as comparison.

**Feasibility:** ✅ Standard Next.js + React; content from Firestore/API; schema is a small addition.

---

### D. Report artifact

**Doc:** “Interactive HTML report of results” for the pipeline run.

**Options:**

- **Option 1:** Extend the existing SEO dashboard: add a “Last run report” section that shows Overview + SERP opportunities + Audit results + list of pSEO items triggered (with links to generated pages). No separate HTML file.  
- **Option 2:** Add an export (e.g. “Download report”) that generates an HTML file (or PDF via a library) from the same run data.  
- **Option 3:** Dedicated report route, e.g. `/dashboard/admin/seo/report/[runId]`, that renders the run summary and links.

**Feasibility:** ✅ All options are feasible; choose based on whether business needs a shareable file or an in-app view is enough.

---

## 3. Suggested implementation order

1. **Phase 1 – Connect Step 4 and Step 5**  
   - Add keyword→URL mapping (config or Firestore).  
   - In pipeline: compute “Yes” opportunities, split into “audit” vs “pSEO” lists.  
   - Step 5: run Firecrawl audit for each URL in the audit list; persist results.  
   - No new pages yet; just pipeline + mapping + multi-URL audit.

2. **Phase 2 – pSEO trigger (one template)**  
   - Pick one template (e.g. Comparison Hub).  
   - Add Firestore collection for pSEO pages; add `lib/claude-seo.js` (Haiku).  
   - Pipeline: for each “pSEO” keyword, call Claude to generate content, save to Firestore.  
   - One dynamic route (e.g. `/compare/[slug]`) that reads from Firestore and renders the comparison template.

3. **Phase 3 – More templates & report**  
   - Add Pricing Calculator, Persona, FAQ-focused templates.  
   - Add report view or export (dashboard section or HTML/PDF download).

4. **Phase 4 (optional)**  
   - Performance checks (e.g. Core Web Vitals) in the audit step.  
   - 4.5 Haiku when available; switch model in `lib/claude-seo.js`.

---

## 4. Summary table

| Item | Feasible? | Notes |
|------|-----------|--------|
| Claude 3.5/4.5 Haiku for SEO | ✅ | Use existing Anthropic SDK; new helper + env key |
| All results in Firebase | ✅ | Already for volume/rankings; add pSEO + run metadata |
| Step 4 → Step 5 data hand-off | ✅ | Mapping store + pipeline logic |
| Audit per flagged URL | ✅ | Loop over URLs; existing Firecrawl audit |
| pSEO trigger when no page | ✅ | Keyword→URL “missing” → Claude + template |
| Comparison / Calculator / FAQ / Persona | ✅ | Next.js routes + Firestore-backed content |
| Interactive report | ✅ | Dashboard section or export |

**Conclusion:** The business doc is feasible with the current stack. The critical path is: **mapping + pipeline hand-off (Phase 1)** then **one pSEO template + Haiku (Phase 2)**. After that, the rest is more templates and report formatting.

---

## 5. Where pSEO should live: blog vs dedicated routes

**Recommendation: use dedicated pSEO routes, not the blog.**

| Use | Why |
|-----|-----|
| **Dedicated sections by intent** | Clear URLs for search (“Deckbase vs Anki” → `/compare/anki`). pSEO is template-driven and evergreen; it doesn’t need a “blog” feel or date-based listing. |
| **Blog only when it’s editorial** | Reserve `/blog` for human-written, narrative, or time-sensitive posts (e.g. “How we built X”, “2025 roadmap”). Mixing programmatic comparison pages into the blog dilutes both. |

### Suggested URL structure

| pSEO type | Route | Example |
|-----------|--------|---------|
| **Comparison** | `/compare/[slug]` | `/compare/anki`, `/compare/quizlet` |
| **Persona / audience** | `/for/[persona]` | `/for/medical-students`, `/for/law-students` |
| **Tools / calculators** | `/tools/[tool]` | `/tools/pricing-calculator`, `/tools/study-roi` |
| **Topic hubs / FAQ** | `/learn/[topic]` or `/resources/[topic]` | `/learn/spaced-repetition`, `/resources/flashcard-apps` |

- **Blog** (`/blog/[slug]`): optional. Use for editorial posts that *link to* pSEO pages (e.g. “Why we built our Anki comparison” → links to `/compare/anki`). Don’t use blog as the primary home for programmatic comparison or calculator pages.

### One-line rule

**pSEO = dedicated routes by intent (`/compare/`, `/for/`, `/tools/`, `/learn/`). Blog = editorial content only.**
