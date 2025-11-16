import { Trash2, Search } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import type { Card } from 'shared/fsrs/types'

interface CardsListViewProps {
  cards: Card[]
  renderMarkdown: (text: string) => React.ReactNode
  onAddCard: () => void
  onEditCard: (card: Card) => void
  onDeleteCard: (cardId: number) => void
}

export function CardsListView({
  cards,
  renderMarkdown,
  onAddCard,
  onEditCard: _onEditCard,
  onDeleteCard,
}: CardsListViewProps) {
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Debounce search input (300ms delay)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchQuery(searchInput)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchInput])

  // Filter cards based on search query
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return cards

    const query = searchQuery.toLowerCase()
    return cards.filter(card => 
      card.front.toLowerCase().includes(query) || 
      card.back.toLowerCase().includes(query)
    )
  }, [cards, searchQuery])

  if (cards.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No Cards Yet</h3>
          <p className="text-gray-500 mb-6">Add your first card to get started!</p>
          <button
            className="px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
            onClick={onAddCard}
          >
            Add Card
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search cards..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-black/40 text-white rounded-lg border border-purple-400/20 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
          />
        </div>
        {searchInput && (
          <p className="text-sm text-gray-400 mt-2">
            Found {filteredCards.length} of {cards.length} cards
          </p>
        )}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredCards.map((card) => {
          // Find original index for numbering
          const originalIndex = cards.findIndex(c => c.id === card.id)
          return (
          <div
            key={card.id}
            className="bg-black/40 border border-purple-400/20 rounded-lg p-6 hover:border-purple-400/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-gray-400 font-mono text-sm mt-1">#{originalIndex + 1}</span>
                  <div className="flex-1">
                    <div className="text-sm text-gray-400 mb-1">Question</div>
                    <div className="text-white mb-4 markdown-content flex flex-col items-center w-full">
                      {renderMarkdown(card.front)}
                    </div>
                    
                    <div className="text-sm text-gray-400 mb-1">Answer</div>
                    <div className="text-gray-300 markdown-content flex flex-col items-center w-full">
                      {renderMarkdown(card.back)}
                    </div>
                  </div>
                </div>
                
                {card.interval > 0 && (
                  <div className="text-xs text-gray-500 mt-3 flex items-center gap-4">
                    <span>Interval: {card.interval}d</span>
                    <span>Reviews: {card.reps}</span>
                    <span>Lapses: {card.lapses}</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                {/* <button
                  className="p-2 rounded-lg text-purple-400 hover:bg-purple-400/10 transition-colors"
                  onClick={() => onEditCard(card)}
                  title="Edit card"
                >
                  <Edit3 size={18} />
                </button> */}
                <button
                  className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                  onClick={() => onDeleteCard(card.id)}
                  title="Delete card"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        )})}
      </div>
    </div>
  )
}

