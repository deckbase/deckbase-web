# Firestore: Flashcards collection migration

This document describes the migration from the legacy `flashcards` collection to user-scoped subcollections under `users`, and the scripts used for cleanup.

## What changed

- **Before:** Decks, cards, and templates lived under  
  `flashcards/{userId}/data/main/{decks|cards|templates|wizard_deck}`.
- **After:** They live under  
  `users/{userId}/decks`, `users/{userId}/cards`, `users/{userId}/templates`, and (for legacy wizard migration) `users/{userId}/wizard_deck`.
- **Media** was already under `users/{userId}/media` and is unchanged.
- The **flashcards** collection is no longer used and can be removed.

## New Firestore structure

| Data           | Path                                    |
|----------------|-----------------------------------------|
| Decks          | `users/{userId}/decks/{deckId}`         |
| Cards          | `users/{userId}/cards/{cardId}`         |
| Templates      | `users/{userId}/templates/{templateId}`  |
| Legacy wizard  | `users/{userId}/wizard_deck/{entryId}`   |
| Media          | `users/{userId}/media/{mediaId}`        |

Wizard (TCG) data stays under `wizard/{userId}/...` and is separate from this migration.

## Code and rules

- **Client:** `utils/firestore.js` — `getDecksCollection`, `getCardsCollection`, `getTemplatesCollection` now use `users/{uid}/decks`, `users/{uid}/cards`, `users/{uid}/templates`. `getLegacyWizardDeckCollection` uses `users/{uid}/wizard_deck`.
- **Server:** `lib/firestore-admin.js` — all admin reads/writes use the same `users/{uid}/...` paths.
- **Rules:** `firestore.rules` — rules for `users/{userId}/decks`, `cards`, `templates`, and `wizard_deck`; the old `flashcards` block has been removed.

## Delete flashcards collection

**Script:** `scripts/delete-flashcards-collection.js`

Permanently deletes the entire `flashcards` collection and all nested data (decks, cards, templates, wizard_deck under each user, plus parent docs). Use only when you no longer need any data in the old collection.

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

## Recommended order

1. **Verify project:** Run `debug-firestore-structure.js` with the target env and confirm project and user count.
2. **Deploy rules:** `firebase deploy --only firestore:rules`
3. **Verify app:** Use the app and confirm decks/cards/templates load and save under the new paths.
4. **Optional cleanup:** Run `delete-flashcards-collection.js` to remove the old `flashcards` collection.
5. **Optional user cleanup:** Use `delete-users-except.js` if you need to trim test users.
