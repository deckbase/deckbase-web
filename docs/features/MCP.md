# Deckbase MCP (Model Context Protocol)

Deckbase exposes an MCP server so AI tools (Cursor, Claude Code, VS Code, etc.) can read project docs and manage decks and cards.

## Endpoints

| Mode | Endpoint | Auth |
|------|----------|------|
| **Hosted (HTTP)** | `POST https://www.deckbase.co/api/mcp` | `Authorization: Bearer <API_KEY>` |
| **Local (stdio)** | Run `node mcp-server/index.js` from project root | None (docs only) |

API keys are created in the dashboard (Pro/VIP). MCP is available for Pro and VIP subscribers in production.

---

## Tools

### Documentation (work in both hosted and stdio)

| Tool | Description | Parameters |
|------|-------------|------------|
| **list_docs** | List public Markdown files (`docs/public/` on hosted catalog) | — |
| **read_doc** | Read a doc by path | `path` |
| **list_template_block_types** | Block type ids for `create_template` / `block_types` | — |
| **list_block_schemas** | JSON shapes per block type (`blocksSnapshot`, `values`, `configJson`) | — |

### Decks, templates, and cards (hosted only; require API key)

| Tool | Description | Parameters |
|------|-------------|------------|
| **list_decks** | List decks (`deckId`, title, description, optional `defaultTemplateId`) | — |
| **list_templates** | List templates (`templateId`, name, description). Empty → create_template first. | — |
| **get_template_schema** | Exact layout JSON for one template (`blockId`s, `valuesExample`, create_card hints). | `templateId` or `deckId` (default template) |
| **create_deck** | Create a new flashcard deck | `title` (required), `description` (optional) |
| **create_card** | New card from a template’s layout | `deckId` (required); `templateId` optional if deck has `defaultTemplateId`; optional `front`, `block_text` |
| **create_cards** | Bulk create cards (same template rules) | `deckId`, `cards` (array, max 50); optional `templateId` |
| **export_deck** | Export deck + cards JSON | `deckId`; optional `max_cards`; optional `export_type`: `full` (default) or `values_only` (omit per-card `blocksSnapshot`) |

- **list_decks** / **list_templates** supply ids for **create_card**; omit `templateId` when the deck has a default template. After choosing a template, **get_template_schema** gives exact `blockId` → string shapes for **block_text**.
- **create_deck** returns `{ deckId, title, description }`.
- **create_card** returns `{ cardId, deckId, templateId, usedDeckDefault }`. The server validates payloads: `block_text` keys must be real template `blockId`s; required text blocks must be filled; if the template has text blocks, at least one must have non-empty content (`front` and/or `block_text`). **create_cards** enforces the same per card.

If you call these hosted-only tools via the local stdio server (no API key), the server returns a message that they are only available when using the hosted MCP endpoint with an API key.

---

## Resources

The server also exposes MCP **resources** for docs:

- **resources/list**: One resource per `.md` file in `docs/`, with URI `deckbase://docs/<filename>`.
- **resources/read**: Fetch doc content by that URI.

---

## Example: deck, template, and card (hosted)

1. Configure your client with the MCP URL and `Authorization: Bearer YOUR_API_KEY`.
2. Call **list_templates**; if empty, **create_template** then list again.
3. Call **get_template_schema** with `templateId` (or `deckId` for default) for exact JSON.
4. Call **create_deck** with `title` (e.g. `"Spanish verbs"`) and optional `description`.
5. Call **create_card** with `deckId` and optional `templateId` (use deck default when set).

---

## Technical details

- **Protocol:** MCP `2024-11-05`
- **Server name:** `deckbase-mcp`
- **Hosted:** JSON-RPC 2.0 over POST; auth is API key only (no Firebase token).
- **Card shape:** create_card copies the selected template’s blocks into a new card via Firestore Admin. Decks and cards appear in the user's dashboard and sync to the mobile app.

See also:

- **Setup and client config:** [Connecting to Deckbase MCP](https://www.deckbase.co/mcp) (public page)
- **Server implementation:** `lib/mcp-handlers.js`, `app/api/mcp/route.js`, `mcp-server/index.js`, `mcp-server/README.md`
