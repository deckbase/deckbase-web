import { NextResponse } from "next/server";

/**
 * POST /api/speech/trigger-analysis
 * Body: { personId: string, sessionId: string }
 *
 * Invokes the Speech Analyzer (Flask app at SPEECH_ANALYZER_URL, e.g. Cloud Run).
 * NOT the Firebase Cloud Function: the Cloud Function triggers on people/{personId}/docs
 * create and does not pass sessionId. This API is what "Start analysis" calls.
 *
 * The analyzer reads queued docs from people/{personId}/docs (status==queued) and
 * writes progress/results to people/{personId}/analysis_sessions/{sessionId}.
 * If progress stays 0/0, check analyzer logs for "[analyzer] queued docs" — often
 * 0 docs means the analyzer runs in a different GCP project or the doc write isn't visible yet.
 *
 * Env: SPEECH_ANALYZER_URL (required), SPEECH_ANALYZER_SECRET (optional)
 */
export async function POST(request) {
  const analyzerUrl = process.env.SPEECH_ANALYZER_URL?.trim();
  console.log("[trigger-analysis] SPEECH_ANALYZER_URL present:", Boolean(analyzerUrl));
  if (!analyzerUrl) {
    return NextResponse.json(
      { error: "Speech analyzer not configured (SPEECH_ANALYZER_URL missing)." },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const personId = body?.personId?.trim();
  const sessionId = body?.sessionId?.trim() || null;
  console.log("[trigger-analysis] body:", { personId, sessionId });
  if (!personId) {
    return NextResponse.json({ error: "personId is required." }, { status: 400 });
  }
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const secret = process.env.SPEECH_ANALYZER_SECRET?.trim();
  const url = `${analyzerUrl.replace(/\/$/, "")}/analyze?personId=${encodeURIComponent(personId)}&sessionId=${encodeURIComponent(sessionId)}`;
  console.log("[trigger-analysis] calling analyzer:", url);
  const headers = { "Content-Type": "application/json" };
  if (secret) headers["X-API-Key"] = secret;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ personId, sessionId }),
    });
    const data = await res.json().catch(() => ({}));
    console.log("[trigger-analysis] analyzer response:", { status: res.status, ok: res.ok, data });
    if (res.ok) {
      console.log("[trigger-analysis] If UI still shows 0/0 progress, check analyzer logs for '[analyzer] queued docs' (0 = wrong project or doc not visible to analyzer).");
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || res.statusText || "Analyzer request failed." },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }
    return NextResponse.json({ status: "started", personId, ...data });
  } catch (err) {
    console.error("[trigger-analysis] fetch error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to call speech analyzer." },
      { status: 502 }
    );
  }
}
