/**
 * CORS for browser-based MCP / OAuth clients (e.g. ChatGPT dev mode) calling deckbase.co from another origin.
 */

export const MCP_BROWSER_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Accept, Accept-Language, Cache-Control",
  "Access-Control-Max-Age": "86400",
};

export const MCP_API_BROWSER_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Accept, Mcp-Session-Id, X-Requested-With, Cache-Control",
  "Access-Control-Max-Age": "86400",
};

export function mergeHeaders(base, extra) {
  return { ...base, ...extra };
}
