const express = require("express");
const { YoutubeTranscript } = require("youtube-transcript");

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

    const transcript = await YoutubeTranscript.fetchTranscript(youtubeUrl);
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
