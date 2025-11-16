// Copyright: Ankitects Pty Ltd and contributors
// License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html

import type { DeckConfig } from './types';
import {
    NewCardInsertOrder,
    NewCardGatherPriority,
    NewCardSortOrder,
    ReviewCardOrder,
    ReviewMix,
    LeechAction,
} from './types';

/**
 * Default FSRS parameters (version 6, 19 parameters)
 * These are optimized values from FSRS research
 */
export const DEFAULT_FSRS_PARAMS = [
    0.4072, 1.1829, 3.1262, 15.4722, 7.2102,
    0.5316, 1.0651, 0.0234, 1.616, 0.1544,
    1.0824, 1.9813, 0.0953, 0.2975, 2.2042,
    0.2407, 2.9466, 0.5034, 0.6567
];

/**
 * Creates default deck configuration matching Anki's defaults with FSRS
 */
export function createDefaultDeckConfig(): DeckConfig {
    return {
        // Learning steps: 1 minute, 5 minutes
        learnSteps: [1.0, 5.0],
        
        // Relearning steps: 5 minutes
        relearnSteps: [5.0],
        
        // Daily limits
        newPerDay: 20,
        reviewsPerDay: 200,
        
        // Graduating intervals
        graduatingIntervalGood: 1, // 1 day
        graduatingIntervalEasy: 4, // 4 days
        
        // Ease factors
        initialEase: 2.5,
        easyMultiplier: 1.3,
        hardMultiplier: 1.2,
        lapseMultiplier: 0.0,
        intervalMultiplier: 1.0,
        
        // Review settings
        maximumReviewInterval: 36500, // 100 years
        minimumLapseInterval: 1,
        
        // FSRS Parameters
        fsrsParams: [...DEFAULT_FSRS_PARAMS],
        desiredRetention: 0.99, // 99% retention target
        
        // Card ordering
        newCardInsertOrder: NewCardInsertOrder.Due,
        newCardGatherPriority: NewCardGatherPriority.Deck,
        newCardSortOrder: NewCardSortOrder.Template,
        reviewOrder: ReviewCardOrder.Day,
        newMix: ReviewMix.MixWithReviews,
        interdayLearningMix: ReviewMix.MixWithReviews,
        
        // Leech handling
        leechAction: LeechAction.TagOnly,
        leechThreshold: 8,
        
        // Sibling burying (disabled by default like Anki)
        buryNew: false,
        buryReviews: false,
        buryInterdayLearning: false,
        
        // Display settings
        showTimer: false,
        autoplay: false,
        
        // Easy days (100% for all days by default)
        easyDaysPercentages: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    };
}

/**
 * Validates FSRS parameters
 */
export function validateFsrsParams(params: number[]): boolean {
    if (params.length !== 19) {
        return false;
    }
    
    // Basic validation - all params should be positive and finite
    return params.every(p => Number.isFinite(p) && p > 0);
}

/**
 * Validates desired retention value
 */
export function validateDesiredRetention(retention: number): boolean {
    return retention > 0 && retention < 1;
}
