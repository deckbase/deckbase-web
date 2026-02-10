const express = require("express");
const { YoutubeTranscript } = require("youtube-transcript");
const ytdl = require("ytdl-core");

const app = express();
const PORT = process.env.PORT || 8080;
const WORKER_TOKEN = process.env.WORKER_TOKEN;
const CALLBACK_TOKEN = process.env.CALLBACK_TOKEN;

app.use(express.json({ limit: "2mb" }));

const requireAuth = (req, res, next) => {
  if (!WORKER_TOKEN) return next();
  const authHeader = req.headers.authorization || "";
  if (authHeader !== `Bearer ${WORKER_TOKEN}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
};

const postCallback = async (callbackUrl, payload) => {
  if (!callbackUrl) return;
  const headers = { "Content-Type": "application/json" };
  if (CALLBACK_TOKEN) {
    headers.Authorization = `Bearer ${CALLBACK_TOKEN}`;
  }
  await fetch(callbackUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
};

const fetchTranscriptFromYtdl = async (youtubeUrl) => {
  const info = await ytdl.getInfo(youtubeUrl, {
    requestOptions: {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    },
  });
  const captionTracks =
    info.player_response?.captions?.playerCaptionsTracklistRenderer
      ?.captionTracks || [];

  if (!captionTracks.length) {
    throw new Error("No caption tracks found");
  }

  const preferredTrack =
    captionTracks.find((track) => track.languageCode === "en") ||
    captionTracks.find((track) => track.languageCode?.startsWith("en")) ||
    captionTracks[0];

  if (!preferredTrack?.baseUrl) {
    throw new Error("Caption track missing baseUrl");
  }

  const url = preferredTrack.baseUrl.includes("fmt=")
    ? preferredTrack.baseUrl
    : `${preferredTrack.baseUrl}&fmt=json3`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Caption fetch failed");
  }
  const data = await response.json();
  const events = Array.isArray(data.events) ? data.events : [];
  const transcript = events
    .filter((event) => Array.isArray(event.segs) && event.segs.length > 0)
    .map((event) => {
      const text = event.segs
        .map((seg) => seg.utf8 || "")
        .join("")
        .replace(/\n/g, " ")
        .trim();
      return {
        text,
        offset: event.tStartMs ? event.tStartMs / 1000 : 0,
        duration: event.dDurationMs ? event.dDurationMs / 1000 : 0,
      };
    })
    .filter((item) => item.text);

  if (!transcript.length) {
    throw new Error("Transcript is empty");
  }

  return transcript;
};

const buildResultFromTranscript = (transcript, speakerCount) => {
  const speakers = Array.from({ length: speakerCount }, (_, index) => ({
    speakerId: `speaker-${index + 1}`,
    label: `Speaker ${index + 1}`,
    segments: [],
  }));

  transcript.forEach((segment, index) => {
    const target = speakers[index % speakerCount];
    target.segments.push({
      start: segment.offset,
      duration: segment.duration,
      text: segment.text,
    });
  });

  return {
    method: "round_robin_transcript",
    speakers: speakers.map((speaker) => ({
      ...speaker,
      text: speaker.segments.map((segment) => segment.text).join(" "),
    })),
  };
};

app.get("/healthz", (_, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/run", requireAuth, async (req, res) => {
  const { jobId, youtubeUrl, speakerCount, callbackUrl } = req.body || {};

  if (!jobId || !youtubeUrl || !speakerCount) {
    return res.status(400).json({
      error: "jobId, youtubeUrl, and speakerCount are required",
    });
  }

  try {
    await postCallback(callbackUrl, {
      jobId,
      status: "processing",
      progress: { percent: 15 },
    });

    let transcript;
    try {
      transcript = await YoutubeTranscript.fetchTranscript(youtubeUrl);
    } catch (error) {
      transcript = await fetchTranscriptFromYtdl(youtubeUrl);
    }
    if (!transcript || transcript.length === 0) {
      throw new Error("Transcript is empty");
    }

    const result = buildResultFromTranscript(transcript, Number(speakerCount));

    await postCallback(callbackUrl, {
      jobId,
      status: "done",
      progress: { percent: 100 },
      result,
    });

    return res.status(202).json({ status: "started" });
  } catch (error) {
    console.error("Diarization worker error:", error);
    await postCallback(callbackUrl, {
      jobId,
      status: "failed",
      progress: { percent: 0, error: error.message || "Worker error" },
      error: error.message,
    });
    return res.status(500).json({ error: "Diarization failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Diarization worker listening on ${PORT}`);
});
