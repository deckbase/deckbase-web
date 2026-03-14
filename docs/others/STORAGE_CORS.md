# Fix Firebase Storage CORS (upload from browser)

When you see:

```text
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' from origin 'http://localhost:3000'
has been blocked by CORS policy
```

the Storage bucket is not allowing browser requests from your app origin. **You must run one of the commands below once** (from this repo root).

---

## Quick fix (copy-paste)

From the **project root** (where `storage-cors.json` lives), after [installing Google Cloud SDK](https://cloud.google.com/sdk/docs/install) and logging in:

```bash
gcloud auth login
gcloud config set project lingo-buddy-dev
gsutil cors set storage-cors.json gs://lingo-buddy-dev.appspot.com
```

(If your Firebase project uses the newer bucket ID, try `gs://lingo-buddy-dev.firebasestorage.app` first; if you get "bucket does not exist", use `gs://lingo-buddy-dev.appspot.com` above.)

**Alternative (if you use `gcloud` but not `gsutil`):**

```bash
gcloud storage buckets update gs://lingo-buddy-dev.appspot.com --cors-file=storage-cors.json
```

Then reload the app and try "Start analysis" again from `http://localhost:3000`.

**If uploads still fail:** Your app may be using the other bucket ID. In `.env` set:

```bash
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=lingo-buddy-dev.appspot.com
```

Restart the dev server (`npm run dev`) and try again. Use the bucket that has CORS set.

---

## Get your bucket name

Firebase Console → **Project settings** → **General** → **Your apps** → **Storage bucket**. Use that value in the commands above (e.g. `lingo-buddy-dev.firebasestorage.app` or `lingo-buddy-dev.appspot.com`).

---

## Add production origin later

Edit **`storage-cors.json`** in the project root and add your production URL to the `"origin"` array, then re-run the same `gsutil cors set` or `gcloud storage buckets update` command.

---

## Verify CORS is set

```bash
gsutil cors get gs://lingo-buddy-dev.appspot.com
```

You should see the same origins and methods as in `storage-cors.json`.
