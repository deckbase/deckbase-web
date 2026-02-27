# Voice sample cache: why the voice keeps changing and there’s no `tts-samples` folder

The voice-sample API is supposed to save samples to Firebase Storage (`tts-samples/{voiceId}.mp3`) and reuse them. If the **voice changes every time** and you **don’t see a `tts-samples` folder** in Storage, the server is either not configured for Storage or **cannot write** to the bucket (e.g. 403). The app then falls back to generating a new sample each time.

---

## 1. Confirm production env

In your **hosting** (e.g. Vercel → Project → Settings → Environment Variables), set:

- **`FIREBASE_STORAGE_BUCKET`** = `deckbase-prod.firebasestorage.app` (no `gs://`)

If this is missing, the API returns **503** and never writes to Storage.

---

## 2. Grant the Firebase Admin service account write access to the bucket

The API uses the **Firebase Admin SDK** with the service account (e.g. `firebase-adminsdk-fbsvc@deckbase-prod.iam.gserviceaccount.com`). That account must be able to **create objects** in the bucket.

**Option A – Bucket-level (recommended)**

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select project **deckbase-prod**.
2. Go to **Cloud Storage** → **Buckets**.
3. Click the bucket **deckbase-prod.firebasestorage.app**.
4. Open the **Permissions** tab.
5. Click **Grant access**.
6. **New principals:** paste your Firebase Admin service account email, e.g.  
   `firebase-adminsdk-fbsvc@deckbase-prod.iam.gserviceaccount.com`  
   (exact name is in Firebase Project settings → Service accounts, or in your `FIREBASE_ADMIN_CLIENT_EMAIL` env.)
7. **Role:** choose **Storage Object Admin** (or **Cloud Storage Admin**).
8. Save.

**Option B – Project-level**

1. **IAM & Admin** → **IAM**.
2. Find the principal `firebase-adminsdk-...@deckbase-prod.iam.gserviceaccount.com` (or add it).
3. Ensure it has a role that includes `storage.objects.create` (e.g. **Storage Object Admin** or **Storage Admin**) for the project.  
   If the bucket uses a different project, grant the same role in that project.

After this, the next voice-sample request that triggers a save should succeed and the **tts-samples** folder will appear in Firebase Console → Storage for that bucket.

---

## 2b. Public read for samples only (permanent URL, no bucket-wide public)

The API calls `makePublic()` on each `tts-samples/*.mp3` file so it can return a permanent public URL. Only those objects become public; the rest of the bucket stays private.

**Recommended: use Fine-grained (object-level) access**

1. Open your bucket in Google Cloud Console:  
   **https://console.cloud.google.com/storage/browser/deckbase-prod.firebasestorage.app?project=deckbase-prod**
2. Click the **Configuration** tab (or the bucket name, then **Edit** / **Permissions** depending on UI).
3. Under **Access control**, set to **Fine-grained** (object-level ACLs). Save if you change it.
4. Do **not** grant `allUsers` at the bucket level. The API will call `makePublic()` only on `tts-samples/{voiceId}.mp3`; only those objects get a public ACL. Other objects (user media, etc.) stay private.

If your bucket is **Uniform** (ACLs disabled), `makePublic()` will fail. Then either switch the bucket to Fine-grained, or grant `allUsers` **Storage Object Viewer** with an IAM condition limited to the prefix `tts-samples/` (see [Google Cloud docs](https://cloud.google.com/storage/docs/access-control/using-iam-permissions#bucket-policy)).

---

## 3. Pre-fill samples with a script (no server write needed)

If you prefer not to give the server write access, you can create the files once from your machine:

```bash
# From repo root, with env loaded (e.g. from .env.prod)
node --env-file=.env.prod scripts/seed-voice-samples.js
```

Or:

```bash
export $(grep -v '^#' .env.prod | xargs)
node scripts/seed-voice-samples.js
```

The script uses the same `FIREBASE_STORAGE_BUCKET`, Firebase Admin credentials, and `ELEVENLABS_API_KEY` to generate each voice sample and upload it to `gs://deckbase-prod.firebasestorage.app/tts-samples/{voiceId}.mp3`. After it runs, the API will find the files (read-only) and stop calling ElevenLabs for samples.

If the script fails with **403 / permission denied**, fix IAM as in step 2 (your local run uses the same service account key from env).

---

## 4. Check what the API is doing

- **Response header `X-Voice-Sample-Source`:**  
  - `cache` or `storage` → sample came from cache/Storage (same voice).  
  - `elevenlabs` → sample was just generated (and save may have failed).
- **500 with `statusCode: 403` or “permission” in the body:** server cannot write to the bucket; apply step 2.
- **Server logs:** look for `voice-sample: save failed` (and the error code) or `voice-sample: saved and verified` (success).

---

## Bucket and path

- **Bucket:** `deckbase-prod.firebasestorage.app` (same as `gs://deckbase-prod.firebasestorage.app` without the prefix).
- **Path in bucket:** `tts-samples/{voiceId}.mp3` (e.g. `tts-samples/dtSEyYGNJqjrtBArPCVZ.mp3`).
- In **Firebase Console** → **Storage**, open the bucket and look for the **tts-samples** “folder” at the root; it appears after the first successful upload.
