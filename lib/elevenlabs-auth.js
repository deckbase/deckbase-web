/**
 * Auth for ElevenLabs API routes (TTS, voice-sample).
 * Web dashboard: Bearer <Firebase ID token> → returns uid for Pro + usage limit check.
 * Mobile app: X-API-Key: <DECKBASE_API_KEY>; can send uid in body for limit check.
 */

import { NextResponse } from "next/server";
import { getAdminAuth } from "@/utils/firebase-admin";

/**
 * Returns { ok: true, uid?: string } if auth passes, or { ok: false, response } with a NextResponse to return.
 * @param {Request} request
 * @returns {Promise<{ ok: true, uid?: string } | { ok: false, response: NextResponse }>}
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

  const authHeader = request.headers.get("authorization") || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (idToken) {
    try {
      const auth = getAdminAuth();
      if (auth) {
        const decoded = await auth.verifyIdToken(idToken);
        return { ok: true, uid: decoded.uid };
      }
    } catch {
      /* invalid token */
    }
  }

  return {
    ok: false,
    response: NextResponse.json(
      {
        error: "Authentication required. Use Bearer token (web) or X-API-Key (mobile).",
        code: "auth_missing",
      },
      { status: 401 }
    ),
  };
}
