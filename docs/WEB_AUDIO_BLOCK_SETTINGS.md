# Audio block settings – for Web team

Template **audio blocks** (block type index **7**) support TTS (text-to-speech) settings. When implementing the template/card editor on web, use the same structure and defaults so templates work across web and mobile.

---

## Where it’s stored

- **Template:** In the template document’s **`blocks`** field (a **JSON string** of an array of block objects).
- **Each block** has: `blockId`, `type`, `label`, `required`, and optionally **`configJson`** (a string containing a JSON object).
- **Audio block settings** live inside that block’s **`configJson`** object.

Mobile **omits** `configJson` when it’s null/empty, so you may not see the key at all for blocks with no config. When the user sets audio options, mobile writes them into `configJson`.

---

## Audio block config keys

Support **both** camelCase and snake_case when **reading** (so mobile-created data works):

| Purpose | CamelCase | Snake_case | Type | Default when missing |
|--------|-----------|------------|------|----------------------|
| Default AI voice (ElevenLabs) | `defaultVoiceId` | `default_voice_id` | string (voice ID) | **First voice** in your voice list |
| Default source block for TTS text | `defaultSourceBlockId` | `default_source_block_id` | string (another block’s `blockId`) | **Template’s main block** (`main_block_id` on the template) |
| Auto-play audio | `autoPlay` | — | boolean | `false` |

- **Default voice:** If the user hasn’t chosen a voice, don’t store a key; at runtime use the first voice from your voices API.
- **Default source block:** If the user hasn’t chosen a source block, don’t store a key; at runtime use the template’s **main block** (`main_block_id`). The text of that block is used as the TTS source.

---

## Example

Parsed `configJson` for an audio block when the user has set options:

```json
{
  "autoPlay": false,
  "defaultVoiceId": "21m00Tcm4TlvDq8ikWAM",
  "defaultSourceBlockId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

When using defaults, omit `defaultVoiceId` and `defaultSourceBlockId` so that “first voice” and “main block” stay correct even if the voice list or main block changes.

---

## Full data structure

For full Firestore document shapes (templates, cards, blocks, values, paths), see:

- **`docs/TEMPLATE_DATA_STRUCTURE_MOBILE.md`** in this repo (templates and blocks).
- **`docs/FIREBASE_DATA_STRUCTURE.md`** when available (or the same doc in the mobile repo) for the full BlockType enum, template/card fields, and the same audio block defaults table.
