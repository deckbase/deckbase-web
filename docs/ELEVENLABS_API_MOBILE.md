# ElevenLabs TTS API for Mobile

Use these endpoints from the mobile app to list voices and generate speech.

**Base URL:** `https://your-app-domain.com` (or your deployed Next.js API base URL)

---

## Testing in development

When the **backend** is running in **development** (`NODE_ENV !== "production"`, e.g. `npm run dev` or a dev preview URL), **auth is not enforced** for TTS or voice-sample:

- **GET /api/elevenlabs/voices** – no auth (same in prod).
- **GET /api/elevenlabs/voice-sample** – **no auth in dev.** You can call it without the `Authorization` header.
- **POST /api/elevenlabs/text-to-speech** – **no auth in dev.** You can call it without the `Authorization` header.

So to test without fixing the token/App Check yet:

1. Point the app at your **dev** backend (e.g. `http://localhost:3000` with a tunnel like ngrok for a real device, or your Vercel/Netlify dev preview URL).
2. Call voices, voice-sample, and TTS **without** sending `Authorization`. All three should succeed in dev.
3. Once the flow works in dev, switch to the **production** URL and add the Firebase ID token header so it works in prod.

---

## Auth options (production): API key or Firebase token

In **production**, TTS and voice-sample accept **either** of these:

| Method | Header | Pro required? |
|--------|--------|----------------|
| **API key** | `X-API-Key: <key>` | No. Key is trusted. |
| **Firebase token** | `Authorization: Bearer <Firebase ID token>` | Yes. |

- **API key:** Set `ELEVENLABS_MOBILE_API_KEY` on the server. Mobile sends `X-API-Key: <that key>` on every TTS and voice-sample request. No Firebase, no Pro check. Use for dev builds or if you prefer not to depend on Firebase Auth for this flow. **Keep the key secret** (e.g. in env only; if you embed it in the app, anyone can extract it).
- **Firebase token:** Send `Authorization: Bearer <idToken>` and ensure the user has Pro. Same as before.

If both are sent, a valid API key wins (no Pro check). Otherwise we validate the Bearer token and Pro.

---

## Verification: no App Check

We **do not use Firebase App Check**. Do **not** enable or require App Check for these APIs.

---

## Auth: why list-voices succeeds but voice-sample (and TTS) fails

| Endpoint | Auth (production) | Why it succeeds or fails |
|----------|--------------------|---------------------------|
| **GET /api/elevenlabs/voices** | **None.** | **Always succeeds.** |
| **GET /api/elevenlabs/voice-sample** | **X-API-Key** or **Authorization: Bearer <token>** + Pro. | **401** if neither is valid. |
| **POST /api/elevenlabs/text-to-speech** | Same as voice-sample. | **401** if neither is valid. |

So **voices** and **voice-sample** are different: the server does **not** check auth for list-voices, but **does** check auth for voice-sample. If the app only sends the token to one of them (or uses an expired token for sample), list-voices returns 200 and voice-sample returns 401. There is no App Check or different auth type – the backend simply does not check auth on voices, and **does** check auth (Firebase token + RevenueCat Pro) on TTS and voice-sample.

If you get **401 "Invalid or expired token"** on TTS or voice-sample:

1. **Send the header on every request:** `Authorization: Bearer <Firebase ID token>` for both TTS and voice-sample.
2. **Use a fresh token:** Firebase ID tokens expire in about 1 hour. If you called voices earlier and then TTS later, the token may have expired. Call `getIdToken(true)` (or your platform’s equivalent) to refresh before TTS/voice-sample.
3. **Same token for both:** Use the same Firebase ID token for POST text-to-speech and GET voice-sample; the backend validates it the same way for both.

### 401 response body (for retry logic)

On 401 the API returns JSON with an optional `code`:

| `code` | Meaning | What to do |
|--------|--------|------------|
| `auth_missing` | No `Authorization` header or empty token | Add `Authorization: Bearer <token>` and retry. |
| `auth_invalid_or_expired` | Token was sent but failed verification (expired or invalid) | Get a **fresh** token with `getIdToken(true)` and retry **once**. If it still fails, ask the user to sign in again. |

**Option A – API key (no Firebase):** Set `ELEVENLABS_MOBILE_API_KEY` on the server, then send it on every TTS/voice-sample request:

```dart
headers['X-API-Key'] = 'your-mobile-api-key';  // from env or secure config
```

**Option B – Firebase token:** Get a fresh token and set the header every time:

```dart
final idToken = await FirebaseAuth.instance.currentUser?.getIdToken(true);
if (idToken == null) { /* user not signed in */ return; }
headers['Authorization'] = 'Bearer $idToken';
```

Use `getIdToken(true)` so Firebase refreshes the token if it’s expired. If you still get 401 with `code: "auth_invalid_or_expired"`, retry once with a newly fetched token; if it fails again, the project or server config may be wrong.

### "Authentication required" + "using placeholder token" / "No AppCheckProvider installed"

If logs show:

- `Error getting App Check token; using placeholder token instead. Error: No AppCheckProvider installed.`
- and then `ElevenLabsTtsException: Authentication required to play voice samples in production`

then the request is **not** sending the right token. Our API expects **only** the **Firebase Auth ID token** in `Authorization: Bearer <token>`. It does **not** use App Check.

- **Do not** send an App Check token or a placeholder. We ignore it and treat the request as unauthenticated.
- **Do** send the **Firebase Auth ID token**: `Authorization: Bearer ${await FirebaseAuth.instance.currentUser?.getIdToken(true)}`.
- If you have a **Dio (or other) interceptor** that adds App Check or overwrites `Authorization`, either:
  - **Exclude** requests to the ElevenLabs API base URL from that interceptor and add a different interceptor that sets **only** `Authorization: Bearer <idToken>` (from Firebase Auth), or
  - Use a **separate** HTTP client for our API that only sets the Firebase ID token header.

So: for `/api/elevenlabs/voice-sample` and `/api/elevenlabs/text-to-speech`, the **only** auth header we use is `Authorization: Bearer <Firebase ID token>`. Nothing else.

---

## 1. List voices

**GET** `/api/elevenlabs/voices`

Returns the list of available voices for the voice picker. **No auth required.**

**Response (200):**
```json
{
  "voices": [
    { "group": "American", "label": "American Male", "id": "dtSEyYGNJqjrtBArPCVZ" },
    { "group": "American", "label": "American Female", "id": "XW70ikSsadUbinwLMZ5w" },
    { "group": "British", "label": "British Male", "id": "goT3UYdM9bhm0n2lmKQx" },
    { "group": "British", "label": "British Female", "id": "S9EGwlCtMF7VXtENq79v" },
    { "group": "Australian", "label": "Australian Male", "id": "ouFAjcjtdrVBT9bRFhFQ" },
    { "group": "Australian", "label": "Australian Female", "id": "w9rPM8AIZle60Nbpw7nl" }
  ]
}
```

**Mobile usage:** Call this once (e.g. on settings or card-audio screen load), then show a picker using `label` for display and `id` when generating.

---

## 2. Generate speech

**POST** `/api/elevenlabs/text-to-speech`  
**Headers:** In **production**, send `Authorization: Bearer <Firebase ID token>` (Pro subscription required).  
**Content-Type:** `application/json`

**Body:**
```json
{
  "text": "Text to convert to speech",
  "voice_id": "dtSEyYGNJqjrtBArPCVZ"
}
```

- `text` (required): string to speak.
- `voice_id` (optional): one of the `id` values from `/api/elevenlabs/voices`. If omitted, server default is used.

**Response (200):** Binary `audio/mpeg` (MP3).  
**Errors:** JSON with `error` (and optional `details`).  
- 401: missing header, or "Invalid or expired token" → send/refresh Firebase ID token  
- 403: "Active subscription required to generate audio" → user needs Pro  
- 400: missing/invalid body or empty text  
- 503: `ELEVENLABS_API_KEY` not set

**Mobile usage:**  
1. GET `/api/elevenlabs/voices` → build voice picker.  
2. User selects voice and enters/pastes text.  
3. POST `/api/elevenlabs/text-to-speech` with `{ "text": "...", "voice_id": "<selected id>" }`.  
4. Use response body as MP3 (save to file or play with audio player).

---

## Optional: Cached voice sample (play sample before generating)

**GET** `/api/elevenlabs/voice-sample?voice_id=dtSEyYGNJqjrtBArPCVZ`  
**Headers:** In **production**, send the same `Authorization: Bearer <Firebase ID token>` as for TTS (Pro required).

Returns `{ "url": "<public-url>" }`. Sample is made public in Storage (no signed URL, no expiry). Use the URL to play the sample. Use the URL to play the sample (e.g. in a “Play sample” button). If the server is not configured for caching, it returns 503; then use the main TTS endpoint with a short phrase to play a sample.

**Server requirements:** Set **`FIREBASE_STORAGE_BUCKET`** in your hosting env. If no sample exists, the server fetches from ElevenLabs, saves to Storage, makes it public, and returns the public URL. Bucket must allow public read (or grant allUsers Storage Object Viewer) so makePublic() succeeds.

**No `tts-samples` folder / voice changes every time:** (1) **503 from voice-sample** → `FIREBASE_STORAGE_BUCKET` is not set in production (e.g. Vercel). Set it to the same value as `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` (e.g. `deckbase-prod.firebasestorage.app`). (2) **500 from voice-sample** or no folder in Firebase Console → the Firebase Admin service account cannot write to the bucket. In Google Cloud Console → IAM & Admin → find the service account (e.g. `firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com`) and ensure it has **Storage Object Admin** (or **Storage Admin**) on the bucket. In Firebase Console → Storage, check the bucket that matches your env (e.g. `deckbase-prod.firebasestorage.app`); the `tts-samples` folder appears at the root after the first successful save.

**Errors:** 401/403 same as TTS (token or subscription).
