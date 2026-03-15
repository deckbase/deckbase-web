import { NextResponse } from "next/server";
import { getAdminBucket } from "@/utils/firebase-admin";

const ALLOWED_HOSTS = [
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
  "storage.cloud.google.com",
];

const SIGNED_URL_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getBucketAndPathFromUrl(parsed) {
  if (parsed.hostname === "storage.googleapis.com") {
    const pathParts = parsed.pathname.replace(/^\/+/, "").split("/");
    const bucketName = pathParts[0];
    const objectPath = pathParts.slice(1).join("/");
    return bucketName && objectPath ? { bucketName, objectPath } : null;
  }
  if (parsed.hostname === "firebasestorage.googleapis.com") {
    const match = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (match) {
      const objectPath = decodeURIComponent(match[2]);
      return { bucketName: match[1], objectPath };
    }
  }
  return null;
}

async function proxyMediaForUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
  }

  const bucketAndPath = getBucketAndPathFromUrl(parsed);
  let fetchUrl = url;
  if (bucketAndPath) {
    const { bucketName, objectPath } = bucketAndPath;
    const bucket = getAdminBucket(bucketName);
    if (bucket) {
      try {
        const [signedUrl] = await bucket.file(objectPath).getSignedUrl({
          version: "v4",
          action: "read",
          expires: new Date(Date.now() + SIGNED_URL_EXPIRY_MS),
        });
        fetchUrl = signedUrl;
      } catch (e) {
        console.warn("[proxy-media] signed URL failed", bucketName, e?.message);
      }
    }
  }

  const res = await fetch(fetchUrl, {
    headers: { "User-Agent": "Deckbase-Proxy/1.0" },
    redirect: "follow",
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn("[proxy-media] upstream error", res.status, parsed.hostname, text?.slice(0, 200));
    return NextResponse.json(
      { error: `Upstream returned ${res.status}`, upstreamBody: text?.slice(0, 500) },
      { status: res.status }
    );
  }
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const blob = await res.arrayBuffer();
  return new NextResponse(blob, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=300",
    },
  });
}

/**
 * GET /api/proxy-media?url=...
 * Use as audio/video src so playback works with signed URLs (e.g. on edit card page).
 */
export async function GET(request) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }
  try {
    return await proxyMediaForUrl(url);
  } catch (err) {
    console.error("[proxy-media]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch media" },
      { status: 502 }
    );
  }
}

/**
 * POST /api/proxy-media
 * Body: { url: string }
 *
 * Proxies media (e.g. audio) server-side. Uses Firebase Admin to generate a fresh signed URL
 * so we never rely on expired tokens in the stored URL.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const url = body?.url;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    return await proxyMediaForUrl(url);
  } catch (err) {
    console.error("[proxy-media]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch media" },
      { status: 502 }
    );
  }
}
