import { useState } from 'react'
import { shortcutsRegistry } from './shortcuts-registry'
import { contextDisplayNames, isMac } from './contexts'
import { ShortcutContext } from './contexts'
import type { ShortcutRegistration } from './types'

interface ShortcutsHelpPanelProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * ShortcutsHelpPanel - Displays all available keyboard shortcuts
 *
 * Shows shortcuts grouped by context (System, Canvas, Tool, Dialog)
 * with proper display formatting (Ctrl/Cmd based on platform)
 */
export function ShortcutsHelpPanel({
  isOpen,
  onClose,
}: ShortcutsHelpPanelProps) {
  if (!isOpen) return null

  const shortcuts = shortcutsRegistry.getAll()

  // Group shortcuts by context
  const byContext: Record<ShortcutContext, ShortcutRegistration[]> = {
    [ShortcutContext.System]: [],
    [ShortcutContext.Tab]: [],
    [ShortcutContext.Canvas]: [],
    [ShortcutContext.Tool]: [],
    [ShortcutContext.Dialog]: [],
  }

  for (const shortcut of shortcuts) {
    byContext[shortcut.context].push(shortcut)
  }

  // Format key for display (replace 'mod' with platform-specific key)
  const formatKey = (key: string): string => {
    const modSymbol = isMac ? '⌘' : 'Ctrl'
    return key
      .replace(/mod/gi, modSymbol)
      .replace(/shift/gi, isMac ? '⇧' : 'Shift')
      .replace(/alt/gi, isMac ? '⌥' : 'Alt')
      .replace(/control/gi, isMac ? '⌃' : 'Ctrl')
      .split('+')
      .map(k => k.charAt(0).toUpperCase() + k.slice(1))
      .join(isMac ? '' : '+')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Keyboard Shortcuts
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {isMac ? 'macOS' : 'Windows/Linux'} shortcuts
            </p>
          </div>
          <button
            className="text-gray-400 hover:text-white transition-colors"
            onClick={onClose}
            type="button"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M6 18L18 6M6 6l12 12"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-6">
          {/* System Shortcuts */}
          {byContext[ShortcutContext.System].length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {contextDisplayNames[ShortcutContext.System]}
              </h3>
              <div className="space-y-2">
                {byContext[ShortcutContext.System].map(shortcut => (
                  <div
                    className="flex items-center justify-between py-2 px-3 rounded hover:bg-white/5"
                    key={shortcut.id}
                  >
                    <span className="text-gray-300">
                      {shortcut.description}
                    </span>
                    <kbd className="px-3 py-1 text-sm font-mono bg-white/10 text-white rounded border border-white/20">
                      {formatKey(shortcut.key)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab Shortcuts */}
          {byContext[ShortcutContext.Tab].length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {contextDisplayNames[ShortcutContext.Tab]}
              </h3>
              <div className="space-y-2">
                {byContext[ShortcutContext.Tab].map(shortcut => (
                  <div
                    className="flex items-center justify-between py-2 px-3 rounded hover:bg-white/5"
                    key={shortcut.id}
                  >
                    <span className="text-gray-300">
                      {shortcut.description}
                    </span>
                    <kbd className="px-3 py-1 text-sm font-mono bg-white/10 text-white rounded border border-white/20">
                      {formatKey(shortcut.key)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Canvas Shortcuts */}
          {byContext[ShortcutContext.Canvas].length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {contextDisplayNames[ShortcutContext.Canvas]}
              </h3>
              <div className="space-y-2">
                {byContext[ShortcutContext.Canvas].map(shortcut => (
                  <div
                    className="flex items-center justify-between py-2 px-3 rounded hover:bg-white/5"
                    key={shortcut.id}
                  >
                    <span className="text-gray-300">
                      {shortcut.description}
                    </span>
                    <kbd className="px-3 py-1 text-sm font-mono bg-white/10 text-white rounded border border-white/20">
                      {formatKey(shortcut.key)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tool Shortcuts */}
          {byContext[ShortcutContext.Tool].length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {contextDisplayNames[ShortcutContext.Tool]}
              </h3>
              <div className="space-y-2">
                {byContext[ShortcutContext.Tool].map(shortcut => (
                  <div
                    className="flex items-center justify-between py-2 px-3 rounded hover:bg-white/5"
                    key={shortcut.id}
                  >
                    <span className="text-gray-300">
                      {shortcut.description}
                    </span>
                    <kbd className="px-3 py-1 text-sm font-mono bg-white/10 text-white rounded border border-white/20">
                      {formatKey(shortcut.key)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dialog Shortcuts */}
          {byContext[ShortcutContext.Dialog].length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {contextDisplayNames[ShortcutContext.Dialog]}
              </h3>
              <div className="space-y-2">
                {byContext[ShortcutContext.Dialog].map(shortcut => (
                  <div
                    className="flex items-center justify-between py-2 px-3 rounded hover:bg-white/5"
                    key={shortcut.id}
                  >
                    <span className="text-gray-300">
                      {shortcut.description}
                    </span>
                    <kbd className="px-3 py-1 text-sm font-mono bg-white/10 text-white rounded border border-white/20">
                      {formatKey(shortcut.key)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-white/10">
            <p className="text-xs text-gray-500 text-center">
              Press{' '}
              <kbd className="px-2 py-0.5 text-xs bg-white/10 rounded">Esc</kbd>{' '}
              or{' '}
              <kbd className="px-2 py-0.5 text-xs bg-white/10 rounded">
                {formatKey('mod+/')}
              </kbd>{' '}
              to close
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to manage shortcuts help panel state
 */
export function useShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false)

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)
  const toggle = () => setIsOpen(prev => !prev)

  return {
    isOpen,
    open,
    close,
    toggle,
  }
}
