import { NextResponse } from "next/server";
import { ELEVENLABS_VOICES } from "@/lib/elevenlabs-voices";

/**
 * GET /api/elevenlabs/voices
 * Returns the list of available TTS voices for mobile (and web) to show a voice picker.
 * Response: { voices: [{ group, label, id }, ...] }
 */
export async function GET() {
  return NextResponse.json({ voices: ELEVENLABS_VOICES });
}
