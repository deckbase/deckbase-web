import { NextResponse } from "next/server";
import { isAdminConfigured } from "@/utils/firebase-admin";
import { resolveAuth } from "@/lib/auth-api";
import { isVip } from "@/lib/vip-server";

/**
 * GET /api/user/vip
 * Auth: Authorization: Bearer <Firebase ID token> or <Deckbase API key> (same as /api/api-keys).
 * Returns { isVip: boolean }. VIP users get Pro features without subscription and should not see subscription UI.
 */
export async function GET(request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ isVip: false }, { status: 200 });
  }
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }
  const resolved = await resolveAuth(token);
  if (!resolved) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
  const vip = await isVip(resolved.uid);
  return NextResponse.json({ isVip: vip });
}
