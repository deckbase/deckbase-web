import { NextResponse } from "next/server";
import { getAdminAuth } from "@/utils/firebase-admin";
import { checkStorageLimit } from "@/lib/usage-limits";

/**
 * POST /api/user/storage-check
 * Auth: Bearer <Firebase ID token>
 * Body: { additionalBytes?: number } — size of file to upload (optional).
 * Returns: { allowed, used, limit, message? } — whether upload is within plan limit (Basic 2GB, Pro 20GB).
 */
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!idToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const auth = getAdminAuth();
    if (!auth) {
      return NextResponse.json({ error: "Server not configured" }, { status: 503 });
    }

    let uid;
    try {
      const decoded = await auth.verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    let additionalBytes = 0;
    try {
      const body = await request.json();
      if (body && typeof body.additionalBytes === "number" && body.additionalBytes >= 0) {
        additionalBytes = body.additionalBytes;
      }
    } catch {
      // no body or invalid JSON is ok
    }

    const result = await checkStorageLimit(uid, additionalBytes);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[user/storage-check]", err);
    return NextResponse.json(
      { allowed: false, used: 0, limit: 0, error: "Failed to check storage limit" },
      { status: 500 }
    );
  }
}
