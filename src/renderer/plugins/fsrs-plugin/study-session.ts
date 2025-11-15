/**
 * Study Session Manager
 * 
 * Manages the study session flow, card selection, and review tracking.
 * Implements Anki's card queueing and selection logic.
 */

import {
  Card,
  CardQueue,
  Deck,
  DeckConfig,
  StudySession,
  CardCounts,
  Rating,
  ReviewLog,
} from './types';
import { CardStateMachine } from './card-state-machine';

/**
 * Study Session Manager
 * Controls the flow of a study session
 */
export class StudySessionManager {
  private stateMachine: CardStateMachine;
  private session: StudySession | null = null;

  constructor(fsrsParams?: number[]) {
    this.stateMachine = new CardStateMachine(fsrsParams);
  }

  /**
   * Start a new study session for a deck
   * 
   * @param deck - The deck to study
   * @param cards - All cards in the deck
   * @param config - Deck configuration
   * @returns Study session
   */
  startSession(deck: Deck, cards: Card[], _config: DeckConfig): StudySession {
    const counts = this.calculateCounts(cards);
    
    this.session = {
      deckId: deck.id,
      currentCard: null,
      counts,
      reviewed: 0,
      startTime: Date.now(),
    };

    return this.session;
  }

  /**
   * Get the next card to review in the session
   * 
   * @param cards - All available cards
   * @param config - Deck configuration
   * @returns Next card or null if session is complete
   */
  getNextCard(cards: Card[], config: DeckConfig): Card | null {
    if (!this.session) {
      throw new Error('No active session. Call startSession first.');
    }

    // Filter cards that are due
    const dueCards = this.getDueCards(cards);
    
    if (dueCards.length === 0) {
      return null;
    }

    // Select next card based on priority
    const nextCard = this.selectNextCard(dueCards, config);
    
    if (nextCard) {
      this.session.currentCard = nextCard;
    }

    return nextCard;
  }

  /**
   * Answer the current card
   * 
   * @param card - Card being answered
   * @param rating - Rating given
   * @param config - Deck configuration
   * @param timeTaken - Time taken in milliseconds
   * @returns Updated card and review log
   */
  answerCard(
    card: Card,
    rating: Rating,
    config: DeckConfig,
    timeTaken: number = 0
  ): { card: Card; log: ReviewLog } {
    if (!this.session) {
      throw new Error('No active session');
    }

    // Apply the rating to get the new card state
    const newCard = this.stateMachine.answerCard(card, rating, config, timeTaken);

    // Create review log
    const log: ReviewLog = {
      id: this.generateId(),
      cardId: card.id,
      timestamp: Date.now(),
      rating,
      timeTaken,
      cardType: card.ctype,
      lastInterval: card.interval,
      newInterval: newCard.interval,
      easeFactor: newCard.easeFactor,
    };

    // Update session
    this.session.reviewed++;
    this.session.currentCard = null;

    return { card: newCard, log };
  }

  /**
   * Get card counts for current session
   */
  getCounts(cards: Card[]): CardCounts {
    return this.calculateCounts(cards);
  }

  /**
   * End the current session
   * 
   * @returns Session summary
   */
  endSession(): {
    reviewed: number;
    duration: number;
  } | null {
    if (!this.session) {
      return null;
    }

    const summary = {
      reviewed: this.session.reviewed,
      duration: Date.now() - this.session.startTime,
    };

    this.session = null;
    return summary;
  }

  /**
   * Get current session state
   */
  getSession(): StudySession | null {
    return this.session;
  }

  // ============================================================================
  // CARD SELECTION & FILTERING
  // ============================================================================

  /**
   * Get all cards that are currently due for review
   */
  private getDueCards(cards: Card[]): Card[] {
    const now = Date.now();
    
    return cards.filter(card => {
      // Skip suspended or buried cards
      if (
        card.queue === CardQueue.Suspended ||
        card.queue === CardQueue.SchedBuried ||
        card.queue === CardQueue.UserBuried
      ) {
        return false;
      }

      // Check if card is due based on its queue type
      switch (card.queue) {
        case CardQueue.New:
          return true; // New cards are always "due"
        
        case CardQueue.Learn:
        case CardQueue.PreviewRepeat:
          // Learning cards: due is a timestamp
          return card.due <= now;
        
        case CardQueue.Review:
        case CardQueue.DayLearn:
          // Review cards: due is days since creation, compare with current day
          const currentDay = this.getCurrentDay();
          return card.due <= currentDay;
        
        default:
          return false;
      }
    });
  }

  /**
   * Select the next card to show based on priority
   * Priority: Learning > Review > New
   */
  private selectNextCard(dueCards: Card[], config: DeckConfig): Card | null {
    if (dueCards.length === 0) {
      return null;
    }

    // Separate cards by type
    const learningCards = dueCards.filter(c => 
      c.queue === CardQueue.Learn || c.queue === CardQueue.PreviewRepeat
    );
    const reviewCards = dueCards.filter(c => 
      c.queue === CardQueue.Review || c.queue === CardQueue.DayLearn
    );
    const newCards = dueCards.filter(c => c.queue === CardQueue.New);

    // Priority 1: Learning cards (most urgent)
    if (learningCards.length > 0) {
      return this.selectLearningCard(learningCards);
    }

    // Check daily limits before showing review or new cards
    if (!this.session) {
      return null;
    }

    // Priority 2: Review cards
    if (reviewCards.length > 0 && this.session.reviewed < config.reviewsPerDay) {
      return this.selectReviewCard(reviewCards);
    }

    // Priority 3: New cards
    if (newCards.length > 0 && this.session.reviewed < config.newPerDay) {
      return this.selectNewCard(newCards);
    }

    // If we have cards but hit daily limits, return the most urgent learning card
    if (learningCards.length > 0) {
      return this.selectLearningCard(learningCards);
    }

    return null;
  }

  /**
   * Select a learning card (earliest due first)
   */
  private selectLearningCard(cards: Card[]): Card {
    return cards.sort((a, b) => a.due - b.due)[0];
  }

  /**
   * Select a review card (random from overdue, or earliest)
   */
  private selectReviewCard(cards: Card[]): Card {
    // Sort by due date
    const sorted = cards.sort((a, b) => a.due - b.due);
    
    // Take the most overdue card
    return sorted[0];
  }

  /**
   * Select a new card (by position/order)
   */
  private selectNewCard(cards: Card[]): Card {
    // Sort by due (which is position for new cards)
    return cards.sort((a, b) => a.due - b.due)[0];
  }

  /**
   * Calculate card counts
   */
  private calculateCounts(cards: Card[]): CardCounts {
    const now = Date.now();
    const currentDay = this.getCurrentDay();

    let newCount = 0;
    let learningCount = 0;
    let reviewCount = 0;

    for (const card of cards) {
      // Skip suspended/buried
      if (
        card.queue === CardQueue.Suspended ||
        card.queue === CardQueue.SchedBuried ||
        card.queue === CardQueue.UserBuried
      ) {
        continue;
      }

      switch (card.queue) {
        case CardQueue.New:
          newCount++;
          break;
        
        case CardQueue.Learn:
        case CardQueue.PreviewRepeat:
          if (card.due <= now) {
            learningCount++;
          }
          break;
        
        case CardQueue.Review:
        case CardQueue.DayLearn:
          if (card.due <= currentDay) {
            reviewCount++;
          }
          break;
      }
    }

    return { new: newCount, learning: learningCount, review: reviewCount };
  }

  /**
   * Get current day number (days since Unix epoch)
   */
  private getCurrentDay(): number {
    const now = new Date();
    now.setHours(4, 0, 0, 0); // 4am rollover
    return Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Deck Manager
 * Manages deck operations and organization
 */
export class DeckManager {
  /**
   * Create a default deck configuration
   */
  static createDefaultConfig(): DeckConfig {
    return {
      id: '1',
      name: 'Default',
      learnSteps: [1, 10], // 1 minute, 10 minutes
      relearnSteps: [10], // 10 minutes
      newPerDay: 20,
      reviewsPerDay: 200,
      initialEase: 2.5,
      easyMultiplier: 1.3,
      hardMultiplier: 1.2,
      lapseMultiplier: 0.0,
      intervalMultiplier: 1.0,
      maximumReviewInterval: 36500, // 100 years
      minimumLapseInterval: 1,
      graduatingIntervalGood: 1,
      graduatingIntervalEasy: 4,
      leechThreshold: 8,
      fsrsParams: [],
      desiredRetention: 0.9,
    };
  }

  /**
   * Create a new deck
   */
  static createDeck(name: string, configId: string = '1'): Deck {
    return {
      id: this.generateId(),
      name,
      configId,
      description: '',
      parentId: null,
      collapsed: false,
    };
  }

  /**
   * Create a subdeck
   */
  static createSubdeck(name: string, parentId: string, configId: string = '1'): Deck {
    return {
      id: this.generateId(),
      name,
      configId,
      description: '',
      parentId,
      collapsed: false,
    };
  }

  /**
   * Get full deck path (including parent decks)
   */
  static getDeckPath(deck: Deck, allDecks: Deck[]): string {
    const path: string[] = [deck.name];
    let current = deck;

    while (current.parentId) {
      const parent = allDecks.find(d => d.id === current.parentId);
      if (!parent) break;
      path.unshift(parent.name);
      current = parent;
    }

    return path.join('::');
  }

  /**
   * Get all cards in a deck (including subdecks)
   */
  static getCardsInDeck(
    deck: Deck,
    allDecks: Deck[],
    allCards: Card[]
  ): Card[] {
    // Get all subdeck IDs
    const deckIds = new Set([deck.id]);
    const addSubdecks = (parentId: string) => {
      for (const subdeck of allDecks) {
        if (subdeck.parentId === parentId) {
          deckIds.add(subdeck.id);
          addSubdecks(subdeck.id);
        }
      }
    };
    addSubdecks(deck.id);

    // Filter cards
    return allCards.filter(card => deckIds.has(card.deckId));
  }

  /**
   * Generate a unique ID
   */
  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
