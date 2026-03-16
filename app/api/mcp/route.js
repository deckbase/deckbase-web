/**
 * Hosted MCP endpoint (JSON-RPC over POST).
 * Auth: Authorization: Bearer <API key> (API key only; no Firebase token).
 *
 * POST /api/mcp
 * Body: JSON-RPC 2.0 request { jsonrpc, id, method, params }
 * Response: JSON-RPC 2.0 response { jsonrpc, id, result? | error? }
 */

import { NextResponse } from "next/server";
import { handleMcpRequest } from "@/lib/mcp-handlers";
import { resolveAuthApiKeyOnly } from "@/lib/auth-api";
import { isBasicOrProOrVip } from "@/lib/revenuecat-server";

export async function POST(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Missing Authorization: Bearer <API key>" } },
      { status: 401 }
    );
  }

  const resolved = await resolveAuthApiKeyOnly(token);
  if (!resolved) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Invalid or unknown API key" } },
      { status: 401 }
    );
  }
  const uid = resolved.uid;

  if (process.env.NODE_ENV === "production") {
    const entitled = await isBasicOrProOrVip(uid);
    if (!entitled) {
      return NextResponse.json(
        { jsonrpc: "2.0", id: null, error: { code: -32002, message: "MCP is available for Pro and VIP subscribers only" } },
        { status: 403 }
      );
    }
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 }
    );
  }

  const id = body.id;
  const rootPath = process.cwd();
  const context = { uid };
  const { result, error } = await handleMcpRequest(rootPath, body, context);

  const response = { jsonrpc: "2.0", id };
  if (error) {
    response.error = error;
    return NextResponse.json(response, { status: 200 });
  }
  response.result = result ?? {};
  return NextResponse.json(response);
}
