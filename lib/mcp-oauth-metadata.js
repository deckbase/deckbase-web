/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414) for Deckbase MCP OAuth.
 * Metadata URL: {MCP_OAUTH_ISSUER}/.well-known/oauth-authorization-server
 */

import {
  isMcpOAuthConfigured,
  MCP_OAUTH_ISSUER,
  oauthAuthorizationUrl,
  oauthTokenUrl,
} from "@/lib/mcp-oauth";
import { MCP_RESOURCE_IDENTIFIER } from "@/lib/mcp-protected-resource-metadata";

/**
 * @returns {Record<string, unknown> | null} null if OAuth is not configured
 */
export function getOAuthAuthorizationServerMetadata() {
  if (!isMcpOAuthConfigured()) return null;

  return {
    issuer: MCP_OAUTH_ISSUER,
    authorization_endpoint: oauthAuthorizationUrl(),
    token_endpoint: oauthTokenUrl(),
    registration_endpoint: `${MCP_OAUTH_ISSUER}/register`,
    protected_resources: [MCP_RESOURCE_IDENTIFIER],
    scopes_supported: ["mcp"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256", "PLAIN"],
    token_endpoint_auth_methods_supported: ["none"],
  };
}
