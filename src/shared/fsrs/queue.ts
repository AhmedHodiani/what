// Copyright: Ankitects Pty Ltd and contributors
// License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html

import type { Card, Deck } from './types';
import { CardQueue } from './types';

/**
 * Hash function using FNV-1a algorithm (same as Anki's FnvHasher)
 */
function fnvHash(value: number, salt: number): number {
    const FNV_OFFSET = 0xcbf29ce484222325n;
    const FNV_PRIME = 0x100000001b3n;
    
    let hash = FNV_OFFSET;
    
    // Hash the value
    const valueBytes = new BigInt64Array([BigInt(value)]);
    const valueU8 = new Uint8Array(valueBytes.buffer);
    for (const byte of valueU8) {
        hash ^= BigInt(byte);
        hash = (hash * FNV_PRIME) & 0xFFFFFFFFFFFFFFFFn;
    }
    
    // Hash the salt
    const saltBytes = new BigInt64Array([BigInt(salt)]);
    const saltU8 = new Uint8Array(saltBytes.buffer);
    for (const byte of saltU8) {
        hash ^= BigInt(byte);
        hash = (hash * FNV_PRIME) & 0xFFFFFFFFFFFFFFFFn;
    }
    
    return Number(hash & 0xFFFFFFFFFFFFFFFFn);
}

/**
 * Sort new cards according to Anki's sorting algorithm
 */
export function sortNewCards(cards: Card[], sortOrder: 'random' | 'order-added' | 'random-note', daysElapsed: number): Card[] {
    if (sortOrder === 'order-added') {
        // Keep original order (sort by card ID)
        return cards.sort((a, b) => a.id - b.id);
    }
    
    if (sortOrder === 'random') {
        // Hash by card ID with daily salt
        const withHash = cards.map(card => ({
            card,
            hash: fnvHash(card.id, daysElapsed)
        }));
        withHash.sort((a, b) => a.hash - b.hash);
        return withHash.map(item => item.card);
    }
    
    if (sortOrder === 'random-note') {
        // Hash by note ID with daily salt
        const withHash = cards.map(card => ({
            card,
            hash: fnvHash(card.noteId, daysElapsed)
        }));
        withHash.sort((a, b) => a.hash - b.hash);
        return withHash.map(item => item.card);
    }
    
    return cards;
}

/**
 * Calculate relative overdueness (retrievability) for SM-2
 * Based on Anki's RetrievabilitySm2 formula
 */
function calculateRelativeOverdueness(card: Card, today: number): number {
    // -(1 + (elapsed days + 0.001) / (scheduled interval))
    const elapsedDays = today - card.due;
    return -(1 + (elapsedDays + 0.001) / card.interval);
}

/**
 * Calculate FSRS retrievability (approximate)
 * This is a simplified version - full FSRS retrievability requires memory state
 */
function calculateFsrsRetrievability(card: Card, today: number): number {
    if (!card.memoryState) {
        // Fallback to SM-2 style calculation
        return calculateRelativeOverdueness(card, today);
    }
    
    // Simplified retrievability based on stability and elapsed time
    // Full formula: R = exp(ln(0.9) * t / S)
    const elapsedDays = today - card.due;
    const t = elapsedDays + card.interval;
    const stability = card.memoryState.stability;
    
    // Approximate: R = 0.9^(t/S)
    return Math.pow(0.9, t / stability);
}

/**
 * Sort review cards according to Anki's sorting algorithm
 * Implements all ReviewCardOrder options from Anki's review_order_sql
 */
export function sortReviewCards(
    cards: Card[],
    sortOrder: 'day' | 'day-then-deck' | 'deck-then-day' | 'intervals-ascending' | 
               'intervals-descending' | 'ease-ascending' | 'ease-descending' | 
               'relative-overdueness' | 'random' | 'added' | 'reverse-added',
    daysElapsed: number,
    useFsrs: boolean = true
): Card[] {
    const sorted = [...cards];
    
    // First, add hash to all cards for tiebreaker (matches Anki adding Random to subclauses)
    const withHash = sorted.map(card => ({
        card,
        hash: fnvHash(card.id, daysElapsed)
    }));
    
    switch (sortOrder) {
        case 'day':
            // Sort by due date, then random tiebreaker
            withHash.sort((a, b) => {
                if (a.card.due !== b.card.due) return a.card.due - b.card.due;
                return a.hash - b.hash;
            });
            break;
            
        case 'day-then-deck':
            // Sort by due date, then by deck ID, then random tiebreaker
            withHash.sort((a, b) => {
                if (a.card.due !== b.card.due) return a.card.due - b.card.due;
                if (a.card.deckId !== b.card.deckId) return a.card.deckId - b.card.deckId;
                return a.hash - b.hash;
            });
            break;
            
        case 'deck-then-day':
            // Sort by deck ID, then by due date, then random tiebreaker
            withHash.sort((a, b) => {
                if (a.card.deckId !== b.card.deckId) return a.card.deckId - b.card.deckId;
                if (a.card.due !== b.card.due) return a.card.due - b.card.due;
                return a.hash - b.hash;
            });
            break;
            
        case 'intervals-ascending':
            // Sort by interval (ascending), then random tiebreaker
            withHash.sort((a, b) => {
                if (a.card.interval !== b.card.interval) return a.card.interval - b.card.interval;
                return a.hash - b.hash;
            });
            break;
            
        case 'intervals-descending':
            // Sort by interval (descending), then random tiebreaker
            withHash.sort((a, b) => {
                if (a.card.interval !== b.card.interval) return b.card.interval - a.card.interval;
                return a.hash - b.hash;
            });
            break;
            
        case 'ease-ascending':
            // FSRS: sort by difficulty descending (lower difficulty = easier)
            // SM-2: sort by ease factor ascending
            if (useFsrs) {
                withHash.sort((a, b) => {
                    const diffA = a.card.memoryState?.difficulty ?? 5.0;
                    const diffB = b.card.memoryState?.difficulty ?? 5.0;
                    if (diffA !== diffB) return diffB - diffA; // Descending difficulty = ascending ease
                    return a.hash - b.hash;
                });
            } else {
                withHash.sort((a, b) => {
                    if (a.card.easeFactor !== b.card.easeFactor) return a.card.easeFactor - b.card.easeFactor;
                    return a.hash - b.hash;
                });
            }
            break;
            
        case 'ease-descending':
            // FSRS: sort by difficulty ascending (higher difficulty = harder)
            // SM-2: sort by ease factor descending
            if (useFsrs) {
                withHash.sort((a, b) => {
                    const diffA = a.card.memoryState?.difficulty ?? 5.0;
                    const diffB = b.card.memoryState?.difficulty ?? 5.0;
                    if (diffA !== diffB) return diffA - diffB; // Ascending difficulty = descending ease
                    return a.hash - b.hash;
                });
            } else {
                withHash.sort((a, b) => {
                    if (a.card.easeFactor !== b.card.easeFactor) return b.card.easeFactor - a.card.easeFactor;
                    return a.hash - b.hash;
                });
            }
            break;
            
        case 'relative-overdueness':
            // Sort by retrievability (how overdue relative to interval)
            // Ascending = most overdue first (lowest retrievability)
            if (useFsrs) {
                withHash.sort((a, b) => {
                    const retA = calculateFsrsRetrievability(a.card, daysElapsed);
                    const retB = calculateFsrsRetrievability(b.card, daysElapsed);
                    if (retA !== retB) return retA - retB;
                    return a.hash - b.hash;
                });
            } else {
                withHash.sort((a, b) => {
                    const overdueA = calculateRelativeOverdueness(a.card, daysElapsed);
                    const overdueB = calculateRelativeOverdueness(b.card, daysElapsed);
                    if (overdueA !== overdueB) return overdueA - overdueB;
                    return a.hash - b.hash;
                });
            }
            break;
            
        case 'added':
            // Sort by note ID ascending, then card ID, then random tiebreaker
            withHash.sort((a, b) => {
                if (a.card.noteId !== b.card.noteId) return a.card.noteId - b.card.noteId;
                if (a.card.id !== b.card.id) return a.card.id - b.card.id;
                return a.hash - b.hash;
            });
            break;
            
        case 'reverse-added':
            // Sort by note ID descending, then card ID, then random tiebreaker
            withHash.sort((a, b) => {
                if (a.card.noteId !== b.card.noteId) return b.card.noteId - a.card.noteId;
                if (a.card.id !== b.card.id) return a.card.id - b.card.id;
                return a.hash - b.hash;
            });
            break;
            
        case 'random':
            // Sort purely by hash
            withHash.sort((a, b) => a.hash - b.hash);
            break;
    }
    
    return withHash.map(item => item.card);
}

/**
 * Intersperser - evenly mixes two arrays according to their ratio
 * Based on Anki's Intersperser implementation
 */
export class Intersperser<T> {
    private oneIdx = 0;
    private twoIdx = 0;
    private ratio: number;
    
    constructor(
        private one: T[],
        private two: T[]
    ) {
        this.ratio = (one.length + 1) / (two.length + 1);
    }
    
    next(): T | undefined {
        const hasOne = this.oneIdx < this.one.length;
        const hastwo = this.twoIdx < this.two.length;
        
        if (!hasOne && !hastwo) {
            return undefined;
        }
        
        if (hasOne && !hastwo) {
            return this.one[this.oneIdx++];
        }
        
        if (!hasOne && hastwo) {
            return this.two[this.twoIdx++];
        }
        
        // Both available - decide which to take based on ratio
        const relativeTwoIdx = (this.twoIdx + 1) * this.ratio;
        if (relativeTwoIdx < (this.oneIdx + 1)) {
            return this.two[this.twoIdx++];
        } else {
            return this.one[this.oneIdx++];
        }
    }
    
    toArray(): T[] {
        const result: T[] = [];
        let item: T | undefined;
        while ((item = this.next()) !== undefined) {
            result.push(item);
        }
        return result;
    }
}

/**
 * Queue entry types
 */
export interface QueueEntry {
    card: Card;
    kind: 'new' | 'review' | 'learning' | 'day-learning';
}

export interface LearningQueueEntry {
    card: Card;
    due: number; // timestamp in seconds
}

/**
 * Card queue builder - implements Anki's queue building logic
 */
export class CardQueueBuilder {
    private newCards: Card[] = [];
    private reviewCards: Card[] = [];
    private learningCards: Card[] = [];
    private dayLearningCards: Card[] = [];
    private intradayLearningCards: LearningQueueEntry[] = [];
    
    private currentDay: number;
    private currentTimestamp: number;
    private learnAheadSecs: number;
    private currentLearningCutoff: number;
    
    constructor(
        private deck: Deck,
        learnAheadSecs: number = 1200 // 20 minutes default
    ) {
        this.currentTimestamp = Math.floor(Date.now() / 1000);
        this.currentDay = Math.floor(this.currentTimestamp / 86400);
        this.learnAheadSecs = learnAheadSecs;
        this.currentLearningCutoff = this.currentTimestamp;
    }
    
    /**
     * Build the queue from deck cards
     */
    build(): {
        mainQueue: QueueEntry[];
        intradayLearning: LearningQueueEntry[];
        counts: { new: number; learning: number; review: number };
    } {
        this.gatherCards();
        this.sortCards();
        const mainQueue = this.buildMainQueue();
        
        return {
            mainQueue,
            intradayLearning: this.intradayLearningCards,
            counts: {
                new: this.newCards.length,
                learning: this.getIntradayNowCount(),
                review: this.reviewCards.length + this.dayLearningCards.length
            }
        };
    }
    
    /**
     * Gather cards from deck and categorize them
     */
    private gatherCards(): void {
        for (const card of this.deck.cards) {
            // Skip suspended cards
            if (card.queue === CardQueue.Suspended) {
                continue;
            }
            
            // Categorize by type and queue
            if (card.queue === CardQueue.New) {
                this.newCards.push(card);
            } else if (card.queue === CardQueue.Learn || card.queue === CardQueue.PreviewRepeat) {
                // Intraday learning - cards due today (timestamp comparison)
                if (card.due < this.currentTimestamp + 86400) {
                    this.intradayLearningCards.push({
                        card,
                        due: card.due
                    });
                }
            } else if (card.queue === CardQueue.DayLearn) {
                // Day learning cards
                if (card.due <= this.currentDay) {
                    this.dayLearningCards.push(card);
                }
            } else if (card.queue === CardQueue.Review) {
                // Review cards - due is in days since epoch
                if (card.due <= this.currentDay) {
                    this.reviewCards.push(card);
                }
            }
        }
        
        // Sort intraday learning by due time
        this.intradayLearningCards.sort((a, b) => a.due - b.due);
    }
    
    /**
     * Sort cards according to deck configuration
     */
    private sortCards(): void {
        // Sort new cards (using random for now)
        this.newCards = sortNewCards(this.newCards, 'random', this.currentDay);
        
        // Sort review cards according to deck config
        const reviewOrder = this.getReviewOrderFromConfig();
        const useFsrs = this.deck.config.fsrsParams.length === 19;
        this.reviewCards = sortReviewCards(this.reviewCards, reviewOrder, this.currentDay, useFsrs);
        
        // Day learning cards also sorted by due
        this.dayLearningCards.sort((a, b) => a.due - b.due);
    }
    
    /**
     * Map deck config ReviewCardOrder to sortReviewCards order string
     */
    private getReviewOrderFromConfig(): 'day' | 'day-then-deck' | 'deck-then-day' | 
                                        'intervals-ascending' | 'intervals-descending' | 
                                        'ease-ascending' | 'ease-descending' | 
                                        'relative-overdueness' | 'random' | 'added' | 'reverse-added' {
        const config = this.deck.config;
        
        // Map ReviewCardOrder enum to string
        switch (config.reviewOrder) {
            case 0: return 'day';
            case 1: return 'day-then-deck';
            case 2: return 'deck-then-day';
            case 4: return 'intervals-ascending';
            case 5: return 'intervals-descending';
            case 6: return 'ease-ascending';
            case 7: return 'ease-descending';
            case 8: return 'relative-overdueness';
            case 3: return 'random';
            default: return 'day'; // Default fallback
        }
    }
    
    /**
     * Build the main queue by interspersing new, review, and day learning cards
     */
    private buildMainQueue(): QueueEntry[] {
        // First, mix review cards with day learning cards
        const reviewEntries: QueueEntry[] = this.reviewCards.map(card => ({
            card,
            kind: 'review' as const
        }));
        
        const dayLearningEntries: QueueEntry[] = this.dayLearningCards.map(card => ({
            card,
            kind: 'day-learning' as const
        }));
        
        // Intersperse day learning with reviews
        const reviewWithLearning = new Intersperser(reviewEntries, dayLearningEntries).toArray();
        
        // Then intersperse new cards with the combined review+learning
        const newEntries: QueueEntry[] = this.newCards.map(card => ({
            card,
            kind: 'new' as const
        }));
        
        // Mix new with review+learning (this respects the new/review mix ratio)
        return new Intersperser(reviewWithLearning, newEntries).toArray();
    }
    
    /**
     * Get count of intraday learning cards that are due now
     */
    private getIntradayNowCount(): number {
        return this.intradayLearningCards.filter(
            entry => entry.due <= this.currentLearningCutoff
        ).length;
    }
    
    /**
     * Get intraday learning cards that are due now
     */
    getIntradayNow(): LearningQueueEntry[] {
        return this.intradayLearningCards.filter(
            entry => entry.due <= this.currentLearningCutoff
        );
    }
    
    /**
     * Get intraday learning cards that are due within learn-ahead window
     */
    getIntradayAhead(): LearningQueueEntry[] {
        const cutoff = this.currentLearningCutoff + this.learnAheadSecs;
        return this.intradayLearningCards.filter(
            entry => entry.due > this.currentLearningCutoff && entry.due <= cutoff
        );
    }
    
    /**
     * Update learning cutoff to current time
     */
    updateLearningCutoff(): void {
        this.currentLearningCutoff = Math.floor(Date.now() / 1000);
    }
    
    /**
     * Requeue a learning card, avoiding immediate re-show
     */
    requeueLearningCard(card: Card): void {
        const entry: LearningQueueEntry = {
            card,
            due: card.due
        };
        
        // If the card would be shown immediately and main queue is empty,
        // try to place it after the next learning card
        const learnAheadCutoff = this.currentLearningCutoff + this.learnAheadSecs;
        if (entry.due <= learnAheadCutoff && this.intradayLearningCards.length > 0) {
            const next = this.intradayLearningCards[0];
            if (next && next.due >= entry.due && next.due + 1 < learnAheadCutoff) {
                entry.due = next.due + 1;
            }
        }
        
        // Insert in sorted position
        const insertIdx = this.intradayLearningCards.findIndex(e => e.due > entry.due);
        if (insertIdx === -1) {
            this.intradayLearningCards.push(entry);
        } else {
            this.intradayLearningCards.splice(insertIdx, 0, entry);
        }
    }
    
    /**
     * Remove a card from intraday learning queue
     */
    removeIntradayLearningCard(cardId: number): LearningQueueEntry | undefined {
        const idx = this.intradayLearningCards.findIndex(e => e.card.id === cardId);
        if (idx !== -1) {
            return this.intradayLearningCards.splice(idx, 1)[0];
        }
        return undefined;
    }
}
