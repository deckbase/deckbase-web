# Template data structure (for mobile)

Templates define the structure of a card (which blocks exist and in what order). They are stored per user in Firestore and used by the add-with-ai API.

---

## Firestore path

```
users / {uid} / templates / {templateId}
```

- **Collection:** `templates` (subcollection of `users/{uid}`).
- **Document ID:** `templateId` (UUID, e.g. `ce6bf54e-145e-4cfb-a68e-b4746c52cf71`).

---

## Stored document shape (Firestore)

When **writing** to Firestore, the web uses **snake_case** and Firestore Timestamp for dates. The API and mobile can read either snake_case or camelCase; the add-with-ai API normalizes to camelCase when returning data internally.

| Field | Type | Description |
|-------|------|-------------|
| `template_id` | string | Same as document ID (UUID). |
| `name` | string | Template name (e.g. "Basic", "Vocabulary"). |
| `description` | string | Optional. |
| `version` | number | Incremented on each update. |
| `blocks` | **array or string** | **Required.** Array of block objects, or a JSON string of that array. The API accepts array, JSON string, `blocks_snapshot`, or `blocks_snapshot_json`. |
| `rendering` | map or null | Optional. `front_block_ids`, `back_block_ids` (arrays of blockIds). |
| `main_block_id` | string or null | Block ID used as “main” (e.g. for TTS / add-with-ai audio). |
| `sub_block_id` | string or null | Block ID used as “sub” (e.g. second line). |
| `created_at` | **Timestamp** | Firestore Timestamp type (not a number). Use your SDK’s `.toMillis()` or `seconds * 1000 + nanoseconds / 1e6` to get milliseconds if needed. |
| `updated_at` | **Timestamp** | Same as above. |
| `is_deleted` | boolean | Soft delete; default false. |

---

## Blocks array

Each element describes one block in the template. Stored in Firestore as **snake_case**; when consumed (e.g. add-with-ai or client transform) you may see **camelCase**.

| Field (stored) | Field (camelCase) | Type | Description |
|----------------|-------------------|------|-------------|
| `block_id` | `blockId` | string | Unique ID for this block (UUID). |
| `type` | `type` | **number or string** | Block type (see Block types below). |
| `label` | `label` | string | Display label (e.g. "Front", "Back", "Pronunciation"). |
| `required` | `required` | boolean | Whether the block must have content. |
| `config_json` | `configJson` | string or null | Optional JSON string for extra config (e.g. audio: `{"defaultVoiceId":"..."}`). |

**Important:** The API accepts `blocks` in any of these forms (so clients can write in whatever shape they use):

- `blocks` (array) — native Firestore array; used by the web.
- `blocks` (JSON string) — same array serialized as a string; parsed by the API.
- `blocks_snapshot` (array) — alternate.
- `blocks_snapshot_json` (JSON string or object) — parsed to array; if object, `Object.values()` is used.

---

## Block types

`type` can be stored as a **number** (BlockType enum) or **string** name. Values must match between web and mobile.

| Name | Numeric value | Description |
|------|---------------|-------------|
| `header1` | 0 | Heading 1 |
| `header2` | 1 | Heading 2 |
| `header3` | 2 | Heading 3 |
| `text` | 3 | Plain text |
| `quote` | 4 | Quote |
| `hiddenText` | 5 | Hidden text (e.g. answer) |
| `image` | 6 | Image |
| `audio` | 7 | Audio (TTS); use `configJson` for `defaultVoiceId` |
| `quizMultiSelect` | 8 | Quiz multi-select |
| `quizSingleSelect` | 9 | Quiz single-select |
| `quizTextAnswer` | 10 | Quiz text answer |
| `divider` | 11 | Divider |
| `space` | 12 | Spacer |

For **add-with-ai**, the API generates content for: `header1`, `header2`, `header3`, `text`, `example`, `hiddenText`, `audio`. If the template has an **audio** block, the server can generate TTS for the main block text and attach it to the card.

---

## Example (stored in Firestore)

```json
{
  "template_id": "ce6bf54e-145e-4cfb-a68e-b4746c52cf71",
  "name": "Basic",
  "description": "",
  "version": 1,
  "blocks": [
    {
      "block_id": "a1b2c3d4-...",
      "type": 0,
      "label": "Front",
      "required": false
    },
    {
      "block_id": "e5f6g7h8-...",
      "type": 3,
      "label": "Back",
      "required": false
    },
    {
      "block_id": "i9j0k1l2-...",
      "type": 7,
      "label": "Pronunciation",
      "required": false,
      "config_json": "{\"defaultVoiceId\":\"dtSEyYGNJqjrtBArPCVZ\"}"
    }
  ],
  "rendering": {
    "front_block_ids": ["a1b2c3d4-..."],
    "back_block_ids": ["e5f6g7h8-...", "i9j0k1l2-..."]
  },
  "main_block_id": "a1b2c3d4-...",
  "sub_block_id": "e5f6g7h8-...",
  "created_at": "<Firestore Timestamp>",
  "updated_at": "<Firestore Timestamp>",
  "is_deleted": false
}
```

---

## Timestamps

- **Stored:** Firestore **Timestamp** type (object with `seconds` and `nanoseconds`). The web app uses `Timestamp.now()` from the Firestore SDK; do **not** store as a plain number or as a plain map `{ seconds, nanoseconds }`, or the client/SDK may not treat it as a timestamp.
- **When reading:** Use your SDK’s `.toMillis()` if available, or `seconds * 1000 + nanoseconds / 1e6` to get milliseconds (number) for display or sync.

---

## Add-with-ai API

- **Path:** `POST /api/mobile/cards/add-with-ai`
- **Body:** `deckId`, `templateId`, `uid`, optional `count`.
- The API loads the template from `users/{uid}/templates/{templateId}` and uses the **blocks** (array or JSON string). It returns 404 with:
  - `code: "template_not_found"` — no document at that path (check same Firebase project as the API).
  - `code: "template_no_blocks"` — document exists but no usable blocks could be read.

Ensure the **same Firebase project** is used for the API and for mobile sync so the template doc exists and has blocks in one of the accepted forms.
