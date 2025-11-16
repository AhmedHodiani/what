interface StudyCompleteViewProps {
  reviewedCount: number
  onBackToOverview: () => void
}

export function StudyCompleteView({ reviewedCount, onBackToOverview }: StudyCompleteViewProps) {
  return (
    <div className="max-w-3xl mx-auto p-8 flex flex-col items-center justify-center h-full">
      <div className="text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-2xl font-bold text-purple-400 mb-2">
          {reviewedCount > 0 ? 'Great Job!' : 'No Cards Available'}
        </h3>
        <p className="text-gray-400 mb-6">
          {reviewedCount > 0
            ? `You reviewed ${reviewedCount} card${reviewedCount === 1 ? '' : 's'}!`
            : 'No cards are due for review right now.'}
        </p>
        <button
          className="px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
          onClick={onBackToOverview}
        >
          Back to Overview
        </button>
      </div>
    </div>
  )
}
