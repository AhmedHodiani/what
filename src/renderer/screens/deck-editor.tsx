import { useEffect, useState } from 'react'
import { logger } from 'shared/logger'
import { BookOpen, Plus, Settings, Edit3, Upload } from 'lucide-react'
import type { Deck, DeckConfig } from 'shared/fsrs/types'
import { DeckSettingsDialog } from 'renderer/components/canvas/deck-settings-dialog'
import { DeleteConfirmDialog } from 'renderer/components/canvas/delete-confirm-dialog'
import { ExternalUrlDialog } from 'renderer/components/canvas/external-url-dialog'
import { BulkAddDialog } from 'renderer/components/canvas/bulk-add-dialog'
import { OverviewView } from 'renderer/components/canvas/deck-overview-view'
import { CardsListView } from 'renderer/components/canvas/deck-cards-list-view'
import { AddCardView } from 'renderer/components/canvas/deck-add-card-view'
import { StudyView } from 'renderer/components/canvas/deck-study-view'
import { StudyCompleteView } from 'renderer/components/canvas/deck-study-complete-view'
import { CardEditor } from 'renderer/components/canvas/card-editor'
import { useStudySession } from 'renderer/hooks/use-study-session'
import { useDeckStats } from 'renderer/hooks/use-deck-stats'
import { useCardForm } from 'renderer/hooks/use-card-form'
import { useCardEditor } from 'renderer/hooks/use-card-editor'
import { useDeckDialogs } from 'renderer/hooks/use-deck-dialogs'
import { useDeckMarkdown } from 'renderer/hooks/use-deck-markdown'
import { useDeckOperations } from 'renderer/hooks/use-deck-operations'

interface DeckEditorProps {
  tabId: string // FlexLayout tab ID (passed from factory)
  objectId: string // This IS the deck_id in the database
  parentTabId: string
  title: string
  assetId?: string // Ignored - kept for compatibility with external tab interface
}

type View = 'overview' | 'cards' | 'study' | 'add-card' | 'study-summary'

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
  
  // Custom hooks
  const { stats, reloadStats } = useDeckStats(objectId, parentTabId)
  const cardForm = useCardForm()
  const cardEditor = useCardEditor()
  const dialogs = useDeckDialogs()
  const { renderMarkdown } = useDeckMarkdown(parentTabId, false)
  const { renderMarkdown: renderMarkdownWithAutoPlay } = useDeckMarkdown(parentTabId, true)
  const studySession = useStudySession(deck, objectId, parentTabId)
  
  const deckOperations = useDeckOperations(
    objectId,
    parentTabId,
    setDeck,
    reloadStats
  )

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
      } catch (error) {
        logger.error('Failed to load deck:', error)
      }
    }
    
    loadDeck()
  }, [objectId, parentTabId])

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

  // Clean up assets when user removes them from card text
  useEffect(() => {
    if (cardForm.uploadedAssets.length === 0) return
    
    const currentAssets = [
      ...cardForm.extractAssetIds(cardForm.newCardFront),
      ...cardForm.extractAssetIds(cardForm.newCardBack)
    ]
    
    const removedAssets = cardForm.uploadedAssets.filter(id => !currentAssets.includes(id))
    
    if (removedAssets.length > 0) {
      logger.debug('[Asset cleanup] Removing assets from text:', removedAssets)
      removedAssets.forEach(async (assetId) => {
        try {
          await window.App.file.deleteAsset(assetId, parentTabId)
        } catch (error) {
          logger.error('Failed to delete removed asset:', error)
        }
      })
      
      cardForm.setUploadedAssets(currentAssets)
    }
  }, [cardForm.newCardFront, cardForm.newCardBack, parentTabId])

  // Save deck to database
  const saveDeck = async (updatedDeck: Deck) => {
    try {
      await window.App.deck.saveConfig(objectId, updatedDeck.config, parentTabId)
      setDeck(updatedDeck)
      setIsDirty(false)
    } catch (error) {
      logger.error('Failed to save deck:', error)
    }
  }

  // Add new card
  const handleAddCard = async () => {
    if (!deck) return
    
    try {
      await deckOperations.addCard(
        cardForm.newCardFront,
        cardForm.newCardBack,
        cardForm.uploadedAssets,
        cardForm.extractAssetIds
      )
      
      cardForm.setUploadedAssets([])
      cardForm.resetForm()
    } catch (error) {
      if (error instanceof Error) {
        cardForm.setAddCardError(error.message)
      }
    }
  }

  // Save edited card
  const handleSaveEdit = async () => {
    if (!deck || cardEditor.editingCardId === null) return
    
    const card = deck.cards.find(c => c.id === cardEditor.editingCardId)
    if (!card) return
    
    try {
      await deckOperations.updateCard(
        card,
        cardEditor.editCardFront,
        cardEditor.editCardBack
      )
      cardEditor.cancelEdit()
    } catch (error) {
      if (error instanceof Error) {
        cardEditor.setEditError(error.message)
      }
    }
  }
  
  // Delete card and its assets
  const handleDeleteCard = async (cardId: number) => {
    if (!deck) return
    
    await deckOperations.deleteCard(cardId, deck.cards, cardForm.extractAssetIds)
    dialogs.setDeleteConfirmId(null)
  }

  // Start study session (using FSRS logic)
  const handleStartStudy = () => {
    if (!deck || deck.cards.length === 0) {
      logger.debug('No cards to study')
      return
    }
    
    studySession.startSession()
    setView('study')
  }

  // Handle settings save
  const handleSettingsSave = async (config: DeckConfig) => {
    if (!deck) return
    
    const updatedDeck = { ...deck, config }
    await saveDeck(updatedDeck)
    dialogs.setShowSettings(false)
  }
  
  // Handle external URL insertion
  const handleInsertExternalUrl = () => {
    if (!dialogs.externalUrl.trim()) return
    cardForm.insertExternalMedia(dialogs.externalUrl, dialogs.externalMediaType)
    dialogs.setExternalUrl('')
    dialogs.setShowExternalUrlDialog(false)
  }
  
  // Handle bulk add cards
  const handleBulkImport = async (cards: Array<{ front: string; back: string }>) => {
    if (!deck) return
    
    try {
      await deckOperations.bulkAddCards(cards)
      logger.debug('[handleBulkImport] Successfully imported', cards.length, 'cards')
    } catch (error) {
      logger.error('[handleBulkImport] Failed:', error)
    }
  }
  
  // Handle cancel add card
  const handleCancelAddCard = async () => {
    for (const assetId of cardForm.uploadedAssets) {
      try {
        await window.App.file.deleteAsset(assetId, parentTabId)
      } catch (error) {
        logger.error('Failed to delete asset:', error)
      }
    }
    
    setView('overview')
    cardForm.resetForm()
    cardForm.setUploadedAssets([])
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
      {dialogs.showSettings && (
        <DeckSettingsDialog
          deckName={deck.name}
          initialConfig={deck.config}
          onCancel={() => dialogs.setShowSettings(false)}
          onConfirm={handleSettingsSave}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      {dialogs.deleteConfirmId !== null && (
        <DeleteConfirmDialog
          onCancel={() => dialogs.setDeleteConfirmId(null)}
          onConfirm={() => handleDeleteCard(dialogs.deleteConfirmId!)}
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
          
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors flex items-center gap-2"
              onClick={() => dialogs.setShowBulkAddDialog(true)}
            >
              <Upload size={16} />
              Bulk Add
            </button>
            
            <button
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors border border-gray-600 flex items-center gap-2"
              onClick={() => dialogs.setShowSettings(true)}
            >
              <Settings size={16} />
              Settings
            </button>
          </div>
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
            setTimeout(() => cardForm.frontInputRef.current?.focus(), 100)
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
          <OverviewView
            deck={deck}
            stats={stats}
            hasCardsToReview={studySession.hasCardsToReview}
            onStartStudy={handleStartStudy}
            onShowSettings={() => dialogs.setShowSettings(true)}
          />
        )}

        {/* Cards List View */}
        {view === 'cards' && deck.cards.map((card) => {
          if (cardEditor.editingCardId === card.id) {
            return (
              <div key={card.id} className="max-w-4xl mx-auto p-8">
                <div className="bg-black/40 border border-purple-400/20 rounded-lg p-6">
                  <CardEditor
                    card={card}
                    frontValue={cardEditor.editCardFront}
                    backValue={cardEditor.editCardBack}
                    error={cardEditor.editError}
                    onFrontChange={cardEditor.setEditCardFront}
                    onBackChange={cardEditor.setEditCardBack}
                    onSave={handleSaveEdit}
                    onCancel={cardEditor.cancelEdit}
                    frontInputRef={cardEditor.editFrontInputRef}
                  />
                </div>
              </div>
            )
          }
          return null
        })}
        
        {view === 'cards' && !deck.cards.some(c => c.id === cardEditor.editingCardId) && (
          <CardsListView
            cards={deck.cards}
            renderMarkdown={renderMarkdown}
            onAddCard={() => {
              setView('add-card')
              setTimeout(() => cardForm.frontInputRef.current?.focus(), 100)
            }}
            onEditCard={cardEditor.startEdit}
            onDeleteCard={(cardId) => dialogs.setDeleteConfirmId(cardId)}
          />
        )}

        {/* Add Card View */}
        {view === 'add-card' && (
          <AddCardView
            frontValue={cardForm.newCardFront}
            backValue={cardForm.newCardBack}
            error={cardForm.addCardError}
            onFrontChange={(value) => {
              cardForm.setNewCardFront(value)
              cardForm.setAddCardError('')
            }}
            onBackChange={(value) => {
              cardForm.setNewCardBack(value)
              cardForm.setAddCardError('')
            }}
            onFrontFocus={() => cardForm.setActiveInput('front')}
            onBackFocus={() => cardForm.setActiveInput('back')}
            onAttachAsset={() => cardForm.assetInputRef.current?.click()}
            onExternalUrl={() => dialogs.setShowExternalUrlDialog(true)}
            onAddCard={handleAddCard}
            onCancel={handleCancelAddCard}
            frontInputRef={cardForm.frontInputRef}
            assetInputRef={cardForm.assetInputRef}
            onAssetUpload={(files) => cardForm.handleAssetUpload(files, parentTabId)}
            renderMarkdown={renderMarkdown}
          />
        )}

        {/* Study Session View (FSRS-powered) */}
        {view === 'study' && deck && studySession.sessionActive && studySession.currentCard && (
          <StudyView
            currentCard={studySession.currentCard}
            showingAnswer={studySession.showingAnswer}
            remainingCounts={studySession.remainingCounts}
            reviewedCount={studySession.reviewedCount}
            intervals={studySession.intervals}
            onShowAnswer={studySession.showAnswer}
            onAnswer={studySession.answerCard}
            onEndSession={() => {
              studySession.endSession()
              setView('overview')
            }}
            renderMarkdown={renderMarkdownWithAutoPlay}
          />
        )}
        
        {/* Study Session Complete / No Cards */}
        {view === 'study' && deck && !studySession.sessionActive && (
          <StudyCompleteView
            reviewedCount={studySession.reviewedCount}
            onBackToOverview={() => setView('overview')}
          />
        )}
        
        {/* External URL Dialog */}
        {dialogs.showExternalUrlDialog && (
          <ExternalUrlDialog
            url={dialogs.externalUrl}
            mediaType={dialogs.externalMediaType}
            onUrlChange={(url) => {
              dialogs.setExternalUrl(url)
              if (url.trim()) {
                dialogs.setExternalMediaType(dialogs.detectMediaType(url))
              }
            }}
            onMediaTypeChange={dialogs.setExternalMediaType}
            onCancel={() => {
              dialogs.setShowExternalUrlDialog(false)
              dialogs.setExternalUrl('')
            }}
            onInsert={handleInsertExternalUrl}
          />
        )}
        
        {/* Bulk Add Dialog */}
        {dialogs.showBulkAddDialog && (
          <BulkAddDialog
            open={dialogs.showBulkAddDialog}
            onClose={() => dialogs.setShowBulkAddDialog(false)}
            onImport={handleBulkImport}
          />
        )}
      </div>
    </div>
  )
}
