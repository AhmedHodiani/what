# FSRS Plugin - Complete API Reference

Comprehensive reference for all types, classes, functions, and interfaces.

## Table of Contents

1. [Core Types](#core-types)
2. [Enums](#enums)
3. [Interfaces](#interfaces)
4. [Classes](#classes)
5. [React Hook](#react-hook)
6. [Utility Functions](#utility-functions)
7. [Constants](#constants)

---

## Core Types

### `Card`

Represents a single flashcard with all scheduling metadata.

```typescript
interface Card {
  // Identity
  id: string;                    // Unique card identifier
  noteId: string;                // Parent note ID (for multi-sided cards)
  deckId: string;                // Deck this card belongs to
  templateIdx: number;           // Template index (0 for basic cards)
  
  // Timestamps
  mtime: number;                 // Last modification time (Unix timestamp)
  
  // State
  ctype: CardType;               // Current type (New/Learn/Review/Relearn)
  queue: CardQueue;              // Current queue position
  due: number;                   // When card is due (meaning varies by queue)
  
  // Scheduling
  interval: number;              // Current interval in days
  easeFactor: number;            // Ease factor (1.3-4.0, default 2.5)
  reps: number;                  // Total number of reviews
  lapses: number;                // Number of times failed
  remainingSteps: number;        // Learning steps remaining
  
  // FSRS
  memoryState: FsrsMemoryState | null;  // FSRS memory tracking
  desiredRetention: number | null;      // Target retention rate (0.0-1.0)
  
  // Content
  front: string;                 // Question/prompt text
  back: string;                  // Answer text
  customData: string;            // JSON string for app-specific data
}
```

**Usage:**
```typescript
const card: Card = fsrs.getCard('card-123');
console.log(`Interval: ${card.interval} days, Ease: ${card.easeFactor}`);
```

---

### `Deck`

Represents a collection of cards.

```typescript
interface Deck {
  id: string;                    // Unique deck identifier
  name: string;                  // Display name (e.g., "Spanish Vocabulary")
  configId: string;              // Reference to deck configuration
  description: string;           // Optional deck description
  parentId: string | null;       // Parent deck ID for nested decks
  collapsed: boolean;            // UI collapse state
}
```

**Usage:**
```typescript
const deck = fsrs.createDeck('My Deck');
console.log(deck.name); // "My Deck"
```

---

### `DeckConfig`

Configuration for deck scheduling behavior.

```typescript
interface DeckConfig {
  // Identity
  id: string;
  name: string;
  
  // Learning
  learnSteps: number[];          // Learning steps in minutes (e.g., [1, 10])
  relearnSteps: number[];        // Relearning steps after failure
  graduatingIntervalGood: number; // Days for "good" graduation
  graduatingIntervalEasy: number; // Days for "easy" graduation
  
  // Daily limits
  newPerDay: number;             // Max new cards per day
  reviewsPerDay: number;         // Max reviews per day
  
  // Ease factors
  initialEase: number;           // Starting ease (default 2.5)
  easyMultiplier: number;        // Multiplier for "easy" (default 1.3)
  hardMultiplier: number;        // Multiplier for "hard" (default 1.2)
  lapseMultiplier: number;       // Multiplier after failure (default 0.5)
  intervalMultiplier: number;    // Global interval multiplier (default 1.0)
  
  // Interval limits
  maximumReviewInterval: number; // Max days between reviews (default 36500)
  minimumLapseInterval: number;  // Min days after failure (default 1)
  
  // Leech detection
  leechThreshold: number;        // Lapses before marking as leech (default 8)
  
  // FSRS
  fsrsParams: number[];          // 19 FSRS parameters
  desiredRetention: number;      // Target retention rate (default 0.9)
}
```

**Usage:**
```typescript
const config = fsrs.createConfig('Custom', {
  learnSteps: [1, 10, 1440],     // 1m, 10m, 1 day
  newPerDay: 50,
  desiredRetention: 0.85,
});
```

---

## Enums

### `CardType`

Card lifecycle stages.

```typescript
enum CardType {
  New = 0,       // Brand new, never studied
  Learn = 1,     // In learning phase
  Review = 2,    // Graduated to review
  Relearn = 3,   // Failed and relearning
}
```

---

### `CardQueue`

Where the card appears in study queue.

```typescript
enum CardQueue {
  New = 0,            // New cards queue
  Learn = 1,          // Learning (intraday)
  Review = 2,         // Review queue
  DayLearn = 3,       // Learning (next day)
  PreviewRepeat = 4,  // Preview mode (filtered decks)
  Suspended = -1,     // Suspended by user
  SchedBuried = -2,   // Buried by scheduler
  UserBuried = -3,    // Buried by user
}
```

---

### `Rating`

Answer quality ratings.

```typescript
enum Rating {
  Again = 1,  // Forgot - start over
  Hard = 2,   // Difficult - shorter interval
  Good = 3,   // Normal - standard interval
  Easy = 4,   // Easy - longer interval
}
```

**Usage:**
```typescript
// User answered correctly
fsrs.answerCard(card.id, Rating.Good);

// User struggled but got it
fsrs.answerCard(card.id, Rating.Hard);
```

---

## Interfaces

### `FsrsMemoryState`

FSRS algorithm memory tracking.

```typescript
interface FsrsMemoryState {
  stability: number;    // Memory stability in days
  difficulty: number;   // Inherent difficulty (1.0-10.0)
}
```

**Explanation:**
- **Stability**: How long the memory will last. Higher = more stable memory.
- **Difficulty**: How hard the card is. Lower = easier, higher = harder.

---

### `StudySession`

Active study session state.

```typescript
interface StudySession {
  deckId: string;              // Deck being studied
  currentCard: Card | null;    // Current card (null if done)
  counts: CardCounts;          // New/learning/review counts
  reviewed: number;            // Cards reviewed this session
  startTime: number;           // Session start timestamp
}
```

---

### `CardCounts`

Card count breakdown.

```typescript
interface CardCounts {
  new: number;       // New cards due
  learning: number;  // Cards in learning
  review: number;    // Review cards due
}
```

**Usage:**
```typescript
const counts = fsrs.getCounts(deckId);
console.log(`${counts.new} new, ${counts.review} reviews`);
```

---

### `ReviewLog`

Record of a single review.

```typescript
interface ReviewLog {
  id: string;           // Unique log ID
  cardId: string;       // Card that was reviewed
  timestamp: number;    // When review happened
  rating: Rating;       // Rating given
  timeTaken: number;    // Milliseconds to answer
  cardType: CardType;   // Card type at review time
  lastInterval: number; // Interval before review
  newInterval: number;  // Interval after review
  easeFactor: number;   // Ease factor after review
}
```

---

## Classes

### `FsrsScheduler`

Core FSRS algorithm implementation.

#### Constructor

```typescript
constructor(params?: number[])
```

Creates a new scheduler with optional custom FSRS parameters.

**Example:**
```typescript
const scheduler = new FsrsScheduler();
// Or with custom params:
const customScheduler = new FsrsScheduler(myCustomParams);
```

#### Methods

##### `nextInterval()`

Calculate next review interval.

```typescript
nextInterval(
  stability: number | null,
  desiredRetention: number,
  daysElapsed?: number
): number
```

**Parameters:**
- `stability`: Current memory stability in days (null for new cards)
- `desiredRetention`: Target retention rate (0.0-1.0, typically 0.9)
- `daysElapsed`: Days since last review (default 0)

**Returns:** Next interval in days

**Example:**
```typescript
const interval = scheduler.nextInterval(14.5, 0.9, 7);
console.log(`Next review in ${interval} days`);
```

##### `nextStates()`

Calculate all possible next states.

```typescript
nextStates(
  currentMemoryState: FsrsMemoryState | null,
  desiredRetention: number,
  daysElapsed: number
): FsrsNextStates
```

**Returns:** Object with `again`, `hard`, `good`, `easy` states

**Example:**
```typescript
const states = scheduler.nextStates(card.memoryState, 0.9, 7);
console.log(`If Good: ${states.good.interval} days`);
console.log(`If Hard: ${states.hard.interval} days`);
```

##### `memoryStateFromSm2()`

Convert SM-2 ease to FSRS memory state (for migration).

```typescript
memoryStateFromSm2(
  easeFactor: number,
  interval: number,
  historicalRetention?: number
): FsrsMemoryState
```

**Example:**
```typescript
// Migrate old Anki card
const memoryState = scheduler.memoryStateFromSm2(2.5, 30, 0.85);
```

---

### `CardStateMachine`

Handles card state transitions.

#### Constructor

```typescript
constructor(fsrsParams?: number[])
```

#### Methods

##### `getCurrentState()`

Get current state of a card.

```typescript
getCurrentState(card: Card): CardState
```

**Returns:** Discriminated union of `NewState | LearnState | ReviewState | RelearnState`

##### `getNextStates()`

Calculate all possible next states for a card.

```typescript
getNextStates(card: Card, config: DeckConfig): SchedulingStates
```

**Returns:** Object with `current`, `again`, `hard`, `good`, `easy` states

##### `answerCard()`

Answer a card and get updated card.

```typescript
answerCard(
  card: Card,
  rating: Rating,
  config: DeckConfig,
  timeTaken?: number
): Card
```

**Example:**
```typescript
const machine = new CardStateMachine();
const updatedCard = machine.answerCard(
  card,
  Rating.Good,
  config,
  5000 // 5 seconds
);
```

---

### `StudySessionManager`

Manages study sessions and card selection.

#### Constructor

```typescript
constructor(fsrsParams?: number[])
```

#### Methods

##### `startSession()`

Start a new study session.

```typescript
startSession(
  deck: Deck,
  cards: Card[],
  config: DeckConfig
): StudySession
```

**Example:**
```typescript
const manager = new StudySessionManager();
const session = manager.startSession(deck, cards, config);
```

##### `getNextCard()`

Get next card to review.

```typescript
getNextCard(cards: Card[], config: DeckConfig): Card | null
```

**Returns:** Next card or `null` if session complete

**Selection priority:** Learning > Review > New

##### `answerCard()`

Answer current card.

```typescript
answerCard(
  card: Card,
  rating: Rating,
  config: DeckConfig,
  timeTaken?: number
): { card: Card; log: ReviewLog }
```

**Returns:** Updated card and review log

---

### `DeckManager`

Utility class for deck operations (static methods).

#### Methods

##### `createDefaultConfig()`

Create default deck configuration.

```typescript
static createDefaultConfig(): DeckConfig
```

##### `createDeck()`

Create a new deck.

```typescript
static createDeck(name: string, configId?: string): Deck
```

##### `getDeckPath()`

Get full path for nested deck (e.g., "Parent::Child").

```typescript
static getDeckPath(deck: Deck, allDecks: Deck[]): string
```

##### `getCardsInDeck()`

Get all cards in a deck.

```typescript
static getCardsInDeck(deckId: string, cards: Card[]): Card[]
```

---

## React Hook

### `useFsrsData()`

Main React hook for FSRS functionality.

```typescript
function useFsrsData(storageKey?: string): UseFsrsDataReturn
```

**Parameters:**
- `storageKey`: localStorage key (default: 'fsrs-data')

**Returns:** Complete FSRS interface

#### Return Object

```typescript
interface UseFsrsDataReturn {
  // State
  decks: Deck[];
  configs: Record<string, DeckConfig>;
  cards: Record<string, Card>;
  reviewLogs: ReviewLog[];
  currentSession: StudySession | null;
  loading: boolean;
  error: string | null;
  
  // Deck operations
  getDeck(deckId: string): Deck | undefined;
  createDeck(name: string, configId?: string): Deck;
  updateDeck(deck: Deck): void;
  deleteDeck(deckId: string): void;
  getAllDecks(): Deck[];
  
  // Card operations
  getCard(cardId: string): Card | undefined;
  getCardsInDeck(deckId: string): Card[];
  createCard(deckId: string, front: string, back: string): Card;
  updateCard(card: Card): void;
  deleteCard(cardId: string): void;
  
  // Config operations
  getConfig(configId: string): DeckConfig | undefined;
  createConfig(name: string, partial?: Partial<DeckConfig>): DeckConfig;
  updateConfig(config: DeckConfig): void;
  
  // Study session
  startStudySession(deckId: string): void;
  getNextCard(): Card | null;
  answerCard(cardId: string, rating: Rating, timeTaken?: number): void;
  endStudySession(): void;
  getCounts(deckId: string): CardCounts;
  
  // Review logs
  getReviewLogs(cardId?: string): ReviewLog[];
  
  // Utility
  resetAllData(): void;
}
```

**Example:**
```typescript
function MyApp() {
  const fsrs = useFsrsData();
  
  useEffect(() => {
    if (!fsrs.loading && fsrs.getAllDecks().length === 0) {
      const deck = fsrs.createDeck('First Deck');
      fsrs.createCard(deck.id, 'Q', 'A');
      fsrs.startStudySession(deck.id);
    }
  }, [fsrs.loading]);
  
  return <div>...</div>;
}
```

---

## Utility Functions

### `withReviewFuzz()`

Add randomization to review intervals.

```typescript
function withReviewFuzz(
  interval: number,
  fuzzFactor: number,
  minimum: number,
  maximum: number
): number
```

**Purpose:** Distributes reviews over time to avoid bunching

**Parameters:**
- `interval`: Base interval in days
- `fuzzFactor`: Random factor (0.0-1.0)
- `minimum`: Minimum allowed interval
- `maximum`: Maximum allowed interval

**Example:**
```typescript
const fuzzed = withReviewFuzz(30, 0.5, 1, 36500);
// Returns ~27-33 days (30 ± 10%)
```

---

### `getFuzzFactor()`

Generate deterministic fuzz factor from seed.

```typescript
function getFuzzFactor(seed: number): number
```

**Returns:** Pseudo-random number (0.0-1.0)

**Example:**
```typescript
const factor = getFuzzFactor(Date.now());
```

---

## Constants

### `FSRS_CONSTANTS`

Default FSRS configuration values.

```typescript
const FSRS_CONSTANTS = {
  INITIAL_EASE_FACTOR: 2.5,
  MINIMUM_EASE_FACTOR: 1.3,
  EASE_FACTOR_AGAIN_DELTA: -0.2,
  EASE_FACTOR_HARD_DELTA: -0.15,
  EASE_FACTOR_EASY_DELTA: 0.15,
  DEFAULT_PARAMS: [0.4072, 1.1829, ...], // 19 params
  SECONDS_PER_DAY: 86400,
};
```

**Usage:**
```typescript
import { FSRS_CONSTANTS } from './fsrs-plugin';

const initialEase = FSRS_CONSTANTS.INITIAL_EASE_FACTOR;
```

---

## Type Exports

All types are exported from the main entry point:

```typescript
// Import everything
import * as FSRS from './fsrs-plugin';

// Or import specific items
import {
  // Types
  Card,
  Deck,
  DeckConfig,
  CardState,
  StudySession,
  ReviewLog,
  FsrsMemoryState,
  
  // Enums
  CardType,
  CardQueue,
  Rating,
  
  // Classes
  FsrsScheduler,
  CardStateMachine,
  StudySessionManager,
  DeckManager,
  
  // Hook
  useFsrsData,
  
  // Constants
  FSRS_CONSTANTS,
} from './fsrs-plugin';
```

---

## Quick Reference

### Common Operations

```typescript
// Initialize
const fsrs = useFsrsData();

// Create deck
const deck = fsrs.createDeck('My Deck');

// Add cards
fsrs.createCard(deck.id, 'Front', 'Back');

// Start studying
fsrs.startStudySession(deck.id);
const card = fsrs.getNextCard();

// Answer card
fsrs.answerCard(card.id, Rating.Good, 5000);

// Check progress
const counts = fsrs.getCounts(deck.id);
console.log(`${counts.new} new, ${counts.review} reviews`);
```

### Without React

```typescript
const scheduler = new CardStateMachine();
const sessionManager = new StudySessionManager();
const config = DeckManager.createDefaultConfig();
const deck = DeckManager.createDeck('My Deck');

const cards: Card[] = [/* your cards */];

sessionManager.startSession(deck, cards, config);
const nextCard = sessionManager.getNextCard(cards, config);
const result = sessionManager.answerCard(nextCard, Rating.Good, config);
```

---

## See Also

- [README.md](README.md) - Overview and introduction
- [GETTING_STARTED.md](GETTING_STARTED.md) - Beginner-friendly guide
- [EXAMPLES.md](EXAMPLES.md) - Complete code examples
- [Anki Manual](https://docs.ankiweb.net/) - Original Anki documentation
- [FSRS Algorithm](https://github.com/open-spaced-repetition/fsrs4anki) - FSRS research

---

**Last Updated:** 2025-11-15  
**Plugin Version:** 1.0.0  
**License:** AGPL-3.0
