/**
 * Google Search Console API client (server-side).
 * Uses the same service account as GA4; add it to Search Console (Settings → Users and permissions) with Full or Restricted access.
 */
import { google } from "googleapis";

function getAuth() {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const json = rawJson?.trim();
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  console.log("[search-console] getAuth:", {
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
      console.log("[search-console] getAuth: JSON parsed OK, client_email:", key.client_email ? `${key.client_email.slice(0, 20)}...` : "(none)");
      return new google.auth.GoogleAuth({
        credentials: key,
        scopes: [
          "https://www.googleapis.com/auth/webmasters.readonly",
        ],
      });
    } catch (e) {
      console.error("[search-console] getAuth: Invalid GOOGLE_SERVICE_ACCOUNT_JSON:", e.message);
      return null;
    }
  }
  if (credsPath) {
    console.log("[search-console] getAuth: using GOOGLE_APPLICATION_CREDENTIALS");
    return new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });
  }
  console.log("[search-console] getAuth: no credentials, returning null");
  return null;
}

/**
 * Fetch Search Console overview: totals and top queries/pages for the last 30 days.
 * @param {string} [siteUrl] - Site URL (e.g. "https://deckbase.co/" or "sc-domain:deckbase.co"). Defaults to GSC_SITE_URL.
 * @returns {Promise<{ ok: boolean, data?: object, error?: string }>}
 */
export async function fetchSearchConsoleOverview(siteUrl) {
  const auth = getAuth();
  if (!auth) {
    return { ok: false, error: "Google credentials not configured (GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS)" };
  }

  const site = (siteUrl || process.env.GSC_SITE_URL || "").toString().trim();
  if (!site) {
    return { ok: false, error: "GSC_SITE_URL is required (e.g. https://deckbase.co/ or sc-domain:deckbase.co)" };
  }

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  async function runQuery(siteUrlParam) {
    const searchconsole = google.searchconsole({ version: "v1", auth });
    const client = await auth.getClient();
    const totalsRes = await searchconsole.searchanalytics.query({
      auth: client,
      siteUrl: siteUrlParam,
      requestBody: { startDate: startStr, endDate: endStr },
    });
    return { searchconsole, client, totalsRes, siteUrlParam };
  }

  try {
    let searchconsole;
    let client;
    let totalsRes;
    let resolvedSite = site;

    try {
      const r = await runQuery(site);
      searchconsole = r.searchconsole;
      client = r.client;
      totalsRes = r.totalsRes;
    } catch (firstErr) {
      if ((firstErr.code === 403 || firstErr.status === 403) && /permission for site|sufficient permission/i.test(firstErr.message || "")) {
        const domainMatch = site.match(/^(?:https?:\/\/)?(?:www\.)?([^/]+)/);
        const domain = domainMatch ? domainMatch[1].replace(/\/$/, "") : null;
        if (domain && !site.startsWith("sc-domain:")) {
          const altSite = `sc-domain:${domain}`;
          console.log("[search-console] 403 with URL property, retrying with domain property:", altSite);
          const r = await runQuery(altSite);
          searchconsole = r.searchconsole;
          client = r.client;
          totalsRes = r.totalsRes;
          resolvedSite = altSite;
        } else {
          throw firstErr;
        }
      } else {
        throw firstErr;
      }
    }

    const row0 = totalsRes?.data?.rows?.[0];
    const totals = {
      clicks: row0 ? Number(row0.clicks ?? 0) : 0,
      impressions: row0 ? Number(row0.impressions ?? 0) : 0,
      ctr: row0 && row0.ctr != null ? Number(row0.ctr) : 0,
      position: row0 && row0.position != null ? Number(row0.position) : 0,
    };

    const queriesRes = await searchconsole.searchanalytics.query({
      auth: client,
      siteUrl: resolvedSite,
      requestBody: {
        startDate: startStr,
        endDate: endStr,
        dimensions: ["query"],
        rowLimit: 10,
      },
    });

    const topQueries = (queriesRes?.data?.rows || []).map((row) => ({
      query: row.keys?.[0] || "",
      clicks: Number(row.clicks ?? 0),
      impressions: Number(row.impressions ?? 0),
      ctr: Number(row.ctr ?? 0),
      position: Number(row.position ?? 0),
    }));

    const pagesRes = await searchconsole.searchanalytics.query({
      auth: client,
      siteUrl: resolvedSite,
      requestBody: {
        startDate: startStr,
        endDate: endStr,
        dimensions: ["page"],
        rowLimit: 10,
      },
    });

    const topPages = (pagesRes?.data?.rows || []).map((row) => ({
      page: row.keys?.[0] || "",
      clicks: Number(row.clicks ?? 0),
      impressions: Number(row.impressions ?? 0),
      position: Number(row.position ?? 0),
    }));

    return {
      ok: true,
      data: {
        dateRange: { start: startStr, end: endStr },
        siteUrl: resolvedSite,
        clicks: totals.clicks,
        impressions: totals.impressions,
        ctr: totals.ctr,
        position: totals.position,
        topQueries,
        topPages,
      },
    };
  } catch (err) {
    console.error("[search-console] query error:", err);
    let msg = err.message || "Search Console API request failed";
    if (err.code === 403 || /sufficient permission|permission for site/i.test(msg)) {
      msg = "Search Console: add your service account as a user (Settings → Users and permissions → Add user → deckbase-seo@deckbase-prod.iam.gserviceaccount.com, Full or Restricted). If the property is a domain property, set GSC_SITE_URL=sc-domain:deckbase.co";
    }
    return { ok: false, error: msg };
  }
}
