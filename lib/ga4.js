/**
 * Google Analytics 4 (GA4) Data API client (server-side).
 * Uses a service account: set GOOGLE_SERVICE_ACCOUNT_JSON (stringified key) or GOOGLE_APPLICATION_CREDENTIALS (path).
 * GA4 property: add the service account email as a Viewer in Admin → Property access.
 */
import { BetaAnalyticsDataClient } from "@google-analytics/data";

function getClient() {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const json = rawJson?.trim();
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  console.log("[ga4] getClient:", {
    hasGoogleServiceAccountJson: !!json,
    googleServiceAccountJsonLength: (rawJson || "").length,
    firstChars: (rawJson || "").slice(0, 40),
    hasGoogleApplicationCredentials: !!credsPath,
    credsPath: credsPath || "(not set)",
  });

  if (json) {
    try {
      let parsed = json;
      if (parsed.startsWith('"') && parsed.endsWith('"')) {
        parsed = parsed.slice(1, -1).replace(/\\"/g, '"');
      }
      // Env may store JSON with escaped quotes: {\"key\":\"value\"} -> unescape
      if (parsed.includes('\\"')) {
        parsed = parsed.replace(/\\"/g, '"');
      }
      const key = JSON.parse(parsed);
      if (key.private_key && typeof key.private_key === "string") {
        key.private_key = key.private_key.replace(/\\n/g, "\n");
      }
      console.log("[ga4] getClient: JSON parsed OK, client_email:", key.client_email ? `${key.client_email.slice(0, 20)}...` : "(none)");
      return new BetaAnalyticsDataClient({ credentials: key });
    } catch (e) {
      console.error("[ga4] getClient: Invalid GOOGLE_SERVICE_ACCOUNT_JSON:", e.message);
      return null;
    }
  }
  if (credsPath) {
    console.log("[ga4] getClient: using GOOGLE_APPLICATION_CREDENTIALS");
    return new BetaAnalyticsDataClient();
  }
  console.log("[ga4] getClient: no credentials, returning null");
  return null;
}

/**
 * Fetch overview metrics and top pages for the last 30 days.
 * @param {string} propertyId - GA4 property ID (numeric string, e.g. "123456789")
 * @returns {Promise<{ ok: boolean, data?: object, error?: string }>}
 */
export async function fetchGA4Overview(propertyId) {
  const client = getClient();
  if (!client) {
    return { ok: false, error: "Google credentials not configured (GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS)" };
  }
  const id = (propertyId || process.env.GA4_PROPERTY_ID || "").toString().trim();
  if (!id) {
    return { ok: false, error: "GA4_PROPERTY_ID is required" };
  }

  const property = `properties/${id}`;
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  try {
    const [response] = await client.runReport({
      property,
      dateRanges: [{ startDate: startStr, endDate: endStr }],
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
      ],
    });

    const row0 = response.rows?.[0];
    const activeUsers = row0 ? Number(row0.metricValues?.[0]?.value || 0) : 0;
    const sessions = row0 ? Number(row0.metricValues?.[1]?.value || 0) : 0;
    const screenPageViews = row0 ? Number(row0.metricValues?.[2]?.value || 0) : 0;

    const [pagesResponse] = await client.runReport({
      property,
      dateRanges: [{ startDate: startStr, endDate: endStr }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      limit: 10,
      orderBy: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    });

    const topPages = (pagesResponse.rows || []).map((row) => ({
      path: row.dimensionValues?.[0]?.value || "",
      views: Number(row.metricValues?.[0]?.value || 0),
    }));

    return {
      ok: true,
      data: {
        dateRange: { start: startStr, end: endStr },
        activeUsers,
        sessions,
        screenPageViews,
        topPages,
      },
    };
  } catch (err) {
    console.error("[ga4] runReport error:", err);
    let msg = err.message || "GA4 API request failed";
    if (err.reason === "SERVICE_DISABLED" || /has not been used.*or it is disabled/i.test(msg)) {
      msg = "Google Analytics Data API is disabled for this project. Enable it in Google Cloud Console: APIs & Services → Enable APIs → search for \"Google Analytics Data API\" and enable it for the same project as your service account.";
    } else if (err.code === 7 || /PERMISSION_DENIED/i.test(msg)) {
      msg = "GA4 access denied. In Google Analytics: Admin → Property access, add your service account email as a Viewer.";
    }
    return { ok: false, error: msg };
  }
}
