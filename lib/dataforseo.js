/**
 * DataForSEO API client (server-side only).
 * Uses Basic Auth: login + password from https://app.dataforseo.com/api-access
 * Docs: https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/
 */

const DATAFORSEO_BASE = "https://api.dataforseo.com";

function getAuthHeader() {
  const login = process.env.DATAFORSEO_LOGIN?.trim();
  const password = process.env.DATAFORSEO_PASSWORD?.trim();
  if (!login || !password) return null;
  const cred = Buffer.from(`${login}:${password}`, "utf8").toString("base64");
  return `Basic ${cred}`;
}

/**
 * Fetch Google Ads search volume for keywords (live endpoint).
 * @param {Object} options
 * @param {string[]} options.keywords - Up to 1000 keywords
 * @param {number} [options.locationCode] - e.g. 2840 (United States)
 * @param {string} [options.languageCode] - e.g. "en"
 * @param {string} [options.dateFrom] - "yyyy-mm-dd"
 * @returns {Promise<{ ok: boolean, data?: object, error?: string }>}
 */
export async function fetchSearchVolume({ keywords, locationCode = 2840, languageCode = "en", dateFrom }) {
  const auth = getAuthHeader();
  if (!auth) {
    return { ok: false, error: "DataForSEO credentials not configured (DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD)" };
  }

  if (!Array.isArray(keywords) || keywords.length === 0) {
    return { ok: false, error: "keywords array is required and must not be empty" };
  }

  const trimmed = keywords.map((k) => String(k).trim()).filter(Boolean).slice(0, 1000);
  if (trimmed.length === 0) {
    return { ok: false, error: "No valid keywords provided" };
  }

  const body = [
    {
      keywords: trimmed,
      location_code: locationCode,
      language_code: languageCode,
      ...(dateFrom && { date_from: dateFrom }),
    },
  ];

  try {
    const res = await fetch(`${DATAFORSEO_BASE}/v3/keywords_data/google_ads/search_volume/live`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data.status_message || data.message || data.error || `DataForSEO HTTP ${res.status}`;
      return { ok: false, error: msg };
    }

    if (data.status_code != null && data.status_code !== 20000) {
      const msg = data.status_message || `DataForSEO error ${data.status_code}`;
      return { ok: false, error: msg };
    }

    const task = data.tasks?.[0];
    if (!task) {
      return { ok: false, error: "DataForSEO returned no task" };
    }

    if (task.status_code != null && task.status_code !== 20000) {
      const msg = task.status_message || `Task error ${task.status_code}`;
      return { ok: false, error: msg };
    }

    // Result can be in task.result (array of keyword objects)
    const resultList = Array.isArray(task.result) ? task.result : [];
    return {
      ok: true,
      data: {
        result: resultList,
        cost: data.cost,
        time: data.time,
      },
    };
  } catch (err) {
    console.error("[dataforseo] fetchSearchVolume error:", err);
    return {
      ok: false,
      error: err.message || "Request to DataForSEO failed",
    };
  }
}

/**
 * Fetch Google organic SERP and find where a domain ranks for each keyword.
 * Uses SERP API with target=domain so only results matching the domain are returned.
 * One API call per keyword (DataForSEO allows only one task per SERP live request).
 * @param {Object} options
 * @param {string} options.domain - Domain to check (e.g. "deckbase.co"), without https://
 * @param {string[]} options.keywords - Keywords to check
 * @param {number} [options.locationCode] - e.g. 2840 (United States)
 * @param {string} [options.languageCode] - e.g. "en"
 * @returns {Promise<{ ok: boolean, data?: { results: Array<{ keyword, position, url, title }> }, error?: string }>}
 */
export async function fetchKeywordRankings({ domain, keywords, locationCode = 2840, languageCode = "en" }) {
  const auth = getAuthHeader();
  if (!auth) {
    return { ok: false, error: "DataForSEO credentials not configured (DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD)" };
  }

  const targetDomain = (domain || "").trim().replace(/^https?:\/\//, "").replace(/\/$/, "").split("/")[0];
  if (!targetDomain) {
    return { ok: false, error: "domain is required (e.g. deckbase.co)" };
  }

  const list = (Array.isArray(keywords) ? keywords : [])
    .map((k) => String(k).trim())
    .filter(Boolean)
    .slice(0, 10);
  if (list.length === 0) {
    return { ok: false, error: "At least one keyword is required (max 10 per request)" };
  }

  const results = [];

  for (const keyword of list) {
    try {
      const body = [
        {
          keyword,
          location_code: locationCode,
          language_code: languageCode,
          target: targetDomain,
          depth: 100,
        },
      ];

      const res = await fetch(`${DATAFORSEO_BASE}/v3/serp/google/organic/live/regular`, {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        results.push({
          keyword,
          position: null,
          url: null,
          title: null,
          error: data.status_message || data.message || `HTTP ${res.status}`,
        });
        continue;
      }

      const task = data.tasks?.[0];
      const items = Array.isArray(task?.result?.items) ? task.result.items : [];
      const organic = items.filter((i) => i.type === "organic" || i.type === "featured_snippet");
      const best = organic.sort((a, b) => (a.rank_absolute ?? 999) - (b.rank_absolute ?? 999))[0];

      if (best) {
        results.push({
          keyword,
          position: best.rank_absolute ?? best.rank_group ?? null,
          url: best.url ?? null,
          title: best.title ?? null,
        });
      } else {
        results.push({
          keyword,
          position: null,
          url: null,
          title: null,
          error: "Not in top 100",
        });
      }
    } catch (err) {
      console.error("[dataforseo] fetchKeywordRankings keyword error:", keyword, err);
      results.push({
        keyword,
        position: null,
        url: null,
        title: null,
        error: err.message || "Request failed",
      });
    }
  }

  return {
    ok: true,
    data: { results },
  };
}

/**
 * DataForSEO Labs: keyword suggestions for a seed keyword (long-tail ideas with volume).
 * Used for autonomous discovery: expand seeds into more keywords from real search data.
 * @param {Object} options
 * @param {string} options.keyword - Seed keyword (e.g. "flashcards", "spaced repetition")
 * @param {number} [options.locationCode] - e.g. 2840 (United States)
 * @param {string} [options.languageCode] - e.g. "en"
 * @param {number} [options.limit] - Max suggestions to return (default 100, max 1000)
 * @returns {Promise<{ ok: boolean, data?: { items: Array<{ keyword, search_volume, competition, cpc }>, seed_keyword: string }, error?: string }>}
 */
export async function fetchKeywordSuggestions({
  keyword,
  locationCode = 2840,
  languageCode = "en",
  limit = 100,
}) {
  const auth = getAuthHeader();
  if (!auth) {
    return { ok: false, error: "DataForSEO credentials not configured (DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD)" };
  }

  const seed = (keyword || "").trim();
  if (!seed) {
    return { ok: false, error: "keyword (seed) is required" };
  }

  const body = [
    {
      keyword: seed,
      location_code: locationCode,
      language_code: languageCode,
      limit: Math.min(1000, Math.max(1, limit)),
    },
  ];

  try {
    const res = await fetch(`${DATAFORSEO_BASE}/v3/dataforseo_labs/google/keyword_suggestions/live`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data.status_message || data.message || data.error || `DataForSEO HTTP ${res.status}`;
      return { ok: false, error: msg };
    }

    if (data.status_code != null && data.status_code !== 20000) {
      const msg = data.status_message || `DataForSEO error ${data.status_code}`;
      return { ok: false, error: msg };
    }

    const task = data.tasks?.[0];
    if (!task || task.status_code != null && task.status_code !== 20000) {
      const msg = task?.status_message || "DataForSEO returned no task or task error";
      return { ok: false, error: msg };
    }

    const items = (task.result?.[0]?.items || []).map((item) => ({
      keyword: (item.keyword || "").trim(),
      search_volume: item.keyword_info?.search_volume ?? 0,
      competition: item.keyword_info?.competition,
      competition_level: item.keyword_info?.competition_level,
      cpc: item.keyword_info?.cpc,
    })).filter((item) => item.keyword);

    return {
      ok: true,
      data: {
        items,
        seed_keyword: task.result?.[0]?.seed_keyword ?? seed,
      },
    };
  } catch (err) {
    console.error("[dataforseo] fetchKeywordSuggestions error:", err);
    return {
      ok: false,
      error: err.message || "Request to DataForSEO failed",
    };
  }
}
