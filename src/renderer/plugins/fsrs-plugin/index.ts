/**
 * FSRS Plugin - Main Entry Point
 * 
 * A complete, standalone Free Spaced Repetition Scheduler (FSRS) implementation
 * extracted from Anki. This plugin provides all the core functionality needed
 * to build a spaced repetition system with 90% of Anki's scheduling capabilities.
 * 
 * @author Extracted from Anki (https://github.com/ankitects/anki)
 * @license AGPL-3.0
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export * from './types';

// ============================================================================
// CORE ALGORITHM EXPORTS
// ============================================================================

export {
  FsrsScheduler,
  FsrsNextStates,
  withReviewFuzz,
  getFuzzFactor,
} from './fsrs-algorithm';

// ============================================================================
// STATE MACHINE EXPORTS
// ============================================================================

export { CardStateMachine } from './card-state-machine';

// ============================================================================
// SESSION & DECK MANAGEMENT EXPORTS
// ============================================================================

export {
  StudySessionManager,
  DeckManager,
} from './study-session';

// ============================================================================
// REACT HOOK EXPORTS
// ============================================================================

export {
  useFsrsData,
  default as useAnkiClone,
} from './use-fsrs-data';

// ============================================================================
// CONVENIENCE RE-EXPORTS
// ============================================================================

/**
 * Quick start exports for common use cases
 */
export { CardStateMachine as Scheduler } from './card-state-machine';
export { StudySessionManager as StudyManager } from './study-session';
