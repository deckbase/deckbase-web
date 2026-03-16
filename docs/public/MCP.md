# Deckbase MCP (Model Context Protocol)

Deckbase exposes an MCP server so AI tools (Cursor, Claude Code, VS Code, etc.) can read public docs and manage decks and cards.

## Endpoints

| Mode | Endpoint | Auth |
|------|----------|------|
| **Hosted (HTTP)** | `POST https://www.deckbase.co/api/mcp` | `Authorization: Bearer <API_KEY>` |

API keys are created in the dashboard (Pro/VIP). MCP is available for Pro and VIP subscribers in production.

---

## Tools

### Documentation

| Tool | Description | Parameters |
|------|-------------|------------|
| **list_docs** | List public docs exposed by the server (docs in `docs/public/`) | — |
| **read_doc** | Read a public doc by path | `path` (e.g. `MCP.md` or `public/MCP.md`) |

### Decks and cards (hosted only; require API key)

| Tool | Description | Parameters |
|------|-------------|------------|
| **list_decks** | List the user's flashcard decks (deckId, title, description) | — |
| **create_deck** | Create a new flashcard deck | `title` (required), `description` (optional) |
| **create_card** | Create a simple flashcard with front-side content only (back not supported) | `deckId`, `front` (both required) |

- **list_decks** returns an array of `{ deckId, title, description }`. Use `deckId` with **create_card**.
- **create_deck** returns `{ deckId, title, description }`.
- **create_card** returns `{ cardId, deckId, front }`. Only the front (one side) is supported; back is not used.

Deck and card tools require the hosted MCP endpoint with an API key.

---

## Resources

The server exposes MCP **resources** for public docs only:

- **resources/list**: One resource per `.md` file in `docs/public/`, with URI `deckbase://docs/public/<filename>`.
- **resources/read**: Fetch doc content by that URI.

---

## Example: create a deck and add a card (hosted)

1. Configure your client with the MCP URL and `Authorization: Bearer YOUR_API_KEY`.
2. Call **create_deck** with `title` (e.g. `"Spanish verbs"`) and optional `description`.
3. Use the returned `deckId` and call **create_card** with `deckId` and `front` (e.g. `"What is 'to run' in Spanish?"`). Only the front is supported; back is not used.

---

## Technical details

- **Protocol:** MCP `2024-11-05`
- **Server name:** `deckbase-mcp`
- **Hosted:** JSON-RPC 2.0 over POST; auth is API key only (no Firebase token).
- **Card shape:** create_card builds a minimal flashcard with front content only (back not supported) and writes via Firestore Admin. Decks and cards appear in the user's dashboard and sync to the mobile app.

See also:

- **Setup and client config:** [Connecting to Deckbase MCP](https://www.deckbase.co/mcp) (public page)
- **Server implementation:** `lib/mcp-handlers.js`, `app/api/mcp/route.js`, `mcp-server/README.md`
