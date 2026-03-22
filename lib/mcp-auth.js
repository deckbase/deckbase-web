/**
 * MCP /api/mcp authentication: OAuth access token (JWT) or dashboard API key.
 */

import { resolveAuthApiKeyOnly } from "@/lib/auth-api";
import { verifyMcpOAuthAccessToken } from "@/lib/mcp-oauth";

/**
 * @param {string} bearerToken - Raw token after "Bearer "
 * @returns {Promise<{ uid: string, method: "oauth" | "api_key" } | null>}
 */
export async function resolveMcpBearer(bearerToken) {
  const raw = (bearerToken || "").trim();
  if (!raw) return null;

  const oauth = await verifyMcpOAuthAccessToken(raw);
  if (oauth?.uid) {
    return { uid: oauth.uid, method: "oauth" };
  }

  const api = await resolveAuthApiKeyOnly(raw);
  if (api?.uid) {
    return { uid: api.uid, method: "api_key" };
  }

  return null;
}
