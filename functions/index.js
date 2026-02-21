/**
 * Firebase Cloud Functions.
 *
 * - onSpeechDocCreated: when a new transcript doc is created under
 *   people/{personId}/docs, calls the Speech Analyzer Cloud Run service
 *   so analysis runs without the client having to call trigger-analysis.
 *
 * Set SPEECH_ANALYZER_URL and optionally SPEECH_ANALYZER_SECRET in
 * Firebase config: firebase functions:config:set speech_analyzer.url="https://..."
 * and speech_analyzer.secret="..."
 * Or use .env (with firebase-functions config in firebase.json).
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineString } from "firebase-functions/params";

const analyzerUrl = defineString("SPEECH_ANALYZER_URL", { default: "" });
const analyzerSecret = defineString("SPEECH_ANALYZER_SECRET", { default: "" });

export const onSpeechDocCreated = onDocumentCreated(
  "people/{personId}/docs/{docId}",
  async (event) => {
    const url = analyzerUrl.value();
    if (!url) {
      console.warn("SPEECH_ANALYZER_URL not set; skipping analyzer trigger.");
      return null;
    }

    const personId = event.params.personId;
    const doc = event.data?.data();
    if (doc?.status !== "queued") return null;

    const endpoint = `${url.replace(/\/$/, "")}/analyze?personId=${encodeURIComponent(personId)}`;
    const headers = { "Content-Type": "application/json" };
    if (analyzerSecret.value()) headers["X-API-Key"] = analyzerSecret.value();

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ personId }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("Speech analyzer failed:", res.status, text);
      }
    } catch (err) {
      console.error("Speech analyzer trigger error:", err);
    }
    return null;
  }
);
