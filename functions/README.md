# Firebase Cloud Functions

## onSpeechDocCreated

When a new transcript document is created at `people/{personId}/docs/{docId}` with `status: "queued"`, this function calls your Speech Analyzer Cloud Run service so analysis runs automatically (no need for the client to call `/api/speech/trigger-analysis`).

## Setup

1. Deploy the Speech Analyzer to Cloud Run (see `../speech-analyzer/README.md`).
2. In the `functions/` directory, create a `.env` file (or use Firebase config):

   ```
   SPEECH_ANALYZER_URL=https://speech-analyzer-xxxx.run.app
   SPEECH_ANALYZER_SECRET=your-secret
   ```

3. Install and deploy:

   ```bash
   cd functions
   npm install
   cd ..
   firebase use lingo-buddy-dev   # or your project
   firebase deploy --only functions
   ```

After deployment, every new queued transcript will trigger the analyzer.
