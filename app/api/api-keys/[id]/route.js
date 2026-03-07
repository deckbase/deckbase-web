/**
 * DELETE /api/api-keys/[id] - Revoke an API key. Auth: Firebase ID token or API key.
 */

import { NextResponse } from "next/server";
import { resolveAuth } from "@/lib/auth-api";
import { revokeApiKey } from "@/lib/api-keys-server";
import { isProOrVip } from "@/lib/revenuecat-server";

export async function DELETE(request, context) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }
  const resolved = await resolveAuth(token);
  if (!resolved) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
  const uid = resolved.uid;

  if (process.env.NODE_ENV === "production") {
    const entitled = await isProOrVip(uid);
    if (!entitled) {
      return NextResponse.json(
        { error: "MCP and API keys are available for Pro and VIP subscribers only" },
        { status: 403 }
      );
    }
  }

  const params = await Promise.resolve(context.params || {});
  const keyId = params?.id;
  if (!keyId || typeof keyId !== "string") {
    return NextResponse.json({ error: "Key id required" }, { status: 400 });
  }

  try {
    await revokeApiKey(uid, keyId.trim());
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e.message?.includes("not found") || e.message?.includes("access denied")) {
      return NextResponse.json({ error: "API key not found or access denied" }, { status: 404 });
    }
    console.error("[api-keys] revoke failed", e);
    return NextResponse.json({ error: e.message || "Failed to revoke" }, { status: 500 });
  }
}
