/**
 * FSRS (Free Spaced Repetition Scheduler) - Anki's scheduling algorithm
 * 
 * This module provides a complete 1:1 implementation of Anki's FSRS system
 * for the What app's deck widget feature.
 */

// Types
export * from './types';
export type {
  Card,
  Deck,
  DeckConfig,
  FsrsMemoryState,
  ReviewLog,
  StudySession,
} from './types';

// Configuration
export { createDefaultDeckConfig, validateFsrsParams, validateDesiredRetention, DEFAULT_FSRS_PARAMS } from './config';

// Card utilities
export {
  createNewCard,
  generateCardId,
  generateNoteId,
  getNormalizedDifficulty,
  easeFactorToPercentage,
  percentageToEaseFactor,
  isCardDue,
  getDaysUntilDue,
  formatInterval,
} from './cardUtils';

// Scheduler
export { FsrsScheduler } from './scheduler';

// Queue builder
export { CardQueueBuilder, sortNewCards, sortReviewCards, Intersperser } from './queue';
export type { QueueEntry, LearningQueueEntry } from './queue';
