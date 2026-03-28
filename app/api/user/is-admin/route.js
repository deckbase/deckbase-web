import { NextResponse } from "next/server";
import { getAdminAuth } from "@/utils/firebase-admin";
import { isAdminEmail } from "@/lib/admin-allowlist";

/**
 * GET /api/user/is-admin
 * Authorization: Bearer &lt;Firebase ID token&gt;
 * Returns { isAdmin: boolean }
 */
export async function GET(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ isAdmin: false });
  }
  const auth = getAdminAuth();
  if (!auth) {
    return NextResponse.json({ isAdmin: false });
  }
  try {
    const decoded = await auth.verifyIdToken(token);
    const email = decoded.email;
    return NextResponse.json({ isAdmin: !!(email && isAdminEmail(email)) });
  } catch {
    return NextResponse.json({ isAdmin: false });
  }
}
