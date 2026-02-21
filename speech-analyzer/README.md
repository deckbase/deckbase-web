# Speech Analyzer (Cloud Run)

Analyzes speech transcripts and writes vocabulary, phrases, and patterns to Firestore. **Source of truth:** `people/{personId}/analysis_sessions/{sessionId}` (session doc holds all analysis results).

## Deploy to Cloud Run

From this directory (`speech-analyzer/`):

```bash
# Set your GCP project
gcloud config set project YOUR_PROJECT_ID

# Deploy (builds from Dockerfile)
gcloud run deploy speech-analyzer \
  --source . \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --timeout 600 \
  --set-env-vars "SPEECH_ANALYZER_SECRET=your-secret" \
  --allow-unauthenticated
```

For private invocation (e.g. from your Next.js API route with a secret), use `--no-allow-unauthenticated` and grant the Cloud Run Invoker role to your App Engine / service account.

## Trigger analysis

**HTTP:**

```bash
curl -X POST "https://YOUR_SERVICE_URL/analyze?personId=THE_PERSON_ID" \
  -H "X-API-Key: your-secret"
```

**From the web app:** After uploading a transcript, the app calls `POST /api/speech/trigger-analysis` with `{ "personId": "..." }`, which invokes this service.

## Environment

- `GOOGLE_APPLICATION_CREDENTIALS` – optional; on Cloud Run use the default service account.
- `SPEECH_ANALYZER_SECRET` – optional; if set, requests must include `X-API-Key: <value>`.

## Firestore / Storage

- Reads: `people/{personId}/docs` (status `queued`), and transcript files from the path in `storagePath` (e.g. `gs://bucket/speech-transcripts/...`).
- Writes: `people/{personId}/analysis_sessions/{sessionId}` only (progress, vocabulary, learningPhrases, patternPhrases, signaturePhrases, corpusStats). No separate analysis collection.
- Updates each processed doc to `status: "done"`.
