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
| **list_docs** | List all Markdown files in the project `docs/` folder | — |
| **read_doc** | Read a doc by path or filename | `path` (e.g. `STATE_BASED_SYNC_MOBILE.md` or `docs/features/MCP.md`) |

### Decks and cards (hosted only; require API key)

| Tool | Description | Parameters |
|------|-------------|------------|
| **list_decks** | List the user's flashcard decks (deckId, title, description) | — |
| **create_deck** | Create a new flashcard deck | `title` (required), `description` (optional) |
| **create_card** | Create a simple flashcard with front content only (back not supported) | `deckId`, `front` (both required) |

- **list_decks** returns an array of `{ deckId, title, description }`. Use `deckId` with **create_card**.
- **create_deck** returns `{ deckId, title, description }`.
- **create_card** returns `{ cardId, deckId, front }`. Only the front (one side) is supported; back is not used.

If you call **list_decks**, **create_deck**, or **create_card** via the local stdio server (no API key), the server returns a message that these tools are only available when using the hosted MCP endpoint with an API key.

---

## Resources

The server also exposes MCP **resources** for docs:

- **resources/list**: One resource per `.md` file in `docs/`, with URI `deckbase://docs/<filename>`.
- **resources/read**: Fetch doc content by that URI.

---

## Example: create a deck and add a card (hosted)

1. Configure your client with the MCP URL and `Authorization: Bearer YOUR_API_KEY`.
2. Call **create_deck** with `title` (e.g. `"Spanish verbs"`) and optional `description`.
3. Use the returned `deckId` and call **create_card** with `deckId`, `front` (e.g. `"What is 'to run' in Spanish?"`), and `back` (e.g. `"correr"`).

---

## Technical details

- **Protocol:** MCP `2024-11-05`
- **Server name:** `deckbase-mcp`
- **Hosted:** JSON-RPC 2.0 over POST; auth is API key only (no Firebase token).
- **Card shape:** create_card builds a minimal flashcard with two blocks (question + answer) and writes via Firestore Admin. Decks and cards appear in the user's dashboard and sync to the mobile app.

See also:

- **Setup and client config:** [Connecting to Deckbase MCP](https://www.deckbase.co/mcp) (public page)
- **Server implementation:** `lib/mcp-handlers.js`, `app/api/mcp/route.js`, `mcp-server/index.js`, `mcp-server/README.md`
