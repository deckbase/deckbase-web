import { NextResponse } from "next/server";
import { getKeywordUrlMapping, setKeywordUrlMapping } from "@/lib/seo-firestore";

/**
 * GET /api/seo/keyword-url-mapping
 * Returns the current keyword → URL mapping for Step 4 → Step 5 hand-off.
 */
export async function GET() {
  try {
    const mappings = await getKeywordUrlMapping();
    return NextResponse.json({ mappings });
  } catch (err) {
    console.error("[api/seo/keyword-url-mapping]", err);
    return NextResponse.json(
      { error: err.message || "Failed to load mapping" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/seo/keyword-url-mapping
 * Body: { mappings: Record<string, string> } — full replace (so client can remove entries by omitting them).
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const incoming = body.mappings && typeof body.mappings === "object" ? body.mappings : {};
    const normalized = {};
    for (const [k, v] of Object.entries(incoming)) {
      const key = (k || "").toString().trim().toLowerCase();
      const url = (v || "").toString().trim();
      if (key && url) normalized[key] = url;
    }
    await setKeywordUrlMapping(normalized);
    return NextResponse.json({ ok: true, mappings: normalized });
  } catch (err) {
    console.error("[api/seo/keyword-url-mapping]", err);
    return NextResponse.json(
      { error: err.message || "Failed to save mapping" },
      { status: 500 }
    );
  }
}
