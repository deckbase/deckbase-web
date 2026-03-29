# Subscription features – current implementation check

Summary of what is gated by plan (Free / Basic / Pro) and how it aligns with [PRICING.md](./PRICING.md).

**AI image generation (planned):** See **[`../features/AI_IMAGE_FAL_FEASIBILITY.md`](../features/AI_IMAGE_FAL_FEASIBILITY.md)** for the full spec (credits, models, style library, reference images).

---

## Tiers and entitlement source

- **Tiers:** `free` (no paid entitlement), `basic` (RevenueCat entitlement `basic`), `pro` (RevenueCat entitlement `pro` or VIP).
- **Client:** `useRevenueCat()` → `isPro` = has **Basic or Pro** entitlement (or VIP). So Basic and Pro users both get access to paid features; limits are enforced server-side by tier.
- **Server:** `lib/revenuecat-server.js`:
  - `getSubscriptionTier(uid)` → `'free' | 'basic' | 'pro'` (one RevenueCat subscriber fetch).
  - `isBasicOrProOrVip(uid)` = tier !== 'free' — use for gating any paid feature (AI, TTS, MCP, API keys, Excel/Anki import/export).
  - `isProOrVip(uid)` = tier === 'pro' — use when Pro-only behavior is needed.
- **Production-only:** Many UI gates use `aiEntitled = !isProduction || !rcConfigured || isPro`, so in dev or when RevenueCat isn’t configured, features are unlocked.

---

## Features gated (Pro / subscribed users only)

### 1. AI card generation

| Where | How |
|-------|-----|
| **Deck page – “Add Card with AI”** | Button disabled when `!aiEntitled`; link to `/dashboard/subscription` when not entitled. |
| **Deck page – Import “Generate with AI”** | `handleImportUseAIInstead` checks `aiEntitled`; alert "Pro subscription required to use AI." |
| **Deck page – Column mapping “Generate with AI”** | Before running AI, checks `aiEntitled`; alert "Pro subscription required to use \"Generate with AI\" for template blocks." |
| **API** `POST /api/cards/generate-with-ai` | `isBasicOrProOrVip(uid)` → 403 if Free; then tier-based AI limit (Basic 250, Pro 600). |
| **API** `POST /api/cards/file-to-ai` | Same server check. |
| **API** `POST /api/mobile/cards/add-with-ai` | Same server check. |

**Limits (production):** Monthly AI generation limit enforced in all three APIs via `lib/usage-limits.js`. **Basic:** 250 cards/month. **Pro:** 600 cards/month. Free = not allowed. If over limit, API returns 403 with message "Monthly AI generation limit reached (X/month). Resets next month." Usage stored in Firestore `users/{uid}/usage/{YYYY-MM}`.

**Status:** ✅ Consistently gated (UI + API) + tier-based limit enforced.

---

### 2. Export (XLSX, Anki .apkg)

| Where | How |
|-------|-----|
| **Deck page – Export dropdown “XLSX”** | Button disabled when `isProduction && !aiEntitled`; handler alerts "Pro subscription required to export as Excel (.xlsx)." |
| **Deck page – Export dropdown “Anki (.apkg)”** | Button disabled when `isProduction && !aiEntitled`; tooltip "Pro subscription required"; handler shows same message if clicked. |

**Status:** ✅ Both gated for production. No separate API (export is client-side).

---

### 3. MCP (Model Context Protocol)

| Where | How |
|-------|-----|
| **MCP page** `/dashboard/mcp` | `canUseMcp = !!user && isPro`; non‑Pro users see “View subscription” and cannot use MCP. |
| **API** `POST /api/mcp` | `isBasicOrProOrVip(uid)` → 403 if Free. |

**Status:** ✅ Gated (UI + API).

---

### 4. API keys (dashboard)

| Where | How |
|-------|-----|
| **API Keys page** `/dashboard/api-keys` | List/create/revoke only when `user && isPro`; non‑Pro see “View subscription”. |
| **API** `POST /api/api-keys` | `isBasicOrProOrVip(uid)` → 403 if Free. |
| **API** `DELETE /api/api-keys/[id]` | Same. |

**Status:** ✅ Gated (UI + API).

---

### 5. Text-to-speech (TTS)

| Where | How |
|-------|-----|
| **Card editor – Audio block “Generate”** | `audioProEntitled = !isProduction || !rcConfigured || isPro`; `onGenerateAudio` only passed when entitled; `generateAudioProRequired` shows upgrade when not. |
| **API** `POST /api/elevenlabs/text-to-speech` | Accepts Bearer (web) or X-API-Key + optional `body.uid` (mobile). When `effectiveUid` present: `isBasicOrProOrVip(uid)` → 403 if Free; `checkTTSLimit(uid, text.length)` → 403 if over tier limit (Basic 30K, Pro 50K). On success, `incrementTTSChars(uid, text.length)`. |
| **Mobile** `add-with-ai` TTS | Before each TTS call: `checkTTSLimit(uid, mainText.length)`; on success `incrementTTSChars(uid, mainText.length)`. |

**Limits:** **Basic:** 30,000 characters/month. **Pro:** 50,000 characters/month. Free = not allowed. Stored in same `users/{uid}/usage/{YYYY-MM}` doc as `ttsChars`.

**Status:** ✅ Gated (UI + API) and tier-based monthly limit enforced.

---

### 5b. AI image generation (fal.ai) — planned

**Product:** Basic and Pro only; **40 / 100 AI image credits/month** (not raw image count). Each resolved `model_id` consumes a **credit weight**; track **`imageCreditsUsed`** + optional **`imageGenerationsByModel`** map on `users/{uid}/usage/{YYYY-MM}`. Separate from **`aiGenerations`**. See [**AI_IMAGE_FAL_FEASIBILITY.md**](../features/AI_IMAGE_FAL_FEASIBILITY.md) (*Usage tracking & quota*) and [PRICING.md](./PRICING.md).

| Where | Intended behavior (when implemented) |
|-------|--------------------------------------|
| **Card editor – Image block** | Same entitlement pattern as TTS; model picker from curated list; show **remaining credits** / cost; optional **style prompt library** (preset snippets merged into prompt; **tag filters** for subject/style — see [AI_IMAGE_FAL_FEASIBILITY.md](../features/AI_IMAGE_FAL_FEASIBILITY.md#style-prompt-library-curated-presets)); call server route; then `uploadImage` + save. |
| **API** `GET` style library (e.g. `/api/ai/image-style-prompts`) | **Subscribers only** (Basic/Pro/VIP): returns curated style presets (with `tags[]`); optional `?tag=` filter. Free **403** or empty + upgrade message. |
| **API** `POST` (e.g. `/api/fal/...` or `/api/ai/generate-image`) | `isBasicOrProOrVip` → 403 if Free; resolve **`model_id`** (including reference → edit endpoint); optional **`style_prompt_id`** resolved server-side; `checkImageGenerationLimit(uid, resolvedModelId)` → 403 if `used + CREDIT_COST > cap`; `incrementImageUsage` on success. |
| **Import / Use AI** | Per-row image gen consumes credits by resolved model. |
| **Mobile** | Same API + auth as TTS (`X-API-Key`, optional `body.uid`). |
| **MCP** | Tool args for prompt + allowlisted `model_id`; same credit-based limits server-side. |

**Marketing:** Update copy to **“AI image credits”** (not flat “images”) in `components/PricingPolicy.js` and `app/dashboard/subscription/page.js` (`BENEFITS_BY_TIER`) when the feature ships.

**Status:** 🔲 Documented; implementation pending.

---

### 6. Import (Excel, Anki .apkg)

| Where | How |
|-------|-----|
| **Deck page – Import modal** | In `processImportFile`, if file type is Excel (.xlsx/.xls) or Anki (.apkg) and `isProduction && !aiEntitled`, alert "Pro subscription required to import Excel or Anki (.apkg) files." and do not proceed. |

**Status:** ✅ Gated for production.

---

### 7. Cloud backup / storage (2GB Basic, 20GB Pro)

| Where | How |
|-------|-----|
| **Storage usage** | `lib/usage-limits.js`: `getStorageUsage(uid)` lists Firebase Storage prefix `users/{uid}/` and sums object sizes. Result cached in Firestore `users/{uid}/usage/storage` for 15 min to avoid listing on every request. |
| **Limits** | **Free:** 0 (no cloud backup). **Basic:** 2 GB. **Pro:** 20 GB. `checkStorageLimit(uid, additionalBytes)` returns `{ allowed, used, limit, message? }`. |
| **GET /api/user/usage** | Returns `storageUsed` (bytes) and `storageLimit` (bytes) for the user’s tier. |
| **POST /api/user/storage-check** | Body: `{ additionalBytes?: number }`. Returns `{ allowed, used, limit, message? }`. Client should call before uploads to enforce limit. |
| **Mobile** `add-with-ai` TTS upload | Before `uploadAudioBufferAdmin`, calls `checkStorageLimit(uid, buffer.length)`; if not allowed, skips TTS upload for that card (card still returned without audio). |
| **Web uploads** | `uploadImage` / `uploadAudio` in `utils/firestore.js` are client-side (direct to Firebase Storage). Enforce by calling `GET /api/user/usage` or `POST /api/user/storage-check` before upload and blocking if `storageUsed + file.size > storageLimit`. |

**Status:** ✅ Tracked and enforced server-side where upload goes through API (mobile add-with-ai). Web dashboard should check usage or storage-check before upload and block if over limit.

---

## Feature summary vs PRICING.md

Per [PRICING.md](./PRICING.md): Free = CSV only import/export; Basic/Pro = CSV, Excel, Anki.

| Feature | Expected (Free) | Current |
|--------|------------------|---------|
| **Export CSV** | Allowed | ✅ No gate. |
| **Export XLSX** | Basic & Pro | ✅ Gated (Basic or Pro required). |
| **Export Anki (.apkg)** | Basic & Pro | ✅ Gated (Basic or Pro required). |
| **Import CSV** | Allowed | ✅ No gate. |
| **Import Excel (.xlsx/.xls)** | Basic & Pro | ✅ Gated (Basic or Pro required). |
| **Import Anki (.apkg)** | Basic & Pro | ✅ Gated (Basic or Pro required). |

---

## Usage and limits

- **Usage docs:** `lib/usage-limits.js` – Firestore `users/{uid}/usage/{YYYY-MM}` with `aiGenerations`, `ttsChars`. Month key resets usage per calendar month. `users/{uid}/usage/storage` caches total storage bytes (15 min TTL).
- **AI generations:** **Free:** 0 (not allowed). **Basic:** 250/month. **Pro:** 600/month. Enforced in `generate-with-ai`, `file-to-ai`, `mobile/cards/add-with-ai` (check before run, increment after success).
- **TTS characters:** **Free:** 0 (not allowed). **Basic:** 30,000/month. **Pro:** 50,000/month. Enforced in `POST /api/elevenlabs/text-to-speech` and in mobile `add-with-ai` when generating audio.
- **Cloud backup (storage):** **Free:** 0. **Basic:** 2 GB. **Pro:** 20 GB. `getStorageUsage(uid)` sums Firebase Storage `users/{uid}/` (cached 15 min). Enforced in mobile `add-with-ai` before TTS upload; web should call usage or `POST /api/user/storage-check` before upload.
- **GET /api/user/usage:** Returns `{ aiUsed, aiLimit, ttsUsed, ttsLimit, storageUsed, storageLimit, isPro, tier }` for the authenticated user (Bearer token). `tier` = `'free' | 'basic' | 'pro'`; limits match plan.
- **VIP:** Treated as Pro everywhere; limits apply same as paid Pro.

---

## Quick reference – files that enforce subscription / limits

| File | What’s gated / enforced |
|------|-------------------------|
| `lib/usage-limits.js` | Usage storage, `checkAIGenerationLimit`, `checkTTSLimit`, `checkStorageLimit`, `getStorageUsage`, `incrementAIGenerations`, `incrementTTSChars`; storage cache in `users/{uid}/usage/storage` |
| `app/dashboard/deck/[deckId]/page.js` | AI add/import, Export XLSX & Anki (.apkg), Import Excel/APKG (Pro only) |
| `app/dashboard/deck/[deckId]/card/[cardId]/page.js` | TTS “Generate” in audio block (Pro only) |
| `app/dashboard/api-keys/page.js` | Entire API keys UI |
| `app/dashboard/mcp/page.js` | MCP usage |
| `app/api/cards/generate-with-ai/route.js` | AI generation (Pro + monthly limit, increment on success) |
| `app/api/cards/file-to-ai/route.js` | File → AI (Pro + monthly limit, increment on success) |
| `app/api/mobile/cards/add-with-ai/route.js` | Mobile add with AI (Pro + AI limit + TTS limit + storage check before TTS upload; increments on success) |
| `app/api/elevenlabs/text-to-speech/route.js` | TTS (Pro + monthly char limit; Bearer or X-API-Key + body.uid) |
| `app/api/user/usage/route.js` | GET usage for dashboard (Bearer token); includes storageUsed, storageLimit |
| `app/api/user/storage-check/route.js` | POST storage-check before upload (Bearer token, body.additionalBytes) |
| `app/api/api-keys/route.js` | Create/list API keys |
| `app/api/api-keys/[id]/route.js` | Revoke API key |
| `app/api/mcp/route.js` | MCP API |
