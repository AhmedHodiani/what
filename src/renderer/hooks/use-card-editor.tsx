import { useState, useRef } from 'react'
import type { Card } from 'shared/fsrs/types'

export function useCardEditor() {
  const [editingCardId, setEditingCardId] = useState<number | null>(null)
  const [editCardFront, setEditCardFront] = useState('')
  const [editCardBack, setEditCardBack] = useState('')
  const [editError, setEditError] = useState('')
  
  const editFrontInputRef = useRef<HTMLTextAreaElement>(null)

  const startEdit = (card: Card) => {
    setEditingCardId(card.id)
    setEditCardFront(card.front)
    setEditCardBack(card.back)
    setEditError('')
    setTimeout(() => editFrontInputRef.current?.focus(), 100)
  }
  
  const cancelEdit = () => {
    setEditingCardId(null)
    setEditCardFront('')
    setEditCardBack('')
    setEditError('')
  }

  return {
    editingCardId,
    editCardFront,
    setEditCardFront,
    editCardBack,
    setEditCardBack,
    editError,
    setEditError,
    editFrontInputRef,
    startEdit,
    cancelEdit,
  }
}
