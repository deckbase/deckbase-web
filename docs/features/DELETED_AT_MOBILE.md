# `deleted_at` — implementation guide for mobile

This document defines how **Deckbase web and backend jobs** use **`deleted_at`** alongside **`is_deleted`**, so **iOS/Android can match the contract** for soft deletes, retention, and optional restore.

**Audience:** Mobile engineers (Swift / Kotlin).  
**Related:** [FIREBASE_STRUCTURE_MOBILE.md](./FIREBASE_STRUCTURE_MOBILE.md), [STATE_BASED_SYNC_MOBILE.md](./STATE_BASED_SYNC_MOBILE.md).

---

## Why `deleted_at` exists

| Concern | Role of `is_deleted` | Role of `deleted_at` |
| ------- | -------------------- | -------------------- |
| Hide from UI / queries | **`true`** = treat as deleted | — |
| Know *when* delete happened | — | **Firestore `Timestamp`** when user (or client) performed the soft delete |
| Server retention / hard purge | Tombstone still required | Used with **retention policy** (e.g. 30 days) to **hard-delete** old tombstones in a scheduled job |

Web sets both fields on every new soft delete. **Mobile should do the same** so behavior and purge timing stay consistent across clients.

---

## Firestore field

| Field | Type | When set |
| ----- | ---- | -------- |
| `deleted_at` | **`Timestamp`** (Firestore) | Set **once** when transitioning to deleted (`is_deleted` becomes `true`). |
| `deleted_at` | **absent** or **`null`** | When the entity is **not** deleted (`is_deleted` is `false` or absent). |

**Do not** store `deleted_at` as a plain number in Firestore if you can use `Timestamp`; web and purge jobs compare timestamps consistently. If your SDK only writes numbers for a transition period, document it with the mobile team—prefer **`FieldValue.serverTimestamp()`** or the platform `Timestamp` type that maps to Firestore `timestamp`.

---

## Collections that use this pattern

All under `users/{uid}/`:

| Collection | Path | Soft-delete fields |
| ---------- | ---- | ------------------ |
| Decks | `decks/{deckId}` | `is_deleted`, `deleted_at`, `updated_at` |
| Cards | `cards/{cardId}` | `is_deleted`, `deleted_at`, `updated_at` |
| Templates | `templates/{templateId}` | `is_deleted`, `deleted_at`, `updated_at` |
| Media metadata | `media/{mediaId}` | `is_deleted`, `deleted_at`, `updated_at` |

**Create** docs with `is_deleted: false` and **no** `deleted_at` (or `null` if your rules allow).

---

## Write rules (align with web)

### Soft delete (user deletes deck / card / template / media)

Atomically (single write or batched update):

1. `is_deleted` → **`true`**
2. `deleted_at` → **`now`** (same moment as the delete action)
3. `updated_at` → **`now`** (same as web—keeps LWW and incremental sync working)

Example shape (conceptual):

```text
is_deleted: true
deleted_at: <Timestamp now>
updated_at: <Timestamp now>
```

### Undo / restore (if your product supports “undelete”)

If you allow restoring a soft-deleted item:

1. `is_deleted` → **`false`**
2. `deleted_at` → **`null`** (remove the field if possible, or set to `null` where rules allow)
3. `updated_at` → **`now`**

Until restore exists on mobile, you can omit restore writes; web may still clear `deleted_at` when implementing restore.

---

## Read / sync behavior

### Queries for “active only” (unchanged)

Keep using:

- `where("is_deleted", "==", false)`  
  (and the same composite indexes you already use with `deck_id`, `srs_due`, etc.)

`deleted_at` is **not** required for “show active decks/cards”—`is_deleted` remains the primary filter.

### Tombstones on pull

When you receive a doc with `is_deleted == true`:

- Apply your existing tombstone handling (remove locally, hide in UI, etc.).
- Optionally store **`deleted_at`** locally if you need sorting (“recently deleted”) or analytics.

### Legacy docs (only `is_deleted`, no `deleted_at`)

Older data may have **`is_deleted: true`** without **`deleted_at`**.

| Situation | Suggested behavior |
| --------- | ------------------- |
| Display / sync | Still treat as **deleted** if `is_deleted === true`. |
| Ordering by delete time | If `deleted_at` is missing, fall back to **`updated_at`** or **`created_at`**, or show “unknown”. |
| Optional client backfill | If mobile performs an update on an old tombstone, you *may* set `deleted_at` from `updated_at` once—coordinate with web to avoid conflicting migrations. Server-side backfill may already exist. |

---

## Conflict resolution (LWW)

When merging with [STATE_BASED_SYNC_MOBILE.md](./STATE_BASED_SYNC_MOBILE.md):

- On **delete**, web sets **`updated_at`** together with **`is_deleted`** and **`deleted_at`**.  
  Last-write-wins using **`updated_at`** remains valid.
- If one client sends only `is_deleted: true` without `deleted_at`, the other client’s newer write that includes **`deleted_at`** should win if **`updated_at`** is newer—ensure **`updated_at`** is always bumped on delete.

---

## Server-side purge (FYI)

- A **scheduled Cloud Function** (or manual script) may **hard-delete** Firestore docs (and Storage objects for media) after **`deleted_at`** is older than the **retention window** (e.g. 30 days).
- Mobile does **not** need to implement purge; it only needs to **write `deleted_at` correctly** on soft delete so retention policy is predictable.

---

## Checklist for mobile

- [ ] On soft delete for **deck / card / template / media**: set `is_deleted: true`, `deleted_at: now`, `updated_at: now`.
- [ ] On create: `is_deleted: false`, no `deleted_at` (or null).
- [ ] On restore (if supported): `is_deleted: false`, clear `deleted_at`, bump `updated_at`.
- [ ] Queries for lists: still `is_deleted == false`.
- [ ] Handle legacy tombstones missing `deleted_at` as still deleted.

---

## Questions

Coordinate with web if you need exceptions (e.g. batch deletes, offline queue flushing many tombstones in one commit). Prefer **one write per logical delete** with all three fields updated together.
