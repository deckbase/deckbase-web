# AI image HTTP API (web + mobile parity)

Mobile and web use the **same** Next.js routes. The card editor and import flow call these from the browser; native apps should use the same URLs and payloads.

**Base URL:** your deployment origin (e.g. `https://www.deckbase.co`).

---

## Authentication

Uses `requireElevenLabsAuth` (same family as ElevenLabs TTS routes).

| Context | Headers |
|--------|---------|
| **Web (dashboard)** | `Authorization: Bearer <Firebase ID token>` |
| **Mobile / server** | `X-API-Key: <DECKBASE_API_KEY>` (must match server env `DECKBASE_API_KEY`) |

In **production**, subscription and usage checks need a **user id**:

- With **Bearer** token, `uid` is taken from the verified ID token.
- With **X-API-Key** only, pass **`uid` in the JSON body** (generate-image) or **`uid` as a query param** (image-style-prompts), matching the signed-in user.

In **development**, auth is relaxed (see `lib/elevenlabs-auth.js`); still send real auth in integration tests when possible.

---

## `POST /api/ai/generate-image`

Generates a **text-to-image** URL via fal.ai (server-side `FAL_KEY`). Consumes **monthly image credits** by model in production (same as web).

**Request**

- `Content-Type: application/json`

**Body**

| Field | Type | Required | Notes |
|--------|------|----------|--------|
| `prompt` | string | yes | Non-empty trimmed prompt |
| `model_id` | string | no | Default `fal-ai/flux/schnell`. Must be in server allowlist (`lib/fal-image-models.js`) |
| `style_prompt_id` | string | no | Curated preset id; server merges snippet (see style library) |
| `uid` | string | with `X-API-Key` in prod | Firebase user id for entitlement + usage |

**Success `200`**

```json
{
  "imageUrl": "https://…",
  "model_id": "fal-ai/flux/schnell",
  "requestId": "…"
}
```

The client must **download** `imageUrl` and upload via your existing media pipeline (e.g. `uploadImage` on web) if the image should live in Deckbase Storage.

**Typical errors**

| Status | Meaning |
|--------|---------|
| `400` | Bad `model_id`, empty prompt, unknown `style_prompt_id`, prompt too long (max see `AI_IMAGE_MAX_PROMPT_LEN` in `lib/ai-image-generation.js`) |
| `401` | Missing/invalid auth |
| `403` | No active subscription or monthly image credits exhausted (production, when `uid` resolved) |
| `503` | `FAL_KEY` missing |

---

## `GET /api/ai/image-style-prompts`

Returns the curated style catalog (subscribers only in production).

**Query**

| Param | Required | Notes |
|--------|----------|--------|
| `tag` | no | Kebab-case tag filter |
| `uid` | with `X-API-Key` in prod | User id for entitlement |

**Success `200`**

JSON includes `version`, `tags`, `entries` (each with `id`, `label`, `description`, `snippet`, `tags`). Use `id` as `style_prompt_id` on `POST /api/ai/generate-image`.

---

## Parity checklist

- Same routes and JSON shapes as the **web** card editor (`app/dashboard/deck/.../card/.../page.js`).
- **Credits:** `incrementImageUsage` runs on successful generate-image when `effectiveUid` is set.
- **Models:** only ids listed in `ALLOWED_TEXT_TO_IMAGE_MODEL_IDS`; costs in `lib/fal-credit-costs.js` / `usage-limits`.
- **Reference / img2img** is not exposed on these routes yet (text-to-image only).

---

## Web UI parity (templates + import)

- **Template → image block settings:** `defaultSourceBlockId` in `configJson` (same key as audio) chooses which text block pre-fills **Generate with AI** on the card editor. Default is the deck **main** block.
- **Import from table (Use AI on image):** The prompt is the row’s text for that source block (from column mappings), then falls back to main-row text.

## Related

- Feasibility / product notes: [`AI_IMAGE_FAL_FEASIBILITY.md`](./AI_IMAGE_FAL_FEASIBILITY.md)
- Public MCP image tools: [`MCP.md`](../public/MCP.md) (`attach_image_to_card`, `list_image_style_prompts`)
- Subject starter prompts (web): `data/image-subject-prompts.json` (curated list in the card editor **Prompt library** section)
