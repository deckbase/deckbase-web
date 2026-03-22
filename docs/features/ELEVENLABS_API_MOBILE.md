# ElevenLabs TTS API for Mobile

Use these endpoints from the mobile app to list voices and generate speech.

**Base URL:** `https://your-app-domain.com` (or your deployed Next.js API base URL)

**Auth:** Send **`X-API-Key: <DECKBASE_API_KEY>`** (value from server env). Same key for add-with-ai and ElevenLabs. Dashboard API keys (Bearer) are for MCP only.

---

## Testing in development

When the **backend** is running in **development** (`NODE_ENV !== "production"`), **auth is not enforced** for TTS or voice-sample:

- **GET /api/elevenlabs/voices** – no auth (same in prod).
- **GET /api/elevenlabs/voice-sample** – no auth in dev.
- **POST /api/elevenlabs/text-to-speech** – no auth in dev.

Point the app at your dev backend and call without auth to test. In production, send `X-API-Key: <DECKBASE_API_KEY>`.

---

## Auth (production)

| Endpoint | Auth |
|----------|------|
| **GET /api/elevenlabs/voices** | None. |
| **GET /api/elevenlabs/voice-sample** | `Authorization: Bearer <API key>` + Pro/VIP. |
| **POST /api/elevenlabs/text-to-speech** | Same as voice-sample. |

In production, send `X-API-Key: <DECKBASE_API_KEY>` (same key as add-with-ai). Dashboard API keys are for MCP only.

---

## 401 / 403

| Code / status | Meaning |
|---------------|--------|
| `auth_missing` | Missing or empty `Authorization: Bearer <API key>`. |
| `auth_invalid_or_expired` | API key not found or invalid. |
| 403 | User not Pro/VIP. |

---

## 1. List voices

**GET** `/api/elevenlabs/voices`

No auth. Returns the list of available voices.

**Response (200):** Curated multilingual list (male/female per language); see `docs/api/ELEVENLABS_VOICES.md`.
```json
{
  "voices": [
    { "group": "English", "label": "English (female)", "id": "owHnXhz2H7U5Cv31srDU", "gender": "female", "language": "en" },
    ...
  ],
  "source": "static_curated"
}
```

---

## 2. Generate speech

**POST** `/api/elevenlabs/text-to-speech`  
**Headers:** `Authorization: Bearer <API key>`, `Content-Type: application/json`

**Body:**
```json
{
  "text": "Text to convert to speech",
  "voice_id": "owHnXhz2H7U5Cv31srDU"
}
```

**Response (200):** Binary `audio/mpeg` (MP3).

**Errors:** 401 (auth), 403 (subscription), 400 (body), 503 (ELEVENLABS_API_KEY not set).

---

## 3. Voice sample (cached)

**GET** `/api/elevenlabs/voice-sample?voice_id=owHnXhz2H7U5Cv31srDU`  
**Headers:** `Authorization: Bearer <API key>` (same as TTS).

Returns `{ "url": "<public-url>" }`. Pro/VIP required in production. Server needs `FIREBASE_STORAGE_BUCKET` and Firebase Admin for cache.
