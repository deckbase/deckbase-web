import { NextResponse } from "next/server";

/**
 * GET /api/proxy-image?url=<encoded-image-url>
 *
 * Proxies an image request server-side to avoid CORS when the client needs
 * to fetch an image (e.g. Firebase Storage download URL) for editing/crop.
 * Only allows URLs from Firebase Storage / Google Cloud Storage.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  const allowedHosts = [
    "firebasestorage.googleapis.com",
    "storage.googleapis.com",
    "storage.cloud.google.com",
  ];
  if (!allowedHosts.includes(parsed.hostname)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Deckbase-Proxy/1.0" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}` },
        { status: res.status }
      );
    }
    const contentType = res.headers.get("content-type") || "image/png";
    const blob = await res.arrayBuffer();
    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    console.error("[proxy-image]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch image" },
      { status: 502 }
    );
  }
}
