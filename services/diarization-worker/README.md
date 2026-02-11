# Diarization Worker (Cloud Run)

This service receives diarization jobs from the web app and posts results back
to the callback endpoint. The current implementation uses YouTube transcript
segments with multiple fallbacks (`youtube-transcript`, HTML parsing, timedtext
track list, and `ytdl-core`) and assigns them to speakers in a simple round-robin
pattern. Replace `buildResultFromTranscript` with a real diarization pipeline
when ready.

## Local run

```bash
npm install
npm start
```

POST a job:

```bash
curl -X POST http://localhost:8080/run \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "demo-job",
    "youtubeUrl": "https://www.youtube.com/watch?v=...",
    "speakerCount": 3,
    "callbackUrl": "https://your-app.com/api/diarization/callback"
  }'
```

## Cloud Run deploy

From this folder:

```bash
gcloud run deploy speech-diarization-worker \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

After deploy, set `DIARIZATION_WORKER_URL` in the web app to the Cloud Run URL.

## Environment variables

- `WORKER_TOKEN` (optional): Require `Authorization: Bearer <token>` for /run
- `CALLBACK_TOKEN` (optional): Sends `Authorization: Bearer <token>` to callback
