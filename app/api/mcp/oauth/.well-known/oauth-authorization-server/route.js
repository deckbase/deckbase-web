import { NextResponse } from "next/server";
import { getOAuthAuthorizationServerMetadata } from "@/lib/mcp-oauth-metadata";

export const dynamic = "force-dynamic";

export function GET() {
  const metadata = getOAuthAuthorizationServerMetadata();
  if (!metadata) {
    return NextResponse.json(
      { error: "OAuth not configured" },
      { status: 503 }
    );
  }
  return NextResponse.json(metadata, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/json",
    },
  });
}
