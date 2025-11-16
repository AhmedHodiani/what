import { Settings, GraduationCap } from 'lucide-react'
import type { Deck } from 'shared/fsrs/types'

interface OverviewViewProps {
  deck: Deck
  stats: {
    total: number
    new: number
    learning: number
    review: number
    due: number
  }
  hasCardsToReview: boolean
  onStartStudy: () => void
  onShowSettings: () => void
}

export function OverviewView({
  deck,
  stats,
  hasCardsToReview,
  onStartStudy,
}: OverviewViewProps) {
  return (
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
      {hasCardsToReview ? (
        <button
          className="w-full py-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-lg transition-colors flex items-center justify-center gap-3"
          onClick={onStartStudy}
        >
          <GraduationCap size={24} />
          Study Due Cards
        </button>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-purple-400 mb-2">All Done!</h3>
          <p className="text-gray-400">No cards due right now. Great job!</p>
        </div>
      )}
    </div>
  )
}
