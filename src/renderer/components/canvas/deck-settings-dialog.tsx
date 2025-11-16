import { useState, useRef, useEffect } from 'react'
import { useShortcut, ShortcutContext } from 'renderer/shortcuts'
import type { DeckConfig } from 'shared/fsrs/types'
import { Settings, BookOpen, Brain, Layers, AlertCircle, ChevronDown, Check } from 'lucide-react'

interface SelectOption {
  value: number
  label: string
  description: string
}

/**
 * CustomSelect - Styled dropdown with descriptions
 */
function CustomSelect({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: SelectOption[]
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const selectedOption = options.find(opt => opt.value === value) || options[0]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        className={`w-full px-4 py-2.5 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all flex items-center justify-between ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-purple-400/50 cursor-pointer'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className="text-sm">{selectedOption.label}</span>
        <ChevronDown className={`w-4 h-4 text-purple-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="fixed z-9999 bg-gray-800 border border-purple-400/30 rounded-lg shadow-2xl max-h-96 overflow-y-auto custom-scrollbar"
          style={{
            top: dropdownRef.current ? `${dropdownRef.current.getBoundingClientRect().bottom + 8}px` : '0',
            left: dropdownRef.current ? `${dropdownRef.current.getBoundingClientRect().left}px` : '0',
            width: dropdownRef.current ? `${dropdownRef.current.getBoundingClientRect().width}px` : 'auto',
          }}
        >
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              className={`w-full px-4 py-3 text-left hover:bg-purple-900/30 transition-colors border-b border-gray-700 last:border-b-0 ${
                option.value === value ? 'bg-purple-900/20' : ''
              }`}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-sm font-medium text-white mb-1">{option.label}</div>
                  <div className="text-xs text-gray-400 leading-relaxed">{option.description}</div>
                </div>
                {option.value === value && (
                  <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

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
  
  // Local state for text inputs to allow free typing
  const [learnStepsText, setLearnStepsText] = useState(initialConfig.learnSteps.join(', '))
  const [relearnStepsText, setRelearnStepsText] = useState(initialConfig.relearnSteps.join(', '))

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
        className="bg-black/90 rounded-lg shadow-2xl border border-purple-400/30 p-6 w-[900px] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <style>{`
          /* Hide number input arrows */
          input[type='number']::-webkit-inner-spin-button,
          input[type='number']::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          input[type='number'] {
            -moz-appearance: textfield;
          }
          
          /* Custom scrollbar for dark theme */
          .custom-scrollbar::-webkit-scrollbar {
            width: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 5px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(168, 85, 247, 0.4);
            border-radius: 5px;
            border: 2px solid rgba(0, 0, 0, 0.3);
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(168, 85, 247, 0.6);
          }
          
          /* Custom checkbox */
          .custom-checkbox {
            appearance: none;
            width: 20px;
            height: 20px;
            border: 2px solid #4b5563;
            border-radius: 4px;
            background: #111827;
            cursor: pointer;
            position: relative;
            transition: all 0.2s;
          }
          .custom-checkbox:checked {
            background: #9333ea;
            border-color: #9333ea;
          }
          .custom-checkbox:checked::after {
            content: '✓';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 14px;
            font-weight: bold;
          }
          .custom-checkbox:hover {
            border-color: #9333ea;
          }
          
          /* Custom select */
          .custom-select {
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239333ea'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 0.75rem center;
            background-size: 1.25em;
            padding-right: 2.5rem;
          }
        `}</style>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold text-purple-400">
              Deck Settings
            </h2>
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
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {activeTab === 'learning' && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              {/* Learning Steps */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Learning Steps (minutes)
                </label>
                <input
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
                  placeholder="e.g., 1, 10"
                  type="text"
                  value={learnStepsText}
                  onChange={e => setLearnStepsText(e.target.value)}
                  onBlur={() => {
                    // Parse on blur to update config
                    const steps = learnStepsText
                      .split(',')
                      .map(s => parseFloat(s.trim()))
                      .filter(s => !isNaN(s) && s > 0)
                    if (steps.length > 0) {
                      updateConfig({ learnSteps: steps })
                      setLearnStepsText(steps.join(', '))
                    } else {
                      // Revert to current config if invalid
                      setLearnStepsText(config.learnSteps.join(', '))
                    }
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
                  value={relearnStepsText}
                  onChange={e => setRelearnStepsText(e.target.value)}
                  onBlur={() => {
                    const steps = relearnStepsText
                      .split(',')
                      .map(s => parseFloat(s.trim()))
                      .filter(s => !isNaN(s) && s > 0)
                    if (steps.length > 0) {
                      updateConfig({ relearnSteps: steps })
                      setRelearnStepsText(steps.join(', '))
                    } else {
                      setRelearnStepsText(config.relearnSteps.join(', '))
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Steps for cards you forget
                </p>
              </div>

              {/* Graduating Interval Good */}
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

              {/* Easy Interval */}
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

              {/* Maximum Review Interval */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Maximum Interval (days)
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

              {/* Initial Ease Factor */}
              <div className="col-span-2">
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

              {/* Interval Multiplier */}
              <div className="col-span-2">
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
            </div>
          )}

          {activeTab === 'fsrs' && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              {/* Desired Retention */}
              <div className="col-span-2">
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
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  FSRS Parameters (Advanced)
                </label>
                <textarea
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all font-mono text-xs resize-none custom-scrollbar"
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
              <div className="col-span-2 bg-purple-900/20 border border-purple-400/30 rounded-lg p-4">
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
            </div>
          )}

          {activeTab === 'ordering' && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              {/* New Card Insert Order */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New Card Insert Order
                </label>
                <CustomSelect
                  value={config.newCardInsertOrder}
                  onChange={value => updateConfig({ newCardInsertOrder: value })}
                  options={[
                    { value: 0, label: 'Due', description: 'New cards appear in order of their due number' },
                    { value: 1, label: 'Random', description: 'New cards appear in random order' },
                  ]}
                />
              </div>

              {/* New Card Gather Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New Card Gather Priority
                </label>
                <CustomSelect
                  value={config.newCardGatherPriority}
                  onChange={value => updateConfig({ newCardGatherPriority: value })}
                  options={[
                    { value: 0, label: 'Deck', description: 'Gather cards in the order they appear in the deck' },
                    { value: 1, label: 'Position (Lowest First)', description: 'Start with cards that have the lowest position number' },
                    { value: 2, label: 'Position (Highest First)', description: 'Start with cards that have the highest position number' },
                  ]}
                />
              </div>

              {/* New Card Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New Card Sort Order
                </label>
                <CustomSelect
                  value={config.newCardSortOrder}
                  onChange={value => updateConfig({ newCardSortOrder: value })}
                  options={[
                    { value: 0, label: 'Template', description: 'Sort by card template order' },
                    { value: 1, label: 'Random', description: 'Randomize the order of new cards' },
                    { value: 2, label: 'Reverse', description: 'Reverse the template order' },
                  ]}
                />
              </div>

              {/* Review Card Order */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Review Card Order
                </label>
                <CustomSelect
                  value={config.reviewOrder}
                  onChange={value => updateConfig({ reviewOrder: value })}
                  options={[
                    { value: 0, label: 'Due Date', description: 'Show cards in order of their due date' },
                    { value: 1, label: 'Due Date, then Random', description: 'Sort by due date, randomize cards with same date' },
                    { value: 2, label: 'Deck, then Due Date', description: 'Group by deck, then sort by due date' },
                    { value: 3, label: 'Random', description: 'Completely random order' },
                    { value: 4, label: 'Intervals (Ascending)', description: 'Shortest intervals first' },
                    { value: 5, label: 'Intervals (Descending)', description: 'Longest intervals first' },
                    { value: 6, label: 'Ease (Ascending)', description: 'Hardest cards (lowest ease) first' },
                    { value: 7, label: 'Ease (Descending)', description: 'Easiest cards (highest ease) first' },
                    { value: 8, label: 'Relative Overdueness', description: 'Most overdue cards relative to their interval' },
                  ]}
                />
              </div>

              {/* New/Review Mix */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New Card Mix
                </label>
                <CustomSelect
                  value={config.newMix}
                  onChange={value => updateConfig({ newMix: value })}
                  options={[
                    { value: 0, label: 'Mix with Reviews', description: 'Interleave new cards with reviews for better retention' },
                    { value: 1, label: 'Reviews First', description: 'Show all reviews before any new cards' },
                    { value: 2, label: 'New First', description: 'Show all new cards before reviews' },
                    { value: 3, label: 'Reviews Only', description: 'Skip new cards, only show reviews' },
                  ]}
                />
              </div>

              {/* Interday Learning Mix */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Interday Learning Mix
                </label>
                <CustomSelect
                  value={config.interdayLearningMix}
                  onChange={value => updateConfig({ interdayLearningMix: value })}
                  options={[
                    { value: 0, label: 'Mix with Reviews', description: 'Show learning cards mixed with reviews' },
                    { value: 1, label: 'Reviews First', description: 'Show reviews before learning cards' },
                    { value: 2, label: 'New First', description: 'Show learning cards before reviews' },
                    { value: 3, label: 'Reviews Only', description: 'Skip learning cards, only show reviews' },
                  ]}
                />
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              {/* Leech Threshold */}
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

              {/* Leech Action */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Leech Action
                </label>
                <CustomSelect
                  value={config.leechAction}
                  onChange={value => updateConfig({ leechAction: value })}
                  options={[
                    { value: 0, label: 'Suspend Card', description: 'Automatically suspend cards that become leeches so you can review them later' },
                    { value: 1, label: 'Tag Only', description: 'Mark leeches with a tag but keep them in rotation' },
                  ]}
                />
              </div>

              {/* Sibling Burying */}
              <div className="col-span-2 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  Sibling Burying
                </label>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      checked={config.buryNew}
                      className="custom-checkbox"
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
                      className="custom-checkbox"
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
                      className="custom-checkbox"
                      type="checkbox"
                      onChange={e =>
                        updateConfig({ buryInterdayLearning: e.target.checked })
                      }
                    />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                      Bury interday learning siblings
                    </span>
                  </label>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  Prevent cards from the same note from appearing together in one session
                </p>
              </div>
            </div>
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
