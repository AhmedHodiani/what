// Copyright: Ankitects Pty Ltd and contributors
// License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html

import type { Card, FsrsMemoryState } from './types';
import { CardType as CT, CardQueue as CQ } from './types';

let nextCardId = 1;
let nextNoteId = 1;

/**
 * Generates a unique card ID (timestamp-based like Anki)
 */
export function generateCardId(): number {
    return Date.now() * 1000 + nextCardId++;
}

/**
 * Generates a unique note ID
 */
export function generateNoteId(): number {
    return Date.now() * 1000 + nextNoteId++;
}

/**
 * Creates a new card with default values
 */
export function createNewCard(
    front: string,
    back: string,
    deckId: number = 1
): Card {
    const now = Math.floor(Date.now() / 1000);
    
    return {
        id: generateCardId(),
        noteId: generateNoteId(),
        deckId,
        
        // Content
        front,
        back,
        
        // New card defaults
        ctype: CT.New,
        queue: CQ.New,
        due: 0, // position in new queue
        interval: 0,
        easeFactor: 2500, // 250% stored as 2500
        reps: 0,
        lapses: 0,
        remainingSteps: 0,
        
        // FSRS (will be set after first review)
        memoryState: null,
        desiredRetention: null,
        
        // Timestamps
        mtime: now,
        lastReview: null,
        
        // Metadata
        flags: 0,
        customData: '',
    };
}

/**
 * Calculates the normalized difficulty from FSRS memory state (0.0-1.0)
 */
export function getNormalizedDifficulty(memoryState: FsrsMemoryState): number {
    return (memoryState.difficulty - 1.0) / 9.0;
}

/**
 * Converts ease factor from storage format (2500) to percentage (2.5)
 */
export function easeFactorToPercentage(easeFactor: number): number {
    return easeFactor / 1000;
}

/**
 * Converts ease factor from percentage (2.5) to storage format (2500)
 */
export function percentageToEaseFactor(percentage: number): number {
    return Math.round(percentage * 1000);
}

/**
 * Checks if a card is due for review
 */
export function isCardDue(card: Card, now: number = Date.now() / 1000): boolean {
    switch (card.queue) {
        case CQ.New:
            return true; // New cards are always "due"
        case CQ.Learn:
        case CQ.DayLearn:
        case CQ.PreviewRepeat:
            return card.due <= now;
        case CQ.Review:
            const daysElapsed = Math.floor(now / 86400);
            return card.due <= daysElapsed;
        case CQ.Suspended:
        case CQ.SchedBuried:
        case CQ.UserBuried:
            return false;
        default:
            return false;
    }
}

/**
 * Gets the days until the card is due
 */
export function getDaysUntilDue(card: Card, now: number = Date.now() / 1000): number {
    if (card.queue === CQ.Review) {
        const daysElapsed = Math.floor(now / 86400);
        return card.due - daysElapsed;
    }
    return 0;
}

/**
 * Formats interval for display
 */
export function formatInterval(interval: number): string {
    if (interval === 0) {
        return 'New';
    } else if (interval < 1) {
        const minutes = Math.round(interval * 1440);
        return `${minutes}m`;
    } else if (interval < 30) {
        return `${interval}d`;
    } else if (interval < 365) {
        const months = Math.round(interval / 30);
        return `${months}mo`;
    } else {
        const years = (interval / 365).toFixed(1);
        return `${years}y`;
    }
}
