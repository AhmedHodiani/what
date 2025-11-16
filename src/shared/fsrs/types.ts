// Copyright: Ankitects Pty Ltd and contributors
// License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html

/**
 * Core type definitions matching Anki's FSRS data model
 * Adapted for What app - stores in SQLite within .what files
 */

// ============================================================================
// Card Types and States
// ============================================================================

export enum CardType {
  New = 0,
  Learn = 1,
  Review = 2,
  Relearn = 3,
}

export enum CardQueue {
  /** due is the order cards are shown in */
  New = 0,
  /** due is a unix timestamp */
  Learn = 1,
  /** due is days since creation date */
  Review = 2,
  DayLearn = 3,
  /** due is a unix timestamp. preview cards only placed here when failed. */
  PreviewRepeat = 4,
  /** cards are not due in these states */
  Suspended = -1,
  SchedBuried = -2,
  UserBuried = -3,
}

export interface FsrsMemoryState {
  /** The expected memory stability, in days */
  stability: number
  /** A number in the range 1.0-10.0 */
  difficulty: number
}

export interface Card {
  id: number
  noteId: number
  deckId: number

  // Content
  front: string
  back: string

  // Scheduling
  ctype: CardType
  queue: CardQueue
  due: number
  interval: number
  easeFactor: number // stored as 2500 for 250%
  reps: number
  lapses: number
  remainingSteps: number

  // FSRS Memory State
  memoryState: FsrsMemoryState | null
  desiredRetention: number | null

  // Timestamps
  mtime: number // modification time (seconds)
  lastReview: number | null // last review time (seconds)

  // Metadata
  flags: number
  customData: string // JSON string for custom data
}

// ============================================================================
// Deck Configuration (FSRS Parameters)
// ============================================================================

export enum NewCardInsertOrder {
  Due = 0,
  Random = 1,
}

export enum NewCardGatherPriority {
  Deck = 0,
  PositionLowestFirst = 1,
  PositionHighestFirst = 2,
}

export enum NewCardSortOrder {
  Template = 0,
  Random = 1,
  Reverse = 2,
}

export enum ReviewCardOrder {
  Day = 0,
  DayThenRandom = 1,
  DeckThenRandom = 2,
  Random = 3,
  IntervalsAscending = 4,
  IntervalsDescending = 5,
  EaseAscending = 6,
  EaseDescending = 7,
  RelativeOverdueness = 8,
}

export enum ReviewMix {
  MixWithReviews = 0,
  ReviewsFirst = 1,
  NewFirst = 2,
  ReviewsOnly = 3,
}

export enum LeechAction {
  Suspend = 0,
  TagOnly = 1,
}

export interface DeckConfig {
  // Learning
  learnSteps: number[] // in minutes
  relearnSteps: number[]

  // Daily limits
  newPerDay: number
  reviewsPerDay: number

  // Graduating intervals
  graduatingIntervalGood: number // days
  graduatingIntervalEasy: number // days

  // Ease factors
  initialEase: number // 2.5 = 250%
  easyMultiplier: number
  hardMultiplier: number
  lapseMultiplier: number
  intervalMultiplier: number

  // Review settings
  maximumReviewInterval: number // days
  minimumLapseInterval: number // days

  // FSRS Parameters (version 6)
  fsrsParams: number[] // 19 parameters
  desiredRetention: number // 0.0-1.0, typically 0.9

  // Card ordering
  newCardInsertOrder: NewCardInsertOrder
  newCardGatherPriority: NewCardGatherPriority
  newCardSortOrder: NewCardSortOrder
  reviewOrder: ReviewCardOrder
  newMix: ReviewMix
  interdayLearningMix: ReviewMix

  // Leech handling
  leechAction: LeechAction
  leechThreshold: number

  // Sibling burying
  buryNew: boolean
  buryReviews: boolean
  buryInterdayLearning: boolean

  // Display settings
  showTimer: boolean
  autoplay: boolean

  // Easy days (load balancing)
  easyDaysPercentages: number[] // 7 values for each day of week
}

// ============================================================================
// Deck
// ============================================================================

export interface Deck {
  id: number
  name: string
  config: DeckConfig
  cards: Card[]

  // Metadata
  mtime: number // modification time (seconds)
  usn: number // update sequence number for syncing

  // Deck description (optional)
  description: string
}

// ============================================================================
// Review History (Revlog)
// ============================================================================

export enum ReviewKind {
  Learning = 0,
  Review = 1,
  Relearn = 2,
  Filtered = 3,
  Manual = 4,
}

export interface ReviewLog {
  id: number // timestamp in milliseconds
  cardId: number
  usn: number

  // Button pressed (1=Again, 2=Hard, 3=Good, 4=Easy)
  buttonChosen: number

  // Interval before this review (in days, or seconds if < 0)
  interval: number

  // Interval that will be used after this review
  lastInterval: number

  // Ease factor after review (in thousandths, e.g., 2500 = 250%)
  easeFactor: number

  // Time taken to answer in milliseconds
  timeTaken: number

  // Review type
  reviewKind: ReviewKind

  // FSRS memory state after review
  memoryState: FsrsMemoryState | null
}

// ============================================================================
// Study Session State
// ============================================================================

export interface StudySession {
  deckId: number
  startTime: number
  cardsStudied: number
  reviews: ReviewLog[]
}
