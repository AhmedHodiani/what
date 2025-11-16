import { X } from 'lucide-react'
import type { Card } from 'shared/fsrs/types'

interface StudyViewProps {
  currentCard: Card
  showingAnswer: boolean
  remainingCounts: {
    new: number
    learning: number
    review: number
  }
  reviewedCount: number
  intervals: {
    again: string
    hard: string
    good: string
    easy: string
  }
  onShowAnswer: () => void
  onAnswer: (rating: 1 | 2 | 3 | 4) => void
  onEndSession: () => void
  renderMarkdown: (text: string) => React.ReactNode
}

export function StudyView({
  currentCard,
  showingAnswer,
  remainingCounts,
  reviewedCount,
  intervals,
  onShowAnswer,
  onAnswer,
  onEndSession,
  renderMarkdown,
}: StudyViewProps) {
  return (
    <div className="max-w-3xl mx-auto p-8 flex flex-col h-full">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
          <span>
            Remaining: {remainingCounts.new} + {remainingCounts.learning} + {remainingCounts.review}
          </span>
          <span>Reviewed: {reviewedCount}</span>
        </div>
      </div>

      {/* Card Display */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full" key={currentCard.id}>
          {/* Question */}
          <div className="bg-black/60 border-2 border-purple-400/30 rounded-2xl p-12 mb-8">
            <div className="text-sm text-purple-400 mb-4 font-medium">QUESTION</div>
            <div className="text-3xl text-white leading-relaxed markdown-content flex flex-col items-center w-full">
              {renderMarkdown(currentCard.front)}
            </div>
            {currentCard.interval > 0 && (
              <div className="text-sm text-gray-500 mt-4 text-center">
                Last interval: {currentCard.interval}d
              </div>
            )}
          </div>

          {/* Answer (shown after reveal) */}
          {showingAnswer && (
            <div className="bg-black/60 border-2 border-green-400/30 rounded-2xl p-12 mb-8 animate-in fade-in duration-300">
              <div className="text-sm text-green-400 mb-4 font-medium">ANSWER</div>
              <div className="text-2xl text-white leading-relaxed markdown-content flex flex-col items-center">
                {renderMarkdown(currentCard.back)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8">
        {!showingAnswer ? (
          <button
            className="w-full py-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-lg transition-colors"
            onClick={onShowAnswer}
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
                onClick={() => onAnswer(1)}
              >
                <div className="text-2xl mb-1">❌</div>
                <div className="text-xs">Again</div>
                <div className="text-xs opacity-70 mt-1">{intervals.again}</div>
              </button>
              
              <button
                className="py-4 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold transition-colors"
                onClick={() => onAnswer(2)}
              >
                <div className="text-2xl mb-1">🤔</div>
                <div className="text-xs">Hard</div>
                <div className="text-xs opacity-70 mt-1">{intervals.hard}</div>
              </button>
              
              <button
                className="py-4 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
                onClick={() => onAnswer(3)}
              >
                <div className="text-2xl mb-1">✓</div>
                <div className="text-xs">Good</div>
                <div className="text-xs opacity-70 mt-1">{intervals.good}</div>
              </button>
              
              <button
                className="py-4 px-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors"
                onClick={() => onAnswer(4)}
              >
                <div className="text-2xl mb-1">⭐</div>
                <div className="text-xs">Easy</div>
                <div className="text-xs opacity-70 mt-1">{intervals.easy}</div>
              </button>
            </div>
          </div>
        )}
        
        <button
          className="w-full mt-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors flex items-center justify-center gap-2"
          onClick={onEndSession}
        >
          <X size={16} />
          End Study Session
        </button>
      </div>
    </div>
  )
}
