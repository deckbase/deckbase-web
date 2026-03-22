/**
 * POST /api/mcp/oauth/authorize/complete
 * After Firebase sign-in, exchanges ID token for authorization code and returns redirect URL.
 */

import { NextResponse } from "next/server";
import { getAdminAuth } from "@/utils/firebase-admin";
import {
  storeAuthorizationCode,
  validateClientRedirect,
  isMcpOAuthConfigured,
} from "@/lib/mcp-oauth";
import { isBasicOrProOrVip } from "@/lib/revenuecat-server";

export async function POST(request) {
  if (!isMcpOAuthConfigured()) {
    return NextResponse.json(
      { error: "MCP OAuth is not configured" },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const idToken = typeof body.idToken === "string" ? body.idToken.trim() : "";
  const clientId = typeof body.client_id === "string" ? body.client_id.trim() : "";
  const redirectUri = typeof body.redirect_uri === "string" ? body.redirect_uri.trim() : "";
  const codeChallenge = typeof body.code_challenge === "string" ? body.code_challenge.trim() : "";
  const codeChallengeMethod = typeof body.code_challenge_method === "string" ? body.code_challenge_method.trim() : "";
  const state = typeof body.state === "string" ? body.state : "";

  if (!idToken || !clientId || !redirectUri || !codeChallenge || !codeChallengeMethod) {
    return NextResponse.json(
      { error: "Missing idToken, client_id, redirect_uri, code_challenge, or code_challenge_method" },
      { status: 400 }
    );
  }

  const vr = validateClientRedirect(clientId, redirectUri);
  if (!vr.ok) {
    return NextResponse.json({ error: vr.error }, { status: 400 });
  }

  const auth = getAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  let uid;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid or expired idToken" }, { status: 401 });
  }

  if (process.env.NODE_ENV === "production") {
    const entitled = await isBasicOrProOrVip(uid);
    if (!entitled) {
      return NextResponse.json(
        { error: "MCP requires Pro or VIP subscription" },
        { status: 403 }
      );
    }
  }

  try {
    const code = await storeAuthorizationCode(uid, {
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod.toUpperCase(),
      state,
    });

    const redirect = new URL(redirectUri);
    redirect.searchParams.set("code", code);
    if (state) redirect.searchParams.set("state", state);

    return NextResponse.json({ redirect_url: redirect.toString() });
  } catch (e) {
    console.error("[mcp-oauth] authorize complete", e);
    return NextResponse.json(
      { error: e.message || "Failed to create authorization code" },
      { status: 500 }
    );
  }
}
