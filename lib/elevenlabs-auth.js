/**
 * Auth for ElevenLabs API routes (TTS, voice-sample).
 * Mobile app: X-API-Key: <DECKBASE_API_KEY> (no Pro check; we don't have uid).
 * Dashboard API keys (Bearer) are for MCP only, not used here.
 */

import { NextResponse } from "next/server";

/**
 * Returns { ok: true } if auth passes, or { ok: false, response } with a NextResponse to return.
 * @param {Request} request
 * @returns {Promise<{ ok: true } | { ok: false, response: NextResponse }>}
 */
export async function requireElevenLabsAuth(request) {
  if (process.env.NODE_ENV !== "production") {
    return { ok: true };
  }

  const apiKeyHeader = request.headers.get("x-api-key")?.trim();
  const expectedKey = process.env.DECKBASE_API_KEY?.trim();

  if (expectedKey && apiKeyHeader === expectedKey) {
    return { ok: true };
  }

  return {
    ok: false,
    response: NextResponse.json(
      {
        error: "Authentication required. Send X-API-Key with mobile API key.",
        code: "auth_missing",
      },
      { status: 401 }
    ),
  };
}
