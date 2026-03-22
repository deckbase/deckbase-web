import { NextResponse } from "next/server";
import {
  resolveElevenlabsVoicesList,
  getCuratedVoicesNormalized,
} from "@/lib/elevenlabs-voices";

/**
 * GET /api/elevenlabs/voices
 *
 * Query:
 * - (none) — same as MCP: Deckbase curated list (see docs/api/ELEVENLABS_VOICES.md).
 * - scope=curated — same voices; explicit source label.
 *
 * Response: { voices, source, note? }
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope")?.trim().toLowerCase();

  if (scope === "elevenlabs") {
    return NextResponse.json(
      {
        error: "deprecated_scope",
        note:
          "Browsing the full ElevenLabs account library is no longer supported. Use the Deckbase curated voice list (docs/api/ELEVENLABS_VOICES.md).",
      },
      { status: 410 },
    );
  }

  if (scope && scope !== "curated") {
    return NextResponse.json(
      { error: "unknown_scope", note: "Omit scope or use scope=curated." },
      { status: 400 },
    );
  }

  if (scope === "curated") {
    return NextResponse.json({
      voices: getCuratedVoicesNormalized(),
      source: "deckbase_curated",
    });
  }

  const { voices, source, note } = await resolveElevenlabsVoicesList();
  const body = { voices, source };
  if (note) body.note = note;
  return NextResponse.json(body);
}
