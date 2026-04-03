# Deckbase documentation

Index of project documentation. Use this to find specs, setup guides, and feature docs.

---

## Public (MCP-served)

Docs in `public/` are served via the MCP `list_docs` / `read_doc` tools. All other folders are internal only.

| Doc | Description |
|-----|-------------|
| [public/MCP.md](./public/MCP.md) | MCP server reference: endpoints, tools, auth. |
| [public/MCP-AI-CARD-WORKFLOW.md](./public/MCP-AI-CARD-WORKFLOW.md) | AI card creation workflow via MCP. |

---

## Features

| Doc | Description |
|-----|-------------|
| [features/DECKBASE_WEBAPP_DEV_GUIDE.md](./features/DECKBASE_WEBAPP_DEV_GUIDE.md) | Web app developer guide: stack, Firebase, data models, routes, UI. |
| [features/DECK_STUDY_MODE_WEB_DOCUMENTATION.md](./features/DECK_STUDY_MODE_WEB_DOCUMENTATION.md) | Deck study mode on web. |
| [features/FILE_TO_AI_CARDS_FEATURE.md](./features/FILE_TO_AI_CARDS_FEATURE.md) | File-to-AI cards: upload PDF/Word/Excel, AI maps content to template. |
| [features/FILE_TO_AI_CARDS_IMPLEMENTATION_PLAN.md](./features/FILE_TO_AI_CARDS_IMPLEMENTATION_PLAN.md) | Implementation plan for File-to-AI cards. |
| [features/FSRS_AND_FIREBASE_ADDENDUM.md](./features/FSRS_AND_FIREBASE_ADDENDUM.md) | FSRS scheduling and Firebase integration addendum. |
| [features/IMAGE_BLOCK_CROP_ASPECT.md](./features/IMAGE_BLOCK_CROP_ASPECT.md) | Image block crop/aspect ratio spec. |
| [features/IMPORT_FLOWS_SEPARATION_PLAN.md](./features/IMPORT_FLOWS_SEPARATION_PLAN.md) | Import flows separation plan. |
| [features/AI_IMAGE_FAL_FEASIBILITY.md](./features/AI_IMAGE_FAL_FEASIBILITY.md) | AI images (fal.ai) — models, pricing, credits, style library. |
| [features/MCP.md](./features/MCP.md) | MCP feature spec (internal, extended). |
| [features/FIREBASE_STRUCTURE_MOBILE.md](./features/FIREBASE_STRUCTURE_MOBILE.md) | Firebase layout for mobile: Auth, Firestore paths, Storage, rules. |
| [features/FIREBASE_MCP_CURSOR.md](./features/FIREBASE_MCP_CURSOR.md) | Firebase MCP in Cursor (`firestore_get_documents`, etc.). |
| [features/ELEVENLABS_API_MOBILE.md](./features/ELEVENLABS_API_MOBILE.md) | ElevenLabs TTS API for mobile. |
| [features/AI_IMAGE_API_MOBILE.md](./features/AI_IMAGE_API_MOBILE.md) | AI image API for mobile. |
| [features/MOBILE_ADD_CARDS_WITH_AI.md](./features/MOBILE_ADD_CARDS_WITH_AI.md) | Add-cards-with-AI API and flow for mobile. |
| [features/MOBILE_DEFAULT_TEMPLATE_PER_DECK.md](./features/MOBILE_DEFAULT_TEMPLATE_PER_DECK.md) | Default template per deck (mobile). |
| [features/MOBILE_MEDIA_SYNC.md](./features/MOBILE_MEDIA_SYNC.md) | Audio/image media: Storage + Firestore + card `media_ids` contract. |
| [features/MOBILE_GENERATE_FROM_DOC_IMG.md](./features/MOBILE_GENERATE_FROM_DOC_IMG.md) | Generate cards from document/image on mobile. |
| [features/MOBILE_IMPORT_SPREADSHEET.md](./features/MOBILE_IMPORT_SPREADSHEET.md) | Spreadsheet import on mobile. |
| [features/MOBILE_EXPORT.md](./features/MOBILE_EXPORT.md) | Deck export on mobile. |
| [features/STATE_BASED_SYNC_MOBILE.md](./features/STATE_BASED_SYNC_MOBILE.md) | State-based sync for mobile. |
| [features/DELETED_AT_MOBILE.md](./features/DELETED_AT_MOBILE.md) | Soft delete: `deleted_at` + `is_deleted` contract (mobile + web). |
| [features/IS_VIP_MOBILE.md](./features/IS_VIP_MOBILE.md) | VIP/Pro subscription check on mobile. |
| [features/feasibility-back-side-support.md](./features/feasibility-back-side-support.md) | Feasibility analysis: card back-side support. |
| [features/back-support-implementation-checklist.md](./features/back-support-implementation-checklist.md) | Implementation checklist: card back-side support. |
| [features/mobile-back-support-implementation.md](./features/mobile-back-support-implementation.md) | Mobile implementation: card back-side support. |

---

## Subscription

| Doc | Description |
|-----|-------------|
| [subscription/PRICING.md](./subscription/PRICING.md) | Subscription pricing: Free, Basic ($5.99/mo), Pro ($11.99/mo) and feature limits. |
| [subscription/CONFIGURE_REVENUECAT.md](./subscription/CONFIGURE_REVENUECAT.md) | Step-by-step RevenueCat setup. |
| [subscription/REVENUECAT_SUBSCRIPTIONS.md](./subscription/REVENUECAT_SUBSCRIPTIONS.md) | How RevenueCat subscriptions work on web (usage, gating). |
| [subscription/SUBSCRIPTION_FEATURES_CHECK.md](./subscription/SUBSCRIPTION_FEATURES_CHECK.md) | Feature gates by subscription tier. |

---

## API & Infrastructure

| Doc | Description |
|-----|-------------|
| [api/ELEVENLABS_VOICES.md](./api/ELEVENLABS_VOICES.md) | ElevenLabs voice catalog and IDs. |
| [api/IMPORT_AI_BLOCKS_530_INVESTIGATION.md](./api/IMPORT_AI_BLOCKS_530_INVESTIGATION.md) | Investigation: import AI blocks 530 error. |
| [api/STORAGE_CORS.md](./api/STORAGE_CORS.md) | Firebase Storage CORS configuration. |
| [api/VOICE_SAMPLE_STORAGE_SETUP.md](./api/VOICE_SAMPLE_STORAGE_SETUP.md) | Voice sample storage setup. |

---

## Marketing

All marketing docs live in `marketing/`. SEO is a subcategory at `marketing/seo/`.

### SEO (Search Engine Optimization)

> Full index: [marketing/seo/README.md](./marketing/seo/README.md)

| Doc | Description |
|-----|-------------|
| [marketing/seo/TODO.md](./marketing/seo/TODO.md) | **Living checklist** — open and done SEO tasks. Start here. |
| [marketing/seo/audits/FULL-AUDIT-REPORT.md](./marketing/seo/audits/FULL-AUDIT-REPORT.md) | Full SEO audit report (2026-03-11). |
| [marketing/seo/audits/GEO-ANALYSIS.md](./marketing/seo/audits/GEO-ANALYSIS.md) | AI/GEO search readiness analysis. |
| [marketing/seo/keywords/SEO_KEYWORD_ACTION_PLAN.md](./marketing/seo/keywords/SEO_KEYWORD_ACTION_PLAN.md) | Keyword priorities and action plan. |
| [marketing/seo/keywords/KEYWORD_RESEARCH_RELATED_KEYWORDS_REPORT.md](./marketing/seo/keywords/KEYWORD_RESEARCH_RELATED_KEYWORDS_REPORT.md) | DataForSEO related keywords report. |
| [marketing/seo/competitor-pages/COMPETITOR-PAGES.md](./marketing/seo/competitor-pages/COMPETITOR-PAGES.md) | Competitor comparison pages (`/deckbase-vs-*`). |
| [marketing/seo/technical/](./marketing/seo/technical/) | Technical SEO: image optimization, IndexNow, Cloudflare AI bots. |
| [marketing/seo/dataforseo/DATA_FOR_SEO_MCP_PROMPTS.md](./marketing/seo/dataforseo/DATA_FOR_SEO_MCP_PROMPTS.md) | DataForSEO MCP prompt library. |
| [marketing/seo/ghost/README.md](./marketing/seo/ghost/README.md) | Ghost CMS blog — publish workflow and SEO checklist. |
| [marketing/seo/competitive/](./marketing/seo/competitive/) | Competitive intelligence: battle cards, pricing, review mining. |
| [marketing/seo/mobile/](./marketing/seo/mobile/) | App store listings (iOS, Android). |

### Launch & Campaigns

| Doc | Description |
|-----|-------------|
| [marketing/product-hunt-launch-kit.md](./marketing/product-hunt-launch-kit.md) | Product Hunt launch kit. |
