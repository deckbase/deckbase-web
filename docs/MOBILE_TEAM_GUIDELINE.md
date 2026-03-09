# Mobile team guideline

Quick reference for integrating with Deckbase web: templates, audio blocks (default AI voice), and add-with-AI flow.

---

## Related docs

| Doc | Purpose |
|-----|--------|
| [TEMPLATE_DATA_STRUCTURE_MOBILE.md](./TEMPLATE_DATA_STRUCTURE_MOBILE.md) | Firestore template shape, blocks array, block types, field names |
| [MOBILE_ADD_CARDS_WITH_AI.md](./MOBILE_ADD_CARDS_WITH_AI.md) | Add-with-AI two-step flow (generate → add), request/response, errors |

---

## Templates and blocks

- Templates live at `users/{uid}/templates/{templateId}`.
- Each template has a **blocks** array. Each block has: `block_id`/`blockId`, `type` (number or string), `label`, `required`, and optionally `config_json`/`configJson`.
- Block type **7** (or `"audio"`) = Audio (TTS) block. Its optional config holds **default AI voice** and **default source block** (see below).
- `main_block_id` / `mainBlockId` and `sub_block_id` / `subBlockId` identify which blocks are “main” and “sub” (e.g. for TTS text and second line).

---

## Audio block: default AI voice and source block

The **default AI voice** (and optional default source block) for an audio block are stored in that block’s **config** and set by the user in the web template editor.

### Where it’s stored

- **Field:** `config_json` (Firestore) / `configJson` (camelCase).
- **Type:** String — a JSON object. Parse it before use.
- **Shape (after parse):**
  - `defaultVoiceId` (string | null) — ElevenLabs voice ID to use for “Generate with AI” / TTS when no voice is chosen.
  - `defaultSourceBlockId` (string | null) — Block ID to copy text from when pre-filling the audio block (e.g. main block).

### Example

```json
{
  "defaultVoiceId": "dtSEyYGNJqjrtBArPCVZ",
  "defaultSourceBlockId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

If `config_json` is missing or null, treat config as `{}` — no default voice, no default source block.

### How mobile should use it

1. **When displaying a template**  
   For each block with `type === 7` (or `type === "audio"`), parse `config_json` / `configJson`. Use `defaultVoiceId` and `defaultSourceBlockId` only if present and valid.

2. **“Generate with AI” / TTS on mobile**  
   - If the template’s audio block has `defaultVoiceId` in its config, use that as the **default selected voice** in your TTS UI (dropdown or preset).  
   - If the user hasn’t picked a voice, sending `defaultVoiceId` to your TTS API (or to the add-with-AI API) matches web behavior.

3. **Pre-filling audio text**  
   If the audio block config has `defaultSourceBlockId`, you can pre-fill the audio block’s text from the value of that block (e.g. the main block’s text) when the user is editing a card.

4. **Add-with-AI API**  
   The server already reads the template’s audio block `config_json` and uses `defaultVoiceId` when generating TTS for new cards. Mobile does not need to send the default voice in the generate request — the server uses the template’s config.

---

## Summary table

| Topic | Action for mobile |
|-------|-------------------|
| **Default AI voice** | Read from audio block’s `config_json` → `defaultVoiceId`. Use as default in TTS UI and when calling TTS. |
| **Default source block** | Read from same config → `defaultSourceBlockId`. Use to pre-fill audio block text from that block’s value. |
| **Block type** | Audio = `type` **7** or `"audio"`. |
| **Config parsing** | Always `JSON.parse(block.configJson)` (or snake_case equivalent). Handle null/missing/invalid — fallback to `{}`. |
| **Add-with-AI** | Server uses template’s `defaultVoiceId` automatically; pass through `templateId` and optional `count`. See [MOBILE_ADD_CARDS_WITH_AI.md](./MOBILE_ADD_CARDS_WITH_AI.md). |

---

## Field name normalization

The API and web accept both **snake_case** (Firestore) and **camelCase**. Prefer resolving to one form in your app, e.g.:

- `config_json` → `configJson`
- `block_id` → `blockId`
- `main_block_id` → `mainBlockId`
- `sub_block_id` → `subBlockId`

Then use camelCase consistently in your UI and when calling the add-with-AI or add endpoints (the API normalizes as needed).
