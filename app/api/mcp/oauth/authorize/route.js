/**
 * GET /api/mcp/oauth/authorize
 * OAuth 2.0 authorization endpoint (redirects to Firebase login page with PKCE params).
 */

import { NextResponse } from "next/server";
import { validateClientRedirect, isMcpOAuthConfigured } from "@/lib/mcp-oauth";
import { SITE_URL } from "@/lib/site-url";

export async function GET(request) {
  if (!isMcpOAuthConfigured()) {
    return NextResponse.json(
      { error: "MCP OAuth is not configured (set MCP_OAUTH_JWT_SECRET)" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const responseType = searchParams.get("response_type") || "";
  const clientId = searchParams.get("client_id") || "";
  const redirectUri = searchParams.get("redirect_uri") || "";
  const state = searchParams.get("state") || "";
  const codeChallenge = searchParams.get("code_challenge") || "";
  const codeChallengeMethod = searchParams.get("code_challenge_method") || "";

  if (responseType !== "code") {
    return NextResponse.json(
      { error: "unsupported_response_type", error_description: "Only response_type=code is supported" },
      { status: 400 }
    );
  }
  if (!clientId || !redirectUri || !codeChallenge || !codeChallengeMethod) {
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description: "Missing client_id, redirect_uri, code_challenge, or code_challenge_method",
      },
      { status: 400 }
    );
  }

  const vr = validateClientRedirect(clientId, redirectUri);
  if (!vr.ok) {
    return NextResponse.json(
      { error: "invalid_client", error_description: vr.error },
      { status: 400 }
    );
  }

  const method = codeChallengeMethod.toUpperCase();
  if (method !== "S256" && method !== "PLAIN") {
    return NextResponse.json(
      { error: "invalid_request", error_description: "code_challenge_method must be S256 or PLAIN" },
      { status: 400 }
    );
  }

  const login = new URL(`${SITE_URL}/mcp/oauth/login`);
  login.searchParams.set("client_id", clientId);
  login.searchParams.set("redirect_uri", redirectUri);
  login.searchParams.set("code_challenge", codeChallenge);
  login.searchParams.set("code_challenge_method", method);
  if (state) login.searchParams.set("state", state);

  return NextResponse.redirect(login.toString());
}
