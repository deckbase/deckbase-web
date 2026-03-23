/**
 * POST /api/mcp/oauth/token
 * OAuth 2.0 token endpoint (authorization_code + refresh_token grants, PKCE).
 */

import { NextResponse } from "next/server";
import {
  consumeAuthorizationCode,
  consumeRefreshToken,
  mintAccessToken,
  mintRefreshToken,
  isMcpOAuthConfigured,
  ACCESS_TOKEN_TTL_SEC,
} from "@/lib/mcp-oauth";
import { MCP_RESOURCE_IDENTIFIER } from "@/lib/mcp-protected-resource-metadata";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

async function parseBody(request) {
  const ct = request.headers.get("content-type") || "";
  if (ct.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    return Object.fromEntries(new URLSearchParams(text));
  }
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function POST(request) {
  if (!isMcpOAuthConfigured()) {
    return NextResponse.json(
      { error: "unsupported_grant_type", error_description: "MCP OAuth is not configured" },
      { status: 503, headers: corsHeaders() }
    );
  }

  const body = await parseBody(request);
  const grantType = typeof body.grant_type === "string" ? body.grant_type.trim() : "";
  const resource =
    typeof body.resource === "string" ? body.resource.trim() : "";
  if (resource && resource !== MCP_RESOURCE_IDENTIFIER) {
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description: "Invalid resource parameter",
      },
      { status: 400, headers: corsHeaders() }
    );
  }

  try {
    if (grantType === "authorization_code") {
      const code = typeof body.code === "string" ? body.code.trim() : "";
      const redirectUri = typeof body.redirect_uri === "string" ? body.redirect_uri.trim() : "";
      const clientId = typeof body.client_id === "string" ? body.client_id.trim() : "";
      const codeVerifier = typeof body.code_verifier === "string" ? body.code_verifier.trim() : "";

      if (!code || !redirectUri || !clientId || !codeVerifier) {
        return NextResponse.json(
          {
            error: "invalid_request",
            error_description: "Missing code, redirect_uri, client_id, or code_verifier",
          },
          { status: 400, headers: corsHeaders() }
        );
      }

      const consumed = await consumeAuthorizationCode(code, clientId, redirectUri, codeVerifier);
      if (!consumed.ok) {
        return NextResponse.json(
          { error: "invalid_grant", error_description: consumed.error },
          { status: 400, headers: corsHeaders() }
        );
      }

      const accessToken = await mintAccessToken(consumed.uid);
      const { refreshToken } = await mintRefreshToken(consumed.uid);

      return NextResponse.json(
        {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: "Bearer",
          expires_in: ACCESS_TOKEN_TTL_SEC,
        },
        { headers: corsHeaders() }
      );
    }

    if (grantType === "refresh_token") {
      const refresh = typeof body.refresh_token === "string" ? body.refresh_token.trim() : "";
      if (!refresh) {
        return NextResponse.json(
          { error: "invalid_request", error_description: "Missing refresh_token" },
          { status: 400, headers: corsHeaders() }
        );
      }

      const consumed = await consumeRefreshToken(refresh);
      if (!consumed.ok) {
        return NextResponse.json(
          { error: "invalid_grant", error_description: consumed.error },
          { status: 400, headers: corsHeaders() }
        );
      }

      const accessToken = await mintAccessToken(consumed.uid);
      const { refreshToken: newRefresh } = await mintRefreshToken(consumed.uid);

      return NextResponse.json(
        {
          access_token: accessToken,
          refresh_token: newRefresh,
          token_type: "Bearer",
          expires_in: ACCESS_TOKEN_TTL_SEC,
        },
        { headers: corsHeaders() }
      );
    }

    return NextResponse.json(
      { error: "unsupported_grant_type", error_description: "Use authorization_code or refresh_token" },
      { status: 400, headers: corsHeaders() }
    );
  } catch (e) {
    console.error("[mcp-oauth] token", e);
    return NextResponse.json(
      { error: "server_error", error_description: e.message || "Token failed" },
      { status: 500, headers: corsHeaders() }
    );
  }
}
