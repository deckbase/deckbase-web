# FSRS Algorithm & Firebase Structure Addendum

**Supplement to:** DECK_STUDY_MODE_WEB_DOCUMENTATION.md

---

## FSRS Algorithm Deep Dive

### What is FSRS?

**FSRS (Free Spaced Repetition Scheduler)** is a modern, research-based spaced repetition algorithm developed as an improvement over traditional SM-2 and Anki algorithms. It uses machine learning-optimized parameters to predict optimal review intervals.

### Core Concepts

#### 1. Stability (S)

**Definition:** The time (in days) for retrievability to decrease from 100% to 90% (the threshold).

**Characteristics:**
- Increases after successful reviews
- Decreases after failed reviews
- Represents memory strength
- Minimum value: 0.001 days
- Maximum initial value: 100 days

**Formula:**
```
Next Interval = Stability × ln(Target Retention) / ln(0.9)
```

#### 2. Difficulty (D)

**Definition:** A measure of how intrinsically hard a card is to remember.

**Characteristics:**
- Scale: 1.0 (easiest) to 10.0 (hardest)
- Increases when cards are rated "Again" or "Hard"
- Decreases when cards are rated "Easy"
- Influences how much stability changes

#### 3. Retrievability (R)

**Definition:** The probability of successfully recalling a card at a given time.

**Calculation:**
```typescript
retrievability = Math.pow(1 + (elapsedDays / (9 * stability)), -1)
```

Where:
- `elapsedDays` = days since last review
- `stability` = current stability value

### The 21 Parameters

FSRS uses 21 scientifically optimized parameters:

```typescript
const defaultParameters = [
  0.2172,   // [0]  w[0]: Initial stability for first learning step (Again)
  1.1771,   // [1]  w[1]: Initial stability for first learning step (Hard)
  3.2602,   // [2]  w[2]: Initial stability for first learning step (Good)
  16.1507,  // [3]  w[3]: Initial stability for first learning step (Easy)
  7.0114,   // [4]  w[4]: Stability decay factor for review state
  0.57,     // [5]  w[5]: Initial difficulty for first review
  2.0966,   // [6]  w[6]: Difficulty increase factor
  0.0069,   // [7]  w[7]: Difficulty decrease factor
  1.5261,   // [8]  w[8]: Difficulty weight in stability calculation
  0.112,    // [9]  w[9]: Stability increase for "Again" rating
  1.0178,   // [10] w[10]: Stability increase for "Hard" rating
  1.849,    // [11] w[11]: Stability increase for "Good" rating
  0.1133,   // [12] w[12]: Stability increase for "Easy" rating
  0.3127,   // [13] w[13]: Stability modifier for short-term memory
  2.2934,   // [14] w[14]: Stability modifier for long-term memory
  0.2191,   // [15] w[15]: Additional stability factor
  3.0004,   // [16] w[16]: Decay rate for "Again" rating
  0.7536,   // [17] w[17]: Decay rate for "Hard" rating
  0.3332,   // [18] w[18]: Decay rate for "Good" rating
  0.1437,   // [19] w[19]: Decay rate for "Easy" rating
  0.2,      // [20] w[20]: Fuzz factor (randomness)
];
```

### State Transitions

```
┌──────────┐
│   New    │ ──(First Review)──> Learning (State 1)
└──────────┘

┌───────────┐
│  Learning │
│ (State 1) │
└─────┬─────┘
      │
      ├─(Again)──> Stay in Learning, reset step
      ├─(Hard)───> Stay in Learning, advance step
      ├─(Good)───> Stay in Learning, advance step
      └─(Easy)───> Move to Review (State 2)

┌────────┐
│ Review │
│(State 2)│
└────┬───┘
     │
     ├─(Again)──> Relearning (State 3)
     ├─(Hard)───> Stay in Review, short interval
     ├─(Good)───> Stay in Review, normal interval
     └─(Easy)───> Stay in Review, long interval

┌────────────┐
│ Relearning │
│  (State 3) │
└──────┬─────┘
       │
       ├─(Again)──> Stay in Relearning, reset step
       ├─(Hard)───> Stay in Relearning, advance step
       └─(Good/Easy)──> Back to Review (State 2)
```

### Rating Effects

| Rating | State Transition | Stability Change | Difficulty Change |
|--------|------------------|------------------|-------------------|
| **Again (1)** | Learning → Learning<br>Review → Relearning<br>Relearning → Relearning | Significant decrease | Significant increase |
| **Hard (2)** | Learning → Learning<br>Review → Review<br>Relearning → Relearning | Small decrease | Small increase |
| **Good (3)** | Learning → Learning/Review<br>Review → Review<br>Relearning → Review | Normal increase | Slight decrease |
| **Easy (4)** | Learning → Review<br>Review → Review<br>Relearning → Review | Large increase | Significant decrease |

### Fuzz Factor

**Purpose:** Prevents clustering of reviews on the same day.

**Implementation:**
```typescript
const fuzzRanges = [
  { start: 2.5, end: 7.0, factor: 0.15 },      // ±15% for 2.5-7 days
  { start: 7.0, end: 20.0, factor: 0.1 },      // ±10% for 7-20 days
  { start: 20.0, end: Infinity, factor: 0.05 } // ±5% for 20+ days
];

function applyFuzz(interval: number): number {
  const range = fuzzRanges.find(r => interval >= r.start && interval < r.end);
  if (!range) return interval;

  const fuzzAmount = interval * range.factor;
  const randomOffset = (Math.random() * 2 - 1) * fuzzAmount;
  return Math.max(1, interval + randomOffset);
}
```

### Scheduler Configuration

```typescript
interface FSRSConfig {
  // Core parameters
  parameters: number[];           // The 21 FSRS parameters

  // Target retention (default: 0.9 = 90%)
  requestRetention: number;

  // Maximum interval in days (default: 36500 = 100 years)
  maximumInterval: number;

  // Enable randomness to prevent review bunching
  enableFuzz: boolean;

  // Learning steps in minutes (e.g., [1, 10])
  learningSteps?: number[];

  // Relearning steps in minutes (e.g., [10])
  relearningSteps?: number[];
}
```

### Implementation Example

```typescript
class FSRSScheduler {
  constructor(private config: FSRSConfig) {}

  /**
   * Calculate next review schedule for a card
   */
  review(card: Card, rating: Rating, now: Date): ScheduledCard {
    const elapsedDays = card.lastReview
      ? (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24)
      : 0;

    // Calculate retrievability
    const retrievability = card.stability
      ? Math.pow(1 + (elapsedDays / (9 * card.stability)), -1)
      : 0;

    // Calculate new difficulty
    const newDifficulty = this.calculateDifficulty(
      card.difficulty || this.config.parameters[5],
      rating,
      retrievability
    );

    // Calculate new stability
    const newStability = this.calculateStability(
      card.state,
      card.stability,
      newDifficulty,
      rating,
      retrievability
    );

    // Calculate interval
    const interval = this.calculateInterval(newStability);
    const fuzzedInterval = this.config.enableFuzz
      ? this.applyFuzz(interval)
      : interval;

    // Calculate due date
    const dueDate = new Date(now.getTime() + fuzzedInterval * 24 * 60 * 60 * 1000);

    // Determine new state
    const newState = this.calculateState(card.state, rating);

    return {
      ...card,
      state: newState,
      difficulty: newDifficulty,
      stability: newStability,
      due: dueDate,
      lastReview: now,
    };
  }

  private calculateInterval(stability: number): number {
    // Interval where retrievability reaches the target retention
    return stability * Math.log(this.config.requestRetention) / Math.log(0.9);
  }
}
```

---

## Firebase/Firestore Structure

### Overview

The web app uses **Firebase Firestore** as its database, organized to match the mobile app's structure for seamless synchronization.

### Collection Hierarchy

```
firestore
│
├── flashcards
│   └── {userId}
│       └── data
│           └── main
│               ├── decks (collection)
│               │   └── {deckId} (document)
│               │       ├── deck_id: string
│               │       ├── title: string
│               │       ├── description: string
│               │       ├── created_at: timestamp
│               │       ├── updated_at: timestamp
│               │       └── is_deleted: boolean
│               │
│               ├── cards (collection)
│               │   └── {cardId} (document)
│               │       ├── card_id: string
│               │       ├── deck_id: string
│               │       ├── template_id: string
│               │       ├── template_version: number
│               │       ├── blocks_snapshot: array
│               │       ├── values: array
│               │       ├── main_block_id: string?
│               │       ├── sub_block_id: string?
│               │       ├── source: object?
│               │       ├── created_at: timestamp
│               │       ├── updated_at: timestamp
│               │       ├── is_deleted: boolean
│               │       │
│               │       └── SRS Fields:
│               │           ├── srs_state: number (1-3)
│               │           ├── srs_step: number
│               │           ├── srs_stability: number?
│               │           ├── srs_difficulty: number?
│               │           ├── srs_due: number (timestamp ms)
│               │           ├── srs_last_review: number? (timestamp ms)
│               │           └── review_count: number
│               │
│               └── templates (collection)
│                   └── {templateId} (document)
│                       ├── template_id: string
│                       ├── name: string
│                       ├── description: string
│                       ├── version: number
│                       ├── blocks: array
│                       ├── rendering: object?
│                       ├── main_block_id: string?
│                       ├── sub_block_id: string?
│                       ├── created_at: timestamp
│                       ├── updated_at: timestamp
│                       └── is_deleted: boolean
│
└── users
    └── {userId}
        ├── profile (document)
        │   ├── email: string
        │   ├── display_name: string
        │   ├── created_at: timestamp
        │   └── ...
        │
        └── media (collection)
            └── {mediaId} (document)
                ├── media_id: string
                ├── storage_path: string
                ├── download_url: string
                ├── type: string ("image" | "audio")
                ├── file_size: number
                ├── mime_type: string
                ├── created_at: timestamp
                ├── updated_at: timestamp
                └── is_deleted: boolean
```

### Path Helpers

```typescript
// Firestore path construction
const getUserDataPath = (uid: string) =>
  `flashcards/${uid}/data/main`;

const getDecksCollection = (uid: string) =>
  collection(db, getUserDataPath(uid), "decks");

const getCardsCollection = (uid: string) =>
  collection(db, getUserDataPath(uid), "cards");

const getTemplatesCollection = (uid: string) =>
  collection(db, getUserDataPath(uid), "templates");

const getMediaCollection = (uid: string) =>
  collection(db, "users", uid, "media");
```

### Data Transformation

**Firestore uses snake_case, JavaScript uses camelCase**

#### Card Document (Firestore)

```typescript
{
  card_id: "uuid-123",
  deck_id: "uuid-456",
  template_id: "uuid-789",
  template_version: 1,
  blocks_snapshot: [
    {
      block_id: "uuid-abc",
      type: 0,  // BlockType enum as number
      label: "Word",
      required: true,
      config_json: "{\"maxLength\":80}"
    }
  ],
  values: [
    {
      block_id: "uuid-abc",
      type: 0,
      text: "hello",
      items: null,
      media_ids: null,
      correct_answers: null
    }
  ],
  main_block_id: "uuid-abc",
  sub_block_id: "uuid-def",
  created_at: Timestamp,
  updated_at: Timestamp,
  is_deleted: false,

  // SRS fields
  srs_state: 1,
  srs_step: 0,
  srs_stability: 3.5,
  srs_difficulty: 5.2,
  srs_due: 1707408000000,
  srs_last_review: 1707321600000,
  review_count: 5
}
```

#### Card Object (JavaScript)

```typescript
{
  cardId: "uuid-123",
  deckId: "uuid-456",
  templateId: "uuid-789",
  templateVersion: 1,
  blocksSnapshot: [
    {
      blockId: "uuid-abc",
      type: 0,
      label: "Word",
      required: true,
      configJson: "{\"maxLength\":80}"
    }
  ],
  values: [
    {
      blockId: "uuid-abc",
      type: 0,
      text: "hello",
      items: null,
      mediaIds: null,
      correctAnswers: null
    }
  ],
  mainBlockId: "uuid-abc",
  subBlockId: "uuid-def",
  createdAt: 1707321600000,  // Converted to milliseconds
  updatedAt: 1707408000000,
  isDeleted: false,

  // SRS fields
  srsState: 1,
  srsStep: 0,
  srsStability: 3.5,
  srsDifficulty: 5.2,
  srsDue: 1707408000000,
  srsLastReview: 1707321600000,
  reviewCount: 5
}
```

### SRS Fields Detail

| Field | Type | Description | Initial Value |
|-------|------|-------------|---------------|
| `srs_state` | number | Learning state (1=Learning, 2=Review, 3=Relearning) | 1 |
| `srs_step` | number | Current step in learning/relearning | 0 |
| `srs_stability` | number? | Memory stability in days | null (calculated on first review) |
| `srs_difficulty` | number? | Card difficulty (1.0-10.0) | null (calculated on first review) |
| `srs_due` | number | Next review timestamp (ms) | Current time |
| `srs_last_review` | number? | Last review timestamp (ms) | null |
| `review_count` | number | Total number of reviews | 0 |

### Block Type Enum Mapping

```typescript
export const BlockType = {
  header1: 0,
  header2: 1,
  header3: 2,
  text: 3,
  quote: 4,
  hiddenText: 5,
  image: 6,
  audio: 7,
  quizMultiSelect: 8,
  quizSingleSelect: 9,
  quizTextAnswer: 10,
  divider: 11,
  space: 12,
};
```

**Important:** Block types are stored as numbers in Firestore to match the mobile app's enum serialization.

### Querying Cards for Study

```typescript
/**
 * Get cards due for review
 */
async function getDueCards(uid: string, deckId: string): Promise<Card[]> {
  const now = Date.now();

  const q = query(
    getCardsCollection(uid),
    where("deck_id", "==", deckId),
    where("is_deleted", "==", false),
    where("srs_due", "<=", now),
    orderBy("srs_due", "asc"),
    limit(20)  // Study session size
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => transformCardFromFirestore(doc.data()));
}

/**
 * Get all cards in a deck (for custom study)
 */
async function getAllCards(uid: string, deckId: string): Promise<Card[]> {
  const q = query(
    getCardsCollection(uid),
    where("deck_id", "==", deckId),
    where("is_deleted", "==", false),
    orderBy("created_at", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => transformCardFromFirestore(doc.data()));
}
```

### Updating Card After Review

```typescript
/**
 * Update card with new SRS values after review
 */
async function updateCardAfterReview(
  uid: string,
  cardId: string,
  updates: {
    srsState: number;
    srsStep: number;
    srsStability: number;
    srsDifficulty: number;
    srsDue: number;
    srsLastReview: number;
    reviewCount: number;
  }
): Promise<void> {
  const cardRef = doc(getCardsCollection(uid), cardId);

  await setDoc(cardRef, {
    srs_state: updates.srsState,
    srs_step: updates.srsStep,
    srs_stability: updates.srsStability,
    srs_difficulty: updates.srsDifficulty,
    srs_due: updates.srsDue,
    srs_last_review: updates.srsLastReview,
    review_count: updates.reviewCount,
    updated_at: Timestamp.now(),
  }, { merge: true });
}
```

### Firebase Storage for Media

**Structure:**
```
gs://your-bucket/
└── users/
    └── {userId}/
        └── media/
            ├── {mediaId}.jpg
            ├── {mediaId}.png
            ├── {mediaId}.mp3
            └── ...
```

**Upload Process:**
1. Upload file to Storage: `users/{userId}/media/{mediaId}.{extension}`
2. Get download URL
3. Create media document in Firestore with URL
4. Reference media in card values via `media_ids` array

---

## Integration Checklist

### Backend Requirements

- [ ] Implement FSRS algorithm (port from Dart or use existing JS library)
- [ ] Create API endpoint for card review
- [ ] Calculate next intervals on review
- [ ] Update card SRS fields in Firestore
- [ ] Query cards by due date
- [ ] Handle state transitions correctly

### Frontend Requirements

- [ ] Display SRS info bar (state, due time, review count)
- [ ] Show interval previews on rating buttons
- [ ] Implement review flow with answer reveal
- [ ] Update local state after review
- [ ] Sync with Firestore
- [ ] Handle offline scenarios

### Testing

- [ ] Verify FSRS calculations match mobile app
- [ ] Test state transitions for all rating combinations
- [ ] Validate data sync between web and mobile
- [ ] Test with various interval ranges
- [ ] Verify fuzz factor application

---

## References

- **FSRS Algorithm**: https://github.com/open-spaced-repetition/fsrs4anki
- **FSRS Paper**: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
- **Mobile Implementation**: `deckbase-mobile/lib/core/utils/fsrs.dart`
- **Firestore Utility**: `deckbase-web/utils/firestore.js`
- **Firebase Config**: `deckbase-web/utils/firebase.js`

---

**Document Version:** 1.0
**Last Updated:** 2026-02-08
**Author:** Based on Deckbase Mobile & Web implementations
