import { useState, useRef, useEffect } from 'react'
import { useShortcut, ShortcutContext } from 'renderer/shortcuts'

interface SpreadsheetNameDialogProps {
  onConfirm: (name: string) => void
  onCancel: () => void
  initialName?: string
}

/**
 * SpreadsheetNameDialog - Modal dialog for entering spreadsheet name
 *
 * Features:
 * - Name validation
 * - Keyboard shortcuts (Enter/Escape)
 * - Auto-focus and auto-select input field
 */
export function SpreadsheetNameDialog({
  onConfirm,
  onCancel,
  initialName = 'New Spreadsheet',
}: SpreadsheetNameDialogProps) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Focus and select all text for easy replacement
    if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [])

  const handleConfirm = () => {
    const trimmedName = name.trim()
    
    if (!trimmedName) {
      setError('Please enter a name for the spreadsheet')
      return
    }

    if (trimmedName.length > 50) {
      setError('Name is too long (max 50 characters)')
      return
    }

    onConfirm(trimmedName)
  }

  // Register dialog shortcuts
  useShortcut(
    {
      key: 'escape',
      context: ShortcutContext.Dialog,
      action: onCancel,
      description: 'Close spreadsheet name dialog',
    },
    [onCancel]
  )

  useShortcut(
    {
      key: 'enter',
      context: ShortcutContext.Dialog,
      action: handleConfirm,
      description: 'Create spreadsheet',
    },
    [handleConfirm]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
    setError('') // Clear error when user types
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]"
      onClick={onCancel}
    >
      <div
        className="bg-black/90 rounded-lg shadow-2xl border border-green-400/30 p-6 w-[450px] max-w-[90vw]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl">📊</div>
          <div>
            <h2 className="text-xl font-semibold text-green-400">
              Create Spreadsheet
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Enter a name for your spreadsheet
            </p>
          </div>
        </div>

        {/* Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Spreadsheet Name
          </label>
          <input
            className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20 transition-all"
            onChange={handleChange}
            placeholder="My Spreadsheet"
            ref={inputRef}
            type="text"
            value={name}
            maxLength={50}
          />
          {error && (
            <p className="text-red-400 text-sm mt-2 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{error}</span>
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1.5">
            {name.length}/50 characters
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors border border-gray-600"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium transition-colors"
            onClick={handleConfirm}
          >
            Create
          </button>
        </div>

        {/* Keyboard hints */}
        <div className="flex gap-4 mt-4 pt-4 border-t border-green-400/20 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-black/50 border border-green-400/30 rounded text-green-400">
              Enter
            </kbd>
            <span>Create</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-black/50 border border-green-400/30 rounded text-green-400">
              Esc
            </kbd>
            <span>Cancel</span>
          </div>
        </div>
      </div>
    </div>
  )
}
