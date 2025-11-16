import { useState } from 'react'
import { useShortcut, ShortcutContext } from 'renderer/shortcuts'
import type { DeckConfig } from 'shared/fsrs/types'
import { Settings, BookOpen, Brain, Layers, AlertCircle } from 'lucide-react'

interface DeckSettingsDialogProps {
  onConfirm: (config: DeckConfig) => void
  onCancel: () => void
  initialConfig: DeckConfig
  deckName: string
}

/**
 * DeckSettingsDialog - Modal dialog for configuring FSRS deck settings
 *
 * Features:
 * - Tabbed interface for different setting categories
 * - Learning & Review settings
 * - FSRS parameters (desired retention)
 * - Card ordering
 * - Advanced options (leech handling, sibling burying)
 * - Keyboard shortcuts (Enter/Escape)
 * - Matches deck-name-dialog styling
 */
export function DeckSettingsDialog({
  onConfirm,
  onCancel,
  initialConfig,
  deckName,
}: DeckSettingsDialogProps) {
  const [config, setConfig] = useState<DeckConfig>(initialConfig)
  const [activeTab, setActiveTab] = useState<'learning' | 'fsrs' | 'ordering' | 'advanced'>('learning')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleConfirm = () => {
    // Validate settings
    const newErrors: Record<string, string> = {}

    if (config.learnSteps.length === 0) {
      newErrors.learnSteps = 'At least one learning step is required'
    }

    if (config.desiredRetention < 0.7 || config.desiredRetention > 0.99) {
      newErrors.desiredRetention = 'Desired retention must be between 70% and 99%'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onConfirm(config)
  }

  // Register dialog shortcuts
  useShortcut(
    {
      key: 'escape',
      context: ShortcutContext.Dialog,
      action: onCancel,
      description: 'Close deck settings dialog',
    },
    [onCancel]
  )

  useShortcut(
    {
      key: 'enter',
      context: ShortcutContext.Dialog,
      action: handleConfirm,
      description: 'Save deck settings',
    },
    [handleConfirm]
  )

  const updateConfig = (updates: Partial<DeckConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
    // Clear related errors
    const updatedKeys = Object.keys(updates)
    setErrors(prev => {
      const newErrors = { ...prev }
      updatedKeys.forEach(key => delete newErrors[key])
      return newErrors
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-9999"
      onClick={onCancel}
    >
      <div
        className="bg-black/90 rounded-lg shadow-2xl border border-purple-400/30 p-6 w-[700px] max-w-[90vw] max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl">⚙️</div>
          <div>
            <h2 className="text-xl font-semibold text-purple-400">
              Deck Settings
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {deckName}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-purple-400/20 pb-2">
          <button
            className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'learning'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
            onClick={() => setActiveTab('learning')}
          >
            <BookOpen className="w-4 h-4" />
            Learning
          </button>
          <button
            className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'fsrs'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
            onClick={() => setActiveTab('fsrs')}
          >
            <Brain className="w-4 h-4" />
            FSRS
          </button>
          <button
            className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'ordering'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
            onClick={() => setActiveTab('ordering')}
          >
            <Layers className="w-4 h-4" />
            Ordering
          </button>
          <button
            className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'advanced'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
            onClick={() => setActiveTab('advanced')}
          >
            <Settings className="w-4 h-4" />
            Advanced
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {activeTab === 'learning' && (
            <>
              {/* Learning Steps */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Learning Steps (minutes)
                </label>
                <input
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
                  placeholder="e.g., 1, 10"
                  type="text"
                  value={config.learnSteps.join(', ')}
                  onChange={e => {
                    const steps = e.target.value
                      .split(',')
                      .map(s => parseFloat(s.trim()))
                      .filter(s => !isNaN(s) && s > 0)
                    updateConfig({ learnSteps: steps })
                  }}
                />
                {errors.learnSteps && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.learnSteps}</span>
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Comma-separated intervals for learning new cards
                </p>
              </div>

              {/* Relearning Steps */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Relearning Steps (minutes)
                </label>
                <input
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
                  placeholder="e.g., 10"
                  type="text"
                  value={config.relearnSteps.join(', ')}
                  onChange={e => {
                    const steps = e.target.value
                      .split(',')
                      .map(s => parseFloat(s.trim()))
                      .filter(s => !isNaN(s) && s > 0)
                    updateConfig({ relearnSteps: steps })
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Steps for cards you forget
                </p>
              </div>

              {/* Graduating Intervals */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Graduating Interval (days)
                  </label>
                  <input
                    className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
                    min={1}
                    type="number"
                    value={config.graduatingIntervalGood}
                    onChange={e =>
                      updateConfig({ graduatingIntervalGood: parseInt(e.target.value) })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    After "Good" on final step
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Easy Interval (days)
                  </label>
                  <input
                    className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
                    min={1}
                    type="number"
                    value={config.graduatingIntervalEasy}
                    onChange={e =>
                      updateConfig({ graduatingIntervalEasy: parseInt(e.target.value) })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    After "Easy" on learning card
                  </p>
                </div>
              </div>

              {/* Initial Ease Factor */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Initial Ease Factor: {(config.initialEase * 100).toFixed(0)}%
                </label>
                <input
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  max={500}
                  min={130}
                  step={5}
                  type="range"
                  value={config.initialEase * 100}
                  onChange={e =>
                    updateConfig({ initialEase: parseInt(e.target.value) / 100 })
                  }
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>130%</span>
                  <span>500%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Starting ease for new cards (default: 250%)
                </p>
              </div>

              {/* Maximum Review Interval */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Maximum Review Interval (days)
                </label>
                <input
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
                  min={1}
                  type="number"
                  value={config.maximumReviewInterval}
                  onChange={e =>
                    updateConfig({ maximumReviewInterval: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cap on how far cards can be pushed out
                </p>
              </div>

              {/* Minimum Lapse Interval */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum Lapse Interval (days)
                </label>
                <input
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
                  min={1}
                  type="number"
                  value={config.minimumLapseInterval}
                  onChange={e =>
                    updateConfig({ minimumLapseInterval: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum interval for lapsed cards
                </p>
              </div>

              {/* Interval Multiplier */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Interval Multiplier: {config.intervalMultiplier.toFixed(2)}
                </label>
                <input
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  max={2.0}
                  min={0.5}
                  step={0.05}
                  type="range"
                  value={config.intervalMultiplier}
                  onChange={e =>
                    updateConfig({ intervalMultiplier: parseFloat(e.target.value) })
                  }
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.5x</span>
                  <span>2.0x</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Multiply all intervals by this factor
                </p>
              </div>
            </>
          )}

          {activeTab === 'fsrs' && (
            <>
              {/* Desired Retention */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Desired Retention: {(config.desiredRetention * 100).toFixed(0)}%
                </label>
                <input
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  max={99}
                  min={70}
                  step={1}
                  type="range"
                  value={config.desiredRetention * 100}
                  onChange={e =>
                    updateConfig({ desiredRetention: parseInt(e.target.value) / 100 })
                  }
                />
                {errors.desiredRetention && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.desiredRetention}</span>
                  </p>
                )}
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>70% (Less work)</span>
                  <span>99% (More work)</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Higher retention means more reviews. 90% is recommended for most users.
                </p>
              </div>

              {/* FSRS Parameters Editor */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  FSRS Parameters (Advanced)
                </label>
                <textarea
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all font-mono text-xs"
                  placeholder="19 comma-separated parameters"
                  rows={4}
                  value={config.fsrsParams.join(', ')}
                  onChange={e => {
                    const params = e.target.value
                      .split(',')
                      .map(s => parseFloat(s.trim()))
                      .filter(s => !isNaN(s) && s > 0)
                    if (params.length === 19) {
                      updateConfig({ fsrsParams: params })
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  19 FSRS parameters - edit only if you know what you're doing
                </p>
              </div>

              {/* FSRS Parameters Info */}
              <div className="bg-purple-900/20 border border-purple-400/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Brain className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-purple-300 mb-1">
                      FSRS Algorithm
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      This deck uses the Free Spaced Repetition Scheduler (FSRS) algorithm with 19
                      optimized parameters. These parameters are automatically configured for optimal
                      learning and typically don't need adjustment.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'ordering' && (
            <>
              {/* New Card Insert Order */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New Card Insert Order
                </label>
                <select
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
                  value={config.newCardInsertOrder}
                  onChange={e =>
                    updateConfig({ newCardInsertOrder: parseInt(e.target.value) })
                  }
                >
                  <option value={0}>Due</option>
                  <option value={1}>Random</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  How new cards are inserted into the deck
                </p>
              </div>

              {/* New Card Gather Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New Card Gather Priority
                </label>
                <select
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
                  value={config.newCardGatherPriority}
                  onChange={e =>
                    updateConfig({ newCardGatherPriority: parseInt(e.target.value) })
                  }
                >
                  <option value={0}>Deck</option>
                  <option value={1}>Position (Lowest First)</option>
                  <option value={2}>Position (Highest First)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  How new cards are gathered from the deck
                </p>
              </div>

              {/* New Card Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New Card Sort Order
                </label>
                <select
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
                  value={config.newCardSortOrder}
                  onChange={e =>
                    updateConfig({ newCardSortOrder: parseInt(e.target.value) })
                  }
                >
                  <option value={0}>Template</option>
                  <option value={1}>Random</option>
                  <option value={2}>Reverse</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  How new cards are sorted for study
                </p>
              </div>

              {/* Review Card Order */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Review Card Order
                </label>
                <select
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
                  value={config.reviewOrder}
                  onChange={e =>
                    updateConfig({ reviewOrder: parseInt(e.target.value) })
                  }
                >
                  <option value={0}>Due Date</option>
                  <option value={1}>Due Date, then Random</option>
                  <option value={2}>Deck, then Due Date</option>
                  <option value={3}>Random</option>
                  <option value={4}>Intervals (Ascending)</option>
                  <option value={5}>Intervals (Descending)</option>
                  <option value={6}>Ease (Ascending)</option>
                  <option value={7}>Ease (Descending)</option>
                  <option value={8}>Relative Overdueness</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  How review cards are ordered for study
                </p>
              </div>

              {/* New/Review Mix */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New Card Mix
                </label>
                <select
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
                  value={config.newMix}
                  onChange={e => updateConfig({ newMix: parseInt(e.target.value) })}
                >
                  <option value={0}>Mix with Reviews</option>
                  <option value={1}>Reviews First</option>
                  <option value={2}>New First</option>
                  <option value={3}>Reviews Only</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  How to mix new cards with review cards
                </p>
              </div>

              {/* Interday Learning Mix */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Interday Learning Mix
                </label>
                <select
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
                  value={config.interdayLearningMix}
                  onChange={e =>
                    updateConfig({ interdayLearningMix: parseInt(e.target.value) })
                  }
                >
                  <option value={0}>Mix with Reviews</option>
                  <option value={1}>Reviews First</option>
                  <option value={2}>New First</option>
                  <option value={3}>Reviews Only</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  How to mix interday learning cards with reviews
                </p>
              </div>
            </>
          )}

          {activeTab === 'advanced' && (
            <>
              {/* Leech Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Leech Threshold
                </label>
                <input
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
                  min={0}
                  type="number"
                  value={config.leechThreshold}
                  onChange={e =>
                    updateConfig({ leechThreshold: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of lapses before a card is marked as a leech (0 = disabled)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Leech Action
                </label>
                <select
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
                  value={config.leechAction}
                  onChange={e =>
                    updateConfig({ leechAction: parseInt(e.target.value) })
                  }
                >
                  <option value={0}>Suspend Card</option>
                  <option value={1}>Tag Only</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  What to do when a card becomes a leech
                </p>
              </div>

              {/* Sibling Burying */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">
                  Sibling Burying
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    checked={config.buryNew}
                    className="w-4 h-4 bg-gray-900 border-gray-600 rounded focus:ring-2 focus:ring-purple-400/20 text-purple-600"
                    type="checkbox"
                    onChange={e => updateConfig({ buryNew: e.target.checked })}
                  />
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                    Bury new siblings
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    checked={config.buryReviews}
                    className="w-4 h-4 bg-gray-900 border-gray-600 rounded focus:ring-2 focus:ring-purple-400/20 text-purple-600"
                    type="checkbox"
                    onChange={e => updateConfig({ buryReviews: e.target.checked })}
                  />
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                    Bury review siblings
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    checked={config.buryInterdayLearning}
                    className="w-4 h-4 bg-gray-900 border-gray-600 rounded focus:ring-2 focus:ring-purple-400/20 text-purple-600"
                    type="checkbox"
                    onChange={e =>
                      updateConfig({ buryInterdayLearning: e.target.checked })
                    }
                  />
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                    Bury interday learning siblings
                  </span>
                </label>

                <p className="text-xs text-gray-500">
                  Prevent cards from the same note from appearing together in one session
                </p>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-purple-400/20">
          <button
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors border border-gray-600"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
            onClick={handleConfirm}
          >
            Save Settings
          </button>
        </div>

        {/* Keyboard hints */}
        <div className="flex gap-4 mt-3 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-black/50 border border-purple-400/30 rounded text-purple-400">
              Enter
            </kbd>
            <span>Save</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-black/50 border border-purple-400/30 rounded text-purple-400">
              Esc
            </kbd>
            <span>Cancel</span>
          </div>
        </div>
      </div>
    </div>
  )
}
