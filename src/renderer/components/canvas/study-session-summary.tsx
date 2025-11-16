/**
 * Study Session Summary Component
 * 
 * Shows completion summary after a study session ends
 * Matches CLI's session completion feedback
 */

import { CheckCircle2, Clock, TrendingUp } from 'lucide-react'

export interface StudySessionSummaryProps {
  reviewedCount: number
  sessionDuration: number
  onContinue: () => void
}

export function StudySessionSummary({
  reviewedCount,
  sessionDuration,
  onContinue,
}: StudySessionSummaryProps) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-950">
      <div className="max-w-lg w-full mx-auto p-8">
        <div className="bg-black/60 border-2 border-purple-400/30 rounded-2xl p-12 text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-purple-500/20 border-2 border-purple-400">
              <CheckCircle2 size={48} className="text-purple-400" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-purple-400 mb-2">
            Session Complete!
          </h2>
          <p className="text-gray-400 mb-8">
            {reviewedCount === 0
              ? 'No cards were reviewed'
              : `Great work! You've completed all due cards.`}
          </p>

          {/* Stats Grid */}
          {reviewedCount > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-8">
              {/* Cards Reviewed */}
              <div className="bg-black/40 border border-purple-400/20 rounded-lg p-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp size={20} className="text-purple-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {reviewedCount}
                </div>
                <div className="text-sm text-gray-400">
                  Card{reviewedCount !== 1 ? 's' : ''} Reviewed
                </div>
              </div>

              {/* Time Spent */}
              <div className="bg-black/40 border border-purple-400/20 rounded-lg p-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock size={20} className="text-purple-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  { sessionDuration }
                </div>
                <div className="text-sm text-gray-400">Time Spent</div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            className="w-full py-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-lg transition-colors"
            onClick={onContinue}
          >
            Return to Overview
          </button>

          <p className="text-xs text-gray-500 mt-4">
            💡 Come back later for more reviews
          </p>
        </div>
      </div>
    </div>
  )
}
