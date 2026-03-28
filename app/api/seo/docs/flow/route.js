import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { requireAdmin } from "@/lib/require-admin-auth";

/**
 * GET /api/seo/docs/flow
 * Returns the SEO Command Center flow doc (markdown) for the in-app modal.
 */
export async function GET(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const path = join(process.cwd(), "docs", "SEO_COMMAND_CENTER_FLOW.md");
    const content = await readFile(path, "utf-8");
    return NextResponse.json({ content });
  } catch (err) {
    console.error("[api/seo/docs/flow]", err);
    return NextResponse.json(
      { error: err.message || "Doc not found" },
      { status: 500 }
    );
  }
}
