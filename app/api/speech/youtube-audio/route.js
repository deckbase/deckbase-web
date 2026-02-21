import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const YOUTUBE_URL_REGEX =
  /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

function getVideoId(url) {
  const trimmed = (url || "").trim();
  const match = trimmed.match(YOUTUBE_URL_REGEX);
  return match ? match[1] : trimmed.length === 11 ? trimmed : null;
}

/** Dynamic import avoids ESM/CommonJS mismatch; returns default or system yt-dlp wrapper. */
async function loadYoutubeDl(useSystemFallback = false) {
  const mod = await import("youtube-dl-exec");
  if (useSystemFallback && typeof mod.create === "function") {
    return mod.create("yt-dlp");
  }
  return mod.default;
}

/**
 * GET /api/speech/youtube-audio?url=<youtube_url>
 * Downloads audio from YouTube and returns it as a file (m4a).
 * Requires yt-dlp: install system binary (e.g. brew install yt-dlp) or rely on package postinstall.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const youtubeUrl = searchParams.get("url") || "";
    const videoId = getVideoId(youtubeUrl);
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid or missing YouTube URL. Use ?url=https://www.youtube.com/watch?v=..." },
        { status: 400 }
      );
    }

    const fullUrl =
      youtubeUrl.startsWith("http") ? youtubeUrl : `https://www.youtube.com/watch?v=${videoId}`;
    const tmpDir = os.tmpdir();
    const outPath = path.join(tmpDir, `yt-audio-${Date.now()}-${videoId}.m4a`);
    const opts = {
      extractAudio: true,
      audioFormat: "m4a",
      output: outPath,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: ["referer:https://www.youtube.com/", "user-agent: Mozilla/5.0"],
    };

    let youtubedl = await loadYoutubeDl(false);
    try {
      await youtubedl(fullUrl, opts);
    } catch (downloadErr) {
      const isMissingBinary =
        downloadErr?.code === "ENOENT" || downloadErr?.errno === -2;
      if (isMissingBinary) {
        youtubedl = await loadYoutubeDl(true);
        await youtubedl(fullUrl, opts);
      } else {
        throw downloadErr;
      }
    }

    if (!fs.existsSync(outPath)) {
      return NextResponse.json(
        { error: "Audio download failed. Ensure yt-dlp is installed (e.g. brew install yt-dlp)." },
        { status: 502 }
      );
    }

    const buffer = fs.readFileSync(outPath);
    try {
      fs.unlinkSync(outPath);
    } catch (_) {}

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mp4",
        "Content-Disposition": `attachment; filename="youtube-${videoId}.m4a"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    console.error("youtube-audio error:", err);
    const msg = err?.message ?? String(err);
    const isMissingBinary =
      err?.code === "ENOENT" ||
      err?.errno === -2 ||
      /spawn|ENOENT|yt-dlp|binary|not found/i.test(msg);
    const status = isMissingBinary ? 503 : 500;
    return NextResponse.json(
      {
        error: isMissingBinary
          ? "yt-dlp binary not found. Install it (e.g. brew install yt-dlp) or run npm install without --ignore-scripts."
          : msg || "Failed to download audio",
      },
      { status }
    );
  }
}
