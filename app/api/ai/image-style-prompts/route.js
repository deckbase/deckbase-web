import { NextResponse } from "next/server";
import { requireElevenLabsAuth } from "@/lib/elevenlabs-auth";
import { isBasicOrProOrVip } from "@/lib/revenuecat-server";
import {
  STYLE_PROMPT_LIBRARY_VERSION,
  collectStylePromptTags,
  filterStylePromptEntriesByTag,
  getStylePromptEntries,
} from "@/lib/image-style-prompts";

/**
 * GET /api/ai/image-style-prompts?tag=&uid=
 * Subscribers only (Basic/Pro/VIP). Optional tag filter (kebab-case, OR match).
 * Mobile: X-API-Key + ?uid= for entitlement.
 */
export async function GET(request) {
  try {
    const authResult = await requireElevenLabsAuth(request);
    if (!authResult.ok) return authResult.response;

    const url = new URL(request.url);
    const tag = url.searchParams.get("tag")?.trim() || "";
    const queryUid = url.searchParams.get("uid")?.trim() || "";
    const effectiveUid = authResult.uid || queryUid || null;

    if (process.env.NODE_ENV === "production") {
      if (!effectiveUid) {
        return NextResponse.json(
          {
            error:
              "Authentication required. Use a Bearer token or X-API-Key with uid query parameter.",
          },
          { status: 401 }
        );
      }
      const entitled = await isBasicOrProOrVip(effectiveUid);
      if (!entitled) {
        return NextResponse.json(
          { error: "Active subscription required for the style prompt library" },
          { status: 403 }
        );
      }
    }

    const all = getStylePromptEntries();
    const entries = tag ? filterStylePromptEntriesByTag(all, tag) : all;

    return NextResponse.json({
      version: STYLE_PROMPT_LIBRARY_VERSION,
      tags: collectStylePromptTags(all),
      entries,
    });
  } catch (e) {
    console.error("[ai/image-style-prompts]", e);
    return NextResponse.json({ error: "Failed to load style prompts" }, { status: 500 });
  }
}
