/**
 * Hosted MCP endpoint (JSON-RPC over POST).
 * Auth: Authorization: Bearer <dashboard API key> OR <OAuth access token from /api/mcp/oauth/token>.
 *
 * POST /api/mcp
 * Body: JSON-RPC 2.0 request { jsonrpc, id, method, params }
 * Response: JSON-RPC 2.0 response { jsonrpc, id, result? | error? }
 */

import { NextResponse } from "next/server";
import { handleMcpRequest } from "@/lib/mcp-handlers";
import { resolveMcpBearer } from "@/lib/mcp-auth";
import { getMcpResourceMetadataWwwAuthenticateValue } from "@/lib/mcp-protected-resource-metadata";
import { isBasicOrProOrVip } from "@/lib/revenuecat-server";
import { incrementMcpRequests } from "@/lib/usage-limits";

function mcpUnauthorizedJson(body) {
  const headers = {};
  const www = getMcpResourceMetadataWwwAuthenticateValue();
  if (www) {
    headers["WWW-Authenticate"] = www;
  }
  return NextResponse.json(body, { status: 401, headers });
}

export async function POST(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return mcpUnauthorizedJson({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32001,
        message: "Missing Authorization: Bearer <API key or OAuth access token>",
      },
    });
  }

  const resolved = await resolveMcpBearer(token);
  if (!resolved) {
    return mcpUnauthorizedJson({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32001,
        message: "Invalid API key or OAuth access token",
      },
    });
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

  incrementMcpRequests(uid, 1).catch((err) =>
    console.warn("[api/mcp] mcp usage increment failed", err?.message)
  );

  const response = { jsonrpc: "2.0", id };
  if (error) {
    response.error = error;
    return NextResponse.json(response, { status: 200 });
  }
  response.result = result ?? {};
  return NextResponse.json(response);
}
