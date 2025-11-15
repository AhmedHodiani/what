/**
 * React Hook for FSRS Data Management
 * 
 * This hook provides a convenient interface to interact with the FSRS plugin.
 * It includes placeholder functions for data persistence that you can implement
 * according to your storage solution (localStorage, IndexedDB, API, etc.)
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Card,
  Deck,
  DeckConfig,
  Rating,
  ReviewLog,
  CardCounts,
  StudySession,
  CardType,
  CardQueue,
} from './types';
import { StudySessionManager, DeckManager } from './study-session';
import { CardStateMachine } from './card-state-machine';

/**
 * Hook state interface
 */
interface UseFsrsDataState {
  decks: Deck[];
  configs: Record<string, DeckConfig>;
  cards: Record<string, Card>; // Keyed by card ID
  reviewLogs: ReviewLog[];
  currentSession: StudySession | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook return interface
 */
interface UseFsrsDataReturn extends UseFsrsDataState {
  // Deck operations
  getDeck: (deckId: string) => Deck | undefined;
  createDeck: (name: string, configId?: string) => Deck;
  updateDeck: (deck: Deck) => void;
  deleteDeck: (deckId: string) => void;
  getAllDecks: () => Deck[];
  
  // Card operations  
  getCard: (cardId: string) => Card | undefined;
  getCardsInDeck: (deckId: string) => Card[];
  createCard: (deckId: string, front: string, back: string) => Card;
  updateCard: (card: Card) => void;
  deleteCard: (cardId: string) => void;
  
  // Config operations
  getConfig: (configId: string) => DeckConfig | undefined;
  createConfig: (name: string, partial?: Partial<DeckConfig>) => DeckConfig;
  updateConfig: (config: DeckConfig) => void;
  
  // Study session operations
  startStudySession: (deckId: string) => void;
  getNextCard: () => Card | null;
  answerCard: (cardId: string, rating: Rating, timeTaken?: number) => void;
  endStudySession: () => void;
  getCounts: (deckId: string) => CardCounts;
  
  // Review log operations
  getReviewLogs: (cardId?: string) => ReviewLog[];
  
  // Utility functions
  resetAllData: () => void;
}

/**
 * Main FSRS data management hook
 * 
 * This is the primary interface for using the FSRS plugin in React applications.
 * It provides a complete data management layer with prototype localStorage persistence
 * that you can replace with your own storage solution.
 * 
 * @param storageKey - Key for localStorage (default: 'fsrs-data'). Used to namespace
 *                     your data if you have multiple apps or want separate storage.
 * 
 * @returns Complete FSRS interface with all operations:
 *   - Deck management (create, read, update, delete)
 *   - Card management (create, read, update, delete)
 *   - Configuration management
 *   - Study session control
 *   - Review log tracking
 * 
 * @example
 * ```tsx
 * function MyFlashcardApp() {
 *   const fsrs = useFsrsData('my-app');
 * 
 *   useEffect(() => {
 *     if (fsrs.getAllDecks().length === 0) {
 *       const deck = fsrs.createDeck('My First Deck');
 *       fsrs.createCard(deck.id, 'Question?', 'Answer!');
 *     }
 *   }, []);
 * 
 *   return <div>...</div>;
 * }
 * ```
 * 
 * @see GETTING_STARTED.md for complete examples
 * @see EXAMPLES.md for advanced use cases
 */
export function useFsrsData(storageKey: string = 'fsrs-data'): UseFsrsDataReturn {
  const [state, setState] = useState<UseFsrsDataState>({
    decks: [],
    configs: {},
    cards: {},
    reviewLogs: [],
    currentSession: null,
    loading: true,
    error: null,
  });

  const [sessionManager] = useState(() => new StudySessionManager());
  const [stateMachine] = useState(() => new CardStateMachine());

  // ============================================================================
  // INITIALIZATION & PERSISTENCE
  // ============================================================================

  /**
   * Load data from storage on mount
   * TODO: Replace with your actual storage implementation
   */
  useEffect(() => {
    const loadData = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        // PLACEHOLDER: Load from your storage
        // Example: const data = await loadFromStorage(storageKey);
        const stored = localStorage.getItem(storageKey);
        
        if (stored) {
          const data = JSON.parse(stored);
          setState(prev => ({
            ...prev,
            decks: data.decks || [],
            configs: data.configs || {},
            cards: data.cards || {},
            reviewLogs: data.reviewLogs || [],
            loading: false,
          }));
        } else {
          // Initialize with default data
          const defaultConfig = DeckManager.createDefaultConfig();
          const defaultDeck = DeckManager.createDeck('Default');
          
          setState(prev => ({
            ...prev,
            decks: [defaultDeck],
            configs: { [defaultConfig.id]: defaultConfig },
            cards: {},
            reviewLogs: [],
            loading: false,
          }));
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load data',
        }));
      }
    };

    loadData();
  }, [storageKey]);

  /**
   * Save data to storage whenever it changes
   * TODO: Replace with your actual storage implementation
   */
  useEffect(() => {
    if (!state.loading) {
      // PLACEHOLDER: Save to your storage
      // Example: await saveToStorage(storageKey, data);
      const data = {
        decks: state.decks,
        configs: state.configs,
        cards: state.cards,
        reviewLogs: state.reviewLogs,
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
    }
  }, [state.decks, state.configs, state.cards, state.reviewLogs, state.loading, storageKey]);

  // ============================================================================
  // DECK OPERATIONS
  // ============================================================================

  /**
   * Get a deck by ID
   * 
   * @param deckId - Unique deck identifier
   * @returns Deck object or undefined if not found
   * 
   * @example
   * ```tsx
   * const deck = fsrs.getDeck('deck-123');
   * if (deck) {
   *   console.log(deck.name);
   * }
   * ```
   */
  const getDeck = useCallback((deckId: string) => {
    return state.decks.find(d => d.id === deckId);
  }, [state.decks]);

  /**
   * Create a new deck
   * 
   * @param name - Human-readable deck name (e.g., "Spanish Vocabulary")
   * @param configId - Optional configuration ID. If not provided, uses default config.
   * @returns Newly created deck with generated ID
   * 
   * @example
   * ```tsx
   * const spanishDeck = fsrs.createDeck('Spanish Vocabulary');
   * const mathDeck = fsrs.createDeck('Calculus', customConfigId);
   * ```
   */
  const createDeck = useCallback((name: string, configId: string = '1') => {
    const newDeck = DeckManager.createDeck(name, configId);
    setState(prev => ({
      ...prev,
      decks: [...prev.decks, newDeck],
    }));
    return newDeck;
  }, []);

  const updateDeck = useCallback((deck: Deck) => {
    setState(prev => ({
      ...prev,
      decks: prev.decks.map(d => d.id === deck.id ? deck : d),
    }));
  }, []);

  const deleteDeck = useCallback((deckId: string) => {
    setState(prev => {
      // Also delete all cards in the deck
      const cardsToDelete = Object.values(prev.cards).filter(c => c.deckId === deckId);
      const newCards = { ...prev.cards };
      cardsToDelete.forEach(c => delete newCards[c.id]);

      return {
        ...prev,
        decks: prev.decks.filter(d => d.id !== deckId),
        cards: newCards,
      };
    });
  }, []);

  const getAllDecks = useCallback(() => {
    return state.decks;
  }, [state.decks]);

  // ============================================================================
  // CARD OPERATIONS
  // ============================================================================

  /**
   * Get a single card by ID
   * 
   * @param cardId - Unique card identifier
   * @returns Card object or undefined if not found
   * 
   * @example
   * ```tsx
   * const card = fsrs.getCard('card-abc');
   * console.log(`Q: ${card?.front}, A: ${card?.back}`);
   * ```
   */
  const getCard = useCallback((cardId: string) => {
    return state.cards[cardId];
  }, [state.cards]);

  /**
   * Get all cards belonging to a specific deck
   * 
   * @param deckId - Deck identifier
   * @returns Array of cards in the deck (empty array if none)
   * 
   * @example
   * ```tsx
   * const cards = fsrs.getCardsInDeck(deckId);
   * console.log(`This deck has ${cards.length} cards`);
   * ```
   */
  const getCardsInDeck = useCallback((deckId: string) => {
    return Object.values(state.cards).filter(c => c.deckId === deckId);
  }, [state.cards]);

  /**
   * Create a new flashcard
   * 
   * This creates a brand new card in the "New" state. The card won't be due
   * until you start a study session for its deck.
   * 
   * @param deckId - ID of the deck to add the card to
   * @param front - Question/prompt text (what the user sees first)
   * @param back - Answer text (revealed after user shows answer)
   * @returns Newly created card with all default values set
   * 
   * @example
   * ```tsx
   * // Simple text card
   * const card = fsrs.createCard(deckId, 'Capital of France?', 'Paris');
   * 
   * // You can extend this in your app to support rich content:
   * const richCard = {
   *   ...fsrs.createCard(deckId, 'Identify this landmark', 'Eiffel Tower'),
   *   imageUrl: '/images/eiffel-tower.jpg',
   *   audioUrl: '/audio/pronunciation.mp3',
   * };
   * ```
   */
  const createCard = useCallback((deckId: string, front: string, back: string) => {
    const newCard: Card = {
      id: `card-${Date.now()}-${Math.random().toString(36).substring(2)}`,
      noteId: `note-${Date.now()}`,
      deckId,
      templateIdx: 0,
      mtime: Date.now(),
      ctype: CardType.New,
      queue: CardQueue.New,
      due: state.cards ? Object.values(state.cards).filter(c => c.deckId === deckId && c.queue === CardQueue.New).length : 0,
      interval: 0,
      easeFactor: 2.5,
      reps: 0,
      lapses: 0,
      remainingSteps: 0,
      memoryState: null,
      desiredRetention: null,
      customData: '',
      front,
      back,
    };

    setState(prev => ({
      ...prev,
      cards: {
        ...prev.cards,
        [newCard.id]: newCard,
      },
    }));

    return newCard;
  }, [state.cards]);

  const updateCard = useCallback((card: Card) => {
    setState(prev => ({
      ...prev,
      cards: {
        ...prev.cards,
        [card.id]: card,
      },
    }));
  }, []);

  const deleteCard = useCallback((cardId: string) => {
    setState(prev => {
      const newCards = { ...prev.cards };
      delete newCards[cardId];
      return {
        ...prev,
        cards: newCards,
      };
    });
  }, []);

  // ============================================================================
  // CONFIG OPERATIONS
  // ============================================================================

  const getConfig = useCallback((configId: string) => {
    return state.configs[configId];
  }, [state.configs]);

  const createConfig = useCallback((name: string, partial?: Partial<DeckConfig>) => {
    const defaultConfig = DeckManager.createDefaultConfig();
    const newConfig: DeckConfig = {
      ...defaultConfig,
      ...partial,
      id: `config-${Date.now()}`,
      name,
    };

    setState(prev => ({
      ...prev,
      configs: {
        ...prev.configs,
        [newConfig.id]: newConfig,
      },
    }));

    return newConfig;
  }, []);

  const updateConfig = useCallback((config: DeckConfig) => {
    setState(prev => ({
      ...prev,
      configs: {
        ...prev.configs,
        [config.id]: config,
      },
    }));
  }, []);

  // ============================================================================
  // STUDY SESSION OPERATIONS
  // ============================================================================

  /**
   * Start a new study session for a deck
   * 
   * This initializes a session and makes cards available for review through
   * getNextCard(). You must start a session before you can study cards.
   * 
   * The session tracks:
   * - Current card being reviewed
   * - Card counts (new/learning/review)
   * - Number of cards reviewed
   * - Session start time
   * 
   * @param deckId - ID of the deck to study
   * 
   * @example
   * ```tsx
   * // Start studying
   * fsrs.startStudySession(deckId);
   * 
   * // Get first card
   * const card = fsrs.getNextCard();
   * 
   * // Check progress
   * const counts = fsrs.getCounts(deckId);
   * console.log(`${counts.new} new cards remaining`);
   * ```
   * 
   * @see getNextCard
   * @see answerCard
   * @see endStudySession
   */
  const startStudySession = useCallback((deckId: string) => {
    const deck = getDeck(deckId);
    if (!deck) {
      setState(prev => ({ ...prev, error: 'Deck not found' }));
      return;
    }

    const cards = getCardsInDeck(deckId);
    const config = getConfig(deck.configId) || DeckManager.createDefaultConfig();

    const session = sessionManager.startSession(deck, cards, config);
    setState(prev => ({ ...prev, currentSession: session, error: null }));
  }, [getDeck, getCardsInDeck, getConfig, sessionManager]);

  const getNextCard = useCallback(() => {
    if (!state.currentSession) {
      setState(prev => ({ ...prev, error: 'No active study session' }));
      return null;
    }

    const deck = getDeck(state.currentSession.deckId);
    if (!deck) return null;

    const cards = getCardsInDeck(state.currentSession.deckId);
    const config = getConfig(deck.configId) || DeckManager.createDefaultConfig();

    return sessionManager.getNextCard(cards, config);
  }, [state.currentSession, getDeck, getCardsInDeck, getConfig, sessionManager]);

  const answerCard = useCallback((cardId: string, rating: Rating, timeTaken: number = 0) => {
    const card = getCard(cardId);
    if (!card) {
      setState(prev => ({ ...prev, error: 'Card not found' }));
      return;
    }

    if (!state.currentSession) {
      setState(prev => ({ ...prev, error: 'No active study session' }));
      return;
    }

    const deck = getDeck(state.currentSession.deckId);
    if (!deck) return;

    const config = getConfig(deck.configId) || DeckManager.createDefaultConfig();

    const { card: updatedCard, log } = sessionManager.answerCard(card, rating, config, timeTaken);

    setState(prev => ({
      ...prev,
      cards: {
        ...prev.cards,
        [updatedCard.id]: updatedCard,
      },
      reviewLogs: [...prev.reviewLogs, log],
      currentSession: sessionManager.getSession(),
      error: null,
    }));
  }, [getCard, state.currentSession, getDeck, getConfig, sessionManager]);

  const endStudySession = useCallback(() => {
    sessionManager.endSession();
    setState(prev => ({ ...prev, currentSession: null }));
  }, [sessionManager]);

  const getCounts = useCallback((deckId: string) => {
    const cards = getCardsInDeck(deckId);
    return sessionManager.getCounts(cards);
  }, [getCardsInDeck, sessionManager]);

  // ============================================================================
  // REVIEW LOG OPERATIONS
  // ============================================================================

  const getReviewLogs = useCallback((cardId?: string) => {
    if (cardId) {
      return state.reviewLogs.filter(log => log.cardId === cardId);
    }
    return state.reviewLogs;
  }, [state.reviewLogs]);

  // ============================================================================
  // UTILITY OPERATIONS
  // ============================================================================

  const resetAllData = useCallback(() => {
    const defaultConfig = DeckManager.createDefaultConfig();
    const defaultDeck = DeckManager.createDeck('Default');

    setState({
      decks: [defaultDeck],
      configs: { [defaultConfig.id]: defaultConfig },
      cards: {},
      reviewLogs: [],
      currentSession: null,
      loading: false,
      error: null,
    });

    localStorage.removeItem(storageKey);
  }, [storageKey]);

  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================

  return {
    // State
    ...state,

    // Deck operations
    getDeck,
    createDeck,
    updateDeck,
    deleteDeck,
    getAllDecks,

    // Card operations
    getCard,
    getCardsInDeck,
    createCard,
    updateCard,
    deleteCard,

    // Config operations
    getConfig,
    createConfig,
    updateConfig,

    // Study session operations
    startStudySession,
    getNextCard,
    answerCard,
    endStudySession,
    getCounts,

    // Review log operations
    getReviewLogs,

    // Utility operations
    resetAllData,
  };
}

export default useFsrsData;
