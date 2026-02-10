import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/utils/firebaseAdmin";

const buildCallbackUrl = (request) => {
  if (process.env.DIARIZATION_CALLBACK_URL) {
    return process.env.DIARIZATION_CALLBACK_URL;
  }
  const origin =
    request.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL;
  return origin ? `${origin}/api/diarization/callback` : null;
};

export async function POST(request) {
  try {
    const workerUrl = process.env.DIARIZATION_WORKER_URL;
    if (!workerUrl) {
      return NextResponse.json(
        { error: "DIARIZATION_WORKER_URL not configured" },
        { status: 500 }
      );
    }

    const hasAdminEnv =
      process.env.FIREBASE_ADMIN_PROJECT_ID &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    const hasDefaultCreds = Boolean(
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        process.env.GCLOUD_PROJECT ||
        process.env.GOOGLE_CLOUD_PROJECT
    );
    if (!hasAdminEnv && !hasDefaultCreds) {
      return NextResponse.json(
        { error: "Firebase admin credentials not configured" },
        { status: 500 }
      );
    }

    const { jobId } = await request.json();
    if (!jobId) {
      return NextResponse.json(
        { error: "jobId is required" },
        { status: 400 }
      );
    }

    const jobRef = adminDb.collection("speech_diarization_jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobSnap.data();
    await jobRef.set(
      {
        status: "processing",
        progress: {
          status: "processing",
          percent: 5,
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const callbackUrl = buildCallbackUrl(request);
    const payload = {
      jobId,
      youtubeUrl: job.youtubeUrl,
      speakerCount: job.speakerCount,
      callbackUrl,
    };

    const headers = {
      "Content-Type": "application/json",
    };
    if (process.env.DIARIZATION_WORKER_TOKEN) {
      headers.Authorization = `Bearer ${process.env.DIARIZATION_WORKER_TOKEN}`;
    }

    const workerResponse = await fetch(workerUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!workerResponse.ok) {
      const message = await workerResponse.text();
      await jobRef.set(
        {
          status: "failed",
          progress: {
            status: "failed",
            percent: 0,
            error: message || "Worker request failed",
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return NextResponse.json(
        { error: message || "Worker request failed" },
        { status: 502 }
      );
    }

    return NextResponse.json({ status: "started" });
  } catch (error) {
    console.error("Diarization execution error:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to execute diarization job" },
      { status: 500 }
    );
  }
}
