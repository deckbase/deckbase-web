# Firestore: Flashcards collection migration

This document describes the migration from the legacy `flashcards` collection to user-scoped subcollections under `users`, and the scripts used for migration and cleanup.

> **In deckbase-mobile:** The Flutter sync service (`lib/features/flashcard/data/sync/firestore_sync_service.dart`) already reads and writes **`users/{uid}/decks`** and **`users/{uid}/cards`** first, and falls back to **`flashcards/{uid}/data/main/...`** when pulling if the new path is empty. Migration and delete scripts are run from your backend or scripts repo (Node.js).

---

## What changed

- **Before:** Decks, cards, and templates lived under  
  `flashcards/{userId}/data/main/{decks|cards|templates|wizard_deck}`.
- **After:** They live under  
  `users/{userId}/decks`, `users/{userId}/cards`, `users/{userId}/templates`, and (for legacy wizard migration) `users/{userId}/wizard_deck`.
- **Media** was already under `users/{userId}/media` and is unchanged.
- The **flashcards** collection is no longer used and can be removed after migration.

## New Firestore structure

| Data           | Path                                    |
|----------------|-----------------------------------------|
| Decks          | `users/{userId}/decks/{deckId}`         |
| Cards          | `users/{userId}/cards/{cardId}`         |
| Templates      | `users/{userId}/templates/{templateId}`  |
| Legacy wizard  | `users/{userId}/wizard_deck/{entryId}`   |
| Media          | `users/{userId}/media/{mediaId}`        |
| **Ops (sync)** | `users/{userId}/ops/{opId}`             |

Wizard (TCG) data stays under `wizard/{userId}/...` and is separate from this migration.

## Code and rules

- **Client:** `utils/firestore.js` — `getDecksCollection`, `getCardsCollection`, `getTemplatesCollection` now use `users/{uid}/decks`, `users/{uid}/cards`, `users/{uid}/templates`. `getLegacyWizardDeckCollection` uses `users/{uid}/wizard_deck`.
- **Server:** `lib/firestore-admin.js` — all admin reads/writes use the same `users/{uid}/...` paths.
- **Rules:** `firestore.rules` — rules for `users/{userId}/decks`, `cards`, `templates`, `wizard_deck`, and `ops`; the old `flashcards` block has been removed.

---

## Sync (web + mobile)

The web app uses **state-based sync** only: it reads and writes `users/{uid}/decks` and `users/{uid}/cards` (no op log). Deletes use tombstones (`is_deleted: true`).

- **Web:** No longer reads or writes `users/{uid}/ops`. All deck/card create, update, and delete go directly to the deck and card collections.
- **Mobile:** May still use the op log until it migrates. Mobile migration to state-based sync (write to decks/cards, tombstones): **[STATE_BASED_SYNC_MOBILE.md](./STATE_BASED_SYNC_MOBILE.md)**.
- **Legacy op log:** The `users/{uid}/ops` collection and rules/index remain for now (e.g. if mobile still uses them). Cleanup: **[OP_LOG_CLEANUP.md](./OP_LOG_CLEANUP.md)**. Op-based sync is deprecated; sync is state-based (see STATE_BASED_SYNC_MOBILE.md).

## Migration script (copy old → new)

**Script:** `scripts/migrate-flashcards-to-users.js`

Copies data from `flashcards/{uid}/data/main/{decks,cards,templates,wizard_deck}` to `users/{uid}/decks`, `users/{uid}/cards`, `users/{uid}/templates`, `users/{uid}/wizard_deck` (same doc IDs and fields). Run this **before** deleting the flashcards collection or deploying the new rules if you have existing data to preserve. (This script may live in your backend/scripts repo; it is not in this web repo.)

### Run (prod)

```bash
node --env-file=.env.prod scripts/migrate-flashcards-to-users.js
```

### Run (dev)

Use the env file that points at your dev Firebase project (e.g. only load `.env` so prod doesn't override):

```bash
ENV_FILE=.env node scripts/migrate-flashcards-to-users.js
```

### Env and options

- **Required:** `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` (from the env file you use).
- **Optional:** `FIRESTORE_DATABASE_ID` — set if the app uses a named Firestore database instead of `(default)`.

The script prints the **Firebase project** and **Firestore database** at the start so you can confirm you're on the right environment. If `flashcards/` has no top-level documents, it falls back to migrating by user IDs from the `users` collection.

### After migration

1. Deploy rules: `firebase deploy --only firestore:rules`
2. Optionally remove the old `flashcards` data with the delete script below.

---

## Delete flashcards collection

**Script:** `scripts/delete-flashcards-collection.js`

Permanently deletes the entire `flashcards` collection and all nested data (decks, cards, templates, wizard_deck under each user, plus parent docs). Use this only after you've migrated (or confirmed there's nothing to migrate) and verified the new paths.

### Run (prod)

```bash
node --env-file=.env.prod scripts/delete-flashcards-collection.js
```

### Run (dev)

```bash
ENV_FILE=.env node scripts/delete-flashcards-collection.js
```

Optional: `FIRESTORE_DATABASE_ID` if you use a named database.

---

## Delete all users except one

**Script:** `scripts/delete-users-except.js`

Deletes every document in the `users` collection **except** the one with the given ID. Only the top-level `users/{uid}` document is deleted; subcollections (decks, cards, etc.) are left as orphaned data. Useful for cleaning up test users while keeping a single account.

### Run

```bash
KEEP_UID=<userId> node --env-file=.env.prod scripts/delete-users-except.js
```

Example:

```bash
KEEP_UID=fOPAq9OrjAZ9KFRFnBM0MqOaeJh2 node --env-file=.env.prod scripts/delete-users-except.js
```

For dev, use the env file that points at dev (e.g. `ENV_FILE=.env node ...` and set `KEEP_UID` as needed).

---

## Debug: inspect Firestore

**Script:** `scripts/debug-firestore-structure.js`

Prints the Firebase project, Firestore database, root collections, and a sample of `flashcards/` and `users/` so you can confirm which project and structure you're hitting.

### Run (prod)

```bash
node --env-file=.env.prod scripts/debug-firestore-structure.js
```

### Run (dev)

```bash
ENV_FILE=.env node scripts/debug-firestore-structure.js
```

Optional: `FIRESTORE_DATABASE_ID` for a named database.

---

## Recommended order (with existing data)

1. **Verify project:** Run `debug-firestore-structure.js` with the target env and confirm project and user count.
2. **Migrate:** Run `migrate-flashcards-to-users.js` with the same env.
3. **Deploy rules:** `firebase deploy --only firestore:rules`
4. **Verify app:** Use the app and confirm decks/cards/templates load and save under the new paths.
5. **Optional cleanup:** Run `delete-flashcards-collection.js` to remove the old `flashcards` collection.
6. **Optional user cleanup:** Use `delete-users-except.js` if you need to trim test users.

If you have no data under `flashcards/`, you can skip step 2 and go straight to deploying rules; the app and API already use the new `users/` paths.

---

## Cloud card empty after mobile upload

**Symptom:** Local card has content (e.g. "oils") but the document in Firestore `users/{uid}/cards/{cardId}` shows empty `values` / `values_json` after mobile sync.

**Mobile side:** The app sends a **full document** with `values_json` and `blocks_snapshot_json` as **JSON strings** (snake_case). Logs show the payload size (e.g. `values_json length=449`) before `.set()`. So the mobile write is non-empty.

**Likely cause:** Another writer is overwriting the document after the mobile upload:

- **Web app:** If the web writes the same card (e.g. on load or auto-save) with a different shape (`values` as array) or with empty content, it can overwrite the mobile write. Check the web's card save/sync and any `set()` or `update()` on `users/{uid}/cards/{cardId}`.
- **Backend/Cloud Functions:** Any code that writes to `users/{uid}/cards` with merge or full set can overwrite. Ensure it never writes empty `values` / `values_json` over existing data.

**What to check:** In the web repo, search for writes to the cards collection (e.g. `set(..., { merge: true })` or `update(...)`) and ensure they don't send empty content for cards that were just updated by mobile.

---

## How mobile differentiates "added on web" vs "deleted on web"

Mobile uses the **`is_deleted`** field on Firestore documents:

- **Added on web:** Doc exists with `is_deleted` false or missing → show in **Download** (new/modified on cloud). User can pull.
- **Deleted on web:** Doc exists with `is_deleted: true` → do not show in Upload; add to pending deletions; after sync prompt "remove locally?"; do not re-upload.
- **New on mobile:** No cloud doc → show in **Upload**. User can push.

The web must **soft-delete**: set `is_deleted: true` on the document. If the web deletes the document, mobile sees no doc and treats the card as "not on cloud" (upload), not "deleted on web."

**Mobile → web:** When the user deletes a card or deck on mobile (soft-delete), the app marks it `isDeleted: true` locally. On the next sync, mobile **pushes that deletion to Firestore** (merge `is_deleted: true`, `updated_at`) for any item that was ever on cloud (`sync.remoteId != null`). So the web will see the doc with `is_deleted: true` and can hide or remove it. Both directions (web→mobile and mobile→web) use soft-delete and sync the flag.

**Collection growth:** Soft-deleted documents stay in Firestore, so the collection grows over time. Recommended approach:

1. **Soft-delete for sync** – Web sets `is_deleted: true` (and optionally `deleted_at: timestamp`). Mobile detects this and offers "remove locally?"; no re-upload.
2. **Eventual hard-delete (cleanup)** – Run a periodic job (e.g. Cloud Function or backend script) that **deletes** documents where `is_deleted === true` and `deleted_at` (or `updated_at`) is older than a retention window (e.g. 30 days). That gives all clients time to sync the deletion, then the doc is removed so the collection doesn't grow forever.
3. **After cleanup** – Once the doc is gone, mobile will treat that card as "not on cloud" if it's still present locally. The user will have already been prompted to "remove locally?" during the retention window, so most devices will have removed it. Devices that never synced in that window may still show the card as an upload candidate; that's acceptable and they can delete it locally or re-upload if desired.

---

## Cards: web aligned to mobile

Path: `users/{userId}/cards/{cardId}`. Web and mobile use the **same** field names and format.

### Field alignment

| Field | Format | Web | Mobile |
|-------|--------|-----|--------|
| `values_json` | JSON string (snake_case) | ✓ writes & reads | ✓ writes & reads |
| `blocks_snapshot_json` | JSON string (snake_case) | ✓ writes & reads | ✓ writes & reads |
| `values` | array (legacy) | ✓ written alongside _json | optional |
| `blocks_snapshot` | array (legacy) | ✓ written alongside _json | optional |

Web **writes** both `values_json` / `blocks_snapshot_json` (mobile format) and `values` / `blocks_snapshot` (arrays) on create and update. When **reading**, web prefers `values_json` and `blocks_snapshot_json` when present, so mobile is the source of truth and both clients see the same content.

### All card write sites (web)

1. **`utils/firestore.js`**
   - **`createCard`** — Writes `values`, `blocks_snapshot`, `values_json`, `blocks_snapshot_json` (same content, aligned to mobile).
   - **`updateCard`** — Merge: writes `values` + `values_json`, `blocks_snapshot` + `blocks_snapshot_json` only when non-empty.
   - **`updateCardReview`** — Only SRS fields; does not touch content.
   - **`deleteCard`** — Only `is_deleted`, `updated_at`.
   - **`createCardForWizard`** — Same as createCard (includes _json fields).

2. **`lib/firestore-admin.js`**
   - **`createCardAdmin`** — Writes same shape including `values_json`, `blocks_snapshot_json`.

Web never does a full `.set()` on an existing card; updates use **merge: true**. Empty content is never written, so existing mobile content is not overwritten.
