/**
 * Fetch current App Store listing (description, keywords, subtitle) per locale via App Store Connect API.
 * Set APPSTORE_CONNECT_ISSUER_ID, APPSTORE_CONNECT_KEY_ID, APPSTORE_CONNECT_PRIVATE_KEY (contents of .p8).
 * Create key in App Store Connect → Users and Access → Integrations → App Store Connect API.
 */
import crypto from "crypto";

const APPSTORE_BASE = "https://api.appstoreconnect.apple.com/v1";

/** Convert DER-encoded ECDSA signature (Node default) to raw r||s (JWT ES256 / P1363). P-256 = 32 bytes each. */
function derToRawP1363(derBuf) {
  if (!Buffer.isBuffer(derBuf)) derBuf = Buffer.from(derBuf, "base64");
  let i = 0;
  if (derBuf[i++] !== 0x30) throw new Error("DER: expected SEQUENCE");
  let seqLen = derBuf[i++];
  if (seqLen & 0x80) {
    const n = seqLen & 0x7f;
    seqLen = 0;
    for (let j = 0; j < n; j++) seqLen = (seqLen << 8) | derBuf[i++];
  }
  const readInt = () => {
    if (derBuf[i++] !== 0x02) throw new Error("DER: expected INTEGER");
    let len = derBuf[i++];
    if (len & 0x80) {
      const n = len & 0x7f;
      len = 0;
      for (let j = 0; j < n; j++) len = (len << 8) | derBuf[i++];
    }
    const val = derBuf.subarray(i, i + len);
    i += len;
    return val;
  };
  let r = readInt();
  let s = readInt();
  const pad = (buf, len) => {
    if (buf.length > len) return buf.subarray(buf.length - len);
    const out = Buffer.alloc(len);
    buf.copy(out, len - buf.length);
    return out;
  };
  return Buffer.concat([pad(r, 32), pad(s, 32)]);
}

function getJwt() {
  const issuerId = process.env.APPSTORE_CONNECT_ISSUER_ID?.trim();
  const keyId = process.env.APPSTORE_CONNECT_KEY_ID?.trim();
  const privateKey = process.env.APPSTORE_CONNECT_PRIVATE_KEY?.trim();
  if (!issuerId || !keyId || !privateKey) {
    console.log("[appstore-connect-listings] getJwt missing:", { hasIssuerId: !!issuerId, hasKeyId: !!keyId, hasPrivateKey: !!privateKey, privateKeyLength: (privateKey || "").length });
    return null;
  }
  const keyPem = privateKey.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: issuerId, iat: now, exp: now + 1200, aud: "appstoreconnect-v1" };
  const header = { alg: "ES256", kid: keyId };
  const b64 = (s) => Buffer.from(JSON.stringify(s)).toString("base64url");
  const signatureInput = `${b64(header)}.${b64(payload)}`;
  try {
    const keyObj = crypto.createPrivateKey(keyPem);
    const sigDer = crypto.sign("sha256", Buffer.from(signatureInput, "utf8"), keyObj);
    const sigRaw = derToRawP1363(sigDer);
    const sigB64 = sigRaw.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return `${signatureInput}.${sigB64}`;
  } catch (e) {
    console.error("[appstore-connect-listings] getJwt sign error:", e.message);
    return null;
  }
}

async function appStoreFetch(path, jwt) {
  const url = `${APPSTORE_BASE}${path}`;
  console.log("[appstore-connect-listings] fetch:", path);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.errors?.[0]?.detail || data.errors?.[0]?.title || data.message || `HTTP ${res.status}`;
    console.error("[appstore-connect-listings] API error:", { path, status: res.status, statusText: res.statusText, data: JSON.stringify(data).slice(0, 300) });
    throw new Error(msg);
  }
  return data;
}

/**
 * Fetch current App Store version localizations (description, keywords, subtitle).
 * @param {string} [appId] - App Store Connect app id (optional; if not set, first app is used)
 * @param {string} [bundleId] - Bundle ID to find app (e.g. com.deckbase.app). Used if appId not set.
 * @returns {Promise<{ ok: boolean, data?: { localizations: Array<{ locale, description, keywords, subtitle, promotionalText }> }, error?: string }>}
 */
export async function fetchAppStoreListings(appId, bundleId) {
  const jwt = getJwt();
  if (!jwt) {
    const err = "App Store Connect not configured (APPSTORE_CONNECT_ISSUER_ID, APPSTORE_CONNECT_KEY_ID, APPSTORE_CONNECT_PRIVATE_KEY)";
    console.log("[appstore-connect-listings] fetchAppStoreListings skipped:", err);
    return { ok: false, error: err };
  }

  const targetAppId = (appId || process.env.APPSTORE_APP_ID || "").toString().trim();
  const targetBundleId = (bundleId || process.env.APPSTORE_BUNDLE_ID || "").toString().trim();
  console.log("[appstore-connect-listings] fetchAppStoreListings start:", { targetAppId: targetAppId || "(none)", targetBundleId: targetBundleId || "(none)" });

  try {
    let resolvedAppId = targetAppId;
    if (!resolvedAppId) {
      const appsData = await appStoreFetch("/apps?limit=200", jwt);
      const apps = appsData.data || [];
      console.log("[appstore-connect-listings] /apps response:", { appCount: apps.length, bundleIds: apps.slice(0, 5).map((a) => a.attributes?.bundleId) });
      const match = targetBundleId
        ? apps.find((a) => (a.attributes?.bundleId || "").toLowerCase() === targetBundleId.toLowerCase())
        : apps[0];
      if (!match) {
        const err = targetBundleId ? `No app with bundle ID ${targetBundleId}` : "No apps found";
        console.log("[appstore-connect-listings]", err);
        return { ok: false, error: err };
      }
      resolvedAppId = match.id;
    }

    const versionsData = await appStoreFetch(`/apps/${resolvedAppId}/appStoreVersions?limit=5`, jwt);
    const versions = (versionsData.data || []).sort((a, b) => {
      const va = a.attributes?.versionString || "";
      const vb = b.attributes?.versionString || "";
      return vb.localeCompare(va, undefined, { numeric: true });
    });
    const versionId = versions[0]?.id;
    if (!versionId) {
      console.log("[appstore-connect-listings] No app store version for app", resolvedAppId);
      return { ok: false, error: "No app store version found" };
    }

    const appDetails = await appStoreFetch(`/apps/${resolvedAppId}`, jwt);
    const appName = appDetails.data?.attributes?.name || "";
    console.log("[appstore-connect-listings] app details:", { appId: resolvedAppId, appName: appName || "(empty)" });

    const locsData = await appStoreFetch(`/appStoreVersions/${versionId}/appStoreVersionLocalizations?limit=50`, jwt);
    const rawLocs = locsData.data || [];
    if (rawLocs.length > 0) {
      const first = rawLocs[0];
      console.log("[appstore-connect-listings] first localization raw attributes keys:", Object.keys(first?.attributes || {}));
      console.log("[appstore-connect-listings] first localization subtitle:", { raw: first?.attributes?.subtitle, type: typeof first?.attributes?.subtitle });
      console.log("[appstore-connect-listings] first localization full attributes (no long text):", {
        locale: first?.attributes?.locale,
        descriptionLength: (first?.attributes?.description || "").length,
        keywordsLength: (first?.attributes?.keywords || "").length,
        subtitle: first?.attributes?.subtitle,
        promotionalText: first?.attributes?.promotionalText,
      });
    } else {
      console.log("[appstore-connect-listings] no appStoreVersionLocalizations returned");
    }
    const locs = rawLocs.map((l) => ({
      id: l.id,
      locale: l.attributes?.locale || "",
      description: l.attributes?.description || "",
      keywords: l.attributes?.keywords || "",
      subtitle: l.attributes?.subtitle || "",
      promotionalText: l.attributes?.promotionalText || "",
    }));
    console.log("[appstore-connect-listings] mapped localizations count:", locs.length, "first locale:", locs[0]?.locale, "first subtitle:", locs[0]?.subtitle ?? "(empty)");

    return { ok: true, data: { appId: resolvedAppId, appName, versionId, localizations: locs } };
  } catch (err) {
    console.error("[appstore-connect-listings] error:", err.message, err.stack);
    return { ok: false, error: err.message || "App Store Connect API failed" };
  }
}
