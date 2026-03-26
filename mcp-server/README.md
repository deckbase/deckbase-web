# Deckbase MCP Server

MCP (Model Context Protocol) server for the Deckbase project. Exposes project documentation and tools so Cursor (or other MCP clients) can read Deckbase docs and list/read files.

**Two ways to use it:**

| Mode              | Use case                                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Local (stdio)** | Run `node mcp-server/index.js`; Cursor starts it as a subprocess. No auth.                                                              |
| **Hosted (HTTP)** | Your deployed app exposes `POST /api/mcp`; clients send an API key (Bearer). Use this to share MCP with your team or use from anywhere. |

---

## What it provides

- **Tools**
  - `list_docs` – List all Markdown files in `docs/`
  - `read_doc` – Read a doc by path (e.g. `STATE_BASED_SYNC_MOBILE.md` or `docs/FIRESTORE_FLASHCARDS_MIGRATION.md`)

- **Resources**
  - `deckbase://docs/<filename>` – Read a doc from `docs/` (e.g. `deckbase://docs/STATE_BASED_SYNC_MOBILE.md`)

---

## Hosted MCP with API key

The app exposes **POST /api/mcp** (JSON-RPC over HTTP). Auth is **API key only** (no Firebase token). Create an API key in the dashboard and send it as Bearer.

### Requirements

- Deploy your Next.js app (e.g. Vercel) so it serves `/api/mcp`.
- Firestore (and API key storage) must be configured so the API can look up keys.

### How to call it

1. **Create an API key** in the dashboard (API keys / MCP page). Copy the key (shown once).
2. **Send a JSON-RPC 2.0 request** to `https://your-app.com/api/mcp`:
   - **Method:** POST
   - **Headers:** `Content-Type: application/json`, `Authorization: Bearer <API key>`
   - **Body:** One JSON-RPC request per POST, e.g.  
     `{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}`  
     or `{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}`  
     or `{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"read_doc","arguments":{"path":"STATE_BASED_SYNC_MOBILE.md"}}}`

3. **Response:** JSON-RPC response, e.g. `{"jsonrpc":"2.0","id":3,"result":{...}}` or `{"jsonrpc":"2.0","id":3,"error":{...}}`.

### Errors

| HTTP | JSON-RPC error                            | Meaning                  |
| ---- | ----------------------------------------- | ------------------------ |
| 401  | `Missing Authorization: Bearer <API key>` | No or invalid header     |
| 401  | `Invalid or unknown API key`              | Key not found or invalid |
| 503  | Server not configured                     | Backend not set up       |

### Cursor with hosted MCP

Cursor’s URL-based MCP expects a single endpoint. The MCP protocol is request/response, so you can point Cursor at your URL and send the API key in headers. If your Cursor config supports a URL + headers:

```json
{
  "mcpServers": {
    "deckbase-hosted": {
      "url": "https://your-app.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

**Note:** API keys do not expire. Use the same key until you revoke it.

---

## Local (stdio) setup

- **Tools**
  - `list_docs` – List all Markdown files in `docs/`
  - `read_doc` – Read a doc by path (e.g. `STATE_BASED_SYNC_MOBILE.md` or `docs/FIRESTORE_FLASHCARDS_MIGRATION.md`)

- **Resources**
  - `deckbase://docs/<filename>` – Read a doc from `docs/` (e.g. `deckbase://docs/STATE_BASED_SYNC_MOBILE.md`)

## Local (stdio) setup

### 1. Enable in Cursor

A project-level config is in `.cursor/mcp.json`. If Cursor uses it, the Deckbase MCP server will appear when you open this repo.

If not, add the server manually in Cursor settings (MCP):

- **User settings:** Cursor → Settings → MCP → Edit config (e.g. `~/.cursor/mcp.json`)
- Add:

```json
{
  "mcpServers": {
    "deckbase": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/deckbase-web/mcp-server/index.js"]
    }
  }
}
```

Replace `/ABSOLUTE/PATH/TO/deckbase-web` with your actual project path. No `cwd` is required; the server resolves paths from its own location.

### 2. Restart Cursor

Restart Cursor (or reload the window) so it picks up the MCP server.

## Run manually (test)

```bash
cd deckbase-web
node mcp-server/index.js
```

Then send JSON-RPC over stdin (newline-delimited JSON). The server responds on stdout.

The server is implemented with plain Node.js (no external dependencies).
