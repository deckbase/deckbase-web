# Subscription features – current implementation check

Summary of what is gated by subscription (Pro/VIP) in the codebase and how it aligns with [PRICING.md](./PRICING.md).

---

## Entitlement source

- **Client:** `useRevenueCat()` → `isPro` = RevenueCat entitlement **or** VIP (from `/api/user/vip`).
- **Server:** `isProOrVip(uid)` in `lib/revenuecat-server.js` = RevenueCat entitlement **or** VIP.
- **Production-only:** Many UI gates use `aiEntitled = !isProduction || !rcConfigured || isPro`, so in dev or when RevenueCat isn’t configured, features are unlocked.

---

## Features gated (Pro / subscribed users only)

### 1. AI card generation

| Where | How |
|-------|-----|
| **Deck page – “Add Card with AI”** | Button disabled when `!aiEntitled`; link to `/dashboard/subscription` when not entitled. |
| **Deck page – Import “Generate with AI”** | `handleImportUseAIInstead` checks `aiEntitled`; alert "Pro subscription required to use AI." |
| **Deck page – Column mapping “Generate with AI”** | Before running AI, checks `aiEntitled`; alert "Pro subscription required to use \"Generate with AI\" for template blocks." |
| **API** `POST /api/cards/generate-with-ai` | `isProOrVip(uid)` → 403 "Active subscription required to use AI features" if not entitled. |
| **API** `POST /api/cards/file-to-ai` | Same server check. |
| **API** `POST /api/mobile/cards/add-with-ai` | Same server check. |

**Limits (production):** Monthly AI generation limit enforced in all three APIs via `lib/usage-limits.js`. Pro: 600 cards/month. If over limit, API returns 403 with message "Monthly AI generation limit reached (600/month). Resets next month." Usage stored in Firestore `users/{uid}/usage/{YYYY-MM}`.

**Status:** ✅ Consistently gated (UI + API) + limit enforced.

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
| **API** `POST /api/mcp` | `isProOrVip(uid)` → 403 if not entitled. |

**Status:** ✅ Gated (UI + API).

---

### 4. API keys (dashboard)

| Where | How |
|-------|-----|
| **API Keys page** `/dashboard/api-keys` | List/create/revoke only when `user && isPro`; non‑Pro see “View subscription”. |
| **API** `POST /api/api-keys` | `isProOrVip(uid)` → 403 if not entitled. |
| **API** `DELETE /api/api-keys/[id]` | Same. |

**Status:** ✅ Gated (UI + API).

---

### 5. Text-to-speech (TTS)

| Where | How |
|-------|-----|
| **Card editor – Audio block “Generate”** | `audioProEntitled = !isProduction || !rcConfigured || isPro`; `onGenerateAudio` only passed when entitled; `generateAudioProRequired` shows upgrade when not. |
| **API** `POST /api/elevenlabs/text-to-speech` | Accepts Bearer (web) or X-API-Key + optional `body.uid` (mobile). When `effectiveUid` present: `isProOrVip(uid)` → 403 if not Pro; `checkTTSLimit(uid, text.length)` → 403 if over monthly limit. On success, `incrementTTSChars(uid, text.length)`. |
| **Mobile** `add-with-ai` TTS | Before each TTS call: `checkTTSLimit(uid, mainText.length)`; on success `incrementTTSChars(uid, mainText.length)`. |

**Limits:** Pro: 50,000 characters/month. Stored in same `users/{uid}/usage/{YYYY-MM}` doc as `ttsChars`.

**Status:** ✅ Gated (UI + API) and monthly limit enforced.

---

### 6. Import (Excel, Anki .apkg)

| Where | How |
|-------|-----|
| **Deck page – Import modal** | In `processImportFile`, if file type is Excel (.xlsx/.xls) or Anki (.apkg) and `isProduction && !aiEntitled`, alert "Pro subscription required to import Excel or Anki (.apkg) files." and do not proceed. |

**Status:** ✅ Gated for production.

---

## Feature summary vs PRICING.md

Per [PRICING.md](./PRICING.md): Free = CSV only import/export; Basic/Pro = CSV, Excel, Anki.

| Feature | Expected (Free) | Current |
|--------|------------------|---------|
| **Export CSV** | Allowed | ✅ No gate. |
| **Export XLSX** | Pro only | ✅ Gated (Pro required). |
| **Export Anki (.apkg)** | Pro only | ✅ Gated (Pro required). |
| **Import CSV** | Allowed | ✅ No gate. |
| **Import Excel (.xlsx/.xls)** | Pro only | ✅ Gated (Pro required). |
| **Import Anki (.apkg)** | Pro only | ✅ Gated (Pro required). |

---

## Usage and limits

- **Storage:** `lib/usage-limits.js` – Firestore `users/{uid}/usage/{YYYY-MM}` with `aiGenerations`, `ttsChars`. Month key resets usage per calendar month.
- **AI generations:** Pro limit 600/month. Enforced in `generate-with-ai`, `file-to-ai`, `mobile/cards/add-with-ai` (check before run, increment after success).
- **TTS characters:** Pro limit 50,000/month. Enforced in `POST /api/elevenlabs/text-to-speech` and in mobile `add-with-ai` when generating audio.
- **GET /api/user/usage:** Returns `{ aiUsed, aiLimit, ttsUsed, ttsLimit, isPro }` for the authenticated user (Bearer token). Use in dashboard to show “X/600 AI this month”.
- **VIP:** Treated as Pro everywhere; limits apply same as paid Pro.
- **Storage/backup limits (2GB/20GB):** PRICING mentions these; enforcement would be separate (storage quota checks).

---

## Quick reference – files that enforce subscription / limits

| File | What’s gated / enforced |
|------|-------------------------|
| `lib/usage-limits.js` | Usage storage, `checkAIGenerationLimit`, `checkTTSLimit`, `incrementAIGenerations`, `incrementTTSChars` |
| `app/dashboard/deck/[deckId]/page.js` | AI add/import, Export XLSX & Anki (.apkg), Import Excel/APKG (Pro only) |
| `app/dashboard/deck/[deckId]/card/[cardId]/page.js` | TTS “Generate” in audio block (Pro only) |
| `app/dashboard/api-keys/page.js` | Entire API keys UI |
| `app/dashboard/mcp/page.js` | MCP usage |
| `app/api/cards/generate-with-ai/route.js` | AI generation (Pro + monthly limit, increment on success) |
| `app/api/cards/file-to-ai/route.js` | File → AI (Pro + monthly limit, increment on success) |
| `app/api/mobile/cards/add-with-ai/route.js` | Mobile add with AI (Pro + AI limit + TTS limit, increments on success) |
| `app/api/elevenlabs/text-to-speech/route.js` | TTS (Pro + monthly char limit; Bearer or X-API-Key + body.uid) |
| `app/api/user/usage/route.js` | GET usage for dashboard (Bearer token) |
| `app/api/api-keys/route.js` | Create/list API keys |
| `app/api/api-keys/[id]/route.js` | Revoke API key |
| `app/api/mcp/route.js` | MCP API |
