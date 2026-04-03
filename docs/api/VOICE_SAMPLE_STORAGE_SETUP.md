# Voice sample cache (Firebase Storage)

Deckbase caches ElevenLabs preview clips in Firebase Storage so the **Sample** button does not call ElevenLabs on every play. This applies to **all** curated voices in `lib/elevenlabs-voices.js` (same mechanism as the former English-only list).

## Object path

| | |
|--|--|
| **Prefix** | `tts-samples-v2/` (see `ELEVENLABS_VOICE_SAMPLE_STORAGE_PREFIX` in `lib/elevenlabs-voices.js`; bumped when sample copy changes) |
| **Object** | `{prefix}/{voiceId}.mp3` |
| **Example** | `tts-samples-v2/owHnXhz2H7U5Cv31srDU.mp3` |

Sample audio uses a **short phrase in the voice’s language** (`getElevenlabsSamplePhraseForVoiceId`), same as the HTTP route and `npm run seed:voice-samples`.

The HTTP route `GET /api/elevenlabs/voice-sample?voice_id=…` checks Storage first; only on miss does it call ElevenLabs, then saves and `makePublic()` on the object.

## Server requirements

- **`FIREBASE_STORAGE_BUCKET`** (or `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`) set in the hosting environment.
- **Firebase Admin** credentials so the API can read/write the bucket (`utils/firebase-admin.js`).
- **`ELEVENLABS_API_KEY`** so the first request per voice can generate audio when the object is missing.

## Public read

Clients receive a `https://storage.googleapis.com/...` URL. The bucket or objects must allow **public read** for that URL to work in the browser (the route calls `makePublic()` on each sample file). If `makePublic` fails, see Google Cloud Console → Storage → your bucket → **Permissions** (e.g. `allUsers` with **Storage Object Viewer** for public buckets, or object-level ACLs consistent with your security model).

## Pre-seed all curated voices

From the repo root, with the same env you use in production:

```bash
npm run seed:voice-samples
# alias: npm run sync:voice-samples
# or: node --env-file=.env.prod scripts/seed-voice-samples.js
```

Optional flags:

- **`--force`** — overwrite objects that already exist (re-download from ElevenLabs).
- **`--fail-fast`** — stop on the first ElevenLabs or Storage error (default is to continue and report failures at the end).

The script uploads one MP3 per curated `voice_id` using the same **per-language phrase**, model, and path as `app/api/elevenlabs/voice-sample/route.js`. By default it **skips** files that already exist. After seeding, first user plays hit Storage immediately.

## IAM for the Admin service account

The Firebase Admin service account needs permission to **write** objects and **set public ACL** if your project uses fine-grained access. Typical role: **Storage Object Admin** on the bucket. If uploads fail with 403, add that role in Google Cloud Console → Storage → bucket → Permissions.
