/**
 * DataForSEO App Data API — App Searches (app store SERP per keyword).
 * Uses same credentials as main DataForSEO client (DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD).
 * Docs: https://docs.dataforseo.com/v3/app_data/overview
 * Apple: POST task_post → poll tasks_ready → GET task_get/advanced/{id}
 * Google: POST task_post → poll tasks_ready → GET task_get/advanced/{id}
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
 * POST App Searches tasks (Apple). Returns task id → keyword map.
 */
async function postAppleAppSearchTasks(keywords, locationCode, languageCode, depth = 100) {
  const auth = getAuthHeader();
  if (!auth) return { ok: false, error: "DataForSEO credentials not set", taskIds: [] };

  const body = keywords.map((keyword) => ({
    keyword: String(keyword).trim().slice(0, 700),
    location_code: locationCode,
    language_code: languageCode,
    depth,
  }));

  const res = await fetch(`${DATAFORSEO_BASE}/v3/app_data/apple/app_searches/task_post`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.status_code !== 20000) {
    return { ok: false, error: data.status_message || `HTTP ${res.status}`, taskIds: [] };
  }

  const taskIds = [];
  const tasks = data.tasks || [];
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    if (t.id && keywords[i] != null) taskIds.push({ id: t.id, keyword: keywords[i] });
  }
  return { ok: true, taskIds };
}

/**
 * POST App Searches tasks (Google Play). Returns task id → keyword map.
 */
async function postGoogleAppSearchTasks(keywords, locationCode, languageCode, depth = 30) {
  const auth = getAuthHeader();
  if (!auth) return { ok: false, error: "DataForSEO credentials not set", taskIds: [] };

  const body = keywords.map((keyword) => ({
    keyword: String(keyword).trim().slice(0, 700),
    location_code: locationCode,
    language_code: languageCode,
    depth,
  }));

  const res = await fetch(`${DATAFORSEO_BASE}/v3/app_data/google/app_searches/task_post`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.status_code !== 20000) {
    return { ok: false, error: data.status_message || `HTTP ${res.status}`, taskIds: [] };
  }

  const taskIds = [];
  const tasks = data.tasks || [];
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    if (t.id && keywords[i] != null) taskIds.push({ id: t.id, keyword: keywords[i] });
  }
  return { ok: true, taskIds };
}

/**
 * Poll Apple tasks_ready until we have endpoint or id for given task ids, then GET each result.
 * Returns map keyword -> rank (1-based) or null if not in SERP.
 */
async function pollAndGetAppleResults(taskIdToKeyword, ourAppId, auth, maxWaitMs = 120000, pollIntervalMs = 4000) {
  const idToKeyword = new Map(taskIdToKeyword.map(({ id, keyword }) => [id, keyword]));
  const ids = [...idToKeyword.keys()];
  const results = {};
  ids.forEach((id) => {
    results[idToKeyword.get(id)] = null;
  });

  const start = Date.now();
  const collected = new Set();

  while (Date.now() - start < maxWaitMs && collected.size < ids.length) {
    const res = await fetch(`${DATAFORSEO_BASE}/v3/app_data/apple/app_searches/tasks_ready`, {
      headers: { Authorization: auth, "Content-Type": "application/json" },
    });
    const data = await res.json().catch(() => ({}));
    if (data.status_code !== 20000 || !Array.isArray(data.tasks)) break;

    for (const task of data.tasks) {
      const list = task.result || [];
      for (const item of list) {
        const id = item.id;
        if (!id || !idToKeyword.has(id) || collected.has(id)) continue;
        const endpoint = item.endpoint_advanced || `/v3/app_data/apple/app_searches/task_get/advanced/${id}`;
        const path = endpoint.startsWith("http") ? new URL(endpoint).pathname : endpoint;
        try {
          const getRes = await fetch(`${DATAFORSEO_BASE}${path}`, {
            headers: { Authorization: auth, "Content-Type": "application/json" },
          });
          const getData = await getRes.json().catch(() => ({}));
          const taskData = getData.tasks?.[0];
          const resultList = taskData?.result;
          const keyword = idToKeyword.get(id);
          if (keyword && Array.isArray(resultList) && resultList[0]) {
            const items = resultList[0].items || [];
            const our = items.find((app) => String(app.app_id) === String(ourAppId));
            results[keyword] = our != null ? (our.rank_absolute ?? our.rank_group ?? null) : null;
          }
          collected.add(id);
        } catch (_) {}
      }
    }

    if (collected.size >= ids.length) break;
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  return results;
}

/**
 * Poll Google tasks_ready and GET each result. ourPackageName = Google Play package (app_id in response).
 */
async function pollAndGetGoogleResults(taskIdToKeyword, ourPackageName, auth, maxWaitMs = 120000, pollIntervalMs = 4000) {
  const idToKeyword = new Map(taskIdToKeyword.map(({ id, keyword }) => [id, keyword]));
  const ids = [...idToKeyword.keys()];
  const results = {};
  ids.forEach((id) => {
    results[idToKeyword.get(id)] = null;
  });

  const start = Date.now();
  const collected = new Set();
  const normPackage = (ourPackageName || "").trim().toLowerCase();

  while (Date.now() - start < maxWaitMs && collected.size < ids.length) {
    const res = await fetch(`${DATAFORSEO_BASE}/v3/app_data/google/app_searches/tasks_ready`, {
      headers: { Authorization: auth, "Content-Type": "application/json" },
    });
    const data = await res.json().catch(() => ({}));
    if (data.status_code !== 20000 || !Array.isArray(data.tasks)) break;

    for (const task of data.tasks) {
      const list = task.result || [];
      for (const item of list) {
        const id = item.id;
        if (!id || !idToKeyword.has(id) || collected.has(id)) continue;
        const endpoint = item.endpoint_advanced || `/v3/app_data/google/app_searches/task_get/advanced/${id}`;
        const path = endpoint.startsWith("http") ? new URL(endpoint).pathname : endpoint;
        try {
          const getRes = await fetch(`${DATAFORSEO_BASE}${path}`, {
            headers: { Authorization: auth, "Content-Type": "application/json" },
          });
          const getData = await getRes.json().catch(() => ({}));
          const taskData = getData.tasks?.[0];
          const resultList = taskData?.result;
          const keyword = idToKeyword.get(id);
          if (keyword && Array.isArray(resultList) && resultList[0]) {
            const items = resultList[0].items || [];
            const our = items.find((app) => String((app.app_id || "")).toLowerCase() === normPackage);
            results[keyword] = our != null ? (our.rank_absolute ?? our.rank_group ?? null) : null;
          }
          collected.add(id);
        } catch (_) {}
      }
    }

    if (collected.size >= ids.length) break;
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  return results;
}

/**
 * Fetch app store rankings for the given app per keyword using DataForSEO App Data App Searches.
 * @param {Object} options
 * @param {string[]} options.keywords - Keywords to check (max 25 per call to limit cost/time)
 * @param {string} [options.appIdApple] - Apple app ID (e.g. "6755723338"). Omit to skip iOS.
 * @param {string} [options.packageNameAndroid] - Google Play package (e.g. "com.tkg.deckbase"). Omit to skip Android.
 * @param {number} [options.locationCode] - e.g. 2840 (United States)
 * @param {string} [options.languageCode] - e.g. "en"
 * @param {number} [options.maxKeywords] - Cap keywords (default 25)
 * @returns {Promise<{ ok: boolean, ios?: Record<string, number | null>, android?: Record<string, number | null>, error?: string }>}
 */
export async function fetchAppSearchRankings({
  keywords,
  appIdApple,
  packageNameAndroid,
  locationCode = 2840,
  languageCode = "en",
  maxKeywords = 25,
}) {
  const auth = getAuthHeader();
  if (!auth) {
    return { ok: false, error: "DataForSEO credentials not configured (DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD)" };
  }

  const list = (Array.isArray(keywords) ? keywords : [])
    .map((k) => String(k).trim())
    .filter(Boolean)
    .slice(0, maxKeywords);
  if (list.length === 0) {
    return { ok: false, error: "At least one keyword required" };
  }

  const ios = {};
  const android = {};

  if (appIdApple && list.length > 0) {
    const post = await postAppleAppSearchTasks(list, locationCode, languageCode, 100);
    if (post.ok && post.taskIds.length > 0) {
      const rankByKeyword = await pollAndGetAppleResults(post.taskIds, String(appIdApple).trim(), auth);
      Object.assign(ios, rankByKeyword);
    }
  }

  if (packageNameAndroid && list.length > 0) {
    const post = await postGoogleAppSearchTasks(list, locationCode, languageCode, 30);
    if (post.ok && post.taskIds.length > 0) {
      const rankByKeyword = await pollAndGetGoogleResults(post.taskIds, packageNameAndroid.trim(), auth);
      Object.assign(android, rankByKeyword);
    }
  }

  return {
    ok: true,
    ios: Object.keys(ios).length ? ios : undefined,
    android: Object.keys(android).length ? android : undefined,
  };
}
