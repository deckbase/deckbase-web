# ElevenLabs TTS API for Mobile

Use these endpoints from the mobile app to list voices and generate speech.

**Base URL:** `https://your-app-domain.com` (or your deployed Next.js API base URL)

---

## 1. List voices

**GET** `/api/elevenlabs/voices`

Returns the list of available voices for the voice picker.

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

Returns `{ "url": "<signed-url>" }` for a short cached sample of that voice. Use the URL to play the sample (e.g. in a “Play sample” button). If the server is not configured for caching, it returns 503; then use the main TTS endpoint with a short phrase to play a sample.
