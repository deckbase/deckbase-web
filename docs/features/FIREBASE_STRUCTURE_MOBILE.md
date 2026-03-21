# Firebase structure (for mobile team)

Deckbase uses **one Firebase project** with three main pieces that work together:

| Piece | What it is | Mobile uses it for |
| ----- | ---------- | ------------------- |
| **Firebase Auth** | User identity (`uid`) | Sign-in; every Firestore/Storage path is scoped by `uid` |
| **Cloud Firestore** | JSON documents & queries | Decks, cards, templates, media **metadata**, profile, etc. |
| **Firebase Storage** | Binary files (objects) | Actual image/audio **bytes** |

**Important:** Firestore and Storage are **different systems**. A card does not store the MP3/JPEG **inside** Firestore—it stores **IDs** that point to a **media doc** in Firestore and a **file path** in Storage.

---

## 1. Authentication → everything keys off `uid`

- After sign-in, **`request.auth.uid`** (or your SDK’s `user.uid`) is the **owner id**.
- **Firestore rules** and **Storage rules** only allow access when the path’s `userId` **equals** that `uid`.
- Mobile and web **must use the same Firebase project** (same `google-services` / `GoogleService-Info.plist` / web config) or data will not line up.

---

## 2. Firestore layout (collections)

All **user-owned flashcard data** lives under **`users/{uid}/...`**. There is **no** top-level `flashcards` collection in current rules—the app uses per-user subcollections.

```
users/{uid}                          # User profile doc (fields like email, displayName, etc.)
users/{uid}/inAppNotifications/{id}  # In-app notifications
users/{uid}/decks/{deckId}           # Decks
users/{uid}/cards/{cardId}           # Cards (state-based sync with web)
users/{uid}/templates/{templateId}   # Templates
users/{uid}/media/{mediaId}          # Media metadata (NOT the file bytes)
```

**Other top-level paths** (from rules; not under `users/{uid}/` for these):

```
free_trials/{userId}                 # Free trial records
```

*(Web docs may mention `notifications/{uid}` for FCM—confirm in your project’s rules if you use push tokens.)*

### Rules idea (same for all `users/{uid}/...` data)

- **Read/write** only if `request.auth.uid == uid` (the `{uid}` in the path).

So: **`uid` in the path must match the signed-in user.**

---

## 3. What goes in each Firestore doc (short)

### `users/{uid}/decks/{deckId}`

- Identifiers: `deck_id` (same as doc id), `title`, `description`
- Timestamps: `created_at`, `updated_at`
- Soft delete: `is_deleted`, **`deleted_at`** (Firestore `Timestamp` when deleted—see **[DELETED_AT_MOBILE.md](./DELETED_AT_MOBILE.md)**)

### `users/{uid}/cards/{cardId}`

- Identifiers: `card_id`, `deck_id`, `template_id`, …
- Content: **`blocks_snapshot`** (or **`blocks_snapshot_json`** string), **`values`** (or **`values_json`** string)  
  Web often prefers the `*_json` fields when present—**keeping `values` and `values_json` in sync** avoids drift between clients.
- Preview: `main_block_id`, `sub_block_id`
- Delete: `is_deleted`, **`deleted_at`** (set together on soft delete—see **[DELETED_AT_MOBILE.md](./DELETED_AT_MOBILE.md)**)
- **SRS** (for study): `srs_state`, `srs_step`, `srs_due`, `srs_last_review`, `review_count`, etc. — **preserve** these when web edits content so mobile scheduling is not wiped.

Block **types** are numeric (see `BlockType` in web `utils/firestore.js`): e.g. image = `6`, audio = `7`.

### `users/{uid}/templates/{templateId}`

- Template definition: `blocks`, `rendering`, `version`, `is_deleted`, **`deleted_at`**, etc. (see **[DELETED_AT_MOBILE.md](./DELETED_AT_MOBILE.md)**)

### `users/{uid}/media/{mediaId}`

- **Metadata only**: e.g. `media_id`, `storage_path`, `download_url`, `type` (`audio` / `image`), `mime_type`, `file_size`, `created_at`, `updated_at`, `is_deleted`, **`deleted_at`**
- **Document id** = **`mediaId`** (UUID), same id referenced in card **`media_ids`**.

See **[MOBILE_MEDIA_SYNC.md](./MOBILE_MEDIA_SYNC.md)** for the full media contract (Storage path + Firestore + card `media_ids`).

---

## 4. Firebase Storage layout (files)

Files are **objects** in a **bucket** (not Firestore documents).

**Pattern:**

```
users/{uid}/media/{mediaId}.{extension}
```

Examples:

- `users/abc…/media/f81d4fae-….mp3`
- `users/abc…/media/9b2c….jpg`

Rules (conceptually): read/write under `users/{userId}/...` only when **`request.auth.uid == userId`**.

So: same **`uid`** as in Firestore paths.

---

## 5. How Firestore + Storage connect

1. Upload bytes to **Storage** → object at `users/{uid}/media/{mediaId}.mp3` (or other ext).
2. Write **Firestore** doc `users/{uid}/media/{mediaId}` with `storage_path` (and usually `download_url`).
3. On the **card**, in the image/audio **block value**, set **`media_ids: [mediaId]`** (snake_case in Firestore), with **`block_id`** matching the block in `blocks_snapshot`.

If step 1 succeeds but step 2 or 3 is wrong, the **file exists in Storage** but the **web app may show empty** image/audio.

---

## 6. Sync model (decks & cards)

- **State-based sync**: clients read/write **`users/{uid}/decks`** and **`users/{uid}/cards`** directly; deletes use **`is_deleted: true`** (tombstones), not a separate op-log collection. Soft deletes should also set **`deleted_at`** (see **[DELETED_AT_MOBILE.md](./DELETED_AT_MOBILE.md)**).
- Details: **[STATE_BASED_SYNC_MOBILE.md](./STATE_BASED_SYNC_MOBILE.md)**

---

## 7. Field naming

- Firestore fields from **web** are mostly **snake_case** (`deck_id`, `media_ids`, `storage_path`, `download_url`, …).
- Web’s parsers often accept **camelCase** in JSON strings (`mediaIds`, `blockId`) for mobile—prefer **snake_case** in Firestore writes for consistency.

---

## Summary diagram

```
[Firebase Auth] → uid
       │
       ├─► Firestore: users/{uid}/decks, cards, templates, media (metadata)
       │
       └─► Storage:   users/{uid}/media/{mediaId}.ext  (bytes)
                              │
                              └── referenced by media doc.storage_path
                                      and card values.media_ids
```

For media specifics, use **MOBILE_MEDIA_SYNC.md**; for deck/card sync flow, use **STATE_BASED_SYNC_MOBILE.md**; for **`deleted_at`** on soft deletes, use **DELETED_AT_MOBILE.md**.
