import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/utils/firebaseAdmin";

export async function POST(request) {
  try {
    const body = await request.json();
    const jobId = body.jobId;
    if (!jobId) {
      return NextResponse.json(
        { error: "jobId is required" },
        { status: 400 }
      );
    }

    const jobRef = adminDb.collection("speech_diarization_jobs").doc(jobId);
    const status = body.status || "done";
    const progressPercent = Number.isFinite(body.progress?.percent)
      ? body.progress.percent
      : status === "done"
      ? 100
      : 0;

    const updateData = {
      status,
      progress: {
        status,
        percent: progressPercent,
      },
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (body.error) {
      updateData.progress.error = body.error;
    }
    if (body.result) {
      updateData.result = body.result;
    }

    await jobRef.set(updateData, { merge: true });
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Diarization callback error:", error);
    return NextResponse.json(
      { error: "Unable to update diarization job" },
      { status: 500 }
    );
  }
}
