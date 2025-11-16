import { logger } from 'shared/logger'
import type { Card, Deck } from 'shared/fsrs/types'
import { generateNoteId } from 'shared/fsrs/cardUtils'

export function useDeckOperations(
  objectId: string,
  parentTabId: string,
  onDeckUpdate: (deck: Deck) => void,
  onStatsReload: () => void
) {
  const addCard = async (
    front: string,
    back: string,
    uploadedAssets: string[],
    extractAssetIds: (text: string) => string[]
  ) => {
    const trimmedFront = front.trim()
    const trimmedBack = back.trim()
    
    if (!trimmedFront) {
      throw new Error('Question cannot be empty')
    }
    
    if (!trimmedBack) {
      throw new Error('Answer cannot be empty')
    }
    
    try {
      const newCard = {
        id: 0,
        noteId: generateNoteId(),
        deckId: 0,
        front: trimmedFront,
        back: trimmedBack,
        ctype: 0,
        queue: 0,
        due: 0,
        interval: 0,
        easeFactor: 2500,
        reps: 0,
        lapses: 0,
        remainingSteps: 0,
        memoryState: null,
        desiredRetention: null,
        mtime: Math.floor(Date.now() / 1000),
        lastReview: null,
        flags: 0,
        customData: '',
      }
      
      await window.App.deck.addCard(newCard, objectId, parentTabId)
      
      // Clean up unused assets
      const usedAssets = [...extractAssetIds(trimmedFront), ...extractAssetIds(trimmedBack)]
      const unusedAssets = uploadedAssets.filter(id => !usedAssets.includes(id))
      
      logger.debug('[addCard] Asset cleanup:', {
        front: trimmedFront.substring(0, 200),
        back: trimmedBack.substring(0, 200),
        uploadedAssets,
        usedAssets,
        unusedAssets
      })
      
      for (const assetId of unusedAssets) {
        try {
          logger.debug('[addCard] Deleting unused asset:', assetId)
          await window.App.file.deleteAsset(assetId, parentTabId)
        } catch (error) {
          logger.error('Failed to delete unused asset:', error)
        }
      }
      
      const updatedDeck = await window.App.deck.load(objectId, parentTabId)
      onDeckUpdate(updatedDeck!)
      
      logger.debug('[addCard] Deck reloaded, cards:', updatedDeck?.cards.map((c: Card) => ({
        id: c.id,
        front: c.front.substring(0, 100),
        back: c.back.substring(0, 100)
      })))
      
      onStatsReload()
    } catch (error) {
      logger.error('Failed to add card:', error)
      throw new Error('Failed to add card. Please try again.')
    }
  }

  const updateCard = async (
    card: Card,
    front: string,
    back: string
  ) => {
    if (!front.trim() || !back.trim()) {
      throw new Error('Both front and back are required')
    }
    
    try {
      await window.App.deck.updateCard(
        {
          ...card,
          front: front.trim(),
          back: back.trim(),
        },
        parentTabId
      )
      
      const updatedDeck = await window.App.deck.load(objectId, parentTabId)
      onDeckUpdate(updatedDeck!)
    } catch (error) {
      logger.error('Failed to update card:', error)
      throw new Error('Failed to update card. Please try again.')
    }
  }

  const deleteCard = async (
    cardId: number,
    cards: Card[],
    extractAssetIds: (text: string) => string[]
  ) => {
    try {
      const card = cards.find(c => c.id === cardId)
      if (!card) return
      
      const frontAssets = extractAssetIds(card.front)
      const backAssets = extractAssetIds(card.back)
      const allAssets = [...new Set([...frontAssets, ...backAssets])]
      
      for (const assetId of allAssets) {
        await window.App.file.deleteAsset(assetId, parentTabId)
      }
      
      await window.App.deck.deleteCard(cardId, parentTabId)
      
      const updatedDeck = await window.App.deck.load(objectId, parentTabId)
      onDeckUpdate(updatedDeck!)
      
      onStatsReload()
    } catch (error) {
      logger.error('Failed to delete card:', error)
    }
  }

  return {
    addCard,
    updateCard,
    deleteCard,
  }
}
