# Firebase Cloud Functions

## `purgeSoftDeletedScheduled`

Runs **daily at 07:00 UTC** and hard-deletes soft-deleted data past retention:

- **Default retention:** 30 days (`PURGE_RETENTION_DAYS`)
- **Default behavior:** real deletes (not dry-run). Set `PURGE_DRY_RUN=true` on the function to log only.

### Deploy to **deckbase-prod**

Prerequisites: [Firebase CLI](https://firebase.google.com/docs/cli), **Blaze** plan (required for scheduled functions), logged in with access to the project.

```bash
cd functions && npm install && cd ..
firebase login
firebase use deckbase-prod   # or: firebase use prod (see ../.firebaserc)
firebase deploy --only functions
```

After first deploy, open **Google Cloud Console → Cloud Functions → `purgeSoftDeletedScheduled` → Edit** and optionally set environment variables:

| Variable | Purpose |
|----------|---------|
| `PURGE_RETENTION_DAYS` | Default `30` |
| `PURGE_DRY_RUN` | `true` = no deletes (testing) |
| `FIRESTORE_DATABASE_ID` | If you use a non-default Firestore database |
| `PURGE_STORAGE_BUCKET` | If the default bucket name is not correct |
To change **schedule** or **region**, edit `functions/index.js` (`onSchedule` options) and redeploy.

### Local emulator

```bash
cd functions
npm run serve
```

---

Add more triggers in `index.js` as needed.

## Troubleshooting deploy

### “Could not build the function due to a missing permission on the build service account”

Gen2 functions build with **Cloud Build** and store images in **Artifact Registry**. Fix is usually IAM + APIs on **deckbase-prod** (must be **Owner** or **Editor**, or custom roles that include IAM changes).

1. **Enable APIs** (Console: APIs & Services → Enable, or use `gcloud`):

   - `cloudbuild.googleapis.com`
   - `artifactregistry.googleapis.com`
   - `run.googleapis.com`
   - `cloudfunctions.googleapis.com`

2. **Grant Artifact Registry access to the Cloud Build service account**  
   Replace `PROJECT_ID` with your Firebase/GCP project id (e.g. `deckbase-prod`) and `PROJECT_NUMBER` with the numeric project id (from [Project settings](https://console.firebase.google.com/) or GCP Console header):

   ```bash
   gcloud config set project PROJECT_ID

   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
     --role="roles/artifactregistry.createOnPushWriter"
   ```

   If that role isn’t available in your org, try `roles/artifactregistry.writer` on the project.

3. **Org policy**  
   If this still fails, an org admin may need to allow Cloud Build / Artifact Registry for the folder (see [Google’s troubleshooting doc](https://cloud.google.com/functions/docs/troubleshooting#build-service-account)).

4. Redeploy:

   ```bash
   firebase deploy --only functions
   ```

### “How many days do you want to keep container images?”

The CLI is asking for an **Artifact Registry cleanup policy** (old build images). Pick something reasonable (e.g. **`7`** or **`30`** days) and press Enter.  
To avoid the prompt next time, you can set the policy once in **Google Cloud Console → Artifact Registry → your `gcf-artifacts` repo (or similar) → Cleanup policies**, or run deploy from a context where defaults are already set.

### Non-interactive deploy (CI)

```bash
firebase deploy --only functions --non-interactive
```

If the cleanup question still appears, answer it once interactively, then future deploys may stop asking after the policy exists.
