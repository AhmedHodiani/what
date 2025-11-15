/**
 * Card State Machine
 * 
 * Implements the state transitions for cards based on user ratings.
 * This follows Anki's FSRS-based scheduling system.
 */

import {
  Card,
  CardState,
  CardType,
  CardQueue,
  Rating,
  SchedulingStates,
  NewState,
  LearnState,
  ReviewState,
  RelearnState,
  DeckConfig,
  FSRS_CONSTANTS,
} from './types';
import { FsrsScheduler, FsrsNextStates, withReviewFuzz, getFuzzFactor } from './fsrs-algorithm';

/**
 * Context needed for state transitions
 */
interface StateContext {
  config: DeckConfig;
  fsrsNextStates: FsrsNextStates | null;
  fuzzSeed: number;
  timing: {
    now: number;
    nextDayAt: number;
  };
}

/**
 * Card State Machine
 * Handles all card state transitions and scheduling
 */
export class CardStateMachine {
  private fsrs: FsrsScheduler;

  constructor(fsrsParams?: number[]) {
    this.fsrs = new FsrsScheduler(fsrsParams);
  }

  /**
   * Get the current state of a card
   */
  getCurrentState(card: Card): CardState {
    switch (card.ctype) {
      case CardType.New:
        return {
          type: 'new',
          state: { position: card.due },
        };
      
      case CardType.Learn:
        return {
          type: 'learning',
          state: {
            remainingSteps: card.remainingSteps,
            scheduledSecs: card.due,
            elapsedSecs: 0,
            memoryState: card.memoryState,
          },
        };
      
      case CardType.Review:
        return {
          type: 'review',
          state: {
            scheduledDays: card.interval,
            elapsedDays: 0,
            easeFactor: card.easeFactor,
            lapses: card.lapses,
            leeched: false,
            memoryState: card.memoryState,
          },
        };
      
      case CardType.Relearn:
        return {
          type: 'relearning',
          state: {
            learning: {
              remainingSteps: card.remainingSteps,
              scheduledSecs: card.due,
              elapsedSecs: 0,
              memoryState: card.memoryState,
            },
            review: {
              scheduledDays: card.interval,
              elapsedDays: 0,
              easeFactor: card.easeFactor,
              lapses: card.lapses,
              leeched: false,
              memoryState: card.memoryState,
            },
          },
        };
    }
  }

  /**
   * Get next states for all possible answers
   */
  getNextStates(card: Card, config: DeckConfig): SchedulingStates {
    const currentState = this.getCurrentState(card);
    const ctx = this.createContext(card, config);

    return this.nextStates(currentState, ctx);
  }

  /**
   * Answer a card and get the new state
   */
  answerCard(
    card: Card,
    rating: Rating,
    config: DeckConfig,
    timeTaken: number = 0
  ): Card {
    const states = this.getNextStates(card, config);
    
    let nextState: CardState;
    switch (rating) {
      case Rating.Again:
        nextState = states.again;
        break;
      case Rating.Hard:
        nextState = states.hard;
        break;
      case Rating.Good:
        nextState = states.good;
        break;
      case Rating.Easy:
        nextState = states.easy;
        break;
      default:
        nextState = states.good;
    }

    return this.applyState(card, nextState, timeTaken);
  }

  /**
   * Create state context for transitions
   */
  private createContext(card: Card, config: DeckConfig): StateContext {
    const daysElapsed = this.calculateDaysElapsed(card);
    
    const fsrsNextStates = this.fsrs.nextStates(
      card.memoryState,
      card.desiredRetention || config.desiredRetention,
      daysElapsed
    );

    return {
      config,
      fsrsNextStates,
      fuzzSeed: this.getFuzzSeed(card),
      timing: {
        now: Date.now(),
        nextDayAt: this.getNextDayAt(),
      },
    };
  }

  /**
   * Calculate days elapsed since last review
   */
  private calculateDaysElapsed(card: Card): number {
    if (card.ctype === CardType.New) {
      return 0;
    }
    
    const now = Date.now();
    const lastReview = card.mtime;
    const msElapsed = now - lastReview;
    return Math.max(0, Math.floor(msElapsed / (FSRS_CONSTANTS.SECONDS_PER_DAY * 1000)));
  }

  /**
   * Get fuzz seed for deterministic randomization
   */
  private getFuzzSeed(card: Card): number {
    return parseInt(card.id, 36) + card.reps;
  }

  /**
   * Get timestamp for next day rollover (4am)
   */
  private getNextDayAt(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(4, 0, 0, 0);
    return tomorrow.getTime();
  }

  /**
   * Calculate next states based on current state
   */
  private nextStates(current: CardState, ctx: StateContext): SchedulingStates {
    switch (current.type) {
      case 'new':
        return this.nextStatesNew(current.state, ctx);
      case 'learning':
        return this.nextStatesLearning(current.state, ctx);
      case 'review':
        return this.nextStatesReview(current.state, ctx);
      case 'relearning':
        return this.nextStatesRelearning(current.state, ctx);
    }
  }

  /**
   * Next states for new cards
   */
  private nextStatesNew(state: NewState, ctx: StateContext): SchedulingStates {
    const { config, fsrsNextStates } = ctx;
    
    return {
      current: { type: 'new', state },
      again: this.newToLearning(config, fsrsNextStates, 'again'),
      hard: this.newToLearning(config, fsrsNextStates, 'hard'),
      good: this.newToLearning(config, fsrsNextStates, 'good'),
      easy: this.newToReview(config, fsrsNextStates, ctx),
    };
  }

  /**
   * Next states for learning cards
   */
  private nextStatesLearning(state: LearnState, ctx: StateContext): SchedulingStates {
    const { config, fsrsNextStates } = ctx;
    
    return {
      current: { type: 'learning', state },
      again: this.learningAgain(state, config, fsrsNextStates),
      hard: this.learningHard(state, config, fsrsNextStates, ctx),
      good: this.learningGood(state, config, fsrsNextStates, ctx),
      easy: this.learningEasy(config, fsrsNextStates, ctx),
    };
  }

  /**
   * Next states for review cards
   */
  private nextStatesReview(state: ReviewState, ctx: StateContext): SchedulingStates {
    const { config, fsrsNextStates } = ctx;
    
    return {
      current: { type: 'review', state },
      again: this.reviewAgain(state, config, fsrsNextStates),
      hard: this.reviewHard(state, config, fsrsNextStates, ctx),
      good: this.reviewGood(state, config, fsrsNextStates, ctx),
      easy: this.reviewEasy(state, config, fsrsNextStates, ctx),
    };
  }

  /**
   * Next states for relearning cards
   */
  private nextStatesRelearning(state: RelearnState, ctx: StateContext): SchedulingStates {
    const { config, fsrsNextStates } = ctx;
    
    return {
      current: { type: 'relearning', state },
      again: this.relearnAgain(state, config, fsrsNextStates),
      hard: this.relearnHard(state, config, fsrsNextStates, ctx),
      good: this.relearnGood(state, config, fsrsNextStates, ctx),
      easy: this.relearnEasy(state, config, fsrsNextStates, ctx),
    };
  }

  // ============================================================================
  // NEW CARD TRANSITIONS
  // ============================================================================

  private newToLearning(
    config: DeckConfig,
    fsrsNextStates: FsrsNextStates | null,
    rating: 'again' | 'hard' | 'good'
  ): CardState {
    const steps = config.learnSteps;
    const stepIndex = rating === 'again' ? 0 : rating === 'hard' ? 0 : 0;
    const scheduledSecs = (steps[stepIndex] || 1) * 60;
    
    return {
      type: 'learning',
      state: {
        remainingSteps: steps.length - stepIndex - 1,
        scheduledSecs,
        elapsedSecs: 0,
        memoryState: fsrsNextStates?.[rating].memory || null,
      },
    };
  }

  private newToReview(
    config: DeckConfig,
    fsrsNextStates: FsrsNextStates | null,
    ctx: StateContext
  ): CardState {
    const interval = fsrsNextStates
      ? Math.round(fsrsNextStates.easy.interval)
      : config.graduatingIntervalEasy;
    
    const fuzzedInterval = this.applyFuzz(interval, 1, config.maximumReviewInterval, ctx);
    
    return {
      type: 'review',
      state: {
        scheduledDays: fuzzedInterval,
        elapsedDays: 0,
        easeFactor: config.initialEase,
        lapses: 0,
        leeched: false,
        memoryState: fsrsNextStates?.easy.memory || null,
      },
    };
  }

  // ============================================================================
  // LEARNING CARD TRANSITIONS
  // ============================================================================

  private learningAgain(
    state: LearnState,
    config: DeckConfig,
    fsrsNextStates: FsrsNextStates | null
  ): CardState {
    const steps = config.learnSteps;
    const scheduledSecs = (steps[0] || 1) * 60;
    
    return {
      type: 'learning',
      state: {
        remainingSteps: steps.length - 1,
        scheduledSecs,
        elapsedSecs: 0,
        memoryState: fsrsNextStates?.again.memory || null,
      },
    };
  }

  private learningHard(
    state: LearnState,
    config: DeckConfig,
    fsrsNextStates: FsrsNextStates | null,
    ctx: StateContext
  ): CardState {
    const steps = config.learnSteps;
    const currentStepIndex = steps.length - state.remainingSteps - 1;
    
    // Stay on same step or move to next
    const nextStepIndex = currentStepIndex;
    if (nextStepIndex < steps.length) {
      return {
        type: 'learning',
        state: {
          remainingSteps: steps.length - nextStepIndex - 1,
          scheduledSecs: (steps[nextStepIndex] || 1) * 60,
          elapsedSecs: 0,
          memoryState: fsrsNextStates?.hard.memory || null,
        },
      };
    }
    
    // Graduate to review
    return this.graduateToReview(config, fsrsNextStates, 'hard', ctx);
  }

  private learningGood(
    state: LearnState,
    config: DeckConfig,
    fsrsNextStates: FsrsNextStates | null,
    ctx: StateContext
  ): CardState {
    const steps = config.learnSteps;
    const currentStepIndex = steps.length - state.remainingSteps - 1;
    const nextStepIndex = currentStepIndex + 1;
    
    if (nextStepIndex < steps.length) {
      return {
        type: 'learning',
        state: {
          remainingSteps: steps.length - nextStepIndex - 1,
          scheduledSecs: (steps[nextStepIndex] || 1) * 60,
          elapsedSecs: 0,
          memoryState: fsrsNextStates?.good.memory || null,
        },
      };
    }
    
    // Graduate to review
    return this.graduateToReview(config, fsrsNextStates, 'good', ctx);
  }

  private learningEasy(
    config: DeckConfig,
    fsrsNextStates: FsrsNextStates | null,
    ctx: StateContext
  ): CardState {
    return this.graduateToReview(config, fsrsNextStates, 'easy', ctx);
  }

  private graduateToReview(
    config: DeckConfig,
    fsrsNextStates: FsrsNextStates | null,
    rating: 'hard' | 'good' | 'easy',
    ctx: StateContext
  ): CardState {
    let interval: number;
    
    if (fsrsNextStates) {
      interval = Math.round(fsrsNextStates[rating].interval);
    } else {
      interval = rating === 'easy' 
        ? config.graduatingIntervalEasy 
        : config.graduatingIntervalGood;
    }
    
    const fuzzedInterval = this.applyFuzz(interval, 1, config.maximumReviewInterval, ctx);
    
    return {
      type: 'review',
      state: {
        scheduledDays: fuzzedInterval,
        elapsedDays: 0,
        easeFactor: config.initialEase,
        lapses: 0,
        leeched: false,
        memoryState: fsrsNextStates?.[rating].memory || null,
      },
    };
  }

  // ============================================================================
  // REVIEW CARD TRANSITIONS
  // ============================================================================

  private reviewAgain(
    state: ReviewState,
    config: DeckConfig,
    fsrsNextStates: FsrsNextStates | null
  ): CardState {
    const steps = config.relearnSteps;
    const lapses = state.lapses + 1;
    const leeched = this.checkLeech(lapses, config.leechThreshold);
    
    if (steps.length > 0) {
      return {
        type: 'relearning',
        state: {
          learning: {
            remainingSteps: steps.length - 1,
            scheduledSecs: (steps[0] || 10) * 60,
            elapsedSecs: 0,
            memoryState: fsrsNextStates?.again.memory || null,
          },
          review: {
            ...state,
            lapses,
            leeched,
            easeFactor: Math.max(
              FSRS_CONSTANTS.MINIMUM_EASE_FACTOR,
              state.easeFactor + FSRS_CONSTANTS.EASE_FACTOR_AGAIN_DELTA
            ),
          },
        },
      };
    }
    
    // No relearn steps - go directly back to review with reduced interval
    const newInterval = fsrsNextStates
      ? Math.round(fsrsNextStates.again.interval)
      : Math.max(1, Math.round(state.scheduledDays * config.lapseMultiplier));
    
    return {
      type: 'review',
      state: {
        scheduledDays: newInterval,
        elapsedDays: 0,
        easeFactor: Math.max(
          FSRS_CONSTANTS.MINIMUM_EASE_FACTOR,
          state.easeFactor + FSRS_CONSTANTS.EASE_FACTOR_AGAIN_DELTA
        ),
        lapses,
        leeched,
        memoryState: fsrsNextStates?.again.memory || null,
      },
    };
  }

  private reviewHard(
    state: ReviewState,
    config: DeckConfig,
    fsrsNextStates: FsrsNextStates | null,
    ctx: StateContext
  ): CardState {
    const baseInterval = fsrsNextStates
      ? fsrsNextStates.hard.interval
      : state.scheduledDays * config.hardMultiplier;
    
    const interval = Math.round(Math.max(state.scheduledDays + 1, baseInterval));
    const fuzzedInterval = this.applyFuzz(interval, state.scheduledDays + 1, config.maximumReviewInterval, ctx);
    
    return {
      type: 'review',
      state: {
        scheduledDays: fuzzedInterval,
        elapsedDays: 0,
        easeFactor: Math.max(
          FSRS_CONSTANTS.MINIMUM_EASE_FACTOR,
          state.easeFactor + FSRS_CONSTANTS.EASE_FACTOR_HARD_DELTA
        ),
        lapses: state.lapses,
        leeched: state.leeched,
        memoryState: fsrsNextStates?.hard.memory || null,
      },
    };
  }

  private reviewGood(
    state: ReviewState,
    config: DeckConfig,
    fsrsNextStates: FsrsNextStates | null,
    ctx: StateContext
  ): CardState {
    const baseInterval = fsrsNextStates
      ? fsrsNextStates.good.interval
      : state.scheduledDays * state.easeFactor;
    
    const interval = Math.round(Math.max(state.scheduledDays + 1, baseInterval));
    const fuzzedInterval = this.applyFuzz(interval, state.scheduledDays + 1, config.maximumReviewInterval, ctx);
    
    return {
      type: 'review',
      state: {
        scheduledDays: fuzzedInterval,
        elapsedDays: 0,
        easeFactor: state.easeFactor,
        lapses: state.lapses,
        leeched: state.leeched,
        memoryState: fsrsNextStates?.good.memory || null,
      },
    };
  }

  private reviewEasy(
    state: ReviewState,
    config: DeckConfig,
    fsrsNextStates: FsrsNextStates | null,
    ctx: StateContext
  ): CardState {
    const baseInterval = fsrsNextStates
      ? fsrsNextStates.easy.interval
      : state.scheduledDays * state.easeFactor * config.easyMultiplier;
    
    const interval = Math.round(Math.max(state.scheduledDays + 1, baseInterval));
    const fuzzedInterval = this.applyFuzz(interval, state.scheduledDays + 1, config.maximumReviewInterval, ctx);
    
    return {
      type: 'review',
      state: {
        scheduledDays: fuzzedInterval,
        elapsedDays: 0,
        easeFactor: state.easeFactor + FSRS_CONSTANTS.EASE_FACTOR_EASY_DELTA,
        lapses: state.lapses,
        leeched: state.leeched,
        memoryState: fsrsNextStates?.easy.memory || null,
      },
    };
  }

  // ============================================================================
  // RELEARNING CARD TRANSITIONS
  // ============================================================================

  private relearnAgain(
    state: RelearnState,
    config: DeckConfig,
    fsrsNextStates: FsrsNextStates | null
  ): CardState {
    const steps = config.relearnSteps;
    
    return {
      type: 'relearning',
      state: {
        learning: {
          remainingSteps: steps.length - 1,
          scheduledSecs: (steps[0] || 10) * 60,
          elapsedSecs: 0,
          memoryState: fsrsNextStates?.again.memory || null,
        },
        review: state.review,
      },
    };
  }

  private relearnHard(
    state: RelearnState,
    config: DeckConfig,
    fsrsNextStates: FsrsNextStates | null,
    ctx: StateContext
  ): CardState {
    const steps = config.relearnSteps;
    const currentStepIndex = steps.length - state.learning.remainingSteps - 1;
    const nextStepIndex = currentStepIndex;
    
    if (nextStepIndex < steps.length) {
      return {
        type: 'relearning',
        state: {
          learning: {
            remainingSteps: steps.length - nextStepIndex - 1,
            scheduledSecs: (steps[nextStepIndex] || 10) * 60,
            elapsedSecs: 0,
            memoryState: fsrsNextStates?.hard.memory || null,
          },
          review: state.review,
        },
      };
    }
    
    // Graduate back to review
    const interval = fsrsNextStates
      ? Math.round(fsrsNextStates.hard.interval)
      : Math.max(1, Math.round(state.review.scheduledDays * config.lapseMultiplier));
    
    const fuzzedInterval = this.applyFuzz(interval, 1, config.maximumReviewInterval, ctx);
    
    return {
      type: 'review',
      state: {
        ...state.review,
        scheduledDays: fuzzedInterval,
        elapsedDays: 0,
        memoryState: fsrsNextStates?.hard.memory || null,
      },
    };
  }

  private relearnGood(
    state: RelearnState,
    config: DeckConfig,
    fsrsNextStates: FsrsNextStates | null,
    ctx: StateContext
  ): CardState {
    const steps = config.relearnSteps;
    const currentStepIndex = steps.length - state.learning.remainingSteps - 1;
    const nextStepIndex = currentStepIndex + 1;
    
    if (nextStepIndex < steps.length) {
      return {
        type: 'relearning',
        state: {
          learning: {
            remainingSteps: steps.length - nextStepIndex - 1,
            scheduledSecs: (steps[nextStepIndex] || 10) * 60,
            elapsedSecs: 0,
            memoryState: fsrsNextStates?.good.memory || null,
          },
          review: state.review,
        },
      };
    }
    
    // Graduate back to review
    const interval = fsrsNextStates
      ? Math.round(fsrsNextStates.good.interval)
      : state.review.scheduledDays;
    
    const fuzzedInterval = this.applyFuzz(interval, 1, config.maximumReviewInterval, ctx);
    
    return {
      type: 'review',
      state: {
        ...state.review,
        scheduledDays: fuzzedInterval,
        elapsedDays: 0,
        memoryState: fsrsNextStates?.good.memory || null,
      },
    };
  }

  private relearnEasy(
    state: RelearnState,
    config: DeckConfig,
    fsrsNextStates: FsrsNextStates | null,
    ctx: StateContext
  ): CardState {
    const interval = fsrsNextStates
      ? Math.round(fsrsNextStates.easy.interval)
      : state.review.scheduledDays + 1;
    
    const fuzzedInterval = this.applyFuzz(interval, state.review.scheduledDays + 1, config.maximumReviewInterval, ctx);
    
    return {
      type: 'review',
      state: {
        ...state.review,
        scheduledDays: fuzzedInterval,
        elapsedDays: 0,
        memoryState: fsrsNextStates?.easy.memory || null,
      },
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Apply fuzzing to interval
   */
  private applyFuzz(interval: number, minimum: number, maximum: number, ctx: StateContext): number {
    const fuzzFactor = getFuzzFactor(ctx.fuzzSeed);
    return withReviewFuzz(interval, fuzzFactor, minimum, maximum);
  }

  /**
   * Check if card has reached leech threshold
   */
  private checkLeech(lapses: number, threshold: number): boolean {
    if (threshold === 0) return false;
    const halfThreshold = Math.max(1, Math.ceil(threshold / 2));
    return lapses >= threshold && (lapses - threshold) % halfThreshold === 0;
  }

  /**
   * Apply a state to a card, updating all relevant fields
   */
  private applyState(card: Card, state: CardState, _timeTaken: number): Card {
    const newCard: Card = {
      ...card,
      reps: card.reps + 1,
      mtime: Date.now(),
    };

    switch (state.type) {
      case 'new':
        newCard.ctype = CardType.New;
        newCard.queue = CardQueue.New;
        newCard.due = state.state.position;
        break;

      case 'learning':
        newCard.ctype = CardType.Learn;
        newCard.queue = CardQueue.Learn;
        newCard.due = Date.now() + state.state.scheduledSecs * 1000;
        newCard.remainingSteps = state.state.remainingSteps;
        newCard.memoryState = state.state.memoryState;
        break;

      case 'review':
        newCard.ctype = CardType.Review;
        newCard.queue = CardQueue.Review;
        newCard.interval = state.state.scheduledDays;
        newCard.due = this.daysToTimestamp(state.state.scheduledDays);
        newCard.easeFactor = state.state.easeFactor;
        newCard.lapses = state.state.lapses;
        newCard.memoryState = state.state.memoryState;
        break;

      case 'relearning':
        newCard.ctype = CardType.Relearn;
        newCard.queue = CardQueue.Learn;
        newCard.due = Date.now() + state.state.learning.scheduledSecs * 1000;
        newCard.remainingSteps = state.state.learning.remainingSteps;
        newCard.easeFactor = state.state.review.easeFactor;
        newCard.lapses = state.state.review.lapses;
        newCard.memoryState = state.state.learning.memoryState;
        break;
    }

    return newCard;
  }

  /**
   * Convert days to timestamp
   */
  private daysToTimestamp(days: number): number {
    const now = new Date();
    now.setHours(4, 0, 0, 0); // 4am rollover
    return now.getTime() + days * FSRS_CONSTANTS.SECONDS_PER_DAY * 1000;
  }
}
