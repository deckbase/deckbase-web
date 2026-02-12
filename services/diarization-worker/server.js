const express = require("express");
const { YoutubeTranscript } = require("youtube-transcript");
const ytdl = require("ytdl-core");
const puppeteer = require("puppeteer-core");

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

const resolveChromePath = () => {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const candidates = [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ];
  return candidates.find((path) => path);
};

const launchBrowser = async () =>
  puppeteer.launch({
    headless: "new",
    executablePath: resolveChromePath(),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
    ],
  });

const extractVideoId = (youtubeUrl) => {
  try {
    const parsed = new URL(youtubeUrl);
    const videoId = parsed.searchParams.get("v");
    if (videoId) return videoId;
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.replace("/", "");
    }
  } catch (error) {
    return null;
  }
  return null;
};

const fetchTranscriptWithPuppeteer = async (youtubeUrl) => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );
    await page.goto(`${youtubeUrl}&hl=en`, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await page.waitForFunction(
      () =>
        Boolean(
          window.ytInitialPlayerResponse || window.ytInitialData
        ),
      { timeout: 15000 }
    );

    const transcript = await page.evaluate(async () => {
      const response =
        window.ytInitialPlayerResponse ||
        window.ytInitialData?.playerResponse ||
        window.ytInitialData?.playerResponse?.captions ||
        null;

      const captionTracks =
        response?.captions?.playerCaptionsTracklistRenderer?.captionTracks ||
        window.ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer
          ?.captionTracks ||
        [];

      if (!captionTracks.length) {
        return null;
      }

      const preferredTrack =
        captionTracks.find((track) => track.languageCode === "en") ||
        captionTracks.find((track) => track.languageCode?.startsWith("en")) ||
        captionTracks[0];

      if (!preferredTrack?.baseUrl) {
        return null;
      }

      const url = preferredTrack.baseUrl.includes("fmt=")
        ? preferredTrack.baseUrl
        : `${preferredTrack.baseUrl}&fmt=json3`;
      const responseData = await fetch(url);
      if (!responseData.ok) {
        return null;
      }
      const data = await responseData.json();
      const events = Array.isArray(data.events) ? data.events : [];
      const transcriptItems = events
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

      return transcriptItems.length ? transcriptItems : null;
    });

    if (!transcript || transcript.length === 0) {
      throw new Error("Transcript not available via puppeteer");
    }

    return transcript;
  } finally {
    await browser.close();
  }
};

const fetchTranscriptFromCaptionTrack = async (baseUrl) => {
  const url = baseUrl.includes("fmt=") ? baseUrl : `${baseUrl}&fmt=json3`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Caption fetch failed (${response.status})`);
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

const fetchTranscriptFromTimedText = async (videoId) => {
  if (!videoId) throw new Error("Missing video ID for timedtext");
  const buildUrl = (params) =>
    `https://www.youtube.com/api/timedtext?${params}&fmt=json3`;

  const tryFetch = async (url) => {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });
    if (!response.ok) {
      return null;
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
    return transcript.length ? transcript : null;
  };

  const primary = await tryFetch(buildUrl(`lang=en&v=${videoId}`));
  if (primary) return primary;
  const auto = await tryFetch(buildUrl(`lang=en&kind=asr&v=${videoId}`));
  if (auto) return auto;

  const listResponse = await fetch(
    `https://www.youtube.com/api/timedtext?type=list&v=${videoId}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    }
  );
  if (!listResponse.ok) {
    throw new Error("Timedtext track list unavailable");
  }
  const listXml = await listResponse.text();
  const trackMatches = listXml.match(/<track[^>]+>/g) || [];
  const tracks = trackMatches
    .map((track) => {
      const attrs = {};
      const attrMatches = track.match(/(\w+)="([^"]*)"/g) || [];
      attrMatches.forEach((attr) => {
        const [key, value] = attr.split("=");
        attrs[key] = value.replace(/"/g, "");
      });
      return attrs;
    })
    .filter((track) => track.lang_code);

  if (!tracks.length) {
    throw new Error("No timedtext tracks found");
  }

  const preferredTrack =
    tracks.find((track) => !track.kind) ||
    tracks.find((track) => track.kind === "asr") ||
    tracks[0];

  const langCode = preferredTrack.lang_code;
  const kindParam = preferredTrack.kind ? `&kind=${preferredTrack.kind}` : "";
  const fallback = await tryFetch(
    buildUrl(`lang=${langCode}${kindParam}&v=${videoId}`)
  );
  if (fallback) return fallback;

  throw new Error("Timedtext transcript unavailable");
};

const extractJsonObject = (text, startIndex) => {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = startIndex; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, i + 1);
      }
    }
  }
  return null;
};

const fetchTranscriptFromHtml = async (youtubeUrl) => {
  const urlVariants = [
    youtubeUrl,
    `${youtubeUrl}&hl=en`,
    `${youtubeUrl}&hl=en&bpctr=9999999999&has_verified=1`,
  ];

  const fetchHtml = async (url) => {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!response.ok) {
      throw new Error(`YouTube HTML fetch failed (${response.status})`);
    }
    return response.text();
  };

  let lastError;
  for (const url of urlVariants) {
    try {
      const html = await fetchHtml(url);
      const marker = "ytInitialPlayerResponse";
      const markerIndex = html.indexOf(marker);
      if (markerIndex === -1) {
        throw new Error("ytInitialPlayerResponse not found");
      }
      const braceIndex = html.indexOf("{", markerIndex);
      if (braceIndex === -1) {
        throw new Error("Player response JSON not found");
      }
      const jsonText = extractJsonObject(html, braceIndex);
      if (!jsonText) {
        throw new Error("Unable to parse player response JSON");
      }
      const playerResponse = JSON.parse(jsonText);
      const captionTracks =
        playerResponse?.captions?.playerCaptionsTracklistRenderer
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
      return fetchTranscriptFromCaptionTrack(preferredTrack.baseUrl);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Unable to fetch transcript from HTML");
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

  return fetchTranscriptFromCaptionTrack(preferredTrack.baseUrl);
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
    const videoId = extractVideoId(youtubeUrl);
    try {
      transcript = await YoutubeTranscript.fetchTranscript(youtubeUrl);
    } catch (error) {
      try {
        transcript = await fetchTranscriptWithPuppeteer(youtubeUrl);
      } catch (puppetError) {
        try {
          transcript = await fetchTranscriptFromHtml(youtubeUrl);
        } catch (htmlError) {
          try {
            transcript = await fetchTranscriptFromTimedText(videoId);
          } catch (timedTextError) {
            try {
              transcript = await fetchTranscriptFromYtdl(youtubeUrl);
            } catch (ytdlError) {
              const puppetMessage =
                puppetError?.message || "Puppeteer transcript failed";
              const htmlMessage =
                htmlError?.message || "HTML transcript failed";
              const timedMessage =
                timedTextError?.message || "Timedtext transcript failed";
              const ytdlMessage = ytdlError?.message || "ytdl-core failed";
              throw new Error(
                `Transcript fetch failed. ${puppetMessage}. ${htmlMessage}. ${timedMessage}. ${ytdlMessage}.`
              );
            }
          }
        }
      }
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
