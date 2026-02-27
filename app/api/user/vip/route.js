import { NextResponse } from "next/server";
import { getAdminAuth } from "@/utils/firebase-admin";
import { isVip } from "@/lib/vip-server";

/**
 * GET /api/user/vip
 * Auth: Authorization: Bearer <Firebase ID token>
 * Returns { isVip: boolean }. VIP users get Pro features without subscription and should not see subscription UI.
 */
export async function GET(request) {
  const auth = getAdminAuth();
  if (!auth) {
    return NextResponse.json({ isVip: false }, { status: 200 });
  }
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }
  try {
    const decoded = await auth.verifyIdToken(token);
    const vip = await isVip(decoded.uid);
    return NextResponse.json({ isVip: vip });
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}
