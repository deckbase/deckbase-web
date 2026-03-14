# State-based sync: migration guide for mobile

This doc is for the **mobile team**. It describes moving from **op-log sync** (`users/{uid}/ops`) to **state-based sync**: reading and writing directly to `users/{uid}/decks` and `users/{uid}/cards`, with **tombstones** (`is_deleted`) for deletes. No cursor, no op log, no op cleanup.

---

## Why switch

- **Op log grows forever** unless we run cleanup (cursor-based or time-based). State-based sync avoids that: Firestore holds only current state (and tombstones).
- **Simpler model:** Same pattern as Anki/Evernote: server stores current state; clients sync by reading state, merging locally, and writing back changes. No replay of ops.
- **Web alignment:** The web app already reads and writes `decks` and `cards` (and dual-writes to ops today). After this migration, web will **stop** emitting/consuming ops and use only decks/cards. Mobile and web will both sync via the same collections.

---

## What changes for mobile

| Before (op log) | After (state-based) |
|-----------------|---------------------|
| Push: write ops to `users/{uid}/ops` | Push: write directly to `users/{uid}/decks`, `users/{uid}/cards` |
| Pull: read ops, apply to local | Pull: read decks/cards, merge into local (see “Pull” below) |
| Delete: emit delete op | Delete: set `is_deleted: true` (and `updated_at`) on the doc — **tombstone** |
| Bootstrap: one-time read of decks/cards when cursor empty | No bootstrap; sync is always “read decks/cards, merge” (and optionally “what changed since X” if you add it) |

You **stop** reading and writing `users/{uid}/ops`. You **only** read and write `users/{uid}/decks` and `users/{uid}/cards`.

---

## Firestore paths and schema (aligned with web)

- **Decks:** `users/{userId}/decks/{deckId}`
- **Cards:** `users/{userId}/cards/{cardId}`

Store fields in **snake_case** in Firestore so web and mobile stay aligned.

### Deck document (minimal for sync)

| Field | Type | Notes |
|-------|------|--------|
| `deck_id` | string | Same as doc id |
| `title` | string | |
| `description` | string | |
| `created_at` | Timestamp or number (ms) | |
| `updated_at` | Timestamp or number (ms) | |
| `is_deleted` | boolean | `true` = tombstone (deleted); default `false` |

(Web may have more fields; you can add them as needed. These are the ones used for sync and filtering.)

### Card document (minimal for sync)

| Field | Type | Notes |
|-------|------|--------|
| `card_id` | string | Same as doc id |
| `deck_id` | string | |
| `template_id` | string | |
| `blocks_snapshot` | array | Block definitions (web also uses this) |
| `blocks_snapshot_json` | string | JSON string of same (preferred for mobile; web reads both) |
| `values` | array | Block values |
| `values_json` | string | JSON string of same (preferred for mobile; web reads both) |
| `main_block_id` | string | |
| `sub_block_id` | string | |
| `created_at` | Timestamp or number (ms) | |
| `updated_at` | Timestamp or number (ms) | |
| `is_deleted` | boolean | `true` = tombstone; default `false` |
| `srs_state`, `srs_step`, `srs_due`, `srs_last_review`, `review_count` | (your SRS types) | Web uses these for study |

For content, web reads **either** `values` / `blocks_snapshot` **or** `values_json` / `blocks_snapshot_json` (prefers `_json` when present). Writing both keeps web and mobile compatible.

---

## Sync behavior

### How mobile can detect updates

Mobile needs to know when cloud data (decks/cards) has changed so it can pull and merge. Common options:

| Approach | How it works | Pros | Cons |
|----------|----------------|------|------|
| **Real-time listeners** | Subscribe to `users/{uid}/decks` and `users/{uid}/cards` with Firestore `onSnapshot`. Firestore pushes an event whenever a doc is added, updated, or deleted. | Updates appear as soon as web (or another device) writes; no polling. | Keeps a connection open; more battery/network if many docs. |
| **Polling (full)** | On a timer or when app comes to foreground, run a full pull: read all decks and all cards (or per-deck), then merge into local. | Simple; no long-lived listener. | Delay until next poll; may read more data than needed. |
| **Polling (incremental)** | Store `lastSyncTimestamp` locally. On sync, query decks/cards where `updated_at > lastSyncTimestamp` (and still include tombstones so deletes are seen). Merge only changed docs. | Fewer reads and less data after first sync. | Requires an index on `updated_at` (or composite); must handle first sync with full pull. |
| **Manual sync** | User taps "Sync"; mobile runs push then pull once. | No background work. | User must trigger; no automatic detection. |

**Recommendation:** Use **real-time listeners** (`onSnapshot`) on the decks and cards collections if you want instant sync when the user edits on web. Use **polling** (full or incremental) if you prefer to sync only when the app is opened or on a schedule. Document the chosen approach so web and backend stay aligned.

### Pull (get cloud state)

- Read **decks:**  
  `users/{uid}/decks` — optionally `where('is_deleted', '==', false)` for “active only,” or read all and treat `is_deleted === true` as “remove locally.”
- Read **cards:**  
  `users/{uid}/cards` — same: filter by `is_deleted` or include tombstones and remove local cards when you see `is_deleted: true`.
- **Merge** into local store: add/update from Firestore; for docs with `is_deleted: true`, remove (or mark deleted) the corresponding deck/card locally so UI and future push don’t re-upload them.

To support “incremental” pull later, you can add something like “only docs where `updated_at > lastSyncTimestamp`” (and still fetch tombstones for deletes in that window). Initially, full read per collection is fine.

### Push (send local changes to cloud)

- **Create:** `setDoc(users/{uid}/decks/{deckId}, data)` or `setDoc(users/{uid}/cards/{cardId}, data)` with `is_deleted: false`.
- **Update:** `setDoc(..., data, { merge: true })` or `updateDoc` with the fields that changed; keep `updated_at` (and optionally `created_at`) in sync with web.
- **Delete:** Do **not** remove the document. Use a **tombstone:**  
  `updateDoc(ref, { is_deleted: true, updated_at: <now> })`  
  so other clients (and web) see “this deck/card was deleted” when they pull.

### How to resolve conflicts

A **conflict** happens when the same deck or card was changed in two places (e.g. web and mobile) before sync, so you have two different versions.

**1. Agree on one rule (web + mobile)**  
Use the same rule on both clients so they converge.

**2. Last-write-wins (LWW) — recommended**

- Each deck and card has `updated_at` (Timestamp or ms). When you merge (e.g. after a pull), compare **local** vs **cloud** for the same doc:
  - If **cloud has no doc** → keep local; push local to cloud (or it was deleted on cloud → apply tombstone locally).
  - If **local has no doc** → take cloud (add or update local).
  - If **both have the doc** → keep the one with the **larger `updated_at`**; discard the other. Then write the winner back to Firestore so both sides end up with the same state.

- **Tombstone wins over content:** If one side has `is_deleted: true` and the other has normal content, treat the **newer** `updated_at` as the winner. So a recent delete (tombstone) overwrites an older edit, and a recent edit overwrites an older delete. Same LWW rule.

**3. Implementation sketch (mobile or web)**

- **On pull:** For each deck/card doc from Firestore, get the same doc from local storage (if any). If both exist, compare `updated_at` (normalize to ms). Keep the version with the larger `updated_at`; apply it to local and, if cloud was older, write it back to Firestore so cloud is updated.
- **On push:** Before overwriting a cloud doc, you can read it and compare `updated_at`. If cloud is newer, don’t overwrite (keep cloud as source of truth). If local is newer or equal, write local. This avoids one client overwriting a newer change from another.

**4. Optional: merge-by-field**

- For cards you can merge different fields from different sides (e.g. take **content** from one version and **SRS fields** from the other). Only do this if both teams implement the same rule; otherwise stick to LWW for the whole document.

---

## What web has done

- **Done:** The web app **no longer** reads or writes `users/{uid}/ops`. It only reads and writes `users/{uid}/decks` and `users/{uid}/cards`, with tombstones (`is_deleted: true`) for deletes.
- Web uses `is_deleted` and filters it in queries. Once mobile also uses only decks/cards (and tombstones), both clients will sync through the same collections.

---

## Transition / rollout

1. **Align on schema** (paths, snake_case, `is_deleted`, `created_at`/`updated_at`, `values_json`/`blocks_snapshot_json` for cards) — this doc and the web repo are the source of truth.
2. **Mobile:** Implement state-based sync (write to decks/cards, tombstones for delete, pull from decks/cards). You can do this behind a flag or in a branch.
3. **Optional interim:** For a short period, mobile could write to **both** ops and decks/cards so web (still on ops) continues to see mobile changes; then web switches to state-only and stops ops; then mobile drops ops.
4. **Cutover:** Once both sides use only decks/cards:
   - Mobile stops reading/writing `users/{uid}/ops`.
   - Web stops emitting and subscribing to ops.
   - You can later add a one-time cleanup (e.g. delete or archive the `ops` collection) if desired; no ongoing op log cleanup needed.

---

## Summary for mobile

- **Remove:** All reads and writes to `users/{uid}/ops`; op cursor/HLC logic for sync.
- **Add / keep:** Read and write `users/{uid}/decks` and `users/{uid}/cards` only. Use **tombstones** (`is_deleted: true`, `updated_at`) for deletes. Merge on pull; push creates/updates/tombstones. Use LWW by `updated_at` (or your chosen rule) for conflicts.
- **Result:** No op log, no cursor, no cleanup policy; sync is “state + tombstones” like Anki/Evernote, and web and mobile stay in sync through the same collections.

If you have questions or want to adjust the schema (e.g. extra fields, naming), we can update this doc and the web implementation to match.
