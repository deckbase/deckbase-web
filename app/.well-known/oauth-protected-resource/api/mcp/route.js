import { NextResponse } from "next/server";
import {
  getProtectedResourceMetadata,
} from "@/lib/mcp-protected-resource-metadata";

export const dynamic = "force-dynamic";

export function GET() {
  const metadata = getProtectedResourceMetadata();
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
