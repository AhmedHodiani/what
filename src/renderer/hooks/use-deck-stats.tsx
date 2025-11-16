import { useState, useEffect } from 'react'
import { logger } from 'shared/logger'

interface DeckStats {
  total: number
  new: number
  learning: number
  review: number
  due: number
}

export function useDeckStats(objectId: string, parentTabId: string) {
  const [stats, setStats] = useState<DeckStats>({
    total: 0,
    new: 0,
    learning: 0,
    review: 0,
    due: 0,
  })

  const loadStats = async () => {
    try {
      const deckStats = await window.App.deck.getStats(objectId, parentTabId)
      setStats({
        total: deckStats.totalCards,
        new: deckStats.newCards,
        learning: deckStats.learningCards,
        review: deckStats.reviewCards,
        due: deckStats.dueCards,
      })
    } catch (error) {
      logger.error('Failed to load deck stats:', error)
    }
  }

  useEffect(() => {
    loadStats()
  }, [objectId, parentTabId])

  return { stats, reloadStats: loadStats }
}
