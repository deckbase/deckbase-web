# Deckbase MCP (Model Context Protocol)

Deckbase exposes an MCP server so AI tools (Cursor, Claude Code, VS Code, etc.) can read public docs and manage decks and cards.

## Endpoints

| Mode | Endpoint | Auth |
|------|----------|------|
| **Hosted (HTTP)** | `POST https://www.deckbase.co/api/mcp` | `Authorization: Bearer <API_KEY>` **or** `Bearer <OAuth access token>` |

API keys are created in the dashboard (Pro/VIP). MCP is available for Pro and VIP subscribers in production.

### OAuth (browser login, optional)

When **`MCP_OAUTH_JWT_SECRET`** is set in the server environment (32+ characters), Deckbase exposes OAuth 2.0 **authorization code + PKCE**:

| | URL |
|---|-----|
| **Discovery (RFC 8414)** | `GET https://www.deckbase.co/api/mcp/oauth/.well-known/oauth-authorization-server` — JSON metadata (`issuer`, `authorization_endpoint`, `token_endpoint`, PKCE support, etc.) |
| **Authorization** | `GET https://www.deckbase.co/api/mcp/oauth/authorize` (`response_type=code`, `client_id`, `redirect_uri`, `state`, `code_challenge`, `code_challenge_method=S256`) |
| **Sign-in** | Redirects to `https://www.deckbase.co/mcp/oauth/login` (Firebase sign-in) |
| **Token** | `POST https://www.deckbase.co/api/mcp/oauth/token` (`grant_type=authorization_code` or `refresh_token`) |

Use the **access_token** from the token response as `Authorization: Bearer` on **`/api/mcp`**. **Dashboard API keys** keep working the same way. OAuth is optional; if the secret is not configured, OAuth endpoints return **503** and only API keys work.

Optional env: **`MCP_OAUTH_CLIENTS`** — JSON array of `{ "client_id", "redirect_uris" }`. Defaults include `cursor://anysphere.cursor-mcp/oauth/callback` and `https://www.deckbase.co/mcp/oauth/callback`.

---

## Tools

### Documentation

| Tool | Description | Parameters |
|------|-------------|------------|
| **list_docs** | List public docs exposed by the server (docs in `docs/public/`) | — |
| **read_doc** | Read a public doc by path | `path` (e.g. `MCP.md` or `public/MCP.md`) |
| **list_template_block_types** | Block type keys and numeric ids (for `create_template` / `block_types`) | — |
| **list_block_schemas** | JSON structure per block type (`blocksSnapshot` + `values` + `configJson`) | — |
| **list_elevenlabs_voices** | ElevenLabs TTS **voice ids** (`group`, `label`, `id`) plus server default/fallback hints | — |

### Decks, templates, and cards (hosted only; require API key)

| Tool | Description | Parameters |
|------|-------------|------------|
| **list_decks** | List the user's flashcard decks (includes `defaultTemplateId` when set) | — |
| **list_templates** | List the user's card templates (`templateId`, name, description). Empty list → create a template first. | — |
| **get_template_schema** | Exact JSON for one template: `blockId`s, `configJson`, `valuesExample`, `create_card` hints (`block_text` keys). | `templateId` (from **list_templates**) or `deckId` only (uses deck default) |
| **create_deck** | Create a new flashcard deck | `title` (required), `description` (optional) |
| **update_deck** | Change deck title, description, and/or **default** template id | `deckId` (required); optional `title`, `description`, `default_template_id` (empty string clears the default) |
| **create_card** | Create a new card using a template’s block layout (empty fields by default) | `deckId` (required); `templateId` optional — omit to use the deck’s **default** template (`defaultTemplateId` from **list_decks**); optional `front`, `block_text`, **`generate_audio`** (default **true**), **`voice_id`** (required for TTS when **`get_template_schema.voice_id_required_for_tts`** is true — use **list_elevenlabs_voices** after the user chooses) |
| **update_card** | Edit an existing card’s content | `deckId`, `cardId`; optional **`values`** (full replacement), **`blocks_snapshot`** (full layout replacement; pair with **`values`** or rely on empty values + `front` / `block_text`), optional **`front`** / **`block_text`** to merge into current values (blockIds must match the card layout — use **export_deck** or **get_template_schema**) |
| **create_cards** | Bulk create cards (same deck + template rules as **create_card**) | `deckId`, `cards` (array of `{ front?, block_text?, generate_audio?, voice_id? }`, max **50** per request); optional `templateId`; optional top-level **`voice_id`** / **`generate_audio`** |
| **attach_audio_to_card** | ElevenLabs TTS: add or replace audio on an **existing** card’s audio block | **`deckId`**, **`cardId`**, **`voice_id`** (required — use **list_elevenlabs_voices** after the user chooses); optional `block_id` (if multiple audio blocks); optional `text`; **`replace_existing`** (default `false`) to overwrite existing `mediaIds` |
| **export_deck** | Export deck metadata and cards as JSON | `deckId`; optional `max_cards`; optional **`export_type`** (see below) |
| **create_template** | Create a card template (block layout) | `name`, optional `description`, **`voice_id`** (required if layout includes **audio** and audio blocks lack **`defaultVoiceId`** in `configJson`), `block_types` or `blocks`, etc. |
| **update_template** | Change a template’s name, description, and/or layout | `templateId` (required); optional `name`, `description`, `block_types` or `blocks`, **`voice_id`**, `rendering`, `mainBlockId`, `subBlockId`. Omit `blocks` / `block_types` to keep the current layout. Increments template **version** when something changes. |

- **list_decks** returns `{ deckId, title, description, defaultTemplateId? }[]`. Use `deckId` with **create_card**; when `defaultTemplateId` is set, **create_card** can omit `templateId`.
- **list_templates** returns `{ templateId, name, description }[]`. If empty, use **create_template** (after **list_template_block_types**) before **create_card**.
- **get_template_schema** returns per-block `blockId`, type, `configJson`, plus `valuesExample` and suggested `block_text` keys for **create_card** / **create_cards** after the user (or client) picks a template.
- **create_deck** returns `{ deckId, title, description }`.
- **update_deck** returns the deck’s current `deckId`, `title`, `description`, `defaultTemplateId` after applying any provided fields.
- **update_card** returns `{ cardId, deckId }` after writing. Prefer **export_deck** to obtain `cardId`s and current **`values`** / **`blocksSnapshot`** before editing.
- **update_template** returns `{ templateId, name, description, mainBlockId, subBlockId, version }`. Same **`voice_id`** rules as **create_template** when the layout includes audio without **`defaultVoiceId`**.
- **create_card** returns `{ cardId, deckId, templateId, usedDeckDefault }`. The card matches the template’s fields; optional `front` fills the template main block; optional `block_text` maps `blockId` → string. Audio: when **`get_template_schema.voice_id_required_for_tts`** is true, you must pass **`voice_id`** (from **list_elevenlabs_voices**) after the user selects a voice; if the template’s audio block(s) already define **`defaultVoiceId`** in `configJson`, **`voice_id`** is optional and overrides when set. When `ELEVENLABS_API_KEY` is set and `generate_audio` is not `false`, the server runs ElevenLabs TTS if source text resolves. Production uses the same TTS character and storage limits as the web ElevenLabs API. Set `generate_audio` to `false` to skip TTS. Image blocks still require in-app upload. `usedDeckDefault` is true when `templateId` was omitted and the deck default was used. Requests are validated: unknown `block_text` keys are rejected; required text blocks must be non-empty; if the template includes any text blocks, at least one must have content (templates with only layout/media/quiz blocks are not forced to include text via MCP).
- **create_cards** applies the same rules to each element in `cards`.
- **create_template** returns `{ templateId, name, description, mainBlockId, subBlockId }`. If the layout includes an **audio** block, **`voice_id`** is required unless every audio block already has **`defaultVoiceId`** in **`configJson`** (e.g. in **`blocks`**). Otherwise call **list_elevenlabs_voices**, have the user choose, then pass **`voice_id`** — it is stored as **`defaultVoiceId`** on all audio blocks in the template.
- **attach_audio_to_card** returns `{ cardId, deckId, mediaId, charsUsed, blockId }` after writing TTS audio to the card’s audio block. **`voice_id`** is required (call **list_elevenlabs_voices** and confirm with the user). Use **`export_deck`** or your app to get `cardId`s. If the audio block already has `mediaIds`, pass **`replace_existing`: `true`** or the tool errors. Multiple audio blocks on one card require **`block_id`**.

Deck, template, and card tools require the hosted MCP endpoint with an API key.

### How **export_deck** works

1. **Auth:** Hosted MCP only; resolves the user from the API key, then loads the deck by `deckId` (must belong to that user).
2. **Query:** Loads non-deleted cards in that deck from Firestore (`deck_id` match, `is_deleted == false`). Ordering is not guaranteed to be chronological.
3. **Limit:** Returns at most `max_cards` (default **2000**, hard cap **5000**). If more cards exist, `truncated: true` and only the first *N* documents are returned.
4. **Shape:** Response is JSON: `deck` (`deckId`, `title`, `description`), `cards[]`, `truncated`, `maxCards`, `exportType`.
5. **Per card:** Each card includes ids (`cardId`, `templateId`, `mainBlockId`, `subBlockId`) and **`values`** (per-block content: `text`, `mediaIds`, quiz fields, etc.). With the default **`export_type`**, each card also includes **`blocksSnapshot`** (block definitions: `blockId`, `type`, `label`, `configJson`), matching what you need to interpret `values`.

**`export_type`**

| Value | Meaning |
|--------|--------|
| **`full`** (default) | Each card includes **`blocksSnapshot`** (layout) and **`values`** (content). |
| **`values_only`** | Omits **`blocksSnapshot`** on each card to reduce size; **`values`** still holds the same content. Use **`get_template_schema`** / **`list_block_schemas`** if you need the layout for a template. |

Invalid `export_type` values return an error. Hyphens are accepted (`values-only` → `values_only`).

---

## Resources

The server exposes MCP **resources** for public docs only:

- **resources/list**: One resource per `.md` file in `docs/public/`, with URI `deckbase://docs/public/<filename>`.
- **resources/read**: Fetch doc content by that URI.

---

## Example: deck, template, and card (hosted)

1. Configure your client with the MCP URL and `Authorization: Bearer YOUR_API_KEY`.
2. Call **list_templates**. If none exist, use **create_template** first, then list again.
3. Call **get_template_schema** with the chosen `templateId` (or `deckId` only to use the default template) to get exact `blockId` keys for `block_text`.
4. Call **create_deck** with `title` (e.g. `"Spanish verbs"`) and optional `description`.
5. Call **create_card** with `deckId` and optional `templateId` (omit when the deck has `defaultTemplateId` from the dashboard). Optionally `front` or `block_text` to pre-fill text.

---

## Technical details

- **Protocol:** MCP `2024-11-05`
- **Server name:** `deckbase-mcp`
- **Hosted:** JSON-RPC 2.0 over POST; auth is API key only (no Firebase token).
- **Claude Code:** Use `claude mcp add --transport http deckbase https://www.deckbase.co/api/mcp --header "Authorization: Bearer YOUR_API_KEY"`. Without `--header`, requests are unauthenticated and return **401**. See the [MCP setup page](https://www.deckbase.co/mcp) for the full steps.
- **ChatGPT Connectors:** Only works if the connector UI lets you set **custom headers** with `Authorization: Bearer <API key>`. If ChatGPT does not support that, Deckbase MCP cannot be used there; use Cursor, Claude Code, or VS Code instead. See [ChatGPT on the setup page](https://www.deckbase.co/mcp#chatgpt).
- **Card shape:** create_card copies the chosen template’s blocks into a new card (via Firestore Admin). Decks and cards appear in the user's dashboard and sync to the mobile app.

See also:

- **AI / assistant workflow (discover template → schema → create):** [MCP-AI-CARD-WORKFLOW.md](./MCP-AI-CARD-WORKFLOW.md)
- **Setup and client config:** [Connecting to Deckbase MCP](https://www.deckbase.co/mcp) (public page)
- **Server implementation:** `lib/mcp-handlers.js`, `app/api/mcp/route.js`, `mcp-server/README.md`
