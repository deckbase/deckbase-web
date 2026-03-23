/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728) for the hosted MCP endpoint.
 * URL: {SITE_URL}/.well-known/oauth-protected-resource/api/mcp
 * (path inserted between host and resource path per RFC 9728 §3)
 */

import { isMcpOAuthConfigured, MCP_OAUTH_ISSUER } from "@/lib/mcp-oauth";
import { SITE_URL } from "@/lib/site-url";

/** Canonical MCP resource identifier (RFC 8707); must match token `resource` when clients send it. */
export const MCP_RESOURCE_IDENTIFIER = `${SITE_URL}/api/mcp`;

/**
 * Well-known URL for this protected resource’s metadata document.
 * @returns {string}
 */
export function getOAuthProtectedResourceMetadataUrl() {
  return `${SITE_URL}/.well-known/oauth-protected-resource/api/mcp`;
}

/**
 * @returns {Record<string, unknown> | null} null if OAuth is not configured
 */
export function getProtectedResourceMetadata() {
  if (!isMcpOAuthConfigured()) return null;

  return {
    resource: MCP_RESOURCE_IDENTIFIER,
    authorization_servers: [MCP_OAUTH_ISSUER],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp"],
  };
}

/**
 * WWW-Authenticate (RFC 9728 §5.1) so MCP clients can discover OAuth after a 401.
 * @returns {string | null}
 */
export function getMcpResourceMetadataWwwAuthenticateValue() {
  if (!isMcpOAuthConfigured()) return null;
  const url = getOAuthProtectedResourceMetadataUrl();
  return `Bearer resource_metadata="${url}"`;
}
