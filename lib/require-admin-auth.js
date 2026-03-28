import { NextResponse } from "next/server";
import { getAdminAuth } from "@/utils/firebase-admin";
import { isAdminEmail } from "@/lib/admin-allowlist";

/**
 * Verifies Firebase ID token and ADMIN_EMAILS allowlist.
 * @param {Request} request
 * @returns {Promise<null | NextResponse>} null if allowed, or 401/403/503 JSON response
 */
export async function requireAdmin(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }
  const auth = getAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }
  let decoded;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
  const email = decoded.email;
  if (!email || !isAdminEmail(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
