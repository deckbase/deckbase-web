import { NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";
import { AssemblyAI } from "assemblyai";
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

async function getYouTubeTranscript(videoId) {
  const chunks = await YoutubeTranscript.fetchTranscript(videoId);
  return (chunks || []).map((c) => ({
    text: c.text || "",
    start: (c.offset ?? 0) / 1000,
    duration: (c.duration ?? 0) / 1000,
  }));
}

async function loadYoutubeDl(useSystemFallback = false) {
  const mod = await import("youtube-dl-exec");
  if (useSystemFallback && typeof mod.create === "function") {
    return mod.create("yt-dlp");
  }
  return mod.default;
}

async function downloadAudio(youtubeUrl) {
  const tmpDir = os.tmpdir();
  const outPath = path.join(tmpDir, `yt-audio-${Date.now()}.m4a`);
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
    await youtubedl(youtubeUrl, opts);
  } catch (err) {
    if (err?.code === "ENOENT" || err?.errno === -2) {
      youtubedl = await loadYoutubeDl(true);
      await youtubedl(youtubeUrl, opts);
    } else {
      throw err;
    }
  }
  return outPath;
}

function speakerLabelFromLetter(letter) {
  const code = (letter || "A").toUpperCase().charCodeAt(0);
  const index = code - 65;
  return index >= 0 && index < 26 ? `Speaker ${String.fromCharCode(65 + index)}` : letter;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const youtubeUrl = (body.youtubeUrl || body.youtube_url || "").trim();
    const speakerCount = Math.min(
      10,
      Math.max(1, parseInt(body.speakerCount ?? body.speaker_count ?? "2", 10) || 2)
    );

    const videoId = getVideoId(youtubeUrl);
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL. Use a link like https://www.youtube.com/watch?v=..." },
        { status: 400 }
      );
    }

    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    let transcript = [];
    let fromDiarization = false;
    let message;

    // 1) Try AssemblyAI diarization if key is set
    if (apiKey) {
      let audioPath;
      try {
        const fullUrl =
          youtubeUrl.startsWith("http") ? youtubeUrl : `https://www.youtube.com/watch?v=${videoId}`;
        audioPath = await downloadAudio(fullUrl);
      } catch (downloadErr) {
        console.warn("YouTube audio download failed (yt-dlp required):", downloadErr.message);
        message =
          "Speaker labeling skipped: could not download audio. Install yt-dlp (e.g. brew install yt-dlp) for Speaker A/B labeling.";
      }

      if (audioPath && fs.existsSync(audioPath)) {
        try {
          const client = new AssemblyAI({
            apiKey,
          });
          const transcriptResult = await client.transcripts.transcribe({
            audio: audioPath,
            speaker_labels: true,
            speakers_expected: speakerCount,
            speech_models: ["universal-3-pro", "universal-2"],
          });

          if (transcriptResult.status === "error") {
            throw new Error(transcriptResult.error || "Transcription failed");
          }

          const utterances = transcriptResult.utterances || [];
          transcript = utterances.map((u) => ({
            speaker: speakerLabelFromLetter(u.speaker),
            text: u.text || "",
            start: u.start != null ? u.start / 1000 : undefined,
            end: u.end != null ? u.end / 1000 : undefined,
          }));
          fromDiarization = true;
        } catch (err) {
          console.error("AssemblyAI error:", err);
          message = message || `Diarization failed: ${err.message}`;
        } finally {
          try {
            if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
          } catch (_) {}
        }
      }
    } else {
      message =
        "Set ASSEMBLYAI_API_KEY and install yt-dlp for Speaker A/B labeling. Returning captions only.";
    }

    // 2) If no diarized result, use YouTube captions
    if (transcript.length === 0) {
      try {
        const captions = await getYouTubeTranscript(videoId);
        transcript = captions.map((c) => ({
          speaker: "Unlabeled",
          text: c.text,
          start: c.start,
          end: c.start + (c.duration || 0),
        }));
      } catch (captionErr) {
        console.error("YouTube transcript error:", captionErr);
        return NextResponse.json(
          {
            error:
              "Could not fetch transcript. The video may have captions disabled or be unavailable.",
          },
          { status: 422 }
        );
      }
    }

    return NextResponse.json({
      videoId,
      speakerCount: fromDiarization ? speakerCount : undefined,
      transcript,
      fromDiarization,
      message: message || undefined,
    });
  } catch (err) {
    console.error("youtube-diarize error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get transcript" },
      { status: 500 }
    );
  }
}
