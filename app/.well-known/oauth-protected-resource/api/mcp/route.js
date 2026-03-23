import { NextResponse } from "next/server";
import {
  getProtectedResourceMetadata,
} from "@/lib/mcp-protected-resource-metadata";
import { MCP_BROWSER_CORS, mergeHeaders } from "@/lib/mcp-cors";

export const dynamic = "force-dynamic";

function jsonHeaders(extra = {}) {
  return mergeHeaders(MCP_BROWSER_CORS, {
    "Content-Type": "application/json",
    ...extra,
  });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: jsonHeaders() });
}

export function GET() {
  const metadata = getProtectedResourceMetadata();
  if (!metadata) {
    return NextResponse.json(
      { error: "OAuth not configured" },
      { status: 503, headers: jsonHeaders() }
    );
  }
  return NextResponse.json(metadata, {
    headers: {
      ...jsonHeaders(),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
