import { NextResponse } from "next/server";
import { getAdminAuth } from "@/utils/firebase-admin";
import { isProOrVip } from "@/lib/revenuecat-server";
import {
  getMonthlyUsage,
  AI_GENERATIONS_LIMIT,
  TTS_CHARS_LIMIT,
} from "@/lib/usage-limits";

/**
 * GET /api/user/usage
 * Auth: Bearer <Firebase ID token>
 * Returns: { aiUsed, aiLimit, ttsUsed, ttsLimit, isPro } for the current user.
 */
export async function GET(request) {
  try {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({
        aiUsed: 0,
        aiLimit: AI_GENERATIONS_LIMIT,
        ttsUsed: 0,
        ttsLimit: TTS_CHARS_LIMIT,
        isPro: true,
      });
    }

    const authHeader = request.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!idToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const auth = getAdminAuth();
    if (!auth) {
      return NextResponse.json(
        { error: "Server not configured" },
        { status: 503 }
      );
    }

    let uid;
    try {
      const decoded = await auth.verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const isPro = await isProOrVip(uid);
    const usage = await getMonthlyUsage(uid);

    return NextResponse.json({
      aiUsed: usage?.aiGenerations ?? 0,
      aiLimit: isPro ? AI_GENERATIONS_LIMIT : 0,
      ttsUsed: usage?.ttsChars ?? 0,
      ttsLimit: isPro ? TTS_CHARS_LIMIT : 0,
      isPro,
    });
  } catch (err) {
    console.error("[user/usage]", err);
    return NextResponse.json(
      { error: "Failed to get usage" },
      { status: 500 }
    );
  }
}
