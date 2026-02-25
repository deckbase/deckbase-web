/**
 * Auth for ElevenLabs API routes (TTS, voice-sample).
 * In production accepts either:
 * 1. X-API-Key: <ELEVENLABS_MOBILE_API_KEY> (no Firebase, no Pro check)
 * 2. Authorization: Bearer <Firebase ID token> + Pro subscription
 */

import { NextResponse } from "next/server";
import { getAdminAuth } from "@/utils/firebase-admin";
import { isEntitledTo } from "@/lib/revenuecat-server";

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
  const expectedApiKey = process.env.ELEVENLABS_MOBILE_API_KEY?.trim();

  if (expectedApiKey && apiKeyHeader === expectedApiKey) {
    return { ok: true };
  }

  const auth = getAdminAuth();
  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!auth || !bearer) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Authentication required. Send X-API-Key or Authorization: Bearer <Firebase ID token>.",
          code: "auth_missing",
        },
        { status: 401 }
      ),
    };
  }

  try {
    const decoded = await auth.verifyIdToken(bearer);
    const entitled = await isEntitledTo(decoded.uid);
    if (!entitled) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Active subscription required", code: "subscription_required" },
          { status: 403 }
        ),
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid or expired token", code: "auth_invalid_or_expired" },
        { status: 401 }
      ),
    };
  }
}
