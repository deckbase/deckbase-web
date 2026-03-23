/**
 * POST /api/mcp/oauth/register — OAuth 2.0 Dynamic Client Registration (RFC 7591).
 * Minimal implementation for browser MCP clients (e.g. ChatGPT) that require registration_endpoint.
 * Public client (PKCE); client_id is always `deckbase` when redirect_uris are allowed.
 */

import { NextResponse } from "next/server";
import {
  isMcpOAuthConfigured,
  validateOAuthDynamicRegistration,
} from "@/lib/mcp-oauth";
import { MCP_API_BROWSER_CORS, mergeHeaders } from "@/lib/mcp-cors";

function corsHeaders(extra = {}) {
  return mergeHeaders(MCP_API_BROWSER_CORS, extra);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request) {
  if (!isMcpOAuthConfigured()) {
    return NextResponse.json(
      { error: "OAuth not configured" },
      { status: 503, headers: corsHeaders() }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "Invalid JSON" },
      { status: 400, headers: corsHeaders() }
    );
  }

  const redirectUris = body.redirect_uris;
  const v = validateOAuthDynamicRegistration(redirectUris);
  if (!v.ok) {
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: v.error },
      { status: 400, headers: corsHeaders() }
    );
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  return NextResponse.json(
    {
      client_id: v.client_id,
      client_id_issued_at: issuedAt,
      redirect_uris: redirectUris.map((u) => String(u).trim()),
    },
    { status: 201, headers: corsHeaders() }
  );
}
