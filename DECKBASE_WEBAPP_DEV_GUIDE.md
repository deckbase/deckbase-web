# Deckbase Web Application Developer Guide

> **Scan books into flashcards. Build decks. Remember more.**

This document provides the web development team with all the specifications needed to implement Deckbase features on the web platform.

**Scope**: The web app focuses on **Deck and Card Management** using Firebase Firestore. Study/review features are mobile-only.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack Recommendations](#tech-stack-recommendations)
3. [Firebase Configuration](#firebase-configuration)
4. [Data Models](#data-models)
5. [Core Features](#core-features)
6. [File Import](#file-import)
7. [Authentication](#authentication)
8. [Firestore Operations](#firestore-operations)
9. [Firebase Storage](#firebase-storage)
10. [UI/UX Specifications](#uiux-specifications)
11. [Routes & Navigation](#routes--navigation)

---

## Overview

Deckbase Web is a companion application for managing flashcard decks and cards. Users can:

- **Create & Manage Decks**: Organize flashcards into decks
- **Create & Edit Cards**: Build flashcards with flexible block-based templates
- **Import Files**: Import from CSV, Excel (XLS/XLSX), and Anki (.apkg) files
- **Upload Images & Audio**: Attach media to cards
- **Sync with Mobile**: All data syncs via Firebase to the mobile app

> **Note**: Study sessions and spaced repetition are handled exclusively on the mobile app.

---

## Tech Stack Recommendations

| Layer                | Recommended Technologies                               |
| -------------------- | ------------------------------------------------------ |
| **Frontend**         | React/Next.js or Vue.js                                |
| **State Management** | Redux Toolkit, Zustand, or Pinia                       |
| **Database**         | Firebase Firestore                                     |
| **Authentication**   | Firebase Auth                                          |
| **Storage**          | Firebase Storage                                       |
| **Styling**          | Tailwind CSS or Styled Components                      |
| **File Parsing**     | PapaParse (CSV), SheetJS (Excel), sql.js (APKG/SQLite) |

---

## Firebase Configuration

### Project Setup

Use the existing Firebase project. Contact the mobile team for credentials.

### Environment Variables

```env
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx
```

### Firebase SDK Initialization

```typescript
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
```

---

## Data Models

### Firestore Collection Structure

```
/users/{uid}                                         # User profile document
/users/{uid}/inAppNotifications/{notificationId}     # In-app notifications
/notifications/{uid}                                 # FCM tokens for push notifications
/flashcards/{uid}/data/main/decks/{deckId}           # User's decks
/flashcards/{uid}/data/main/cards/{cardId}           # User's cards
/flashcards/{uid}/data/main/templates/{templateId}   # User's templates
/free_trials/{email}                                 # Free trial records
```

> **Important**:
>
> - Note the nested path structure under `/flashcards/{uid}/data/main/`
> - Media files are stored in **Firebase Storage** (not Firestore). Only the storage path is referenced in card values.

---

### Deck Document

**Collection**: `/flashcards/{uid}/data/main/decks/{deckId}`

```typescript
interface Deck {
  deck_id: string; // Unique deck identifier (UUID)
  title: string; // Deck title (required)
  description?: string; // Optional description
  created_at: Timestamp; // Firestore Timestamp
  updated_at: Timestamp; // Firestore Timestamp
  is_deleted: boolean; // Soft delete flag (default: false)
}
```

**Example:**

```json
{
  "deck_id": "d1a2b3c4-5678-90ab-cdef-1234567890ab",
  "title": "Spanish Vocabulary",
  "description": "Common Spanish words and phrases",
  "created_at": { "seconds": 1705000000, "nanoseconds": 0 },
  "updated_at": { "seconds": 1705000000, "nanoseconds": 0 },
  "is_deleted": false
}
```

---

### Card Document

**Collection**: `/flashcards/{uid}/data/main/cards/{cardId}`

```typescript
interface Card {
  card_id: string; // Unique card identifier (UUID)
  deck_id: string; // Parent deck ID (required)
  template_id?: string; // Template ID (optional)
  template_version?: number; // Template version at creation
  main_block_id?: string; // Block ID to display as main preview text
  sub_block_id?: string; // Block ID to display as sub text
  blocks_snapshot: TemplateBlock[]; // Snapshot of card blocks
  values: BlockValue[]; // User-filled values
  source?: CardSource; // Source info (e.g., OCR, import)
  created_at: Timestamp; // Firestore Timestamp
  updated_at: Timestamp; // Firestore Timestamp
  is_deleted: boolean; // Soft delete flag

  // SRS fields (managed by mobile app, preserve on web)
  srs_state?: number; // 1=learning, 2=review, 3=relearning
  srs_step?: number; // Current learning/relearning step
  srs_stability?: number; // FSRS stability parameter
  srs_difficulty?: number; // FSRS difficulty parameter
  srs_due?: number; // Due timestamp (milliseconds, UTC)
  srs_last_review?: number; // Last review timestamp
  srs_review_count?: number; // Total review count
}

interface CardSource {
  image_local_path?: string;
  ocr_engine?: string;
  image_width?: number;
  image_height?: number;
}
```

> **Important**: When editing cards on web, preserve all `srs_*` fields. These are managed by the mobile app's spaced repetition system.

---

### Block Types

```typescript
enum BlockType {
  HEADER1 = 0, // Large header
  HEADER2 = 1, // Medium header
  HEADER3 = 2, // Small header
  TEXT = 3, // Regular text
  QUOTE = 4, // Quote/example text with styling
  HIDDEN_TEXT = 5, // Text hidden until revealed
  IMAGE = 6, // Image block
  AUDIO = 7, // Audio block
  QUIZ_SINGLE_SELECT = 8, // Single choice quiz
  QUIZ_MULTI_SELECT = 9, // Multiple choice quiz
  QUIZ_TEXT_ANSWER = 10, // Text input quiz
  DIVIDER = 11, // Visual separator
  SPACE = 12, // Empty vertical space
}
```

> **Note**: Block types are stored as integer indices in Firestore.

### Template Block

```typescript
interface TemplateBlock {
  block_id: string; // Unique block ID within card
  type: number; // BlockType enum index
  label: string; // Display label
  required: boolean; // Is this block required?
  config_json?: string; // Type-specific config (JSON string)
}
```

**Config Examples by Block Type:**

| Block Type           | Config Example                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| Header (0,1,2)       | `{"maxLength": 80}`                                                                                       |
| Text (3)             | `{"multiline": true, "appendMode": "newline"}`                                                            |
| Quote (4)            | `{"multiline": true}`                                                                                     |
| Hidden Text (5)      | `{"multiline": true}`                                                                                     |
| Image (6)            | `{"maxItems": 4, "imageLayout": "horizontal"}`                                                            |
| Audio (7)            | `{"maxItems": 2, "autoPlay": false}`                                                                      |
| QuizSingleSelect (8) | `{"options": ["A", "B", "C"], "correctAnswerIndex": 0, "question": "...", "hint": "...", "isQuiz": true}` |
| QuizMultiSelect (9)  | `{"options": [...], "correctAnswerIndices": [0, 2], "question": "...", "isQuiz": true}`                   |
| QuizTextAnswer (10)  | `{"question": "...", "correctAnswer": "...", "caseSensitive": false, "hint": "...", "isQuiz": true}`      |
| Divider (11)         | `null` (no config needed)                                                                                 |
| Space (12)           | `{"height": 16}`                                                                                          |

### Block Value

```typescript
interface BlockValue {
  block_id: string; // References TemplateBlock.block_id
  type: number; // BlockType enum index
  text?: string; // For header, text, quote, hiddenText
  items?: string[]; // For select types (selected options)
  media_ids?: string[]; // For image/audio type (references media docs)
  correct_answers?: string[]; // For quiz types
}
```

---

### Template Document

**Collection**: `/flashcards/{uid}/data/main/templates/{templateId}`

```typescript
interface Template {
  template_id: string; // Unique template identifier (UUID)
  name: string; // Template name
  description?: string; // Optional description
  version: number; // Version number (increments on changes)
  blocks: TemplateBlock[]; // Ordered list of blocks
  main_block_id?: string; // Block ID for main card preview text
  sub_block_id?: string; // Block ID for sub text
  rendering?: TemplateRendering; // Front/back rendering config
  created_at: Timestamp;
  updated_at: Timestamp;
  is_deleted: boolean;
}

interface TemplateRendering {
  front_block_ids?: string[]; // Block IDs to show on card front
  back_block_ids?: string[]; // Block IDs to show on card back
}
```

---

### Media (Firebase Storage)

Media files are stored in **Firebase Storage**, not as Firestore documents. The mobile app tracks media metadata locally, and cards reference media by storing the storage path directly in `BlockValue.media_ids`.

**Storage Path Pattern**: `users/{uid}/media/{filename}`

```typescript
// When uploading media, store the path and reference it in card values
interface MediaReference {
  storagePath: string; // e.g., "users/abc123/media/image1.jpg"
  type: "image" | "audio";
  mimeType?: string;
}

// In card BlockValue, media_ids contains storage paths or URLs
interface BlockValue {
  block_id: string;
  type: number;
  media_ids?: string[]; // Array of storage paths or download URLs
}
```

**Supported Media Types:**

| Category | Extensions                | MIME Types                                             |
| -------- | ------------------------- | ------------------------------------------------------ |
| Image    | jpg, jpeg, png, gif, webp | image/jpeg, image/png, image/gif, image/webp           |
| Audio    | mp3, wav, ogg, m4a, aac   | audio/mpeg, audio/wav, audio/ogg, audio/mp4, audio/aac |

---

### User Document

**Collection**: `/users/{uid}`

```typescript
interface UserProfile {
  uid: string;
  displayName?: string; // camelCase (legacy convention)
  email: string;
  phoneNumber?: string;
  profileUrl?: string; // Profile image download URL
  profilePath?: string; // Profile image storage path
  dob?: string; // Date of birth
  created_at: Timestamp; // Note: this one field uses snake_case
}
```

> **Note**: User fields use **camelCase** (legacy convention), while flashcard data uses **snake_case**.

---

### In-App Notification Document

**Collection**: `/users/{uid}/inAppNotifications/{notificationId}`

```typescript
interface InAppNotification {
  notificationId: string;
  notificationPurpose: string; // e.g., "friendRequest", "system"
  notificationType: string; // e.g., "info", "warning"
  notificationMessage: string;
  isRead: boolean;
  requestId?: string; // Related request ID
  requestorId?: string; // User who triggered notification
  uid: string; // Owner user ID
  createdAt: Timestamp;
}
```

> **Note**: Notification fields also use **camelCase**.

---

## Core Features

### 1. Deck Management

| Feature             | Description                                                          |
| ------------------- | -------------------------------------------------------------------- |
| **List Decks**      | Show all decks where `is_deleted === false`                          |
| **Create Deck**     | Title (required), Description (optional)                             |
| **Edit Deck**       | Update title and description                                         |
| **Delete Deck**     | Set `is_deleted: true`, update `updated_at`                          |
| **Deck Card Count** | Query cards where `deck_id === deck.deck_id && is_deleted === false` |

### 2. Card Management

| Feature          | Description                                        |
| ---------------- | -------------------------------------------------- |
| **List Cards**   | Show cards for a deck where `is_deleted === false` |
| **Create Card**  | Add blocks and values, link to deck                |
| **Edit Card**    | Modify block values (preserve SRS fields!)         |
| **Delete Card**  | Set `is_deleted: true`, update `updated_at`        |
| **Card Preview** | Display card with all blocks rendered              |

### 3. Template System

Templates define reusable card structures.

**Default Template Example:**

```typescript
const defaultTemplate: Template = {
  template_id: "default",
  name: "Basic",
  version: 1,
  blocks: [
    { block_id: "front", type: 0, label: "Front", required: true },
    { block_id: "back", type: 3, label: "Back", required: true },
  ],
  main_block_id: "front",
  sub_block_id: "back",
  rendering: {
    front_block_ids: ["front"],
    back_block_ids: ["back"],
  },
  created_at: Timestamp.now(),
  updated_at: Timestamp.now(),
  is_deleted: false,
};
```

### 4. Media Upload

- Upload images/audio to Firebase Storage
- Create media document in Firestore
- Reference `media_id` in card's `BlockValue.media_ids`

---

## File Import

### Supported Formats

| Format | Extension | Description            |
| ------ | --------- | ---------------------- |
| CSV    | `.csv`    | Comma-separated values |
| XLS    | `.xls`    | Legacy Excel format    |
| XLSX   | `.xlsx`   | Modern Excel format    |
| APKG   | `.apkg`   | Anki deck package      |

### Import Wizard Flow

1. **Load File** - User selects and uploads file
2. **Select Deck** - Choose existing deck or create new one
3. **Preview Data** - Show parsed rows/columns
4. **Map Columns** - Map file columns to template blocks
5. **Import** - Create cards, show progress

### Spreadsheet Import (CSV/Excel)

```typescript
interface SpreadsheetData {
  headers: string[]; // Column headers from first row
  rows: string[][]; // Data rows
  fileName: string;
  sheetName: string; // For Excel files with multiple sheets
}

interface ColumnMapping {
  columnIndex: number; // Source column index
  blockId: string; // Target template block ID
  columnName: string; // Column header name
  blockLabel: string; // Block label
  hintColumnIndex?: number; // For quiz blocks - hint column
  answerColumnIndex?: number; // For quiz text answer - answer column
}
```

**Implementation Steps:**

1. Parse file using PapaParse (CSV) or SheetJS (Excel)
2. Extract headers from first row
3. Show column mapping UI
4. For each data row, create a card with mapped values

### APKG Import (Anki Decks)

APKG files are ZIP archives containing:

- `collection.anki2` or `collection.anki21` - SQLite database
- `media` - JSON file mapping numeric IDs to filenames
- Media files (numbered: `0`, `1`, `2`, etc.)

```typescript
interface ApkgData {
  deckName: string; // Extracted deck name
  fieldNames: string[]; // Note field names (e.g., "Front", "Back")
  notes: AnkiNote[]; // Parsed notes
  media: Map<string, Uint8Array>; // filename -> file bytes
}

interface AnkiNote {
  id: string;
  fields: string[]; // Field values (HTML stripped)
  tags: string[];
}
```

**Implementation Steps:**

1. Extract ZIP using JSZip or similar
2. Load SQLite database using sql.js
3. Query deck name from `col` table → `decks` JSON
4. Query field names from `col` table → `models` JSON
5. Query notes from `notes` table
6. Parse media mapping from `media` JSON file
7. Process HTML in fields:
   - Strip HTML tags
   - Convert `[sound:file.mp3]` to audio references
   - Convert `<img src="file.jpg">` to image references
8. Map fields to template blocks
9. Create cards and upload media files

**SQL Queries for APKG:**

```sql
-- Get collection metadata (contains deck names and model/field definitions)
SELECT decks, models FROM col;

-- Get all notes
SELECT id, mid, flds, tags FROM notes;
-- flds contains fields separated by \x1f character
```

**HTML Processing:**

```typescript
// Convert Anki media references
const processAnkiField = (
  html: string,
): { text: string; mediaRefs: string[] } => {
  const mediaRefs: string[] = [];

  // Extract audio: [sound:filename.mp3]
  let text = html.replace(/\[sound:([^\]]+)\]/g, (_, file) => {
    mediaRefs.push(file);
    return `[audio: ${file}]`;
  });

  // Extract images: <img src="filename.jpg">
  text = text.replace(/<img[^>]*src="([^"]+)"[^>]*>/g, (_, file) => {
    mediaRefs.push(file);
    return `[image: ${file}]`;
  });

  // Strip remaining HTML
  text = text.replace(/<[^>]+>/g, "");

  return { text: text.trim(), mediaRefs };
};
```

---

## Authentication

### Supported Methods

| Method         | Provider                       |
| -------------- | ------------------------------ |
| Email/Password | Firebase Auth                  |
| Google Sign-In | Google OAuth                   |
| Apple Sign-In  | Apple OAuth (optional for web) |

### Implementation

```typescript
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";

// Email/Password Login
const login = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

// Google Sign-In
const googleLogin = async () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

// Sign Out
const logout = async () => {
  return signOut(auth);
};
```

### Auth State Listener

```typescript
import { onAuthStateChanged } from "firebase/auth";

onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    console.log("User:", user.uid);
  } else {
    // User is signed out
    // Redirect to login
  }
});
```

---

## Firestore Operations

### Collection Helper

```typescript
// Helper to get collection paths
const getCollectionPath = (uid: string, collection: string) => {
  return `flashcards/${uid}/data/main/${collection}`;
};
```

### Deck Operations

```typescript
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

// Create Deck
const createDeck = async (uid: string, title: string, description?: string) => {
  const deckId = uuidv4();
  const now = Timestamp.now();

  const deck: Deck = {
    deck_id: deckId,
    title,
    description,
    created_at: now,
    updated_at: now,
    is_deleted: false,
  };

  const path = getCollectionPath(uid, "decks");
  await setDoc(doc(db, path, deckId), deck);
  return deck;
};

// Get All Decks (real-time)
const subscribeToDecks = (uid: string, callback: (decks: Deck[]) => void) => {
  const path = getCollectionPath(uid, "decks");
  const q = query(collection(db, path), where("is_deleted", "==", false));

  return onSnapshot(q, (snapshot) => {
    const decks = snapshot.docs.map((doc) => doc.data() as Deck);
    callback(decks);
  });
};

// Update Deck
const updateDeck = async (
  uid: string,
  deckId: string,
  updates: Partial<Deck>,
) => {
  const path = getCollectionPath(uid, "decks");
  const deckRef = doc(db, path, deckId);
  await setDoc(
    deckRef,
    {
      ...updates,
      updated_at: Timestamp.now(),
    },
    { merge: true },
  );
};

// Delete Deck (soft delete)
const deleteDeck = async (uid: string, deckId: string) => {
  await updateDeck(uid, deckId, { is_deleted: true });
};
```

### Card Operations

```typescript
// Create Card
const createCard = async (
  uid: string,
  deckId: string,
  blocks: TemplateBlock[],
  values: BlockValue[],
  templateId?: string,
  mainBlockId?: string,
  subBlockId?: string,
) => {
  const cardId = uuidv4();
  const now = Timestamp.now();

  const card: Card = {
    card_id: cardId,
    deck_id: deckId,
    template_id: templateId,
    main_block_id: mainBlockId,
    sub_block_id: subBlockId,
    blocks_snapshot: blocks,
    values,
    created_at: now,
    updated_at: now,
    is_deleted: false,
    // Initialize SRS fields for mobile app
    srs_state: 1, // learning
    srs_step: 0,
    srs_due: Date.now(), // due immediately
    srs_review_count: 0,
  };

  const path = getCollectionPath(uid, "cards");
  await setDoc(doc(db, path, cardId), card);
  return card;
};

// Get Cards for Deck (real-time)
const subscribeToCards = (
  uid: string,
  deckId: string,
  callback: (cards: Card[]) => void,
) => {
  const path = getCollectionPath(uid, "cards");
  const q = query(
    collection(db, path),
    where("deck_id", "==", deckId),
    where("is_deleted", "==", false),
  );

  return onSnapshot(q, (snapshot) => {
    const cards = snapshot.docs.map((doc) => doc.data() as Card);
    callback(cards);
  });
};

// Update Card (preserve SRS fields!)
const updateCard = async (
  uid: string,
  cardId: string,
  values: BlockValue[],
) => {
  const path = getCollectionPath(uid, "cards");
  const cardRef = doc(db, path, cardId);
  await setDoc(
    cardRef,
    {
      values,
      updated_at: Timestamp.now(),
    },
    { merge: true },
  ); // merge: true preserves other fields including SRS
};

// Delete Card (soft delete)
const deleteCard = async (uid: string, cardId: string) => {
  const path = getCollectionPath(uid, "cards");
  const cardRef = doc(db, path, cardId);
  await setDoc(
    cardRef,
    {
      is_deleted: true,
      updated_at: Timestamp.now(),
    },
    { merge: true },
  );
};
```

### Batch Import Cards

```typescript
import { writeBatch } from "firebase/firestore";

// Batch create cards (for imports)
const batchCreateCards = async (
  uid: string,
  cards: Omit<Card, "card_id" | "created_at" | "updated_at">[],
) => {
  const batch = writeBatch(db);
  const path = getCollectionPath(uid, "cards");
  const now = Timestamp.now();

  const createdCards: Card[] = [];

  for (const cardData of cards) {
    const cardId = uuidv4();
    const card: Card = {
      ...cardData,
      card_id: cardId,
      created_at: now,
      updated_at: now,
      is_deleted: false,
      srs_state: 1,
      srs_step: 0,
      srs_due: Date.now(),
      srs_review_count: 0,
    };

    batch.set(doc(db, path, cardId), card);
    createdCards.push(card);
  }

  await batch.commit();
  return createdCards;
};
```

---

## Firebase Storage

### Storage Path Pattern

```
users/{uid}/media/{filename}
```

> **Note**: Media metadata is NOT stored in Firestore. Only the storage path is saved in card `BlockValue.media_ids`. The web app should upload files to Storage and store the path/URL in the card document.

### Upload Media

```typescript
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

// Upload media and return storage path
const uploadMedia = async (
  uid: string,
  file: File | Blob,
  mediaType: "image" | "audio",
): Promise<{ storagePath: string; downloadUrl: string }> => {
  const mediaId = uuidv4();
  const extension =
    file instanceof File
      ? file.name.split(".").pop()
      : mediaType === "image"
        ? "jpg"
        : "mp3";

  const storagePath = `users/${uid}/media/${mediaId}.${extension}`;
  const storageRef = ref(storage, storagePath);

  // Upload file
  await uploadBytes(storageRef, file);

  // Get download URL
  const downloadUrl = await getDownloadURL(storageRef);

  return { storagePath, downloadUrl };
};

// Get media download URL from storage path
const getMediaUrl = async (storagePath: string): Promise<string> => {
  const storageRef = ref(storage, storagePath);
  return getDownloadURL(storageRef);
};

// Batch upload media (for APKG imports)
// Returns map of original filename -> storage path
const batchUploadMedia = async (
  uid: string,
  files: Map<string, { data: Uint8Array; type: "image" | "audio" }>,
): Promise<Map<string, string>> => {
  const pathMap = new Map<string, string>(); // filename -> storagePath

  for (const [filename, { data, type }] of files) {
    const blob = new Blob([data]);
    const { storagePath } = await uploadMedia(uid, blob, type);
    pathMap.set(filename, storagePath);
  }

  return pathMap;
};
```

### Using Media in Cards

When creating/editing cards with images or audio:

```typescript
// 1. Upload the file
const { storagePath, downloadUrl } = await uploadMedia(uid, file, "image");

// 2. Add to card's block value
const blockValue: BlockValue = {
  block_id: "imageBlock",
  type: 6, // BlockType.IMAGE
  media_ids: [storagePath], // Store storage path or download URL
};

// 3. Save the card with the updated values
await updateCard(uid, cardId, [...otherValues, blockValue]);
```

---

## UI/UX Specifications

### Pages Overview

| Page             | Description                        |
| ---------------- | ---------------------------------- |
| **Login**        | Email/password + Google sign-in    |
| **Register**     | Create new account                 |
| **Dashboard**    | List of user's decks               |
| **Deck Detail**  | List of cards in a deck            |
| **Card Editor**  | Create/edit card with block editor |
| **Card Preview** | View card content                  |
| **Import**       | File import wizard                 |
| **Templates**    | Manage card templates              |

### Dashboard (Deck List)

- Grid or list view of decks
- Each deck shows: Title, description, card count
- Actions: Edit, Delete, View Cards
- FAB or button to create new deck
- Import button for file import

### Deck Detail (Card List)

- List of cards in the deck
- Card preview showing `main_block_id` and `sub_block_id` content
- Actions: Edit, Delete, Preview
- Button to create new card
- Import button to import cards into this deck

### Card Editor

- Block-based editor
- Add/remove/reorder blocks
- Block types: Headers, Text, Quote, Hidden Text, Image, Audio, Quiz, Divider, Space
- Image/audio upload with drag-and-drop
- Template selection
- Save and Cancel buttons

### Import Wizard

- **Step 1**: File selection (drag-and-drop or file picker)
- **Step 2**: Preview parsed data (table view)
- **Step 3**: Column-to-block mapping interface
- **Step 4**: Progress bar during import
- **Step 5**: Summary (cards created, errors if any)

### Card Preview

- Render all blocks with appropriate styling
- Show images and audio players
- For quiz blocks, show question and options
- Hidden text should have tap-to-reveal

---

## Routes & Navigation

### Public Routes

| Path               | Component          | Description    |
| ------------------ | ------------------ | -------------- |
| `/login`           | LoginPage          | Sign in        |
| `/register`        | RegisterPage       | Create account |
| `/forgot-password` | ForgotPasswordPage | Reset password |

### Protected Routes (require auth)

| Path                                 | Component       | Description             |
| ------------------------------------ | --------------- | ----------------------- |
| `/`                                  | DashboardPage   | Deck list (home)        |
| `/deck/:deckId`                      | DeckDetailPage  | Cards in a deck         |
| `/deck/:deckId/card/new`             | CardEditorPage  | Create new card         |
| `/deck/:deckId/card/:cardId`         | CardEditorPage  | Edit existing card      |
| `/deck/:deckId/card/:cardId/preview` | CardPreviewPage | Preview card            |
| `/deck/new`                          | CreateDeckPage  | Create new deck         |
| `/import`                            | ImportPage      | File import wizard      |
| `/import/:deckId`                    | ImportPage      | Import to specific deck |
| `/templates`                         | TemplatesPage   | Manage templates        |
| `/templates/new`                     | TemplateEditor  | Create template         |
| `/templates/:templateId`             | TemplateEditor  | Edit template           |
| `/profile`                           | ProfilePage     | User settings           |

---

## Constants

```typescript
const APP_NAME = "Deckbase";
const TERMS_URL = "https://www.deckbase.co/terms-and-conditions";
const PRIVACY_URL = "https://www.deckbase.co/privacy-policy";

// Firestore collections
const COLLECTION_USERS = "users";
const COLLECTION_FLASHCARDS = "flashcards";
const COLLECTION_DECKS = "decks";
const COLLECTION_CARDS = "cards";
const COLLECTION_TEMPLATES = "templates";
const COLLECTION_MEDIA = "media";

// Storage
const STORAGE_MEDIA_PATH = "users/{uid}/media";
```

---

## Implementation Checklist

### Phase 1: Foundation

- [ ] Firebase project setup
- [ ] Authentication (Email + Google)
- [ ] Protected routes
- [ ] User profile creation

### Phase 2: Deck Management

- [ ] Create deck
- [ ] List decks
- [ ] Edit deck
- [ ] Delete deck

### Phase 3: Card Management

- [ ] Create card with blocks
- [ ] List cards in deck
- [ ] Edit card (preserve SRS fields)
- [ ] Delete card
- [ ] Card preview

### Phase 4: Template System

- [ ] Default template
- [ ] Create custom templates
- [ ] Edit templates
- [ ] Template selection in card editor

### Phase 5: Media

- [ ] Image upload to Firebase Storage
- [ ] Audio upload
- [ ] Display images in cards
- [ ] Audio player in cards
- [ ] Media management

### Phase 6: File Import

- [ ] CSV parsing and import
- [ ] Excel (XLS/XLSX) parsing and import
- [ ] APKG parsing and import
- [ ] Column mapping UI
- [ ] Batch card creation
- [ ] Media extraction from APKG

### Phase 7: Polish

- [ ] Responsive design
- [ ] Error handling
- [ ] Loading states
- [ ] Empty states
- [ ] Keyboard shortcuts

---

## Questions?

Contact the mobile team for clarification on any features or implementation details.

---

_Last updated: January 2026_
