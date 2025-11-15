/**
 * FSRS Algorithm Implementation
 * 
 * Free Spaced Repetition Scheduler (FSRS) algorithm extracted from Anki.
 * This implements the core scheduling calculations using memory stability and difficulty.
 */

import { FsrsMemoryState, FSRS_CONSTANTS } from './types';

/**
 * FSRS Next States - intervals and memory states for each possible rating
 */
export interface FsrsNextStates {
  again: {
    interval: number;
    memory: FsrsMemoryState;
  };
  hard: {
    interval: number;
    memory: FsrsMemoryState;
  };
  good: {
    interval: number;
    memory: FsrsMemoryState;
  };
  easy: {
    interval: number;
    memory: FsrsMemoryState;
  };
}

/**
 * FSRS Scheduler class
 * Implements the core FSRS algorithm for calculating review intervals
 */
export class FsrsScheduler {
  private params: number[];

  constructor(params?: number[]) {
    this.params = params || [...FSRS_CONSTANTS.DEFAULT_PARAMS];
  }

  /**
   * Calculate the next interval based on memory stability and desired retention
   * 
   * @param stability - Current memory stability in days
   * @param desiredRetention - Target retention rate (0.0-1.0)
   * @param daysElapsed - Days since last review (default: 0 for new scheduling)
   * @returns Next interval in days
   */
  nextInterval(
    stability: number | null,
    desiredRetention: number,
    _daysElapsed: number = 0
  ): number {
    if (!stability || stability <= 0) {
      return 1;
    }

    const newInterval = stability / 9 * (1 / desiredRetention - 1);
    return Math.max(1, Math.round(newInterval));
  }

  /**
   * Calculate next states for all possible ratings
   * 
   * @param currentMemoryState - Current FSRS memory state (null for new cards)
   * @param desiredRetention - Target retention rate (0.0-1.0)
   * @param daysElapsed - Days since last review
   * @returns Next states for all ratings
   */
  nextStates(
    currentMemoryState: FsrsMemoryState | null,
    desiredRetention: number,
    daysElapsed: number
  ): FsrsNextStates {
    // For new cards, initialize with default values
    if (!currentMemoryState) {
      return this.initialStates(desiredRetention);
    }

    const { stability, difficulty } = currentMemoryState;

    // Calculate retrievability (how likely the card is to be remembered)
    const retrievability = this.calculateRetrievability(stability, daysElapsed);

    // Calculate new states for each rating
    const againState = this.stateAfterReview(
      stability,
      difficulty,
      retrievability,
      1, // Again
      desiredRetention
    );

    const hardState = this.stateAfterReview(
      stability,
      difficulty,
      retrievability,
      2, // Hard
      desiredRetention
    );

    const goodState = this.stateAfterReview(
      stability,
      difficulty,
      retrievability,
      3, // Good
      desiredRetention
    );

    const easyState = this.stateAfterReview(
      stability,
      difficulty,
      retrievability,
      4, // Easy
      desiredRetention
    );

    return {
      again: {
        interval: this.nextInterval(againState.stability, desiredRetention),
        memory: againState,
      },
      hard: {
        interval: this.nextInterval(hardState.stability, desiredRetention),
        memory: hardState,
      },
      good: {
        interval: this.nextInterval(goodState.stability, desiredRetention),
        memory: goodState,
      },
      easy: {
        interval: this.nextInterval(easyState.stability, desiredRetention),
        memory: easyState,
      },
    };
  }

  /**
   * Calculate initial states for a brand new card
   */
  private initialStates(desiredRetention: number): FsrsNextStates {
    const initialDifficulty = 5.0; // Middle of the 1-10 scale
    const againStability = this.params[0] || 0.4;
    const hardStability = this.params[1] || 1.0;
    const goodStability = this.params[2] || 3.0;
    const easyStability = this.params[3] || 15.0;

    return {
      again: {
        interval: this.nextInterval(againStability, desiredRetention),
        memory: { stability: againStability, difficulty: initialDifficulty + 2 },
      },
      hard: {
        interval: this.nextInterval(hardStability, desiredRetention),
        memory: { stability: hardStability, difficulty: initialDifficulty + 1 },
      },
      good: {
        interval: this.nextInterval(goodStability, desiredRetention),
        memory: { stability: goodStability, difficulty: initialDifficulty },
      },
      easy: {
        interval: this.nextInterval(easyStability, desiredRetention),
        memory: { stability: easyStability, difficulty: initialDifficulty - 1 },
      },
    };
  }

  /**
   * Calculate retrievability (probability of recall) based on stability and elapsed time
   * 
   * @param stability - Memory stability in days
   * @param daysElapsed - Days since last review
   * @returns Retrievability (0.0-1.0)
   */
  private calculateRetrievability(stability: number, daysElapsed: number): number {
    if (stability <= 0 || daysElapsed < 0) {
      return 1.0;
    }
    return Math.pow(1 + daysElapsed / (9 * stability), -1);
  }

  /**
   * Calculate the new memory state after a review
   * 
   * @param stability - Current stability
   * @param difficulty - Current difficulty
   * @param retrievability - Current retrievability
   * @param rating - Rating given (1=Again, 2=Hard, 3=Good, 4=Easy)
   * @param desiredRetention - Target retention
   * @returns New memory state
   */
  private stateAfterReview(
    stability: number,
    difficulty: number,
    retrievability: number,
    rating: number,
    desiredRetention: number
  ): FsrsMemoryState {
    // Calculate new difficulty based on rating and current difficulty
    const newDifficulty = this.nextDifficulty(difficulty, rating);
    
    // Calculate new stability based on rating
    const newStability = this.nextStability(
      stability,
      difficulty,
      retrievability,
      rating
    );

    return {
      stability: newStability,
      difficulty: newDifficulty,
    };
  }

  /**
   * Calculate next difficulty based on current difficulty and rating
   */
  private nextDifficulty(difficulty: number, rating: number): number {
    const difficultyChange = {
      1: 0.7,   // Again - increase difficulty significantly
      2: 0.3,   // Hard - increase difficulty slightly
      3: -0.1,  // Good - decrease difficulty slightly
      4: -0.3,  // Easy - decrease difficulty more
    };

    const change = difficultyChange[rating as keyof typeof difficultyChange] || 0;
    const newDifficulty = difficulty + change;
    
    // Clamp difficulty to 1.0-10.0 range
    return Math.max(1.0, Math.min(10.0, newDifficulty));
  }

  /**
   * Calculate next stability based on current state and rating
   */
  private nextStability(
    stability: number,
    difficulty: number,
    retrievability: number,
    rating: number,
  ): number {
    let newStability: number;

    if (rating === 1) { // Again
      // Failed recall - stability decreases
      newStability = stability * (this.params[6] || 0.5);
    } else {
      // Successful recall - stability increases
      const successFactor = this.params[8 + (rating - 2)] || 1.0;
      const difficultyFactor = Math.exp((10 - difficulty) * 0.1);
      const retrievabilityFactor = 1 - retrievability;
      
      newStability = stability * (1 + successFactor * difficultyFactor * retrievabilityFactor);
    }

    return Math.max(0.1, newStability);
  }

  /**
   * Create initial memory state from SM-2 ease factor (for migration)
   * 
   * @param easeFactor - SM-2 ease factor (e.g., 2.5)
   * @param interval - Current interval in days
   * @param historicalRetention - Historical retention rate
   * @returns Estimated FSRS memory state
   */
  memoryStateFromSm2(
    easeFactor: number,
    interval: number,
    historicalRetention: number = 0.9
  ): FsrsMemoryState {
    // Convert ease factor to difficulty (inversely related)
    // Ease 2.5 (default) -> difficulty 5.0 (middle)
    // Ease 1.3 (min) -> difficulty 10.0 (max)
    // Ease 4.0+ -> difficulty 1.0 (min)
    const difficulty = Math.max(1.0, Math.min(10.0, 11 - easeFactor * 3));

    // Estimate stability from interval and retention
    // Using the inverse of the interval formula
    const stability = interval * 9 * historicalRetention / (1 - historicalRetention);

    return {
      stability: Math.max(0.1, stability),
      difficulty,
    };
  }
}

/**
 * Calculate fuzz (randomization) for interval to distribute reviews
 * 
 * @param interval - Base interval in days
 * @param fuzzFactor - Random factor 0.0-1.0
 * @param minimum - Minimum allowed interval
 * @param maximum - Maximum allowed interval
 * @returns Fuzzed interval
 */
export function withReviewFuzz(
  interval: number,
  fuzzFactor: number,
  minimum: number,
  maximum: number
): number {
  const [lower, upper] = fuzzBounds(interval, minimum, maximum);
  return Math.floor(lower + fuzzFactor * (1 + upper - lower));
}

/**
 * Calculate fuzz bounds for an interval
 */
function fuzzBounds(
  interval: number,
  minimum: number,
  maximum: number
): [number, number] {
  const constrainedInterval = Math.max(minimum, Math.min(maximum, interval));
  const delta = fuzzDelta(constrainedInterval);
  
  let lower = Math.round(constrainedInterval - delta);
  let upper = Math.round(constrainedInterval + delta);
  
  // Constrain to min/max
  lower = Math.max(minimum, Math.min(maximum, lower));
  upper = Math.max(minimum, Math.min(maximum, upper));
  
  // Ensure at least 1 day difference if possible
  if (upper === lower && upper > 2 && upper < maximum) {
    upper = lower + 1;
  }
  
  return [lower, upper];
}

/**
 * Calculate fuzz delta based on interval
 * Short intervals don't get fuzzed, longer intervals get more fuzz
 */
function fuzzDelta(interval: number): number {
  if (interval < 2.5) {
    return 0;
  }
  
  let delta = 1.0; // Base fuzz of 1 day
  
  // 15% for days 2.5-7
  if (interval >= 2.5) {
    delta += 0.15 * Math.min(interval - 2.5, 7 - 2.5);
  }
  
  // 10% for days 7-20
  if (interval >= 7) {
    delta += 0.1 * Math.min(interval - 7, 20 - 7);
  }
  
  // 5% for days 20+
  if (interval >= 20) {
    delta += 0.05 * (interval - 20);
  }
  
  return delta;
}

/**
 * Generate a fuzz factor from a seed (for deterministic fuzzing)
 * 
 * @param seed - Seed value
 * @returns Fuzz factor (0.0-1.0)
 */
export function getFuzzFactor(seed: number): number {
  // Simple pseudo-random generator
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
