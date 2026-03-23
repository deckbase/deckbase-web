/**
 * MCP OAuth 2.0 (authorization code + PKCE) with Firebase sign-in.
 * Access tokens are JWTs; API keys (db_...) remain supported on /api/mcp via resolveMcpBearer.
 */

import { createHash, randomBytes } from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import { SignJWT, jwtVerify } from "jose";
import { getAdminFirestore } from "@/utils/firebase-admin";
import { SITE_URL } from "@/lib/site-url";

const CODES_COLLECTION = "mcp_oauth_codes";
const REFRESH_COLLECTION = "mcp_oauth_refresh_tokens";

const CODE_TTL_MS = 10 * 60 * 1000;
export const ACCESS_TOKEN_TTL_SEC = 3600;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Issuer identifier; matches JWT `iss` and OAuth metadata discovery. */
export const MCP_OAUTH_ISSUER = `${SITE_URL}/api/mcp/oauth`;
const JWT_AUDIENCE = "deckbase-mcp";

/** @returns {Uint8Array} */
function getJwtSecret() {
  const s = process.env.MCP_OAUTH_JWT_SECRET?.trim();
  if (!s || s.length < 32) {
    throw new Error("MCP_OAUTH_JWT_SECRET is not set or shorter than 32 characters");
  }
  return new TextEncoder().encode(s);
}

export function isMcpOAuthConfigured() {
  try {
    getJwtSecret();
    return true;
  } catch {
    return false;
  }
}

/**
 * Registered OAuth clients (public clients, PKCE). Override via MCP_OAUTH_CLIENTS JSON array.
 * @returns {{ client_id: string, redirect_uris: string[] }[]}
 */
export function getOAuthClients() {
  const raw = process.env.MCP_OAUTH_CLIENTS?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      /* fall through */
    }
  }
  return [
    {
      client_id: "deckbase",
      redirect_uris: [
        "cursor://anysphere.cursor-mcp/oauth/callback",
        "http://127.0.0.1",
        "http://localhost",
        "http://localhost:3000",
        `${SITE_URL}/mcp/oauth/callback`,
        // ChatGPT / OpenAI connector OAuth (browser; prefix match allows path + query)
        "https://chatgpt.com",
        "https://www.chatgpt.com",
        "https://chat.openai.com",
      ],
    },
  ];
}

/**
 * ChatGPT connector and OpenAI web OAuth use HTTPS URLs under these hosts (any path).
 * Kept separate from env override so `client_id=deckbase` always accepts them.
 * @param {string} redirectUri
 */
export function isAllowedChatgptOpenAiBrowserRedirect(redirectUri) {
  try {
    const u = new URL(String(redirectUri).trim());
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    // ChatGPT / OpenAI connectors may use apex, www, or product subdomains.
    if (h === "chatgpt.com" || h.endsWith(".chatgpt.com")) return true;
    if (h === "openai.com" || h.endsWith(".openai.com")) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * @param {string} clientId
 * @param {string} redirectUri
 */
export function validateClientRedirect(clientId, redirectUri) {
  const clients = getOAuthClients();
  const cid = String(clientId || "").trim();
  const client = clients.find((c) => c.client_id.toLowerCase() === cid.toLowerCase());
  if (!client) return { ok: false, error: "Unknown client_id" };
  const rid = String(redirectUri || "").trim();
  if (client.client_id.toLowerCase() === "deckbase" && isAllowedChatgptOpenAiBrowserRedirect(rid)) {
    return { ok: true, client };
  }
  const allowed = client.redirect_uris || [];
  const exact = allowed.some((u) => u === rid);
  if (exact) return { ok: true, client };
  const prefix = allowed.some((u) => rid.startsWith(u + "/") || rid.startsWith(u + "?"));
  if (prefix) return { ok: true, client };
  return { ok: false, error: "redirect_uri not allowed for this client" };
}

/**
 * RFC 7591 dynamic registration: every redirect_uri must be allowed for client_id `deckbase`.
 * @param {unknown} redirectUris
 * @returns {{ ok: true, client_id: "deckbase" } | { ok: false, error: string }}
 */
export function validateOAuthDynamicRegistration(redirectUris) {
  const clientId = "deckbase";
  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    return { ok: false, error: "redirect_uris required" };
  }
  for (const uri of redirectUris) {
    if (typeof uri !== "string" || !uri.trim()) {
      return { ok: false, error: "invalid redirect_uri" };
    }
    const vr = validateClientRedirect(clientId, uri.trim());
    if (!vr.ok) {
      return { ok: false, error: vr.error || "redirect_uri not allowed" };
    }
  }
  return { ok: true, client_id: clientId };
}

/**
 * @param {string} verifier
 * @param {string} challenge
 * @param {string} method
 */
export function verifyPkce(verifier, challenge, method) {
  if (!verifier || !challenge || !method) return false;
  const m = String(method).toUpperCase();
  if (m === "PLAIN") return verifier === challenge;
  if (m === "S256") {
    const digest = createHash("sha256").update(verifier, "utf8").digest("base64url");
    return digest === challenge;
  }
  return false;
}

function hashToken(raw) {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/**
 * @param {string} uid
 * @param {object} fields
 */
export async function storeAuthorizationCode(uid, fields) {
  const db = getAdminFirestore();
  if (!db) throw new Error("Firestore not configured");

  const code = randomBytes(24).toString("hex");
  const now = Date.now();
  const ref = db.collection(CODES_COLLECTION).doc(code);
  await ref.set({
    uid,
    client_id: fields.client_id,
    redirect_uri: fields.redirect_uri,
    code_challenge: fields.code_challenge,
    code_challenge_method: fields.code_challenge_method,
    state: fields.state ?? "",
    created_at: Timestamp.fromMillis(now),
    expires_at: Timestamp.fromMillis(now + CODE_TTL_MS),
  });

  return code;
}

/**
 * @param {string} code
 * @param {string} clientId
 * @param {string} redirectUri
 * @param {string} codeVerifier
 * @returns {Promise<{ ok: true, uid: string } | { ok: false, error: string }>}
 */
export async function consumeAuthorizationCode(code, clientId, redirectUri, codeVerifier) {
  const db = getAdminFirestore();
  if (!db) return { ok: false, error: "Server not configured" };

  const ref = db.collection(CODES_COLLECTION).doc(code);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "Invalid or expired code" };

  const d = snap.data();
  const exp = d.expires_at?.toMillis?.() ?? 0;
  if (Date.now() > exp) {
    await ref.delete().catch(() => {});
    return { ok: false, error: "Authorization code expired" };
  }

  if (String(d.client_id).toLowerCase() !== String(clientId).toLowerCase()) {
    return { ok: false, error: "client_id mismatch" };
  }
  if (String(d.redirect_uri).trim() !== String(redirectUri).trim()) {
    return { ok: false, error: "redirect_uri mismatch" };
  }
  if (!verifyPkce(codeVerifier, d.code_challenge, d.code_challenge_method)) {
    return { ok: false, error: "Invalid code_verifier (PKCE)" };
  }

  const uid = d.uid;
  await ref.delete().catch(() => {});
  return { ok: true, uid };
}

/**
 * @param {string} uid
 */
export async function mintAccessToken(uid) {
  const secret = getJwtSecret();
  const token = await new SignJWT({ purpose: "mcp_oauth" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(uid)
    .setIssuer(MCP_OAUTH_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SEC}s`)
    .sign(secret);
  return token;
}

/**
 * @param {string} uid
 * @returns {Promise<{ refreshToken: string }>}
 */
export async function mintRefreshToken(uid) {
  const db = getAdminFirestore();
  if (!db) throw new Error("Firestore not configured");

  const raw = randomBytes(32).toString("hex");
  const id = hashToken(raw);
  const now = Date.now();
  await db.collection(REFRESH_COLLECTION).doc(id).set({
    uid,
    created_at: Timestamp.fromMillis(now),
    expires_at: Timestamp.fromMillis(now + REFRESH_TOKEN_TTL_MS),
  });

  return { refreshToken: raw };
}

/**
 * @param {string} refreshTokenRaw
 */
export async function consumeRefreshToken(refreshTokenRaw) {
  const db = getAdminFirestore();
  if (!db) return { ok: false, error: "Server not configured" };

  const id = hashToken(refreshTokenRaw);
  const ref = db.collection(REFRESH_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "Invalid refresh token" };

  const d = snap.data();
  const exp = d.expires_at?.toMillis?.() ?? 0;
  if (Date.now() > exp) {
    await ref.delete().catch(() => {});
    return { ok: false, error: "Refresh token expired" };
  }

  const uid = d.uid;
  await ref.delete().catch(() => {});
  return { ok: true, uid };
}

/**
 * @param {string} jwt
 * @returns {Promise<{ uid: string } | null>}
 */
export async function verifyMcpOAuthAccessToken(jwt) {
  if (!jwt || typeof jwt !== "string" || !jwt.includes(".")) return null;
  if (!isMcpOAuthConfigured()) return null;

  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(jwt, secret, {
      issuer: MCP_OAUTH_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ["HS256"],
    });
    const sub = payload.sub;
    if (typeof sub !== "string" || !sub.trim()) return null;
    if (payload.purpose !== "mcp_oauth") return null;
    return { uid: sub.trim() };
  } catch {
    return null;
  }
}

export function oauthAuthorizationUrl() {
  return `${SITE_URL}/api/mcp/oauth/authorize`;
}

export function oauthTokenUrl() {
  return `${SITE_URL}/api/mcp/oauth/token`;
}
