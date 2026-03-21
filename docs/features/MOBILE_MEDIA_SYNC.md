# Mobile → Web: audio & image media sync

This doc is for the **mobile team**. It explains why the **web app can show empty audio controls** even when Storage upload succeeds, and the **exact contract** web expects so media resolves reliably.

Related: [STATE_BASED_SYNC_MOBILE.md](./STATE_BASED_SYNC_MOBILE.md) (decks/cards), [MOBILE_IMPORT_SPREADSHEET.md](./MOBILE_IMPORT_SPREADSHEET.md) (TTS + media example).

---

## How web resolves audio (summary)

Web resolves playback URLs in this order:

1. Read the **card** and parse **block values** (see below).
2. For each **audio/image** block, read `mediaIds: string[]` (UUIDs).
3. For each id, load **`users/{uid}/media/{mediaId}`** in **Firestore** and read metadata (`download_url`, `storage_path`, etc.).
4. If the **Firestore media doc is missing** but the **file exists** in Storage at `users/{uid}/media/{mediaId}.{ext}`, web **`getMedia`** still tries **Storage-only** resolution (extension probing + optional prefix match). So missing metadata doc alone no longer blocks playback if the object is present.
5. Use the resolved URL to play audio / show images in the UI.

So **three pieces must align**:

| Layer                   | Requirement                                                                                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Storage**             | Object exists at `users/{uid}/media/{mediaId}.{ext}` (e.g. `.mp3`). **Include a file extension** in the object name.                                                                     |
| **Firestore media doc** | Doc id **must equal** `mediaId`. Doc must include `storage_path` and ideally `download_url` (see schema).                                                                                |
| **Card value**          | The audio block’s value entry must include **`media_ids: [mediaId]`** (snake_case in Firestore) matching that doc id, with **`block_id`** matching the audio block in `blocks_snapshot`. |

If Storage upload succeeds but the **media doc is missing**, **wrong doc id**, **`media_ids` missing/wrong field name**, or **`block_id` mismatch**, web will show **empty or silent** audio.

---

## 1. Firebase Storage

### Path pattern (required)

```
users/{uid}/media/{mediaId}.{extension}
```

Examples:

- `users/abc123/media/f81d4fae-7dec-11d0-a765-00a0c91e6bf6.mp3`

### Rules (same project as web)

Storage rules require the authenticated user to own the path:

- `request.auth.uid == userId` for `users/{userId}/...`

Mobile and web **must use the same Firebase project** (dev/prod) and the **same `uid`** as in the path. A mismatch looks like “upload OK on device A, invisible on web B”.

### Extension

Use a real extension (`.mp3`, `.m4a`, `.wav`, …). Avoid uploading to a path **without** an extension; web and tooling assume `storage_path` points at the actual object key.

---

## 2. Firestore: media document

**Collection:** `users/{uid}/media/{mediaId}`  
**Document ID:** must be the same UUID as in the Storage file name (the segment before `.mp3`).

### Recommended fields (snake_case, aligned with web)

| Field          | Type               | Required             | Notes                                                    |
| -------------- | ------------------ | -------------------- | -------------------------------------------------------- |
| `media_id`     | string             | Yes                  | Same as doc id                                           |
| `storage_path` | string             | Yes                  | Full object path, e.g. `users/{uid}/media/{mediaId}.mp3` |
| `download_url` | string             | Strongly recommended | Firebase download URL after upload (web uses this first) |
| `type`         | string             | Yes                  | `"audio"` or `"image"`                                   |
| `mime_type`    | string             | Recommended          | e.g. `audio/mpeg`                                        |
| `file_size`    | number             | Optional             | Bytes                                                    |
| `created_at`   | Timestamp / number | Recommended          |                                                          |
| `updated_at`   | Timestamp / number | Recommended          |                                                          |
| `is_deleted`   | boolean            | Optional             | default `false`; if `true`, treat as removed             |

Web code reference: `utils/firestore.js` — `uploadAudio` / `uploadImage` (writes the above), `getMedia` (reads).

### Common mistakes

- **No Firestore doc** — only uploaded to Storage → web `getMedia` returns nothing → empty player.
- **Doc id ≠ `mediaId` in path** — card points to UUID A, file/doc uses B → broken.
- **Missing `storage_path` or wrong path** — download resolution fails.
- **`is_deleted: true`** — web may still skip or treat as missing depending on UI path.

---

## 3. Firestore: card value for audio blocks

### Block type

Audio is block type **`7`** (enum `BlockType.audio`). Web also accepts string `"7"` in some UI paths; prefer numeric **`7`** in Firestore for consistency.

### Value shape

Each entry in the card’s `values` array (or inside `values_json` string) should look like:

```json
{
  "block_id": "<same as audio block’s block_id in blocks_snapshot>",
  "type": 7,
  "media_ids": ["<mediaId>"]
}
```

Aliases web accepts when normalizing JSON:

- `blockId` → merged to `block_id`
- `mediaIds` → merged to `media_ids`

**Still write snake_case in Firestore** (`block_id`, `media_ids`) to match web writes and avoid edge cases.

### `block_id` must match

The audio block’s `media_ids` must be on the value whose **`block_id`** equals the **audio block’s** `block_id` in `blocks_snapshot`. If mobile attaches audio to the wrong block id, web will not show it on the audio block.

### Keep `values` and `values_json` in sync

Web prefers **`values_json`** when present (mobile-friendly). Per [STATE_BASED_SYNC_MOBILE.md](./STATE_BASED_SYNC_MOBILE.md), updating **both** `values` and `values_json` on each card write avoids stale reads on any client.

---

## 4. Order of operations (recommended)

When adding or syncing audio for a card:

1. Generate `mediaId` (UUID).
2. Upload file to Storage at `users/{uid}/media/{mediaId}.mp3` (or appropriate ext).
3. Create/update Firestore `users/{uid}/media/{mediaId}` with `storage_path`, `download_url`, `type`, `mime_type`, etc.
4. Update the card: set the audio block value’s `media_ids: [mediaId]` and bump `updated_at`; write both `values` and `values_json` if you use both.

If step 4 runs **before** step 3 completes, web can briefly show empty audio until the next read (or persistently if step 3 never happens).

---

## 5. Debugging checklist (when web shows empty audio)

1. **Firestore** — Does `users/{uid}/media/{mediaId}` exist? Do fields `storage_path` / `download_url` look correct?
2. **Storage** — Does object exist at exactly `storage_path`? Same `uid` as signed-in web user?
3. **Card** — Does `values` / `values_json` contain `media_ids: ["<mediaId>"]` on the row with `block_id` = audio block?
4. **Project** — Web `.env` / Firebase config same project as mobile?
5. **Auth** — Same user on web as `uid` in paths (Storage rules + Firestore path)?

Web may log resolution hints under prefixes like `[media.resolve]`, `[DeckMediaResolve]`, `[StudyMediaResolve]` (browser console / server logs depending on path).

---

## 6. Summary

| Check     | Action                                                                    |
| --------- | ------------------------------------------------------------------------- |
| Storage   | `users/{uid}/media/{mediaId}.{ext}`                                       |
| Media doc | Doc id = `mediaId`; set `storage_path` + `download_url`                   |
| Card      | Audio value: `block_id` + `type: 7` + `media_ids: [mediaId]`              |
| Sync      | Same Firebase project + same `uid`; keep `values` / `values_json` aligned |

**Upload success in mobile logs does not imply web can play audio** until the **Firestore media document** and **card `media_ids`** are correct and consistent with that object path.

Questions or schema tweaks should be reflected here and in `utils/firestore.js` so web and mobile stay aligned.
