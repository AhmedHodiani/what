/**
 * Study Session Hook
 * 
 * Manages FSRS-powered study sessions with queue building and card scheduling.
 * This hook exactly replicates the CLI's study.ts logic for use in the deck editor.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { logger } from 'shared/logger'
import type { Card, Deck } from 'shared/fsrs/types'
import { CardQueue } from 'shared/fsrs/types'
import { FsrsScheduler } from 'shared/fsrs/scheduler'
import { CardQueueBuilder, type QueueEntry, type LearningQueueEntry } from 'shared/fsrs/queue'

interface StudySessionState {
  // Current card being reviewed
  currentCard: Card | null
  currentCardKind: 'new' | 'learning' | 'review'
  isLearningCard: boolean // Whether card came from intraday learning queue
  
  // Answer visibility
  showingAnswer: boolean
  
  // Button intervals (for display)
  intervals: {
    again: string
    hard: string
    good: string
    easy: string
  }
  
  // Queue counts (x+y+z display)
  remainingCounts: {
    new: number
    learning: number
    review: number
  }
  
  // Session stats
  reviewedCount: number
  sessionActive: boolean
}

interface UseStudySessionReturn extends StudySessionState {
  // Actions
  startSession: () => void
  endSession: () => void
  showAnswer: () => void
  answerCard: (rating: 1 | 2 | 3 | 4) => Promise<void>
  
  // State checks
  hasCardsToReview: boolean
}

/**
 * Hook for managing study sessions - matches CLI study.ts behavior exactly
 */
export function useStudySession(
  deck: Deck | null,
  objectId: string,
  parentTabId: string
): UseStudySessionReturn {
  // Queue state - using refs to maintain mutable queue like CLI
  const queueBuilderRef = useRef<CardQueueBuilder | null>(null)
  const mainQueueRef = useRef<QueueEntry[]>([])
  
  // Session state
  const [currentCard, setCurrentCard] = useState<Card | null>(null)
  const [currentCardKind, setCurrentCardKind] = useState<'new' | 'learning' | 'review'>('review')
  const [isLearningCard, setIsLearningCard] = useState(false)
  const [showingAnswer, setShowingAnswer] = useState(false)
  const [intervals, setIntervals] = useState({
    again: '1m',
    hard: '10m',
    good: '1d',
    easy: '4d',
  })
  const [remainingCounts, setRemainingCounts] = useState({
    new: 0,
    learning: 0,
    review: 0,
  })
  const [reviewedCount, setReviewedCount] = useState(0)
  const [sessionActive, setSessionActive] = useState(false)
  
  // Scheduler instance
  const schedulerRef = useRef<FsrsScheduler | null>(null)
  
  // Deck ref for accessing current deck in callbacks
  const deckRef = useRef<Deck | null>(null)
  
  // Initialize scheduler when deck changes
  useEffect(() => {
    deckRef.current = deck
    if (deck) {
      schedulerRef.current = new FsrsScheduler(deck.config)
    } else {
      schedulerRef.current = null
    }
  }, [deck])
  
  /**
   * Calculate remaining counts - matches CLI logic exactly
   * Count includes the current card being shown
   */
  const calculateRemainingCounts = useCallback(
    (
      mainQueue: QueueEntry[],
      intradayNow: LearningQueueEntry[],
      intradayAhead: LearningQueueEntry[],
      currentKind: 'new' | 'learning' | 'review',
      currentIsLearning: boolean
    ) => {
      const counts = {
        new: 0,
        learning: 0,
        review: 0,
      }
      
      // Count the current card
      if (currentKind === 'new') {
        counts.new = 1
      } else if (currentKind === 'learning') {
        counts.learning = 1
      } else {
        counts.review = 1
      }
      
      // Add remaining cards from main queue
      for (const entry of mainQueue) {
        if (entry.kind === 'new') {
          counts.new++
        } else if (entry.kind === 'day-learning') {
          counts.learning++
        } else {
          counts.review++
        }
      }
      
      // Add remaining intraday learning cards (excluding current if it's from there)
      const remainingIntradayNow = currentIsLearning && intradayNow.length > 0 
        ? intradayNow.length - 1 
        : intradayNow.length
      counts.learning += remainingIntradayNow
      
      // Add learn-ahead cards (excluding current if it's from there)
      const remainingIntradayAhead = currentIsLearning && intradayNow.length === 0 && intradayAhead.length > 0 
        ? intradayAhead.length - 1 
        : intradayAhead.length
      counts.learning += remainingIntradayAhead
      
      return counts
    },
    []
  )
  
  /**
   * Get next card from queue - matches CLI logic exactly
   * Priority: intradayNow > mainQueue > intradayAhead
   */
  const getNextCard = useCallback((): {
    card: Card
    kind: 'new' | 'learning' | 'review'
    isLearning: boolean
  } | null => {
    const queueBuilder = queueBuilderRef.current
    if (!queueBuilder) return null
    
    // Update learning cutoff to current time
    queueBuilder.updateLearningCutoff()
    const intradayNow = queueBuilder.getIntradayNow()
    const intradayAhead = queueBuilder.getIntradayAhead()
    const mainQueue = mainQueueRef.current
    
    // Priority 1: Intraday learning cards due now
    if (intradayNow.length > 0) {
      const entry = intradayNow[0]
      return {
        card: entry.card,
        kind: 'learning',
        isLearning: true,
      }
    }
    
    // Priority 2: Main queue cards
    if (mainQueue.length > 0) {
      const entry = mainQueue[0]
      const kind = entry.kind === 'new' ? 'new' : 
                   entry.kind === 'day-learning' ? 'learning' : 'review'
      return {
        card: entry.card,
        kind,
        isLearning: false,
      }
    }
    
    // Priority 3: Learn-ahead cards (due soon)
    if (intradayAhead.length > 0) {
      const entry = intradayAhead[0]
      return {
        card: entry.card,
        kind: 'learning',
        isLearning: true,
      }
    }
    
    return null
  }, [])
  
  /**
   * Start study session - matches CLI startStudySession
   */
  const startSession = useCallback(() => {
    if (!deck) {
      logger.error('Cannot start session: no deck loaded')
      return
    }
    
    // Build queue using Anki's algorithm
    const builder = new CardQueueBuilder(deck)
    const { mainQueue: newMainQueue, intradayLearning } = builder.build()
    
    if (newMainQueue.length === 0 && intradayLearning.length === 0) {
      logger.debug('No cards are due for review right now')
      setSessionActive(false)
      return
    }
    
    queueBuilderRef.current = builder
    mainQueueRef.current = newMainQueue
    setReviewedCount(0)
    setSessionActive(true)
    
    // Get first card
    const next = getNextCard()
    if (!next) {
      logger.debug('No cards available to study')
      setSessionActive(false)
      return
    }
    
    // Update learning cutoff
    builder.updateLearningCutoff()
    const intradayNow = builder.getIntradayNow()
    const intradayAhead = builder.getIntradayAhead()
    
    setCurrentCard(next.card)
    setCurrentCardKind(next.kind)
    setIsLearningCard(next.isLearning)
    setShowingAnswer(false)
    
    // Calculate intervals
    if (schedulerRef.current) {
      const buttonIntervals = schedulerRef.current.getButtonIntervals(next.card)
      setIntervals(buttonIntervals)
    }
    
    // Calculate remaining counts
    const counts = calculateRemainingCounts(
      mainQueueRef.current,
      intradayNow,
      intradayAhead,
      next.kind,
      next.isLearning
    )
    setRemainingCounts(counts)
    
    logger.debug('Study session started', { totalCards: newMainQueue.length + intradayLearning.length })
  }, [deck, getNextCard, calculateRemainingCounts])
  
  /**
   * End study session
   */
  const endSession = useCallback(() => {
    setSessionActive(false)
    setCurrentCard(null)
    setShowingAnswer(false)
    queueBuilderRef.current = null
    mainQueueRef.current = []
    logger.debug('Study session ended', { reviewed: reviewedCount })
  }, [reviewedCount])
  
  /**
   * Show answer
   */
  const showAnswer = useCallback(() => {
    setShowingAnswer(true)
  }, [])
  
  /**
   * Answer current card and load next - matches CLI logic exactly
   */
  const answerCard = useCallback(
    async (rating: 1 | 2 | 3 | 4) => {
      if (!currentCard || !schedulerRef.current || !queueBuilderRef.current || !deckRef.current) {
        logger.error('Cannot answer card: invalid state')
        return
      }
      
      const queueBuilder = queueBuilderRef.current
      const wasLearningCard = isLearningCard
      
      try {
        // Schedule card using FSRS
        const { card: cardUpdates, reviewLog } = schedulerRef.current.scheduleCard(
          currentCard,
          rating
        )
        
        // Update card in database
        await window.App.deck.updateCard({ id: currentCard.id, ...cardUpdates }, parentTabId)
        
        // Add review log
        await window.App.deck.addReviewLog(
          {
            id: Date.now(),
            cardId: currentCard.id,
            usn: 0,
            ...reviewLog,
          },
          parentTabId
        )
        
        // Update reviewed count
        setReviewedCount(prev => prev + 1)
        
        // If this was a learning card, remove it from the intraday queue
        if (wasLearningCard) {
          queueBuilder.removeIntradayLearningCard(currentCard.id)
        } else {
          // Remove from main queue (shift)
          mainQueueRef.current = mainQueueRef.current.slice(1)
        }
        
        // If card is still in learning (not graduated), requeue it
        if (cardUpdates.queue === CardQueue.Learn || cardUpdates.queue === CardQueue.PreviewRepeat) {
          // Reload deck to get updated card
          const updatedDeck = await window.App.deck.load(objectId, parentTabId)
          const updatedCard = updatedDeck?.cards.find((c: Card) => c.id === currentCard.id)
          
          if (updatedCard) {
            queueBuilder.requeueLearningCard(updatedCard)
          }
        }
        
        // Get next card
        const next = getNextCard()
        
        if (!next) {
          // No more cards - end session
          endSession()
          return
        }
        
        // Update learning cutoff
        queueBuilder.updateLearningCutoff()
        const intradayNow = queueBuilder.getIntradayNow()
        const intradayAhead = queueBuilder.getIntradayAhead()
        
        // Load next card
        setCurrentCard(next.card)
        setCurrentCardKind(next.kind)
        setIsLearningCard(next.isLearning)
        setShowingAnswer(false)
        
        // Calculate intervals for next card
        const buttonIntervals = schedulerRef.current.getButtonIntervals(next.card)
        setIntervals(buttonIntervals)
        
        // Update remaining counts
        const counts = calculateRemainingCounts(
          mainQueueRef.current,
          intradayNow,
          intradayAhead,
          next.kind,
          next.isLearning
        )
        setRemainingCounts(counts)
        
      } catch (error) {
        logger.error('Failed to answer card:', error)
      }
    },
    [
      currentCard,
      isLearningCard,
      parentTabId,
      objectId,
      getNextCard,
      endSession,
      calculateRemainingCounts,
    ]
  )
  
  // Check if there are cards to review
  const hasCardsToReview = deck ? deck.cards.some(card => {
    const now = Math.floor(Date.now() / 1000)
    const daysElapsed = Math.floor(now / 86400)
    
    if (card.queue === CardQueue.Suspended || 
        card.queue === CardQueue.SchedBuried || 
        card.queue === CardQueue.UserBuried) {
      return false
    }
    
    if (card.queue === CardQueue.New) return true
    if (card.queue === CardQueue.Learn || card.queue === CardQueue.PreviewRepeat) {
      return card.due <= now
    }
    if (card.queue === CardQueue.DayLearn) {
      return card.due <= now
    }
    if (card.queue === CardQueue.Review) {
      return card.due <= daysElapsed
    }
    
    return false
  }) : false
  
  return {
    // State
    currentCard,
    currentCardKind,
    isLearningCard,
    showingAnswer,
    intervals,
    remainingCounts,
    reviewedCount,
    sessionActive,
    
    // Actions
    startSession,
    endSession,
    showAnswer,
    answerCard,
    
    // Checks
    hasCardsToReview,
  }
}
