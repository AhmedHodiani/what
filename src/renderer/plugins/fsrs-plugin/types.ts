/**
 * FSRS Plugin - Type Definitions
 * 
 * Core types extracted from Anki's FSRS implementation.
 * These types represent the fundamental data structures for the spaced repetition system.
 */

// ============================================================================
// CARD TYPES & STATES
// ============================================================================

/**
 * Card types representing the lifecycle stage of a card
 */
export enum CardType {
  /** Brand new card that hasn't been studied yet */
  New = 0,
  /** Card currently in the learning phase */
  Learn = 1,
  /** Card in review phase (graduated from learning) */
  Review = 2,
  /** Card being relearned after failing */
  Relearn = 3,
}

/**
 * Card queue determines where and when the card appears
 */
export enum CardQueue {
  /** New cards queue - due is the order cards are shown in */
  New = 0,
  /** Learning cards - due is a unix timestamp */
  Learn = 1,
  /** Review cards - due is days since creation date */
  Review = 2,
  /** Day learning cards */
  DayLearn = 3,
  /** Preview cards - only when failed */
  PreviewRepeat = 4,
  /** Card is suspended */
  Suspended = -1,
  /** Card is buried by scheduler */
  SchedBuried = -2,
  /** Card is buried by user */
  UserBuried = -3,
}

/**
 * Answer ratings for card review
 */
export enum Rating {
  /** Failed the card - needs relearning */
  Again = 1,
  /** Difficult but passed */
  Hard = 2,
  /** Normal recall */
  Good = 3,
  /** Perfect recall */
  Easy = 4,
}

/**
 * FSRS Memory State - represents the card's memory strength
 */
export interface FsrsMemoryState {
  /** Expected memory stability in days */
  stability: number;
  /** Difficulty rating (1.0-10.0 range) */
  difficulty: number;
}

/**
 * Core Card structure
 */
export interface Card {
  id: string;
  noteId: string;
  deckId: string;
  /** Template index for the card */
  templateIdx: number;
  /** Last modification time */
  mtime: number;
  /** Card type */
  ctype: CardType;
  /** Card queue */
  queue: CardQueue;
  /** Due date (meaning depends on queue type) */
  due: number;
  /** Current interval in days */
  interval: number;
  /** Ease factor (multiplier, e.g., 2.5 = 250%) */
  easeFactor: number;
  /** Number of reviews */
  reps: number;
  /** Number of lapses (failures) */
  lapses: number;
  /** Remaining learning steps */
  remainingSteps: number;
  /** FSRS memory state */
  memoryState: FsrsMemoryState | null;
  /** Desired retention (0.0-1.0) */
  desiredRetention: number | null;
  /** Custom data for the card (JSON string) */
  customData: string;
  /** Front content */
  front: string;
  /** Back content */
  back: string;
}

// ============================================================================
// STATE MACHINE STATES
// ============================================================================

/**
 * New card state
 */
export interface NewState {
  position: number;
}

/**
 * Learning card state
 */
export interface LearnState {
  remainingSteps: number;
  scheduledSecs: number;
  elapsedSecs: number;
  memoryState: FsrsMemoryState | null;
}

/**
 * Review card state
 */
export interface ReviewState {
  scheduledDays: number;
  elapsedDays: number;
  easeFactor: number;
  lapses: number;
  leeched: boolean;
  memoryState: FsrsMemoryState | null;
}

/**
 * Relearning card state (after a lapse)
 */
export interface RelearnState {
  learning: LearnState;
  review: ReviewState;
}

/**
 * Card state union type
 */
export type CardState = 
  | { type: 'new'; state: NewState }
  | { type: 'learning'; state: LearnState }
  | { type: 'review'; state: ReviewState }
  | { type: 'relearning'; state: RelearnState };

/**
 * Scheduling states for all possible answers
 */
export interface SchedulingStates {
  current: CardState;
  again: CardState;
  hard: CardState;
  good: CardState;
  easy: CardState;
}

// ============================================================================
// DECK & CONFIGURATION
// ============================================================================

/**
 * Deck configuration
 */
export interface DeckConfig {
  id: string;
  name: string;
  /** Learning steps in minutes */
  learnSteps: number[];
  /** Relearning steps in minutes */
  relearnSteps: number[];
  /** New cards per day limit */
  newPerDay: number;
  /** Reviews per day limit */
  reviewsPerDay: number;
  /** Initial ease factor (e.g., 2.5) */
  initialEase: number;
  /** Easy bonus multiplier */
  easyMultiplier: number;
  /** Hard interval multiplier */
  hardMultiplier: number;
  /** Lapse interval multiplier */
  lapseMultiplier: number;
  /** Global interval multiplier */
  intervalMultiplier: number;
  /** Maximum review interval in days */
  maximumReviewInterval: number;
  /** Minimum interval after lapse */
  minimumLapseInterval: number;
  /** Graduating interval for "good" */
  graduatingIntervalGood: number;
  /** Graduating interval for "easy" */
  graduatingIntervalEasy: number;
  /** Leech threshold (number of lapses) */
  leechThreshold: number;
  /** FSRS parameters */
  fsrsParams: number[];
  /** Desired retention (0.0-1.0) */
  desiredRetention: number;
}

/**
 * Deck structure
 */
export interface Deck {
  id: string;
  name: string;
  configId: string;
  /** Deck description */
  description: string;
  /** Parent deck ID (null for root decks) */
  parentId: string | null;
  /** Whether deck is collapsed in UI */
  collapsed: boolean;
}

// ============================================================================
// STUDY SESSION
// ============================================================================

/**
 * Card counts for study session
 */
export interface CardCounts {
  new: number;
  learning: number;
  review: number;
}

/**
 * Study session state
 */
export interface StudySession {
  deckId: string;
  currentCard: Card | null;
  counts: CardCounts;
  /** Cards reviewed in this session */
  reviewed: number;
  /** Start time of session */
  startTime: number;
}

/**
 * Review log entry
 */
export interface ReviewLog {
  id: string;
  cardId: string;
  /** Unix timestamp */
  timestamp: number;
  /** Rating given */
  rating: Rating;
  /** Time taken in milliseconds */
  timeTaken: number;
  /** Card type at review time */
  cardType: CardType;
  /** Interval before review */
  lastInterval: number;
  /** Interval after review */
  newInterval: number;
  /** Ease factor after review */
  easeFactor: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const FSRS_CONSTANTS = {
  /** Initial ease factor for new cards */
  INITIAL_EASE_FACTOR: 2.5,
  /** Minimum ease factor */
  MINIMUM_EASE_FACTOR: 1.3,
  /** Ease factor change on "Again" */
  EASE_FACTOR_AGAIN_DELTA: -0.2,
  /** Ease factor change on "Hard" */
  EASE_FACTOR_HARD_DELTA: -0.15,
  /** Ease factor change on "Easy" */
  EASE_FACTOR_EASY_DELTA: 0.15,
  /** Default FSRS parameters (v5) */
  DEFAULT_PARAMS: [
    0.4072, 1.1829, 3.1262, 15.4722, 7.2102,
    0.5316, 1.0651, 0.0234, 1.616, 0.1544,
    1.0824, 1.9813, 0.0953, 0.2975, 2.2042,
    0.2407, 2.9466, 0.5034, 0.6567,
  ],
  /** Seconds in a day */
  SECONDS_PER_DAY: 86400,
} as const;

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Options for answering a card
 */
export interface AnswerCardOptions {
  rating: Rating;
  /** Time taken to answer in milliseconds */
  timeTaken?: number;
  /** Custom data to store */
  customData?: string;
}

/**
 * Result of answering a card
 */
export interface AnswerResult {
  card: Card;
  reviewLog: ReviewLog;
  newState: CardState;
}
