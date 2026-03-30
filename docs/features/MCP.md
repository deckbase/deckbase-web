# Deckbase MCP (features folder)

**Canonical documentation:** [`docs/public/MCP.md`](../public/MCP.md)

That file is what the hosted MCP serves via **`read_doc`** (paths under `docs/public/`) and is the single source of truth for endpoints, OAuth, the full tool list, and examples.

The older stub in this path only listed basic CRUD. **Edit `docs/public/MCP.md`** when changing MCP behavior.

## Quick pointers

| Topic | Where |
|--------|--------|
| Assistant workflow (template → schema → create) | [`MCP-AI-CARD-WORKFLOW.md`](../public/MCP-AI-CARD-WORKFLOW.md) |
| Hosted endpoint | `POST https://www.deckbase.co/api/mcp` |
| Auth | Dashboard API key **or** OAuth access token (see public doc) |
| ElevenLabs voices, image tools, delete/update tools, `export_deck` | Full tables in [`MCP.md`](../public/MCP.md) |
| Implementation | `lib/mcp-handlers.js`, `app/api/mcp/route.js`, `mcp-server/index.js` |

## Resources

Hosted MCP exposes **`deckbase://docs/public/<filename>`** resources (see public `MCP.md`). Local stdio MCP is docs-only unless configured for hosted tools.
