import { useEffect, useState, useRef } from 'react'
import { logger } from 'shared/logger'
import { BookOpen, Plus, Settings, Trash2, Edit3, GraduationCap, X } from 'lucide-react'
import type { Deck, Card, DeckConfig } from 'shared/fsrs/types'
import { DeckSettingsDialog } from 'renderer/components/canvas/deck-settings-dialog'
import { FsrsScheduler } from 'shared/fsrs/scheduler'
import { formatInterval } from 'shared/fsrs/cardUtils'
import { CardQueueBuilder } from 'shared/fsrs/queue'

interface DeckEditorProps {
  tabId: string // FlexLayout tab ID (passed from factory)
  objectId: string // This IS the deck_id in the database
  parentTabId: string
  title: string
  assetId?: string // Ignored - kept for compatibility with external tab interface
}

type View = 'overview' | 'cards' | 'study' | 'add-card'

interface DeckStats {
  total: number
  new: number
  learning: number
  review: number
  due: number
}

/**
 * DeckEditor - Full-screen deck editor in a dedicated tab
 * 
 * Features:
 * - Deck overview with stats (like Anki/CLI)
 * - Card list management
 * - Study session with FSRS scheduling
 * - Settings configuration
 * - Matches dark theme with purple accents
 */
export function DeckEditor({
  tabId,
  objectId,
  parentTabId,
  title,
}: DeckEditorProps) {
  const [deck, setDeck] = useState<Deck | null>(null)
  const [view, setView] = useState<View>('overview')
  const [isDirty, setIsDirty] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [stats, setStats] = useState<DeckStats>({ total: 0, new: 0, learning: 0, review: 0, due: 0 })
  
  // Study session state
  const [studyQueue, setStudyQueue] = useState<Card[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [reviewedCount, setReviewedCount] = useState(0)
  
  // Add card form state
  const [newCardFront, setNewCardFront] = useState('')
  const [newCardBack, setNewCardBack] = useState('')
  const [addCardError, setAddCardError] = useState('')
  
  const frontInputRef = useRef<HTMLTextAreaElement>(null)

  // Load deck from database
  useEffect(() => {
    const loadDeck = async () => {
      try {
        logger.debug('Loading deck:', { objectId })
        
        const loadedDeck = await window.App.deck.load(objectId, parentTabId)
        
        if (!loadedDeck) {
          logger.error('Deck not found in database, may need to be created first')
          return
        }
        
        setDeck(loadedDeck)
        updateStats(loadedDeck)
      } catch (error) {
        logger.error('Failed to load deck:', error)
      }
    }
    
    loadDeck()
  }, [objectId, parentTabId])

  // Calculate deck statistics
  const updateStats = (deck: Deck) => {
    const queueBuilder = new CardQueueBuilder(deck)
    const { mainQueue, intradayLearning } = queueBuilder.build()
    
    const newCards = mainQueue.filter(e => e.kind === 'new').length
    const learningCards = mainQueue.filter(e => e.kind === 'day-learning').length + intradayLearning.length
    const reviewCards = mainQueue.filter(e => e.kind === 'review').length
    
    setStats({
      total: deck.cards.length,
      new: newCards,
      learning: learningCards,
      review: reviewCards,
      due: mainQueue.length + intradayLearning.length,
    })
  }

  // Update tab name with dirty indicator
  useEffect(() => {
    const dirtyIndicator = isDirty ? '● ' : ''
    const newName = `${dirtyIndicator}${title}`
    
    if (window.__updateTabName) {
      window.__updateTabName(tabId, newName)
    }
  }, [isDirty, title, tabId])

  // Allow system shortcuts (Ctrl+Tab, etc.) to work even when editor is focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e as any).__fromDeck) return
      
      const isSystemShortcut = 
        (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) ||
        (e.ctrlKey && e.shiftKey && e.key === 'Tab') ||
        (e.ctrlKey && e.key === 's') ||
        (e.ctrlKey && e.key === 'n') ||
        (e.ctrlKey && e.key === 'o') ||
        (e.ctrlKey && e.key === 'w')
      
      if (isSystemShortcut) {
        e.stopImmediatePropagation()
        e.preventDefault()
        
        const newEvent = new KeyboardEvent('keydown', {
          key: e.key,
          code: e.code,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          metaKey: e.metaKey,
          bubbles: true,
          cancelable: true,
        })
        
        ;(newEvent as any).__fromDeck = true
        document.dispatchEvent(newEvent)
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [])

  // Save deck to database
  const saveDeck = async (updatedDeck: Deck) => {
    try {
      await window.App.deck.saveConfig(objectId, updatedDeck.config, parentTabId)
      setDeck(updatedDeck)
      updateStats(updatedDeck)
      setIsDirty(false)
    } catch (error) {
      logger.error('Failed to save deck:', error)
    }
  }

  // Add new card
  const handleAddCard = async () => {
    if (!deck) return
    
    const front = newCardFront.trim()
    const back = newCardBack.trim()
    
    if (!front) {
      setAddCardError('Question cannot be empty')
      return
    }
    
    if (!back) {
      setAddCardError('Answer cannot be empty')
      return
    }
    
    try {
      // Create card object matching Card type from shared/fsrs/types.ts
      const newCard = {
        id: 0, // Will be assigned by database
        noteId: Date.now(), // Use timestamp as unique note ID
        deckId: deck.id,
        front,
        back,
        ctype: 0, // CardType.New
        queue: 0, // CardQueue.New
        due: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
        interval: 0,
        easeFactor: 2500, // 250% (Anki default)
        reps: 0,
        lapses: 0,
        remainingSteps: 0,
        memoryState: null,
        desiredRetention: null,
        mtime: Math.floor(Date.now() / 1000),
        lastReview: null,
        flags: 0,
        customData: '{}',
      }
      
      await window.App.deck.addCard(newCard, objectId, parentTabId)
      
      // Reload deck to get updated cards
      const updatedDeck = await window.App.deck.load(objectId, parentTabId)
      setDeck(updatedDeck)
      updateStats(updatedDeck)
      
      // Clear form
      setNewCardFront('')
      setNewCardBack('')
      setAddCardError('')
      
      // Show success feedback
      logger.debug('Card added successfully')
      
      // Switch to cards view to show the new card
      setView('cards')
    } catch (error) {
      logger.error('Failed to add card:', error)
      setAddCardError('Failed to add card. Please try again.')
    }
  }

  // Delete card
  const handleDeleteCard = async (cardId: string) => {
    if (!deck) return
    
    try {
      await window.App.deck.deleteCard(Number(cardId), parentTabId)
      
      // Reload deck
      const updatedDeck = await window.App.deck.load(objectId, parentTabId)
      setDeck(updatedDeck)
      updateStats(updatedDeck)
    } catch (error) {
      logger.error('Failed to delete card:', error)
    }
  }

  // Start study session
  const handleStartStudy = () => {
    if (!deck) return
    
    const queueBuilder = new CardQueueBuilder(deck)
    const { mainQueue, intradayLearning } = queueBuilder.build()
    
    // Combine main queue and intraday learning cards
    const allDueCards = [
      ...intradayLearning.map(e => e.card),
      ...mainQueue.map(e => e.card),
    ]
    
    if (allDueCards.length === 0) {
      logger.debug('No cards due for review')
      return
    }
    
    setStudyQueue(allDueCards)
    setCurrentCardIndex(0)
    setShowAnswer(false)
    setReviewedCount(0)
    setView('study')
  }

  // Rate card during study
  const handleRateCard = async (rating: 1 | 2 | 3 | 4) => {
    if (!deck) return
    
    const currentCard = studyQueue[currentCardIndex]
    if (!currentCard) return
    
    try {
      const scheduler = new FsrsScheduler(deck.config)
      const { card: updatedCard } = scheduler.scheduleCard(currentCard, rating)
      
      // Update card in database
      await window.App.deck.updateCard({ ...currentCard, ...updatedCard }, parentTabId)
      
      // Move to next card
      setReviewedCount(prev => prev + 1)
      
      if (currentCardIndex < studyQueue.length - 1) {
        setCurrentCardIndex(prev => prev + 1)
        setShowAnswer(false)
      } else {
        // Study session complete
        const updatedDeck = await window.App.deck.load(objectId, parentTabId)
        setDeck(updatedDeck)
        updateStats(updatedDeck)
        setView('overview')
      }
    } catch (error) {
      logger.error('Failed to rate card:', error)
    }
  }

  // Handle settings save
  const handleSettingsSave = async (config: DeckConfig) => {
    if (!deck) return
    
    const updatedDeck = { ...deck, config }
    await saveDeck(updatedDeck)
    setShowSettings(false)
  }

  if (!deck) {
    return (
      <div className="w-full h-full bg-gray-950 flex items-center justify-center" style={{ position: 'relative', zIndex: 50 }}>
        <div className="text-center">
          <div className="text-6xl mb-4">🃏</div>
          <p className="text-gray-400">Loading deck...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-gray-950 text-white overflow-hidden flex flex-col" style={{ position: 'relative', zIndex: 50 }}>
      {/* Settings Dialog */}
      {showSettings && (
        <DeckSettingsDialog
          deckName={deck.name}
          initialConfig={deck.config}
          onCancel={() => setShowSettings(false)}
          onConfirm={handleSettingsSave}
        />
      )}

      {/* Header */}
      <div className="border-b border-purple-400/20 bg-black/40 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🃏</div>
            <div>
              <h1 className="text-2xl font-bold text-purple-400">{deck.name}</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {stats.total} cards • {stats.due} due
              </p>
            </div>
          </div>
          
          <button
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors border border-gray-600 flex items-center gap-2"
            onClick={() => setShowSettings(true)}
          >
            <Settings size={16} />
            Settings
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-purple-400/20 bg-black/20 px-6 flex gap-1">
        <button
          className={`px-4 py-3 transition-colors border-b-2 ${
            view === 'overview'
              ? 'border-purple-400 text-purple-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
          onClick={() => setView('overview')}
        >
          <div className="flex items-center gap-2">
            <BookOpen size={16} />
            Overview
          </div>
        </button>
        
        <button
          className={`px-4 py-3 transition-colors border-b-2 ${
            view === 'cards'
              ? 'border-purple-400 text-purple-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
          onClick={() => setView('cards')}
        >
          <div className="flex items-center gap-2">
            <Edit3 size={16} />
            Cards ({deck.cards.length})
          </div>
        </button>
        
        <button
          className={`px-4 py-3 transition-colors border-b-2 ${
            view === 'add-card'
              ? 'border-purple-400 text-purple-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
          onClick={() => {
            setView('add-card')
            setTimeout(() => frontInputRef.current?.focus(), 100)
          }}
        >
          <div className="flex items-center gap-2">
            <Plus size={16} />
            Add Card
          </div>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Overview View */}
        {view === 'overview' && (
          <div className="max-w-4xl mx-auto p-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-black/40 border border-purple-400/20 rounded-lg p-6">
                <div className="text-3xl font-bold text-purple-400">{stats.total}</div>
                <div className="text-sm text-gray-400 mt-1">Total Cards</div>
              </div>
              
              <div className="bg-black/40 border border-blue-400/20 rounded-lg p-6">
                <div className="text-3xl font-bold text-blue-400">{stats.new}</div>
                <div className="text-sm text-gray-400 mt-1">New</div>
              </div>
              
              <div className="bg-black/40 border border-orange-400/20 rounded-lg p-6">
                <div className="text-3xl font-bold text-orange-400">{stats.learning}</div>
                <div className="text-sm text-gray-400 mt-1">Learning</div>
              </div>
              
              <div className="bg-black/40 border border-green-400/20 rounded-lg p-6">
                <div className="text-3xl font-bold text-green-400">{stats.review}</div>
                <div className="text-sm text-gray-400 mt-1">Review</div>
              </div>
            </div>

            {/* FSRS Info */}
            <div className="bg-black/40 border border-purple-400/20 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-purple-400 mb-4 flex items-center gap-2">
                <Settings size={18} />
                FSRS Configuration
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Desired Retention:</span>
                  <span className="ml-2 text-white font-medium">
                    {(deck.config.desiredRetention * 100).toFixed(0)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Max Interval:</span>
                  <span className="ml-2 text-white font-medium">
                    {deck.config.maximumReviewInterval} days
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Learning Steps:</span>
                  <span className="ml-2 text-white font-medium">
                    {deck.config.learnSteps.map(s => `${s}m`).join(', ')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Graduating Interval:</span>
                  <span className="ml-2 text-white font-medium">
                    {deck.config.graduatingIntervalGood} day{deck.config.graduatingIntervalGood !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Study Button */}
            {stats.due > 0 ? (
              <button
                className="w-full py-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-lg transition-colors flex items-center justify-center gap-3"
                onClick={handleStartStudy}
              >
                <GraduationCap size={24} />
                Study {stats.due} Due Card{stats.due !== 1 ? 's' : ''}
              </button>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-purple-400 mb-2">All Done!</h3>
                <p className="text-gray-400">No cards due right now. Great job!</p>
              </div>
            )}
          </div>
        )}

        {/* Cards List View */}
        {view === 'cards' && (
          <div className="max-w-4xl mx-auto p-8">
            {deck.cards.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No Cards Yet</h3>
                <p className="text-gray-500 mb-6">Add your first card to get started!</p>
                <button
                  className="px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
                  onClick={() => {
                    setView('add-card')
                    setTimeout(() => frontInputRef.current?.focus(), 100)
                  }}
                >
                  Add Card
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {deck.cards.map((card, index) => (
                  <div
                    key={card.id}
                    className="bg-black/40 border border-purple-400/20 rounded-lg p-6 hover:border-purple-400/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="text-gray-400 font-mono text-sm mt-1">#{index + 1}</span>
                          <div className="flex-1">
                            <div className="text-sm text-gray-400 mb-1">Question</div>
                            <div className="text-white mb-4">{card.front}</div>
                            
                            <div className="text-sm text-gray-400 mb-1">Answer</div>
                            <div className="text-gray-300">{card.back}</div>
                          </div>
                        </div>
                        
                        {card.interval > 0 && (
                          <div className="text-xs text-gray-500 mt-3 flex items-center gap-4">
                            <span>Interval: {formatInterval(card.interval)}</span>
                            <span>Reviews: {card.reps}</span>
                            <span>Lapses: {card.lapses}</span>
                          </div>
                        )}
                      </div>
                      
                      <button
                        className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                        onClick={() => handleDeleteCard(String(card.id))}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add Card View */}
        {view === 'add-card' && (
          <div className="max-w-2xl mx-auto p-8">
            <div className="bg-black/40 border border-purple-400/20 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-purple-400 mb-6 flex items-center gap-2">
                <Plus size={24} />
                Add New Card
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Question (Front)
                  </label>
                  <textarea
                    className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all resize-none"
                    onChange={(e) => {
                      setNewCardFront(e.target.value)
                      setAddCardError('')
                    }}
                    placeholder="What is the capital of France?"
                    ref={frontInputRef}
                    rows={3}
                    value={newCardFront}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Answer (Back)
                  </label>
                  <textarea
                    className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all resize-none"
                    onChange={(e) => {
                      setNewCardBack(e.target.value)
                      setAddCardError('')
                    }}
                    placeholder="Paris"
                    rows={3}
                    value={newCardBack}
                  />
                </div>
                
                {addCardError && (
                  <div className="text-red-400 text-sm flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{addCardError}</span>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button
                    className="flex-1 px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors"
                    onClick={handleAddCard}
                  >
                    Add Card
                  </button>
                  <button
                    className="px-6 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors border border-gray-600"
                    onClick={() => {
                      setNewCardFront('')
                      setNewCardBack('')
                      setAddCardError('')
                      setView('overview')
                    }}
                  >
                    Cancel
                  </button>
                </div>
                
                <div className="text-xs text-gray-500 pt-4 border-t border-purple-400/20">
                  <p>💡 Tip: Use clear, concise questions and answers for best results</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Study Session View */}
        {view === 'study' && studyQueue.length > 0 && (
          <div className="max-w-3xl mx-auto p-8 flex flex-col h-full">
            {/* Progress Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                <span>Card {currentCardIndex + 1} of {studyQueue.length}</span>
                <span>Reviewed: {reviewedCount}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${((currentCardIndex + 1) / studyQueue.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Card Display */}
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full">
                {/* Question */}
                <div className="bg-black/60 border-2 border-purple-400/30 rounded-2xl p-12 mb-8">
                  <div className="text-sm text-purple-400 mb-4 font-medium">QUESTION</div>
                  <div className="text-3xl text-white text-center leading-relaxed">
                    {studyQueue[currentCardIndex].front}
                  </div>
                </div>

                {/* Answer (shown after reveal) */}
                {showAnswer && (
                  <div className="bg-black/60 border-2 border-green-400/30 rounded-2xl p-12 mb-8 animate-in fade-in duration-300">
                    <div className="text-sm text-green-400 mb-4 font-medium">ANSWER</div>
                    <div className="text-2xl text-white text-center leading-relaxed">
                      {studyQueue[currentCardIndex].back}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8">
              {!showAnswer ? (
                <button
                  className="w-full py-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-lg transition-colors"
                  onClick={() => setShowAnswer(true)}
                >
                  Show Answer
                </button>
              ) : (
                <div>
                  <div className="text-sm text-gray-400 mb-3 text-center">
                    How well did you know this card?
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <button
                      className="py-4 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
                      onClick={() => handleRateCard(1)}
                    >
                      <div className="text-2xl mb-1">❌</div>
                      <div className="text-xs">Again</div>
                      <div className="text-xs opacity-70 mt-1">
                        {new FsrsScheduler(deck.config).getButtonIntervals(studyQueue[currentCardIndex]).again}
                      </div>
                    </button>
                    
                    <button
                      className="py-4 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold transition-colors"
                      onClick={() => handleRateCard(2)}
                    >
                      <div className="text-2xl mb-1">🤔</div>
                      <div className="text-xs">Hard</div>
                      <div className="text-xs opacity-70 mt-1">
                        {new FsrsScheduler(deck.config).getButtonIntervals(studyQueue[currentCardIndex]).hard}
                      </div>
                    </button>
                    
                    <button
                      className="py-4 px-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors"
                      onClick={() => handleRateCard(3)}
                    >
                      <div className="text-2xl mb-1">✓</div>
                      <div className="text-xs">Good</div>
                      <div className="text-xs opacity-70 mt-1">
                        {new FsrsScheduler(deck.config).getButtonIntervals(studyQueue[currentCardIndex]).good}
                      </div>
                    </button>
                    
                    <button
                      className="py-4 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
                      onClick={() => handleRateCard(4)}
                    >
                      <div className="text-2xl mb-1">⭐</div>
                      <div className="text-xs">Easy</div>
                      <div className="text-xs opacity-70 mt-1">
                        {new FsrsScheduler(deck.config).getButtonIntervals(studyQueue[currentCardIndex]).easy}
                      </div>
                    </button>
                  </div>
                </div>
              )}
              
              <button
                className="w-full mt-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors flex items-center justify-center gap-2"
                onClick={() => setView('overview')}
              >
                <X size={16} />
                End Study Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
