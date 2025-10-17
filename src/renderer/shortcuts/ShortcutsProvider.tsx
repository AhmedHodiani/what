import { createContext, useEffect, useCallback, type ReactNode } from 'react'
import { shortcutsRegistry } from './shortcuts-registry'
import type { ShortcutConfig } from './types'
import type { ShortcutContextState } from './contexts'

/**
 * Shortcuts Context Value
 */
interface ShortcutsContextValue {
  /** Register a new shortcut (returns ID for cleanup) */
  registerShortcut: (config: ShortcutConfig) => string
  
  /** Unregister a shortcut by ID */
  unregisterShortcut: (id: string) => void
  
  /** Current context state (for conditional shortcuts) */
  contextState: ShortcutContextState
  
  /** Update context state */
  updateContextState: (updates: Partial<ShortcutContextState>) => void
}

/**
 * Shortcuts Context
 */
export const ShortcutsContext = createContext<ShortcutsContextValue | null>(null)

/**
 * ShortcutsProvider Props
 */
interface ShortcutsProviderProps {
  children: ReactNode
  
  /** Initial context state (optional) */
  initialContextState?: Partial<ShortcutContextState>
}

/**
 * ShortcutsProvider - Global keyboard shortcuts manager
 * 
 * Provides:
 * - Centralized keyboard event handling
 * - Context-aware shortcut execution
 * - Dynamic registration/unregistration
 * - Context state management
 * 
 * Usage:
 * ```tsx
 * // In app root (index.tsx or App.tsx)
 * <ShortcutsProvider>
 *   <App />
 * </ShortcutsProvider>
 * 
 * // In any component
 * const { registerShortcut } = useShortcuts()
 * 
 * useEffect(() => {
 *   const id = registerShortcut({
 *     key: 'ctrl+s',
 *     context: ShortcutContext.System,
 *     action: () => saveFile(),
 *     description: 'Save file',
 *   })
 *   
 *   return () => unregisterShortcut(id)
 * }, [])
 * ```
 */
export function ShortcutsProvider({
  children,
  initialContextState,
}: ShortcutsProviderProps) {
  // Context state (tracks what's active)
  const [contextState, setContextState] = React.useState<ShortcutContextState>({
    hasActiveDialog: false,
    activeTool: null,
    isCanvasFocused: false,
    activeTabId: null,
    hasSelection: false,
    isTypingInInput: false,
    ...initialContextState,
  })

  // Register shortcut
  const registerShortcut = useCallback((config: ShortcutConfig): string => {
    return shortcutsRegistry.register(config)
  }, [])

  // Unregister shortcut
  const unregisterShortcut = useCallback((id: string): void => {
    shortcutsRegistry.unregister(id)
  }, [])

  // Update context state
  const updateContextState = useCallback(
    (updates: Partial<ShortcutContextState>) => {
      setContextState(prev => ({ ...prev, ...updates }))
    },
    []
  )

  // Global keyboard event handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      shortcutsRegistry.handleKeyDown(event)
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      shortcutsRegistry.handleKeyUp(event)
    }

    // Attach to document
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    // Log conflicts in dev mode
    if (process.env.NODE_ENV === 'development') {
      const stats = shortcutsRegistry.getStats()
      if (stats.conflicts.length > 0) {
        console.warn('[Shortcuts] ⚠️ Conflicts detected:', stats.conflicts)
      }
      console.log('[Shortcuts] Stats:', stats)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const value: ShortcutsContextValue = {
    registerShortcut,
    unregisterShortcut,
    contextState,
    updateContextState,
  }

  return (
    <ShortcutsContext.Provider value={value}>
      {children}
    </ShortcutsContext.Provider>
  )
}

// Need React import for useState
import React from 'react'
