import { Edit3, Trash2 } from 'lucide-react'
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
  onEditCard,
  onDeleteCard,
}: CardsListViewProps) {
  if (cards.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-8">
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
    <div className="max-w-4xl mx-auto p-8">
      <div className="space-y-4">
        {cards.map((card, index) => (
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
        ))}
      </div>
    </div>
  )
}
