// Copyright: Ankitects Pty Ltd and contributors
// License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html

import { FSRS, Rating, State, Card as FSRSCard, type RecordLog, createEmptyCard } from 'ts-fsrs';
import type { Card, FsrsMemoryState, DeckConfig, ReviewLog } from './types';
import { CardType, CardQueue, ReviewKind } from './types';

// Ease factor adjustment constants (from Anki's review.rs)
const EASE_FACTOR_AGAIN_DELTA = -0.2;
const EASE_FACTOR_HARD_DELTA = -0.15;
const EASE_FACTOR_EASY_DELTA = 0.15;
const MINIMUM_EASE_FACTOR = 1.3;

// ============================================================================
// Sibling Burying
// ============================================================================

/**
 * Burying mode for sibling cards (from Anki's queue/mod.rs)
 * When we encounter a card with burying enabled, all future siblings
 * need to be buried, regardless of their own settings.
 */
interface BuryMode {
    buryNew: boolean;
    buryReviews: boolean;
    buryInterdayLearning: boolean;
}

/**
 * Tracks which note IDs have been seen and their burying modes.
 * Used during queue building to prevent siblings from appearing together.
 */
class SiblingTracker {
    private seenNotes = new Map<number, BuryMode>();
    
    /**
     * Check if we should bury a card based on previously seen siblings.
     * Returns true if the card should be buried.
     */
    shouldBury(card: Card, config: DeckConfig): boolean {
        const previousMode = this.seenNotes.get(card.noteId);
        if (!previousMode) {
            // First card from this note - record it and don't bury
            const currentMode: BuryMode = {
                buryNew: config.buryNew,
                buryReviews: config.buryReviews,
                buryInterdayLearning: config.buryInterdayLearning,
            };
            this.seenNotes.set(card.noteId, currentMode);
            return false;
        }
        
        // We've seen a sibling - check if we should bury this one
        let shouldBury = false;
        
        if (card.queue === CardQueue.New && previousMode.buryNew) {
            shouldBury = true;
        } else if (card.queue === CardQueue.Review && previousMode.buryReviews) {
            shouldBury = true;
        } else if (card.queue === CardQueue.DayLearn && previousMode.buryInterdayLearning) {
            shouldBury = true;
        }
        
        // Update the mode to include current card's settings (OR operation)
        const updatedMode: BuryMode = {
            buryNew: previousMode.buryNew || config.buryNew,
            buryReviews: previousMode.buryReviews || config.buryReviews,
            buryInterdayLearning: previousMode.buryInterdayLearning || config.buryInterdayLearning,
        };
        this.seenNotes.set(card.noteId, updatedMode);
        
        return shouldBury;
    }
    
    /**
     * Reset tracking (used when rebuilding queue)
     */
    reset(): void {
        this.seenNotes.clear();
    }
}

/**
 * Helper class for managing learning steps
 */
class LearningSteps {
    private steps: number[]; // in minutes

    constructor(steps: number[]) {
        this.steps = steps;
    }

    /**
     * Get delay in seconds for "again" answer (always first step)
     */
    getAgainDelaySecs(): number | null {
        if (this.steps.length === 0) return null;
        return this.steps[0] * 60;
    }

    /**
     * Get delay in seconds for "hard" answer
     */
    getHardDelaySecs(remainingSteps: number): number | null {
        if (this.steps.length === 0) return null;
        
        const currentIndex = this.steps.length - remainingSteps;
        const currentStep = this.steps[currentIndex];
        
        if (!currentStep) return this.steps[0] * 60;

        if (currentIndex === 0) {
            // Special case: for first step, hard is average of first and second steps
            if (this.steps.length > 1) {
                const avgMinutes = (this.steps[0] + this.steps[1]) / 2;
                return avgMinutes * 60;
            } else {
                // 50% more than the again step
                return Math.floor(this.steps[0] * 60 * 1.5);
            }
        }
        
        return currentStep * 60;
    }

    /**
     * Get delay in seconds for "good" answer (advance to next step)
     */
    getGoodDelaySecs(remainingSteps: number): number | null {
        if (this.steps.length === 0) return null;
        
        const currentIndex = this.steps.length - remainingSteps;
        const nextStep = this.steps[currentIndex + 1];
        
        return nextStep ? nextStep * 60 : null;
    }

    /**
     * Get remaining steps after "good" answer
     */
    getRemainingForGood(remainingSteps: number): number {
        return Math.max(0, remainingSteps - 1);
    }

    /**
     * Get remaining steps after "again" answer (reset to all steps)
     */
    getRemainingForFailed(): number {
        return this.steps.length;
    }

    isEmpty(): boolean {
        return this.steps.length === 0;
    }
}

/**
 * FSRS Scheduler - handles card scheduling using the FSRS algorithm
 * with Anki's learning steps
 */
export class FsrsScheduler {
    private fsrs: FSRS;
    private config: DeckConfig;
    private learnSteps: LearningSteps;
    private relearnSteps: LearningSteps;
    private siblingTracker: SiblingTracker;

    constructor(config: DeckConfig) {
        this.config = config;
        this.fsrs = new FSRS({
            w: config.fsrsParams,
            request_retention: config.desiredRetention,
            enable_short_term: true,
        });
        this.learnSteps = new LearningSteps(config.learnSteps);
        this.relearnSteps = new LearningSteps(config.relearnSteps);
        this.siblingTracker = new SiblingTracker();
    }

    /**
     * Converts our Card to FSRS Card format
     */
    private toFsrsCard(card: Card): FSRSCard {
        if (card.memoryState) {
            return {
                due: new Date(card.due * 1000),
                stability: card.memoryState.stability,
                difficulty: card.memoryState.difficulty,
                elapsed_days: card.interval,
                scheduled_days: card.interval,
                reps: card.reps,
                lapses: card.lapses,
                state: this.cardTypeToFsrsState(card.ctype),
                last_review: card.lastReview ? new Date(card.lastReview * 1000) : undefined,
            };
        } else {
            // New card
            return createEmptyCard(new Date());
        }
    }

    /**
     * Converts CardType to FSRS State
     */
    private cardTypeToFsrsState(ctype: CardType): State {
        switch (ctype) {
            case CardType.New:
                return State.New;
            case CardType.Learn:
            case CardType.Relearn:
                return State.Learning;
            case CardType.Review:
                return State.Review;
            default:
                return State.New;
        }
    }

    /**
     * Converts rating number to FSRS Rating
     */
    private toFsrsRating(rating: number): Rating {
        switch (rating) {
            case 1:
                return Rating.Again;
            case 2:
                return Rating.Hard;
            case 3:
                return Rating.Good;
            case 4:
                return Rating.Easy;
            default:
                return Rating.Good;
        }
    }

    /**
     * Schedules the next review for a card based on the rating
     * Returns updated card data
     * 
     * This implements Anki's hybrid approach:
     * - New cards start with learning steps
     * - Learning cards progress through steps
     * - Once all steps passed, FSRS handles reviews
     * - Failed reviews go to relearning steps
     */
    public scheduleCard(
        card: Card,
        rating: 1 | 2 | 3 | 4,
        reviewTime: number = Date.now()
    ): {
        card: Partial<Card>;
        reviewLog: Omit<ReviewLog, 'id' | 'cardId' | 'usn'>;
    } {
        const now = new Date(reviewTime);
        const reviewTimeSecs = Math.floor(reviewTime / 1000);

        // Get FSRS memory states for all answers
        const fsrsCard = this.toFsrsCard(card);
        const recordLog = this.fsrs.repeat(fsrsCard, now);
        
        // Determine which learning steps to use
        const isRelearning = card.ctype === CardType.Relearn || 
            (card.ctype === CardType.Review && rating === 1);
        const steps = isRelearning ? this.relearnSteps : this.learnSteps;

        // Check if we're in learning/relearning phase
        const inLearning = card.ctype === CardType.New || 
            card.ctype === CardType.Learn || 
            card.ctype === CardType.Relearn;

        let updatedCard: Partial<Card>;
        
        if (inLearning && !steps.isEmpty()) {
            // Use learning steps
            updatedCard = this.scheduleWithSteps(card, rating, steps, recordLog, reviewTimeSecs);
        } else if (card.ctype === CardType.Review && rating === 1 && !this.relearnSteps.isEmpty()) {
            // Failed review - enter relearning
            updatedCard = this.scheduleFailedReview(card, recordLog, reviewTimeSecs);
        } else {
            // Pure FSRS for reviews or when no steps configured
            updatedCard = this.scheduleWithFsrs(card, rating, recordLog, reviewTimeSecs);
        }

        // Create review log
        const reviewLog: Omit<ReviewLog, 'id' | 'cardId' | 'usn'> = {
            buttonChosen: rating,
            interval: card.interval,
            lastInterval: updatedCard.interval!,
            easeFactor: updatedCard.easeFactor!,
            timeTaken: 0, // Would be tracked in real app
            reviewKind: this.getReviewKind(card.ctype, rating),
            memoryState: updatedCard.memoryState!,
        };

        // Check for leech
        if (this.isLeech(card.lapses, updatedCard.lapses!)) {
            // Card has become a leech
            if (this.config.leechAction === 0) { // Suspend
                updatedCard.queue = CardQueue.Suspended;
            }
            // Tag would be handled at the deck/storage level
        }

        return { card: updatedCard, reviewLog };
    }

    /**
     * Check if a card has become a leech
     * Triggers at threshold, then every half-threshold after
     */
    private isLeech(oldLapses: number, newLapses: number): boolean {
        const threshold = this.config.leechThreshold;
        if (threshold === 0 || newLapses < threshold) {
            return false;
        }

        const halfThreshold = Math.max(1, Math.ceil(threshold / 2));
        
        // Check if we just crossed a leech boundary
        // Triggers at: threshold, threshold + halfThreshold, threshold + 2*halfThreshold, ...
        const wasLeech = oldLapses >= threshold && (oldLapses - threshold) % halfThreshold === 0;
        const isNowLeech = newLapses >= threshold && (newLapses - threshold) % halfThreshold === 0;
        
        // Only trigger if we just became a leech (not already one)
        return isNowLeech && !wasLeech;
    }

    /**
     * Schedule using learning steps
     */
    private scheduleWithSteps(
        card: Card,
        rating: 1 | 2 | 3 | 4,
        steps: LearningSteps,
        recordLog: RecordLog,
        reviewTimeSecs: number
    ): Partial<Card> {
        const isNew = card.ctype === CardType.New;
        const remainingSteps = isNew ? steps.getRemainingForFailed() : card.remainingSteps;
        
        let delaySecs: number | null;
        let newRemainingSteps: number;
        let newCtype: CardType;
        let newQueue: CardQueue;
        let memoryState: FsrsMemoryState;
        let reps = card.reps;
        let lapses = card.lapses;

        if (rating === 1) {
            // Again - reset to first step
            delaySecs = steps.getAgainDelaySecs();
            newRemainingSteps = steps.getRemainingForFailed();
            newCtype = card.lapses > 0 ? CardType.Relearn : CardType.Learn;
            memoryState = {
                stability: recordLog[Rating.Again].card.stability,
                difficulty: recordLog[Rating.Again].card.difficulty,
            };
            if (card.ctype === CardType.Review) {
                lapses++;
            }
        } else if (rating === 2) {
            // Hard - stay on current step (or average for first step)
            delaySecs = steps.getHardDelaySecs(remainingSteps);
            newRemainingSteps = remainingSteps;
            newCtype = card.lapses > 0 ? CardType.Relearn : CardType.Learn;
            memoryState = {
                stability: recordLog[Rating.Hard].card.stability,
                difficulty: recordLog[Rating.Hard].card.difficulty,
            };
        } else if (rating === 3) {
            // Good - advance to next step
            delaySecs = steps.getGoodDelaySecs(remainingSteps);
            newRemainingSteps = steps.getRemainingForGood(remainingSteps);
            memoryState = {
                stability: recordLog[Rating.Good].card.stability,
                difficulty: recordLog[Rating.Good].card.difficulty,
            };
            
            if (delaySecs === null) {
                // Graduated! Move to review using FSRS
                return this.graduateCard(card, recordLog, Rating.Good, reviewTimeSecs);
            }
            
            newCtype = card.lapses > 0 ? CardType.Relearn : CardType.Learn;
        } else {
            // Easy - graduate immediately
            return this.graduateCard(card, recordLog, Rating.Easy, reviewTimeSecs);
        }

        // Determine queue based on delay
        if (delaySecs! < 86400) {
            newQueue = CardQueue.Learn;
        } else {
            newQueue = CardQueue.DayLearn;
        }

        reps++;

        return {
            ctype: newCtype,
            queue: newQueue,
            due: reviewTimeSecs + delaySecs!,
            interval: Math.floor(delaySecs! / 86400),
            easeFactor: card.easeFactor,
            reps,
            lapses,
            remainingSteps: newRemainingSteps,
            memoryState,
            desiredRetention: this.config.desiredRetention,
            lastReview: reviewTimeSecs,
            mtime: reviewTimeSecs,
        };
    }

    /**
     * Graduate card from learning to review
     */
    private graduateCard(
        card: Card,
        recordLog: RecordLog,
        rating: Rating,
        reviewTimeSecs: number
    ): Partial<Card> {
        const schedulingResult = recordLog[rating as unknown as keyof RecordLog];
        const scheduledDays = Math.round(schedulingResult.card.scheduled_days);
        
        // Use graduating intervals if configured
        let interval = scheduledDays;
        if (rating === Rating.Good) {
            interval = Math.max(interval, this.config.graduatingIntervalGood);
        } else if (rating === Rating.Easy) {
            interval = Math.max(interval, this.config.graduatingIntervalEasy);
        }

        const dueInDays = Math.floor(reviewTimeSecs / 86400) + interval;

        // Determine ease factor: preserve for relearning, use initial for new cards
        const isRelearning = card.ctype === CardType.Relearn;
        let easeFactor: number;
        if (isRelearning) {
            // Graduating from relearning - preserve ease factor (but apply Easy adjustment)
            easeFactor = rating === Rating.Easy 
                ? this.adjustEaseFactor(card.easeFactor, 4)
                : card.easeFactor;
        } else {
            // Graduating from new/learning - use initial ease (but apply Easy adjustment)
            easeFactor = rating === Rating.Easy
                ? this.adjustEaseFactor(this.config.initialEase * 1000, 4)
                : this.config.initialEase * 1000;
        }

        return {
            ctype: CardType.Review,
            queue: CardQueue.Review,
            due: dueInDays,
            interval,
            easeFactor,
            reps: card.reps + 1,
            lapses: card.lapses,
            remainingSteps: 0,
            memoryState: {
                stability: schedulingResult.card.stability,
                difficulty: schedulingResult.card.difficulty,
            },
            desiredRetention: this.config.desiredRetention,
            lastReview: reviewTimeSecs,
            mtime: reviewTimeSecs,
        };
    }

    /**
     * Handle failed review card
     */
    private scheduleFailedReview(
        card: Card,
        recordLog: RecordLog,
        reviewTimeSecs: number
    ): Partial<Card> {
        const schedulingResult = recordLog[Rating.Again];
        
        // Always use relearning steps if configured (matching Anki's behavior)
        const delaySecs = this.relearnSteps.getAgainDelaySecs() || 600; // Default 10 minutes
        
        // Adjust ease factor for failing review (Again = -0.2, min 1.3)
        const newEaseFactor = this.adjustEaseFactor(card.easeFactor, 1);
        
        return {
            ctype: CardType.Relearn,
            queue: delaySecs < 86400 ? CardQueue.Learn : CardQueue.DayLearn,
            due: reviewTimeSecs + delaySecs,
            interval: Math.floor(delaySecs / 86400),
            easeFactor: newEaseFactor,
            reps: card.reps + 1,
            lapses: card.lapses + 1,
            remainingSteps: this.relearnSteps.getRemainingForFailed(),
            memoryState: {
                stability: schedulingResult.card.stability,
                difficulty: schedulingResult.card.difficulty,
            },
            desiredRetention: this.config.desiredRetention,
            lastReview: reviewTimeSecs,
            mtime: reviewTimeSecs,
        };
    }

    /**
     * Schedule using pure FSRS (for reviews)
     */
    private scheduleWithFsrs(
        card: Card,
        rating: 1 | 2 | 3 | 4,
        recordLog: RecordLog,
        reviewTimeSecs: number
    ): Partial<Card> {
        const fsrsRating = this.toFsrsRating(rating);
        const schedulingResult = recordLog[fsrsRating as unknown as keyof RecordLog];

        // Determine new card type and queue
        let newCtype: CardType;
        let newQueue: CardQueue;
        
        switch (schedulingResult.card.state) {
            case State.New:
                newCtype = CardType.New;
                newQueue = CardQueue.New;
                break;
            case State.Learning:
            case State.Relearning:
                newCtype = card.lapses > 0 ? CardType.Relearn : CardType.Learn;
                newQueue = schedulingResult.card.scheduled_days < 1 
                    ? CardQueue.Learn 
                    : CardQueue.DayLearn;
                break;
            case State.Review:
                newCtype = CardType.Review;
                newQueue = CardQueue.Review;
                break;
            default:
                newCtype = card.ctype;
                newQueue = card.queue;
        }

        // Calculate due date
        const dueDate = schedulingResult.card.due.getTime() / 1000;
        let due: number;
        
        if (newQueue === CardQueue.Review) {
            // For review cards, due is days since epoch
            due = Math.floor(dueDate / 86400);
        } else {
            // For learning cards, due is unix timestamp
            due = Math.floor(dueDate);
        }

        // Adjust ease factor for review cards (even with FSRS)
        let newEaseFactor = card.easeFactor;
        if (card.ctype === CardType.Review) {
            newEaseFactor = this.adjustEaseFactor(card.easeFactor, rating);
        }

        // Update card
        return {
            ctype: newCtype,
            queue: newQueue,
            due,
            interval: Math.round(schedulingResult.card.scheduled_days),
            easeFactor: newEaseFactor,
            reps: schedulingResult.card.reps,
            lapses: schedulingResult.card.lapses,
            remainingSteps: 0,
            memoryState: {
                stability: schedulingResult.card.stability,
                difficulty: schedulingResult.card.difficulty,
            },
            desiredRetention: this.config.desiredRetention,
            lastReview: reviewTimeSecs,
            mtime: reviewTimeSecs,
        };
    }

    /**
     * Adjust ease factor based on rating (matching Anki)
     * Again: -0.2, Hard: -0.15, Good: no change, Easy: +0.15
     * Minimum: 1.3 (130%)
     */
    private adjustEaseFactor(currentEase: number, rating: 1 | 2 | 3 | 4): number {
        const currentFactor = currentEase / 1000; // Convert from 2500 to 2.5
        let newFactor = currentFactor;

        switch (rating) {
            case 1: // Again
                newFactor = Math.max(currentFactor + EASE_FACTOR_AGAIN_DELTA, MINIMUM_EASE_FACTOR);
                break;
            case 2: // Hard
                newFactor = Math.max(currentFactor + EASE_FACTOR_HARD_DELTA, MINIMUM_EASE_FACTOR);
                break;
            case 3: // Good
                // No change
                break;
            case 4: // Easy
                newFactor = currentFactor + EASE_FACTOR_EASY_DELTA;
                break;
        }

        return Math.round(newFactor * 1000); // Convert back to 2500 format
    }

    /**
     * Gets the review kind based on card type and rating
     */
    private getReviewKind(ctype: CardType, rating: number): ReviewKind {
        if (ctype === CardType.New) {
            return ReviewKind.Learning;
        } else if (ctype === CardType.Learn || ctype === CardType.Relearn) {
            return rating === 1 ? ReviewKind.Relearn : ReviewKind.Learning;
        } else {
            return rating === 1 ? ReviewKind.Relearn : ReviewKind.Review;
        }
    }

    /**
     * Gets the intervals for each button (for display purposes)
     * Accounts for learning steps when applicable
     */
    public getButtonIntervals(card: Card): {
        again: string;
        hard: string;
        good: string;
        easy: string;
    } {
        const formatInterval = (secs: number): string => {
            if (secs < 60) {
                return `${Math.round(secs)}s`;
            } else if (secs < 3600) {
                return `${Math.round(secs / 60)}m`;
            } else if (secs < 86400) {
                return `${Math.round(secs / 3600)}h`;
            }
            
            const days = secs / 86400;
            if (days < 30) {
                return `${Math.round(days)}d`;
            } else if (days < 365) {
                return `${Math.round(days / 30)}mo`;
            } else {
                return `${(days / 365).toFixed(1)}y`;
            }
        };

        // Check if we're using learning steps
        const inLearning = card.ctype === CardType.New || 
            card.ctype === CardType.Learn || 
            card.ctype === CardType.Relearn;
        
        const isRelearning = card.ctype === CardType.Relearn;
        const steps = isRelearning ? this.relearnSteps : this.learnSteps;

        // Get FSRS intervals
        const fsrsCard = this.toFsrsCard(card);
        const recordLog = this.fsrs.repeat(fsrsCard, new Date());

        if (inLearning && !steps.isEmpty()) {
            const remainingSteps = card.ctype === CardType.New 
                ? steps.getRemainingForFailed() 
                : card.remainingSteps;

            const againSecs = steps.getAgainDelaySecs() || 60;
            const hardSecs = steps.getHardDelaySecs(remainingSteps) || againSecs;
            const goodSecs = steps.getGoodDelaySecs(remainingSteps);

            const easySecs = Math.round(recordLog[Rating.Easy].card.scheduled_days * 86400);

            return {
                again: formatInterval(againSecs),
                hard: formatInterval(hardSecs),
                good: goodSecs ? formatInterval(goodSecs) : formatInterval(recordLog[Rating.Good].card.scheduled_days * 86400),
                easy: formatInterval(easySecs),
            };
        } else if (card.ctype === CardType.Review && !this.relearnSteps.isEmpty()) {
            // Review card - show relearn step for "Again"
            const againSecs = this.relearnSteps.getAgainDelaySecs() || 600;
            
            return {
                again: formatInterval(againSecs),
                hard: formatInterval(recordLog[Rating.Hard].card.scheduled_days * 86400),
                good: formatInterval(recordLog[Rating.Good].card.scheduled_days * 86400),
                easy: formatInterval(recordLog[Rating.Easy].card.scheduled_days * 86400),
            };
        } else {
            // Use FSRS intervals
            return {
                again: formatInterval(recordLog[Rating.Again].card.scheduled_days * 86400),
                hard: formatInterval(recordLog[Rating.Hard].card.scheduled_days * 86400),
                good: formatInterval(recordLog[Rating.Good].card.scheduled_days * 86400),
                easy: formatInterval(recordLog[Rating.Easy].card.scheduled_days * 86400),
            };
        }
    }

    // ========================================================================
    // Sibling Burying Methods
    // ========================================================================

    /**
     * Checks if a card should be buried based on previously seen siblings.
     * This is used during queue building to prevent siblings from appearing together.
     * 
     * Implementation matches Anki's queue/builder/burying.rs
     */
    public shouldBurySibling(card: Card): boolean {
        return this.siblingTracker.shouldBury(card, this.config);
    }

    /**
     * Bury all remaining sibling cards after answering a card.
     * This is called after a card is answered to prevent other cards from
     * the same note appearing in the same session.
     * 
     * Implementation matches Anki's bury_and_suspend.rs
     */
    public burySiblings(cards: Card[], answeredCard: Card): Card[] {
        const buryMode: BuryMode = {
            buryNew: this.config.buryNew,
            buryReviews: this.config.buryReviews,
            buryInterdayLearning: this.config.buryInterdayLearning,
        };

        // No burying enabled
        if (!buryMode.buryNew && !buryMode.buryReviews && !buryMode.buryInterdayLearning) {
            return cards;
        }

        // Anki's exclude_earlier_gathered_queues logic (from bury_and_suspend.rs)
        // This prevents burying queues that were gathered before the answered card's queue
        const excludeEarlierQueues = (mode: BuryMode, queue: CardQueue): BuryMode => {
            const gatherOrder = (q: CardQueue): number => {
                switch (q) {
                    case CardQueue.Learn:
                    case CardQueue.PreviewRepeat:
                        return 0;
                    case CardQueue.DayLearn:
                        return 1;
                    case CardQueue.Review:
                        return 2;
                    case CardQueue.New:
                        return 3;
                    default:
                        return 999; // Not gathered
                }
            };

            const answerOrder = gatherOrder(queue);
            
            return {
                buryNew: mode.buryNew,
                buryReviews: mode.buryReviews && answerOrder <= gatherOrder(CardQueue.Review),
                buryInterdayLearning: mode.buryInterdayLearning && answerOrder <= gatherOrder(CardQueue.DayLearn),
            };
        };

        const effectiveMode = excludeEarlierQueues(buryMode, answeredCard.queue);

        // Bury siblings (from siblings_for_bury.sql logic)
        return cards.map(card => {
            // Don't bury the answered card itself
            if (card.id === answeredCard.id) {
                return card;
            }

            // Only bury cards from the same note
            if (card.noteId !== answeredCard.noteId) {
                return card;
            }

            // Don't bury already buried or suspended cards
            if (card.queue === CardQueue.Suspended ||
                card.queue === CardQueue.SchedBuried ||
                card.queue === CardQueue.UserBuried) {
                return card;
            }

            // Check if this card should be buried based on its queue
            let shouldBury = false;
            if (card.queue === CardQueue.New && effectiveMode.buryNew) {
                shouldBury = true;
            } else if (card.queue === CardQueue.Review && effectiveMode.buryReviews) {
                shouldBury = true;
            } else if (card.queue === CardQueue.DayLearn && effectiveMode.buryInterdayLearning) {
                shouldBury = true;
            }

            if (shouldBury) {
                return {
                    ...card,
                    queue: CardQueue.SchedBuried,
                };
            }

            return card;
        });
    }

    /**
     * Unbury all cards that were automatically buried (SchedBuried).
     * This is typically done at the start of a new day.
     * 
     * Implementation matches Anki's unbury_on_day_rollover
     */
    public static unburyCards(cards: Card[]): Card[] {
        return cards.map(card => {
            if (card.queue === CardQueue.SchedBuried) {
                // Restore the queue based on card type (from Card::restore_queue_from_type)
                let restoredQueue: CardQueue;
                switch (card.ctype) {
                    case CardType.New:
                        restoredQueue = CardQueue.New;
                        break;
                    case CardType.Learn:
                    case CardType.Relearn:
                        restoredQueue = card.due < 86400 ? CardQueue.Learn : CardQueue.DayLearn;
                        break;
                    case CardType.Review:
                        restoredQueue = CardQueue.Review;
                        break;
                    default:
                        restoredQueue = CardQueue.New;
                }
                
                return {
                    ...card,
                    queue: restoredQueue,
                };
            }
            return card;
        });
    }

    /**
     * Reset sibling tracking (called when rebuilding queue)
     */
    public resetSiblingTracking(): void {
        this.siblingTracker.reset();
    }
}
