/**
 * Fetch current Google Play store listing (title, short/full description) per language.
 * Uses Android Publisher API v3; requires edit then list listings.
 * Set GOOGLE_SERVICE_ACCOUNT_JSON (or GOOGLE_APPLICATION_CREDENTIALS) and grant the service account
 * access in Play Console. Enable "Google Play Android Developer API" in Cloud Console.
 */
import { google } from "googleapis";

const ANDROIDPUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher";

function getAuth() {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (rawJson) {
    try {
      let parsed = rawJson;
      if (parsed.startsWith('"') && parsed.endsWith('"')) parsed = parsed.slice(1, -1).replace(/\\"/g, '"');
      if (parsed.includes('\\"')) parsed = parsed.replace(/\\"/g, '"');
      const key = JSON.parse(parsed);
      if (key.private_key && typeof key.private_key === "string") key.private_key = key.private_key.replace(/\\n/g, "\n");
      console.log("[google-play-listings] getAuth: using GOOGLE_SERVICE_ACCOUNT_JSON, client_email:", key.client_email ? `${key.client_email.slice(0, 25)}…` : "(none)");
      return new google.auth.GoogleAuth({ credentials: key, scopes: [ANDROIDPUBLISHER_SCOPE] });
    } catch (e) {
      console.error("[google-play-listings] getAuth parse error:", e.message);
      return null;
    }
  }
  if (credsPath) {
    console.log("[google-play-listings] getAuth: using GOOGLE_APPLICATION_CREDENTIALS:", credsPath);
    return new google.auth.GoogleAuth({ scopes: [ANDROIDPUBLISHER_SCOPE] });
  }
  console.log("[google-play-listings] getAuth: no credentials (no JSON, no creds path)");
  return null;
}

/**
 * Fetch current store listings for an app.
 * @param {string} packageName - Android package name (e.g. com.deckbase.app)
 * @returns {Promise<{ ok: boolean, data?: { listings: Array<{ language, title, fullDescription, shortDescription }> }, error?: string }>}
 */
export async function fetchGooglePlayListings(packageName) {
  const auth = getAuth();
  if (!auth) {
    console.log("[google-play-listings] fetchGooglePlayListings skipped: no auth");
    return { ok: false, error: "Google credentials not configured (GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS)" };
  }

  const pkg = (packageName || process.env.ANDROID_PACKAGE_NAME || "").toString().trim();
  if (!pkg) {
    console.log("[google-play-listings] fetchGooglePlayListings skipped: no package name");
    return { ok: false, error: "Package name required (ANDROID_PACKAGE_NAME or pass packageName)" };
  }

  console.log("[google-play-listings] fetchGooglePlayListings start:", { packageName: pkg });
  try {
    const androidPublisher = google.androidpublisher({ version: "v3", auth });
    const { data: edit } = await androidPublisher.edits.insert({ packageName: pkg });
    const editId = edit?.id;
    if (!editId) {
      console.log("[google-play-listings] edits.insert returned no edit id");
      return { ok: false, error: "Failed to create edit" };
    }
    const { data: listData } = await androidPublisher.edits.listings.list({ packageName: pkg, editId });
    const listings = (listData?.listings || []).map((l) => ({
      language: l.language || "",
      title: l.title || "",
      fullDescription: l.fullDescription || "",
      shortDescription: l.shortDescription || "",
    }));

    return { ok: true, data: { packageName: pkg, listings } };
  } catch (err) {
    console.error("[google-play-listings] error:", err.code || err.message, err.message, err.response?.data ? JSON.stringify(err.response.data).slice(0, 200) : "");
    let msg = err.message || "Android Publisher API failed";
    if (err.code === 403 || /PERMISSION_DENIED|not enabled/i.test(msg)) {
      msg = "Enable Google Play Android Developer API and grant the service account access in Play Console.";
    }
    return { ok: false, error: msg };
  }
}
