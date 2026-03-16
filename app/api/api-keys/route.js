/**
 * API key management. Auth: Firebase ID token or API key (Bearer).
 * POST: create key (body: { label? }), returns { key, id, label, createdAt } - key shown once.
 * GET: list keys for user, returns { keys: [{ id, label, createdAt, lastUsedAt }] }.
 */

import { NextResponse } from "next/server";
import { resolveAuth } from "@/lib/auth-api";
import { createApiKey, listApiKeysByUser } from "@/lib/api-keys-server";
import { isBasicOrProOrVip } from "@/lib/revenuecat-server";

async function getUidFromRequest(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return { uid: null, error: 401 };
  const resolved = await resolveAuth(token);
  if (!resolved) return { uid: null, error: 401 };
  return { uid: resolved.uid };
}

export async function POST(request) {
  const { uid, error } = await getUidFromRequest(request);
  if (error === 401 || !uid) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }

  if (process.env.NODE_ENV === "production") {
    const entitled = await isBasicOrProOrVip(uid);
    if (!entitled) {
      return NextResponse.json(
        { error: "MCP and API keys are available for Pro and VIP subscribers only" },
        { status: 403 }
      );
    }
  }

  let body = {};
  try {
    const raw = await request.json();
    if (raw && typeof raw === "object") body = raw;
  } catch {
    // no body is ok
  }
  const label = typeof body.label === "string" ? body.label.trim() : "";

  try {
    const result = await createApiKey(uid, label || undefined);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[api-keys] create failed", e);
    return NextResponse.json(
      { error: e.message || "Failed to create API key" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const { uid, error } = await getUidFromRequest(request);
  if (error === 401 || !uid) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }

  if (process.env.NODE_ENV === "production") {
    const entitled = await isBasicOrProOrVip(uid);
    if (!entitled) {
      return NextResponse.json(
        { error: "MCP and API keys are available for Pro and VIP subscribers only" },
        { status: 403 }
      );
    }
  }

  try {
    const keys = await listApiKeysByUser(uid);
    return NextResponse.json({ keys });
  } catch (e) {
    console.error("[api-keys] list failed", e);
    return NextResponse.json(
      { error: e.message || "Failed to list API keys" },
      { status: 500 }
    );
  }
}
