# Firebase MCP in Cursor (official)

Google ships a **Firebase MCP server** via `firebase-tools`. It lets the AI use tools like **`firestore_get_documents`**, **`firestore_list_collections`**, Storage rules, Auth users, etc., using the **same credentials as the Firebase CLI** on your machine.

**Docs:** [Firebase MCP server](https://firebase.google.com/docs/cli/mcp-server)

---

## Prerequisites

1. **Node.js** and **npm**
2. **Firebase CLI logged in** (or Application Default Credentials) for the project you want to query:
   ```bash
   firebase login
   firebase use <your-project-id>   # in a folder that has firebase.json, or set default project
   ```

---

## Cursor (this repo)

Project file: **`.cursor/mcp.json`**

The repo includes a **`firebase`** entry alongside **`deckbase`**:

```json
"firebase": {
  "command": "npx",
  "args": [
    "-y",
    "firebase-tools@latest",
    "experimental:mcp",
    "--dir",
    "${workspaceFolder}",
    "--only",
    "core,firestore,storage,auth"
  ]
}
```

- **`--dir`** — Sets Firebase project context from this repo (expects `firebase.json` at the workspace root).
- **`--only`** — Limits exposed tools (optional). Remove or adjust if you need more feature groups (see [capabilities](https://firebase.google.com/docs/cli/mcp-server#capabilities)).

After editing, **restart MCP** or reload Cursor so the new server connects.

---

## Example: read a Firestore card doc

With the Firebase MCP connected and the correct project active, the assistant can use:

- **`firestore_get_documents`** with full paths like:
  - `users/<uid>/cards/<cardId>`
  - `users/<uid>/media/<mediaId>`

List tools anytime:

```bash
npx firebase-tools@latest experimental:mcp --generate-tool-list
```

---

## Notes

- **Deckbase MCP** (`mcp-server/index.js`) only reads local `docs/` and (when hosted) deck/card APIs — it does **not** query Firestore. Use **Firebase MCP** for database inspection.
- **PII:** Google’s docs warn against putting sensitive user data into prompts; use for debugging with care, not production data dumps in shared chats.
