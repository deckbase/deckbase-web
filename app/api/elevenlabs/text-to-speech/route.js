import { NextResponse } from "next/server";
import { getAdminAuth } from "@/utils/firebase-admin";
import { isEntitledTo } from "@/lib/revenuecat-server";

/**
 * POST /api/elevenlabs/text-to-speech
 * Body: { text: string, voice_id?: string }
 * Returns: audio/mpeg binary (or JSON error).
 * In production requires auth and Pro subscription.
 */
export async function POST(request) {
  try {
    if (process.env.NODE_ENV === "production") {
      const auth = getAdminAuth();
      const authHeader = request.headers.get("authorization") || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      if (!auth || !idToken) {
        return NextResponse.json(
          { error: "Authentication required to generate audio in production" },
          { status: 401 }
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
      const entitled = await isEntitledTo(uid);
      if (!entitled) {
        return NextResponse.json(
          { error: "Active subscription required to generate audio" },
          { status: 403 }
        );
      }
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const defaultVoiceId =
      process.env.ELEVENLABS_DEFAULT_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel if not set

    if (!apiKey) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY is not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const voiceId = body.voice_id || defaultVoiceId;

    if (!text) {
      return NextResponse.json(
        { error: "Missing or empty text" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs API error:", response.status, errText);
      return NextResponse.json(
        {
          error: "ElevenLabs TTS failed",
          details: response.status === 401 ? "Invalid API key" : errText.slice(0, 200),
        },
        { status: response.status >= 500 ? 502 : 400 }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("ElevenLabs TTS error:", error);
    return NextResponse.json(
      { error: "Failed to generate speech", message: error.message },
      { status: 500 }
    );
  }
}
