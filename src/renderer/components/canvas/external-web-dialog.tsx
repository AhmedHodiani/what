import { useState, useRef, useEffect } from 'react'
import { useShortcut, ShortcutContext } from 'renderer/shortcuts'

interface ExternalWebDialogProps {
  onConfirm: (url: string) => void
  onCancel: () => void
  initialUrl?: string
}

/**
 * ExternalWebDialog - Modal dialog for entering external website URL
 *
 * Features:
 * - URL validation (must start with http:// or https://)
 * - Keyboard shortcuts (Enter/Escape)
 * - Auto-focus and auto-select input field
 */
export function ExternalWebDialog({
  onConfirm,
  onCancel,
  initialUrl = 'https://',
}: ExternalWebDialogProps) {
  const [url, setUrl] = useState(initialUrl)
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
    const trimmedUrl = url.trim()
    
    if (!trimmedUrl) {
      setError('Please enter a URL')
      return
    }

    // Validate URL format
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      setError('URL must start with http:// or https://')
      return
    }

    try {
      // Additional validation - check if it's a valid URL
      new URL(trimmedUrl)
    } catch {
      setError('Please enter a valid URL')
      return
    }

    onConfirm(trimmedUrl)
  }

  // Register dialog shortcuts
  useShortcut(
    {
      key: 'escape',
      context: ShortcutContext.Dialog,
      action: onCancel,
      description: 'Close external web dialog',
    },
    [onCancel]
  )

  useShortcut(
    {
      key: 'enter',
      context: ShortcutContext.Dialog,
      action: handleConfirm,
      description: 'Add external web',
    },
    [handleConfirm]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value)
    setError('') // Clear error when user types
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-9999"
      onClick={onCancel}
    >
      <div
        className="bg-black/90 rounded-lg shadow-2xl border border-blue-400/30 p-6 w-[500px] max-w-[90vw]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl">🌐</div>
          <div>
            <h2 className="text-xl font-semibold text-blue-400">
              Add External Website
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Enter the URL of the website to embed
            </p>
          </div>
        </div>

        {/* Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Website URL
          </label>
          <input
            className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 transition-all font-mono text-sm"
            onChange={handleChange}
            placeholder="https://example.com"
            ref={inputRef}
            type="url"
            value={url}
          />
          {error && (
            <p className="text-red-400 text-sm mt-2 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{error}</span>
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            💡 Double-click: Split view • Ctrl+Double-click: Full tab
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
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
            onClick={handleConfirm}
          >
            Add Website
          </button>
        </div>

        {/* Keyboard hints */}
        <div className="flex gap-4 mt-4 pt-4 border-t border-blue-400/20 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-black/50 border border-blue-400/30 rounded text-blue-400">
              Enter
            </kbd>
            <span>Add</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-black/50 border border-blue-400/30 rounded text-blue-400">
              Esc
            </kbd>
            <span>Cancel</span>
          </div>
        </div>
      </div>
    </div>
  )
}
