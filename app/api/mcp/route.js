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
import { MCP_API_BROWSER_CORS, mergeHeaders } from "@/lib/mcp-cors";
import { isBasicOrProOrVip } from "@/lib/revenuecat-server";
import { incrementMcpRequests } from "@/lib/usage-limits";

function mcpJsonHeaders(extra = {}) {
  return mergeHeaders(MCP_API_BROWSER_CORS, extra);
}

function mcpUnauthorizedJson(body) {
  const headers = mcpJsonHeaders();
  const www = getMcpResourceMetadataWwwAuthenticateValue();
  if (www) {
    headers["WWW-Authenticate"] = www;
  }
  return NextResponse.json(body, { status: 401, headers });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: mcpJsonHeaders() });
}

/**
 * Browser clients (ChatGPT, etc.) may probe GET before POST; advertise OAuth without a session.
 */
export async function GET() {
  return mcpUnauthorizedJson({
    jsonrpc: "2.0",
    id: null,
    error: {
      code: -32001,
      message:
        "Use POST with JSON-RPC for MCP. Sign in via OAuth (WWW-Authenticate) or send Authorization: Bearer API key.",
    },
  });
}

export async function POST(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (!token) {
    return mcpUnauthorizedJson({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32001,
        message:
          "Missing Authorization: Bearer <API key or OAuth access token>",
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

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      },
      { status: 400, headers: mcpJsonHeaders() },
    );
  }

  const id = body.id;
  const method = typeof body?.method === "string" ? body.method : "";

  // Allow client discovery methods even when entitlement checks fail/flap.
  // Restrict paid access at execution time (tools/call) instead.
  if (process.env.NODE_ENV === "production" && method === "tools/call") {
    const entitled = await isBasicOrProOrVip(uid);
    if (!entitled) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32002,
            message: "MCP is available for Pro and VIP subscribers only",
          },
        },
        { status: 403, headers: mcpJsonHeaders() },
      );
    }
  }

  const rootPath = process.cwd();
  const context = { uid };
  const { result, error } = await handleMcpRequest(rootPath, body, context);

  incrementMcpRequests(uid, 1).catch((err) =>
    console.warn("[api/mcp] mcp usage increment failed", err?.message),
  );

  const response = { jsonrpc: "2.0", id };
  if (error) {
    response.error = error;
    return NextResponse.json(response, {
      status: 200,
      headers: mcpJsonHeaders(),
    });
  }
  response.result = result ?? {};
  return NextResponse.json(response, { headers: mcpJsonHeaders() });
}
