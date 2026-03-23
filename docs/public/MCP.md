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
| **Protected resource (RFC 9728)** | `GET https://www.deckbase.co/.well-known/oauth-protected-resource/api/mcp` — MCP clients use this first to find `authorization_servers` (required by the MCP [authorization](https://modelcontextprotocol.io/specification/latest/basic/authorization) spec). |
| **Discovery (RFC 8414)** | `GET https://www.deckbase.co/api/mcp/oauth/.well-known/oauth-authorization-server` — authorization server metadata (`issuer`, `authorization_endpoint`, `token_endpoint`, PKCE support, etc.) |
| **Authorization** | `GET https://www.deckbase.co/api/mcp/oauth/authorize` (`response_type=code`, `client_id`, `redirect_uri`, `state`, `code_challenge`, `code_challenge_method=S256`) |
| **Sign-in** | Redirects to `https://www.deckbase.co/mcp/oauth/login` (Firebase sign-in) |
| **Token** | `POST https://www.deckbase.co/api/mcp/oauth/token` (`grant_type=authorization_code` or `refresh_token`) |

Use the **access_token** from the token response as `Authorization: Bearer` on **`/api/mcp`**. **Dashboard API keys** keep working the same way. OAuth is optional; if the secret is not configured, OAuth endpoints return **503** and only API keys work. Unauthenticated **`POST /api/mcp`** responses include **`WWW-Authenticate` with `resource_metadata`** (RFC 9728) when OAuth is configured so clients can discover the protected resource URL.

Optional env: **`MCP_OAUTH_CLIENTS`** — JSON array of `{ "client_id", "redirect_uris" }`. Defaults include `cursor://anysphere.cursor-mcp/oauth/callback` and `https://www.deckbase.co/mcp/oauth/callback`.

---

## Tools

### Documentation

| Tool | Description | Parameters |
|------|-------------|------------|
| **list_docs** | List Markdown files in `docs/public/`. | None. |
| **read_doc** | Read a doc by path. Only docs in `docs/public/` are served. | `path` — e.g. `MCP.md` or `deckbase://docs/public/MCP.md`. |
| **list_template_block_types** | List all template block type keys and numeric ids (**text**, **media**, **quiz**, **layout**). Use so you can show the user what to pick; they choose multiple types in order, then you pass that list as `block_types` to **create_template**. Static data (no user Firestore reads). | None. |
| **list_block_schemas** | Returns JSON shapes for every block type: typical `blocksSnapshot` entry, matching `values` entry, and `configJson` fields for quiz/image/audio. Use for mobile, MCP, or any client building or parsing cards; pair with **export_deck** for real examples. | None. |
| **list_elevenlabs_voices** | Returns JSON with ElevenLabs voice ids (`group`, `label`, `id`, `gender`, `language`, …) for `voice_id` on **attach_audio_to_card** or `defaultVoiceId` in template audio blocks. The list is always the **Deckbase curated catalog** (same as `docs/api/ELEVENLABS_VOICES.md`); `source` is `static_curated`. Optional args: **`language`** (ISO 639 code, e.g. `uk`, `en`, `fil`), **`gender`** (`female` \| `male`), **`search`** (substring on label, group name, id, or language code). Response includes **`voices`** (filtered), **`totalVoicesInCatalog`**, **`filtersApplied`**, **`languageOptions`** (all `{ code, name }` pairs), plus `defaultVoiceIdFromEnv`, `serverFallbackVoiceId`, `docsUrl`, and optional `note` if **`ELEVENLABS_API_KEY`** is unset. No user Firestore reads. | Optional `language`, `gender`, `search`. |

### Decks and cards (hosted only; require API key)

| Tool | Description | Parameters |
|------|-------------|------------|
| **list_decks** | List the user’s flashcard decks (`deckId`, `title`, `description`, optional `defaultTemplateId`). When `defaultTemplateId` is set, **create_card** can omit `templateId`. | None. |
| **create_deck** | Create a new deck. Returns `deckId`. | `title` (required), `description` (optional). |
| **update_deck** | Update title, description, or default template. | `deckId` (required); optional `title`, `description`, `default_template_id` (empty string clears the default). |
| **list_templates** | List templates (`templateId`, `name`, `description`). If the list is empty, use **create_template** before **create_card**. | None. |
| **get_template_schema** | After the user picks a template, returns exact JSON for that layout: each `blockId`, type, `configJson`, `valuesExample`, and hints for **create_card** (`block_text` keys). Includes `voice_id_required_for_tts` when TTS needs an explicit voice. | `templateId` from **list_templates**, or `deckId` only to use the deck’s default template. |
| **create_card** | Create a new card using a template’s fields. Returns `cardId`, `templateId` used, and `usedDeckDefault`. Validates `block_text` keys, required text blocks, and that at least one text field is filled when the template has text blocks. | `deckId` (required). `templateId` optional — if omitted, uses the deck’s `defaultTemplateId` from **list_decks** (set in the dashboard); if the deck has no default, pass `templateId` from **list_templates**. Optional `front`, `block_text`, **`generate_audio`** (default **true**). When **`generate_audio`** is true and the template has an **audio** block, pass **`voice_id`** from **list_elevenlabs_voices** *or* **`audio_language`** (ISO 639) and **`audio_gender`** (`female` \| `male`) after asking the user — same curated catalog as **list_elevenlabs_voices** filters. |
| **update_card** | Edit an existing card. | Required `deckId` and `cardId`; optional full `values` and/or `blocks_snapshot`, or merge `front` / `block_text` into current values (use **export_deck** for ids and shapes). |
| **create_cards** | Create multiple cards in one request (same `deckId`, template resolution, and validation as **create_card**). Max **50** cards per request. If one card fails, the response lists created so far and `failedAt`; earlier cards may already exist in Firestore. | `deckId`, optional `templateId`, optional top-level `voice_id`, **`audio_language`**, **`audio_gender`**, **`generate_audio`**, required non-empty `cards` array; each element may include `front`, `block_text`, `voice_id`, `audio_language`, `audio_gender`, **`generate_audio`** like **create_card**. |
| **attach_audio_to_card** | ElevenLabs TTS for an existing card. | Required `deckId`, `cardId` (from **export_deck**). Pass **`voice_id`** *or* **`audio_language`** + **`audio_gender`** (after asking the user). Optional `text`, `block_id` when the card has multiple audio blocks, and **`replace_existing`** to overwrite existing audio. |
| **export_deck** | Export deck metadata and cards as JSON. Response includes `truncated` and `exportType`. | `deckId` (required); optional `max_cards` (default **2000**, cap **5000**); optional **`export_type`**: **`full`** (default: each card includes `blocksSnapshot` and `values`) or **`values_only`** (`values` only, smaller payload). |
| **create_template** | Create a flashcard template (block layout for new cards). Returns `templateId` and block ids. | `name` (required), optional `description`, optional `block_types` (ordered list of type keys or 0–12 ids from **list_template_block_types**; mutually exclusive with `blocks`), optional `blocks` (full block objects; omit both for default Question + Answer). If the layout includes an **audio** block, ask the user for a default TTS voice, then pass **`voice_id`** from **list_elevenlabs_voices** or **`audio_language`** (ISO 639) + **`audio_gender`** (`female` \| `male`) — same as **create_card** — unless every audio block already has `defaultVoiceId` in `configJson`. Optional `rendering` (`frontBlockIds` / `backBlockIds`), optional `mainBlockId` / `subBlockId`. |
| **update_template** | Change a template’s metadata and/or layout. Returns updated version (increments **version** when layout or metadata changes). | Required `templateId`; optional `name`, `description`, `block_types` / `blocks`, `voice_id` or `audio_language` + `audio_gender`, `rendering`, `mainBlockId` / `subBlockId`. Same default-voice rules as **create_template**. |

- **list_decks** returns `{ deckId, title, description, defaultTemplateId? }[]`. Use `deckId` with **create_card**; when `defaultTemplateId` is set, **create_card** can omit `templateId`.
- **list_templates** returns `{ templateId, name, description }[]`. If empty, use **create_template** (after **list_template_block_types**) before **create_card**.
- **get_template_schema** returns per-block `blockId`, type, `configJson`, plus `valuesExample` and suggested `block_text` keys for **create_card** / **create_cards** after the user (or client) picks a template.
- **create_deck** returns `{ deckId, title, description }`.
- **update_deck** returns the deck’s current `deckId`, `title`, `description`, `defaultTemplateId` after applying any provided fields.
- **update_card** returns `{ cardId, deckId }` after writing. Prefer **export_deck** to obtain `cardId`s and current **`values`** / **`blocksSnapshot`** before editing.
- **update_template** returns `{ templateId, name, description, mainBlockId, subBlockId, version }`. Same **`voice_id`** / **`audio_language`** + **`audio_gender`** rules as **create_template** when the layout includes audio without **`defaultVoiceId`**.
- **create_card** returns `{ cardId, deckId, templateId, usedDeckDefault }`. The card matches the template’s fields; optional `front` fills the template main block; optional `block_text` maps `blockId` → string. Audio: when **`generate_audio`** is not `false` and the template has an audio block, pass **`voice_id`** *or* **`audio_language`** + **`audio_gender`** (after asking the user). When `ELEVENLABS_API_KEY` is set and `generate_audio` is not `false`, the server runs ElevenLabs TTS if source text resolves. Production uses the same TTS character and storage limits as the web ElevenLabs API. Set `generate_audio` to `false` to skip TTS. Image blocks still require in-app upload. `usedDeckDefault` is true when `templateId` was omitted and the deck default was used. Requests are validated: unknown `block_text` keys are rejected; required text blocks must be non-empty; if the template includes any text blocks, at least one must have content (templates with only layout/media/quiz blocks are not forced to include text via MCP).
- **create_cards** applies the same rules to each element in `cards`.
- **create_template** returns `{ templateId, name, description, mainBlockId, subBlockId }`. If the layout includes an **audio** block, **`voice_id`** or **`audio_language`** + **`audio_gender`** is required unless every audio block already has **`defaultVoiceId`** in **`configJson`** (e.g. in **`blocks`**). Otherwise call **list_elevenlabs_voices**, ask the user which voice (or language + gender), then pass those args — stored as **`defaultVoiceId`** on all audio blocks in the template.
- **attach_audio_to_card** returns `{ cardId, deckId, mediaId, charsUsed, blockId }` after writing TTS audio to the card’s audio block. Pass **`voice_id`** *or* **`audio_language`** + **`audio_gender`**. Use **`export_deck`** or your app to get `cardId`s. If the audio block already has `mediaIds`, pass **`replace_existing`: `true`** or the tool errors. Multiple audio blocks on one card require **`block_id`**.

The **hosted** MCP endpoint requires an API key (or OAuth access token; see [Endpoints](#endpoints)) on **every** request. Tools that read your data (**list_decks**, **list_templates**, **get_template_schema**, **create_deck**, **update_deck**, **create_card**, **update_card**, **create_cards**, **attach_audio_to_card**, **export_deck**, **create_template**, **update_template**) need that key. **list_template_block_types** and **list_block_schemas** return static reference data (no user Firestore reads). **list_elevenlabs_voices** does not read Firestore; it returns the Deckbase curated voice catalog (same env **`ELEVENLABS_API_KEY`** is used for TTS generation, not for listing voices).

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
