# Op log cleanup

The op-based sync stores one Firestore document per operation at `users/{uid}/ops/{op_id}`. Over time this collection grows (every add/update/delete = one doc). This doc describes **why** and **how** to clean up old ops, and **who** should do it.

---

## Why cleanup is safe

- Each op is applied by clients (mobile/web) and its **effect** is written into the materialized state (decks/cards in DB or in memory).
- Once a client has **pulled and applied** an op, that client no longer needs that op doc for sync.
- So op docs are only needed to **replicate** changes. After replication, they are redundant and can be deleted — as long as **no client still needs to pull them**.

---

## How Anki and others avoid this

Many sync services don’t have an op log at all, so they don’t need log cleanup:

- **Anki:** The server stores a **single copy of the collection** (SQLite DB + media). Sync is **state-based**: client and server exchange “my state” and merge (upload/download/merge). There is no growing list of operations — just one current state per user. Conflicts are resolved at sync time (e.g. “use server” vs “use client” when merge isn’t possible).
- **Evernote (EDAM):** Server is the source of truth. Clients do **full sync** (download everything) or **incremental sync** (request chunks since last USN). The server holds current notes + a **USN** (update sequence number) for incremental reads; it doesn’t keep an unbounded operation log that grows forever.
- **Typical pattern:** Store **current state** (and maybe a short-lived or bounded “what changed” hint for incremental sync). Clients push changes as state or deltas; server merges into state. No long-lived op log → no retention/cleanup policy.

**Deckbase** uses an **op log** at `users/{uid}/ops` so that mobile and web can replay a stream of operations and stay in sync. That design is flexible and works well for multi-client sync, but the log grows without bound unless we **explicitly** clean up (cursor-based or time-based), as described below.

---

## When to delete

**Policy: keep ops until synced.** Delete only ops that **every** interested client has already applied. No fixed retention period — remove an op only when you know no client still needs to pull it.

- **Cursor-based (preferred):** Track the latest applied cursor per device (e.g. in a backend or in `users/{uid}/sync_state`). Delete ops with `hlc` less than the **minimum** cursor across all devices. Once a device has reported "I've applied up to hlc X," ops below the min of all such X are safe to delete.
- **Time-based (fallback):** If you don't track per-device cursors, you can't know "everyone has synced." In that case use a retention window (e.g. 30 or 90 days) as a proxy: delete ops older than the window and document the chosen value so all clients stay aligned.

---

## What to delete

- **Collection:** `users/{uid}/ops`
- **Condition:** For cursor-based: `hlc < min_cursor` (min across all devices). For time-based fallback: `created_at < (now - retention_days)`.
- **How:** Query in batches (e.g. 100–500 docs per batch), then delete each batch. Firestore has no "delete by query" — you must read doc IDs then delete by ID. Use a **limit** and loop until no more docs match.

Example (pseudo, cursor-based):

```
minCursor = min(cursor for each device that has synced)
query: users/{uid}/ops where hlc < minCursor, limit 200
for each doc: batch.delete(doc.ref)
repeat until query returns 0 docs
```

---

## Who should implement cleanup

| Option | Pros | Cons |
|--------|------|------|
| **Backend (Cloud Function / scheduled job)** | Runs on a schedule; one place for policy; no dependency on user opening app | Requires backend |
| **Mobile (after sync)** | No backend; runs when user syncs | Only runs when app is used; same logic could live on web |
| **Web (after apply ops / on load)** | No backend; can run when dashboard is open | Only runs when web app is used |

**Recommendation**

- **If you have a backend:** Prefer **cursor-based** cleanup: have clients report their applied cursor when they sync; store per-device cursors; scheduled job deletes ops with `hlc < min(cursors)`. No retention period. If you can't track cursors, use a time-based window and document it.
- **If client-only:** You can't compute a global min cursor without shared state. Use a **time-based** window (e.g. after applying ops or on load) and document the value. Pick **one** owner (e.g. mobile) so both teams don't implement different policies.

---

## Security / rules

- Only the **owner** of the op doc (the user `uid`) should be able to delete. Firestore rules for `users/{userId}/ops/{opId}` should already restrict write/delete to `request.auth.uid == userId`.
- If cleanup runs from a **backend**, use Admin SDK and ensure the job is scoped to the right project and environment.

---

## Message to web team

You can send the following (or adapt it) to the web team:

---

**Subject: Op log cleanup for `users/{uid}/ops`**

Hi,

We're using the op-based sync model for flashcards: each change is stored as a doc in `users/{uid}/ops`. Over time that collection grows, so we need to **clean up old ops** so storage and reads stay manageable.

**Why it's safe**  
Once a client has pulled and applied an op, the change is already in the materialized state (decks/cards). The op doc is only needed for replication, so we can delete ops that are old enough that every client has had a chance to sync.

**What we need**  
- **Policy:** Keep ops until synced — delete only ops that every client has applied. Prefer **cursor-based** cleanup (track min cursor across devices; delete ops with `hlc < min`). If we can't track cursors (e.g. client-only), use a **time-based** window as a fallback and document it (see `docs/OP_LOG_CLEANUP.md`).
- **Who implements:**  
  - **Preferred:** A **backend** that stores per-device cursors and runs a scheduled job to delete ops below the min cursor.  
  - **If no backend:** Web or mobile runs time-based cleanup (e.g. after sync). Agree on **one** owner and the fallback retention value.

**How**  
- Cursor-based: query `users/{uid}/ops` where `hlc < min_cursor`, in batches (e.g. limit 200); delete each batch; repeat.  
- Time-based fallback: same but with `created_at < (now - retention_days)`.

Thanks,  
[Your name]

---
