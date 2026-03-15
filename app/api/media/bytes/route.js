import { NextResponse } from "next/server";
import { getAdminAuth, getAdminBucket } from "@/utils/firebase-admin";
import { getAdminFirestore } from "@/utils/firebase-admin";

/**
 * POST /api/media/bytes
 * Body: { mediaId: string }
 * Auth: Bearer <Firebase ID token>
 * Returns: binary media (audio/image) for the given mediaId.
 * Used by APKG export so media is fetched server-side (no client URL/proxy issues).
 */
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";
    if (!idToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const auth = getAdminAuth();
    if (!auth) {
      return NextResponse.json(
        { error: "Server not configured" },
        { status: 503 }
      );
    }

    let uid;
    try {
      const decoded = await auth.verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    const mediaId =
      typeof body?.mediaId === "string" ? body.mediaId.trim() : "";
    if (!mediaId) {
      return NextResponse.json(
        { error: "Missing mediaId" },
        { status: 400 }
      );
    }
    console.log("[media/bytes] request", { mediaId, uid });

    const db = getAdminFirestore();
    const bucket = getAdminBucket();
    if (!db || !bucket) {
      return NextResponse.json(
        { error: "Storage not configured" },
        { status: 503 }
      );
    }

    const mediaRef = db
      .collection("users")
      .doc(uid)
      .collection("media")
      .doc(mediaId);
    const mediaSnap = await mediaRef.get();
    if (!mediaSnap.exists) {
      console.warn("[media/bytes] media doc not found", { mediaId, uid });
      return NextResponse.json(
        { error: "Media not found" },
        { status: 404 }
      );
    }

    const data = mediaSnap.data();
    const storagePath =
      data.storage_path || data.storagePath || null;
    if (!storagePath || typeof storagePath !== "string") {
      console.warn("[media/bytes] no storage path", { mediaId, uid, keys: Object.keys(data || {}) });
      return NextResponse.json(
        { error: "Media has no storage path" },
        { status: 404 }
      );
    }

    const [bytes] = await bucket.file(storagePath).download();
    const contentType =
      data.mime_type || data.mimeType || "application/octet-stream";
    console.log("[media/bytes] ok", { mediaId, storagePath, bytesLength: bytes?.length, contentType });

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("[media/bytes]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch media" },
      { status: 502 }
    );
  }
}
