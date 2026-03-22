import { NextResponse } from "next/server";
import { getAdminAuth } from "@/utils/firebase-admin";
import {
  getMonthlyUsage,
  getLimitsForUser,
  getStorageUsage,
  AI_GENERATIONS_LIMIT_PRO,
  TTS_CHARS_LIMIT_PRO,
} from "@/lib/usage-limits";

/**
 * GET /api/user/usage
 * Auth: Bearer <Firebase ID token>
 * Returns: { aiUsed, aiLimit, ttsUsed, ttsLimit, mcpUsed, storageUsed, storageLimit, isPro, tier } for the current user.
 * tier = 'free' | 'basic' | 'pro'. Limits: Basic 250 AI / 30K TTS / 2GB; Pro 600 AI / 50K TTS / 20GB.
 */
export async function GET(request) {
  try {
    if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({
      aiUsed: 0,
      aiLimit: AI_GENERATIONS_LIMIT_PRO,
      ttsUsed: 0,
      ttsLimit: TTS_CHARS_LIMIT_PRO,
      mcpUsed: 0,
      storageUsed: 0,
      storageLimit: 20 * 1024 * 1024 * 1024,
      isPro: true,
      tier: "pro",
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

    const [usage, limits, storageUsed] = await Promise.all([
      getMonthlyUsage(uid),
      getLimitsForUser(uid),
      getStorageUsage(uid),
    ]);
    const { aiLimit, ttsLimit, storageLimit, tier } = limits;
    const isPro = tier !== "free";

    return NextResponse.json({
      aiUsed: usage?.aiGenerations ?? 0,
      aiLimit,
      ttsUsed: usage?.ttsChars ?? 0,
      ttsLimit,
      mcpUsed: usage?.mcpRequests ?? 0,
      storageUsed,
      storageLimit,
      isPro,
      tier,
    });
  } catch (err) {
    console.error("[user/usage]", err);
    return NextResponse.json(
      { error: "Failed to get usage" },
      { status: 500 }
    );
  }
}
