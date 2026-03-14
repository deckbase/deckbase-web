# Deck Study Mode - Web Application Documentation

## Overview

This document provides comprehensive documentation for implementing the deck study mode in the web application, based on the current mobile app implementation. The study mode is a spaced repetition learning system that uses the FSRS (Free Spaced Repetition Scheduler) algorithm for optimal card scheduling.

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Study Session Architecture](#study-session-architecture)
3. [Features](#features)
4. [Block Types](#block-types)
5. [FSRS Integration](#fsrs-integration)
6. [UI Components](#ui-components)
7. [User Flow](#user-flow)
8. [API Requirements](#api-requirements)
9. [Implementation Guide](#implementation-guide)

---

## Core Concepts

### What is Study Mode?

Study mode is a flashcard review system that presents cards from a deck to the user for learning and memorization. It implements spaced repetition using the FSRS algorithm to optimize learning efficiency.

### Key Terminology

- **Card**: A flashcard containing content blocks (text, images, quizzes, etc.)
- **Deck**: A collection of cards grouped together
- **Block**: A content element within a card (header, text, image, quiz, etc.)
- **SRS (Spaced Repetition System)**: Algorithm that determines when to show a card next
- **Review**: The act of rating a card during a study session
- **Rating**: User's self-assessment of how well they knew the answer (Again, Hard, Good, Easy)

---

## Study Session Architecture

### Component Structure

```
StudySessionPage
├── AppBar (Header with progress)
├── LinearProgressIndicator (Visual progress)
├── FlashcardView (Card display)
│   ├── SRS Info Bar (Learning state, due time, review count)
│   └── Block Renderers (Dynamic content)
└── RatingButtons (Again, Hard, Good, Easy)
```

### State Management

The study session maintains several pieces of state:

```typescript
interface StudySessionState {
  cards: CardEntity[];           // All cards in session
  currentIndex: number;           // Current card position
  showAnswer: boolean;            // Whether answer is revealed
  reviewedCount: number;          // Number of cards reviewed
  cardShownAt: DateTime;          // Timestamp when card was shown
}
```

### Card Entity Structure

```typescript
interface CardEntity {
  cardId: string;
  deckId: string;
  templateId: string;
  templateVersion: number;
  blocksSnapshot: TemplateBlockEmbedded[];
  values: BlockValueEmbedded[];
  mainBlockId?: string;           // Main text for card preview
  subBlockId?: string;            // Subtitle for card preview

  // SRS fields
  srsState: number;               // 1=Learning, 2=Review, 3=Relearning
  srsStep: number;
  srsStability?: number;
  srsDifficulty?: number;
  srsDue: number;                 // Unix timestamp (ms)
  srsLastReview?: number;         // Unix timestamp (ms)
  reviewCount: number;            // Total number of reviews

  createdAt: number;
  updatedAt: number;
}
```

---

## Features

### 1. Progress Tracking

**Visual Elements:**
- Progress bar showing percentage completion
- Text counter: "X / Y" (current/total)
- Session completion modal with statistics

**Implementation:**
```typescript
const progress = (currentIndex + 1) / totalCards;
const progressText = `${currentIndex + 1} / ${totalCards}`;
```

### 2. Card Display

**Flashcard View renders:**
- SRS information bar (state, due time, review count)
- All content blocks in order
- Interactive elements (quizzes, hidden text)
- Media elements (images, audio)

### 3. Answer Reveal Logic

**Behavior:**
- If card has revealable blocks (quiz or hidden text):
  - First rating button press → reveals answer (800ms delay)
  - Second rating button press → records rating
- If card has no revealable blocks:
  - Rating button press immediately records rating

**Revealable Block Types:**
- `quizSingleSelect`
- `quizMultiSelect`
- `quizTextAnswer`
- `hiddenText`

### 4. Rating System

Four rating buttons with preview intervals:

| Rating | Emoji | Label   | Color  | Description |
|--------|-------|---------|--------|-------------|
| Again  | 😵    | Nope    | Red    | Completely forgot |
| Hard   | 😬    | Uhh…    | Orange | Difficult to recall |
| Good   | 😎    | Got it  | Green  | Correct with effort |
| Easy   | 🚀    | Easy    | Blue   | Perfect recall |

**Interval Preview:**
Each button shows the next review interval (e.g., "2d", "5h", "30m")

### 5. Session Completion

**Completion Modal:**
- Celebration icon (🎉)
- Summary: "You reviewed X cards"
- Two actions:
  - "Study Again" - Restart session with same cards
  - "Done" - Exit to deck view

### 6. Review Duration Tracking

Each card review tracks:
- Time when card was shown
- Time when rating was given
- Duration stored in database for analytics

---

## Block Types

### Content Blocks

#### 1. Header Blocks

**Types:**
- `header1` - Largest heading
- `header2` - Medium heading
- `header3` - Smallest heading

**Configuration:**
```json
{
  "maxLength": 80
}
```

#### 2. Text Blocks

**Types:**
- `text` - Standard text content
- `quote` - Styled quote with border/background

**Configuration:**
```json
{
  "multiline": true,
  "appendMode": "newline"
}
```

#### 3. Hidden Text Block

**Type:** `hiddenText`

**Behavior:**
- Initially shows "Tap to reveal" placeholder
- User can tap to reveal/hide content
- Auto-reveals when answer is shown
- Visual styling: teal border when revealed

**Configuration:**
```json
{
  "multiline": true
}
```

### Media Blocks

#### 4. Image Block

**Type:** `image`

**Features:**
- Supports multiple images
- Two layout modes: horizontal (carousel), vertical (stacked)
- Image carousel with dot indicators
- Fallback for missing/error images

**Configuration:**
```json
{
  "maxItems": 4,
  "imageLayout": "horizontal"
}
```

**Layouts:**
- `horizontal`: Carousel with pagination dots
- `vertical`: Stacked images

#### 5. Audio Block

**Type:** `audio`

**Features:**
- Play/pause controls
- Progress bar
- Time display (current / duration)
- Auto-play option
- Supports multiple audio files

**Configuration:**
```json
{
  "maxItems": 4,
  "autoPlay": false
}
```

### Quiz Blocks

#### 6. Single Select Quiz

**Type:** `quizSingleSelect`

**Features:**
- Multiple choice (select one)
- Optional hint (collapsible)
- Answer validation
- Visual feedback (checkmark for correct, X for wrong)

**Configuration:**
```json
{
  "question": "What is the capital of France?",
  "options": ["London", "Paris", "Berlin", "Madrid"],
  "correctAnswer": "Paris",
  "hint": "It's known as the City of Light",
  "isQuiz": true
}
```

**Alternative (index-based):**
```json
{
  "question": "What is the capital of France?",
  "options": ["London", "Paris", "Berlin", "Madrid"],
  "correctAnswerIndex": 1,
  "hint": "It's known as the City of Light",
  "isQuiz": true
}
```

#### 7. Multi-Select Quiz

**Type:** `quizMultiSelect`

**Features:**
- Multiple choice (select multiple)
- Checkbox interface
- Answer validation
- Visual feedback for each option

**Configuration:**
```json
{
  "question": "Which of these are programming languages?",
  "options": ["Python", "HTML", "JavaScript", "CSS"],
  "correctAnswers": ["Python", "JavaScript"],
  "hint": "Think about what can execute logic",
  "isQuiz": true
}
```

**Alternative (index-based):**
```json
{
  "question": "Which of these are programming languages?",
  "options": ["Python", "HTML", "JavaScript", "CSS"],
  "correctAnswerIndices": [0, 2],
  "hint": "Think about what can execute logic",
  "isQuiz": true
}
```

#### 8. Text Answer Quiz

**Type:** `quizTextAnswer`

**Features:**
- Text input field
- Case-sensitive option
- Exact match validation
- Shows correct answer if wrong

**Configuration:**
```json
{
  "question": "What is 2 + 2?",
  "correctAnswer": "4",
  "caseSensitive": false,
  "hint": "It's less than 5",
  "isQuiz": true
}
```

### Layout Blocks

#### 9. Divider

**Type:** `divider`

Renders a horizontal line separator.

#### 10. Space

**Type:** `space`

Adds vertical spacing.

**Configuration:**
```json
{
  "height": 16
}
```

---

## FSRS Integration

### Algorithm Overview

FSRS (Free Spaced Repetition Scheduler) is a modern spaced repetition algorithm that optimizes review intervals based on:
- Card difficulty
- Stability (memory strength)
- Review history
- Rating pattern

### SRS States

```typescript
enum SRSState {
  New = 0,         // Never reviewed
  Learning = 1,    // Currently learning
  Review = 2,      // In review phase
  Relearning = 3   // Relearning after forgetting
}
```

### Rating Enum

```typescript
enum Rating {
  Again = 1,  // Forgot, need to review soon
  Hard = 2,   // Difficult recall
  Good = 3,   // Correct recall
  Easy = 4    // Perfect recall
}
```

### Review Process

1. **Display Card**: Show current card with SRS info
2. **User Reviews**: User rates their recall
3. **FSRS Calculation**: Calculate next review time
   - Updates stability
   - Updates difficulty
   - Calculates due date
   - Increments review count
4. **Persist**: Save updated card state
5. **Next Card**: Move to next card or complete session

### Scheduler Configuration

```typescript
interface SchedulerConfig {
  parameters: number[];        // 21 FSRS parameters
  requestRetention: number;    // Target retention (default 0.9)
  maximumInterval: number;     // Max days between reviews
  enableFuzz: boolean;         // Add randomness to intervals
}
```

### Default Parameters

```typescript
const defaultParameters = [
  0.2172, 1.1771, 3.2602, 16.1507, 7.0114,
  0.57, 2.0966, 0.0069, 1.5261, 0.112,
  1.0178, 1.849, 0.1133, 0.3127, 2.2934,
  0.2191, 3.0004, 0.7536, 0.3332, 0.1437, 0.2
];
```

### Interval Formatting

Display intervals in human-readable format:
- Less than 1 hour: "&lt;1m"
- Less than 24 hours: "Xh" (e.g., "5h")
- Less than 30 days: "Xd" (e.g., "7d")
- 30+ days: "Xmo" (e.g., "2mo")

```typescript
function formatInterval(duration: Duration): string {
  if (duration.days > 0) return `${duration.days}d`;
  if (duration.hours > 0) return `${duration.hours}h`;
  if (duration.minutes > 0) return `${duration.minutes}m`;
  return '<1m';
}
```

---

## UI Components

### 1. Study Session Page

**Header (AppBar):**
- Title: Deck name or "Study Session"
- Progress indicator: "X / Y" cards

**Body:**
- Linear progress bar
- Flashcard view (main content)
- Rating buttons (bottom)

**Layout:**
```
┌─────────────────────────────────┐
│  ← Deck Name          5 / 20    │ ← AppBar
├─────────────────────────────────┤
│ ████████░░░░░░░░░░░░░░          │ ← Progress Bar
├─────────────────────────────────┤
│                                 │
│    [Flashcard Content]          │
│                                 │
│    - SRS Info Bar               │
│    - Block Content              │
│    - Images/Audio/Quizzes       │
│                                 │
│                                 │
├─────────────────────────────────┤
│ [😵][😬][😎][🚀]               │ ← Rating Buttons
│ Nope Uhh Got it Easy            │
│  <1m  2h   5d   30d             │ ← Intervals
└─────────────────────────────────┘
```

### 2. Flashcard View

**SRS Info Bar:**
```
┌─────────────────────────────────┐
│ [Learning]        Due in 2h     │
│ 5 reviews • 1d ago              │
└─────────────────────────────────┘
```

**Components:**
- State chip (Learning/Review/Relearning)
- Due time chip
- Review count
- Last review time

**Styling:**
- Learning: Blue
- Review: Green
- Relearning: Orange
- New: Grey

### 3. Rating Buttons

**Layout:** Four equal-width buttons in a row

**Button Structure:**
```
┌──────────┐
│    😵    │ ← Emoji
│   Nope   │ ← Label
│   <1m    │ ← Interval preview
└──────────┘
```

**Colors (with alpha 0.1 background):**
- Again: Red
- Hard: Orange
- Good: Green
- Easy: Blue (tertiary color)

### 4. Completion Modal

**Bottom Sheet:**
```
┌─────────────────────────────────┐
│                                 │
│           🎉                    │
│                                 │
│     Session Complete!           │
│   You reviewed 20 cards.        │
│                                 │
│  [Study Again]    [Done]        │
│                                 │
└─────────────────────────────────┘
```

**Actions:**
- Study Again: Reset index, restart session
- Done: Close modal, navigate back to deck

---

## User Flow

### Starting a Study Session

```
Deck Detail Page
    ↓
[Study Button]
    ↓
Study Session Page
    ↓
Load cards + FSRS scheduler
    ↓
Show first card
```

### Reviewing a Card

```
Card Displayed
    ↓
User reads content
    ↓
[Has revealable blocks?]
    ├─ YES → User clicks rating
    │         ↓
    │    Show answer (800ms delay)
    │         ↓
    │    User clicks rating again
    │         ↓
    │    Record rating
    │
    └─ NO → User clicks rating
             ↓
        Record rating immediately
             ↓
        Update FSRS values
             ↓
        Save to database
             ↓
    [More cards?]
        ├─ YES → Show next card
        └─ NO → Show completion modal
```

### Session Completion

```
All cards reviewed
    ↓
Show completion modal
    ↓
User chooses action:
    ├─ Study Again → Reset session, go to first card
    └─ Done → Close modal, return to deck
```

---

## API Requirements

### 1. Get Cards for Study

**Endpoint:** `GET /api/decks/{deckId}/cards`

**Query Parameters:**
- `dueOnly` - Filter to only due cards (optional)
- `limit` - Maximum number of cards (optional)

**Response:**
```typescript
interface GetCardsResponse {
  cards: CardEntity[];
}
```

### 2. Review Card

**Endpoint:** `POST /api/cards/{cardId}/review`

**Request Body:**
```typescript
interface ReviewCardRequest {
  rating: 1 | 2 | 3 | 4;        // Again, Hard, Good, Easy
  reviewDurationMs?: number;     // Time spent reviewing
  schedulerConfig?: {            // Optional custom config
    parameters: number[];
    requestRetention: number;
    maximumInterval: number;
  };
}
```

**Response:**
```typescript
interface ReviewCardResponse {
  card: CardEntity;              // Updated card with new SRS values
  nextReviewDate: number;        // Unix timestamp (ms)
}
```

**Updates Performed:**
- Calculate new stability and difficulty
- Update `srsState`, `srsStep`
- Set `srsDue` (next review time)
- Update `srsLastReview` (current time)
- Increment `reviewCount`
- Update `updatedAt` timestamp

### 3. Get FSRS Scheduler Config

**Endpoint:** `GET /api/users/{userId}/scheduler-config`

**Response:**
```typescript
interface SchedulerConfig {
  parameters: number[];
  requestRetention: number;
  maximumInterval: number;
  enableFuzz: boolean;
}
```

---

## Implementation Guide

### Phase 1: Basic Study Session

1. **Create Study Session Component**
   - Session state management
   - Card navigation
   - Progress tracking

2. **Implement Basic Card Display**
   - Render text blocks
   - Render headers
   - Basic layout

3. **Add Rating Buttons**
   - Four rating options
   - Click handlers
   - Basic navigation

4. **Completion Modal**
   - Session statistics
   - Action buttons

### Phase 2: Block Renderers

1. **Text Content Blocks**
   - Headers (h1, h2, h3)
   - Text
   - Quote (with styling)
   - Hidden text (with reveal)

2. **Layout Blocks**
   - Divider
   - Space

### Phase 3: Media Blocks

1. **Image Block**
   - Single image display
   - Multiple images (carousel)
   - Vertical layout option
   - Error handling

2. **Audio Block**
   - Audio player controls
   - Progress bar
   - Auto-play option

### Phase 4: Quiz Blocks

1. **Single Select Quiz**
   - Radio button interface
   - Answer validation
   - Visual feedback
   - Hint toggle

2. **Multi-Select Quiz**
   - Checkbox interface
   - Multiple answer validation
   - Visual feedback

3. **Text Answer Quiz**
   - Text input
   - Validation
   - Case sensitivity
   - Show correct answer

### Phase 5: FSRS Integration

1. **Implement FSRS Algorithm**
   - Port Dart FSRS implementation to TypeScript/JavaScript
   - Configure scheduler
   - Calculate intervals

2. **SRS Info Display**
   - State chip
   - Due time
   - Review statistics

3. **Rating with Intervals**
   - Show preview intervals
   - Update card on rating
   - Persist to database

4. **Review History Tracking**
   - Duration tracking
   - Analytics support

### Phase 6: Polish & UX

1. **Animations**
   - Card transitions
   - Answer reveal animation
   - Progress bar animation

2. **Keyboard Shortcuts**
   - Number keys for ratings (1-4)
   - Space to reveal answer
   - Arrow keys for navigation

3. **Accessibility**
   - ARIA labels
   - Keyboard navigation
   - Screen reader support

4. **Responsive Design**
   - Mobile layout
   - Tablet layout
   - Desktop layout

---

## Technical Considerations

### State Management

**Recommended approach:**
- Use React Context or Redux for session state
- Local component state for UI interactions
- Persistent storage for card updates

### Performance

**Optimization strategies:**
- Lazy load media content
- Preload next card
- Debounce rating clicks
- Optimize re-renders

### Error Handling

**Scenarios to handle:**
- Failed card loads
- Missing media files
- Network errors during review submission
- Corrupted card data

### Offline Support

**Considerations:**
- Cache cards locally
- Queue rating actions
- Sync when online
- Conflict resolution

---

## Testing Checklist

### Unit Tests
- [ ] FSRS calculations
- [ ] Interval formatting
- [ ] Block rendering logic
- [ ] State updates

### Integration Tests
- [ ] Full study session flow
- [ ] Rating submission
- [ ] Progress tracking
- [ ] Completion modal

### E2E Tests
- [ ] Start study session
- [ ] Review multiple cards
- [ ] Complete session
- [ ] Study again functionality

### UI/UX Tests
- [ ] Responsive layouts
- [ ] Keyboard navigation
- [ ] Accessibility
- [ ] Cross-browser compatibility

---

## Future Enhancements

### Planned Features
1. **Study Statistics Dashboard**
   - Daily review count
   - Retention rate
   - Time spent studying
   - Streak tracking

2. **Custom Study Options**
   - Filter by due date
   - Randomize card order
   - Focus on difficult cards
   - Time-limited sessions

3. **Study Modes**
   - Quick review (show both sides)
   - Cram mode (no SRS updates)
   - Practice mode (specific tags)

4. **Social Features**
   - Shared study sessions
   - Leaderboards
   - Study groups

5. **Advanced FSRS**
   - Custom parameters per deck
   - A/B testing different configs
   - Machine learning optimization

---

## References

- [FSRS Algorithm](https://github.com/open-spaced-repetition/fsrs4anki/wiki)
- Mobile App Source: `lib/features/flashcard/presentation/pages/study_session_page.dart`
- Flashcard View: `lib/features/flashcard/presentation/widgets/flashcard_view.dart`
- FSRS Implementation: `lib/core/utils/fsrs.dart`

---

## Appendix: Code Examples

### Example: Rating Button Component (React)

```jsx
function RatingButton({ rating, emoji, label, interval, color, onRate }) {
  return (
    <button
      onClick={() => onRate(rating)}
      style={{
        backgroundColor: `${color}1A`, // 10% opacity
        border: `1px solid ${color}`,
        borderRadius: '12px',
        padding: '10px 4px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        flex: 1,
      }}
    >
      <span style={{ fontSize: '20px' }}>{emoji}</span>
      <span style={{ fontSize: '12px', fontWeight: 600, color }}>
        {label}
      </span>
      {interval && (
        <span style={{ fontSize: '10px', color: `${color}B3` }}>
          {formatInterval(interval)}
        </span>
      )}
    </button>
  );
}
```

### Example: Study Session Hook (React)

```typescript
function useStudySession(deckId: string) {
  const [cards, setCards] = useState<CardEntity[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [cardShownAt, setCardShownAt] = useState<Date>(new Date());

  const currentCard = cards[currentIndex];
  const hasRevealableBlocks = useMemo(() => {
    return currentCard?.blocksSnapshot.some(block =>
      ['quizSingleSelect', 'quizMultiSelect', 'quizTextAnswer', 'hiddenText']
        .includes(block.type)
    );
  }, [currentCard]);

  async function rateCard(rating: Rating) {
    if (!showAnswer && hasRevealableBlocks) {
      setShowAnswer(true);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    const reviewDurationMs = Date.now() - cardShownAt.getTime();
    const updatedCard = await reviewCardAPI(currentCard.cardId, {
      rating,
      reviewDurationMs,
    });

    setCards(prev => {
      const updated = [...prev];
      updated[currentIndex] = updatedCard;
      return updated;
    });

    setReviewedCount(prev => prev + 1);

    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
      setCardShownAt(new Date());
    } else {
      // Show completion modal
    }
  }

  return {
    cards,
    currentCard,
    currentIndex,
    showAnswer,
    reviewedCount,
    progress: (currentIndex + 1) / cards.length,
    rateCard,
  };
}
```

---

## Document Version

- **Version:** 1.0
- **Last Updated:** 2026-02-08
- **Based on:** Deckbase Mobile App (Flutter/Dart)
- **Target Platform:** Web Application (React/TypeScript recommended)
