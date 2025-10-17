import { useContext, useEffect } from 'react'
import { ShortcutsContext } from './ShortcutsProvider'
import type { ShortcutConfig, ModifierConfig } from './types'
import { shortcutsRegistry } from './shortcuts-registry'

/**
 * useShortcuts - React hook for keyboard shortcuts
 * 
 * Provides access to shortcuts registry and context state
 * 
 * Usage:
 * ```typescript
 * function MyComponent() {
 *   const { registerShortcut, registerModifier, contextState } = useShortcuts()
 *   
 *   // Register regular shortcut
 *   useEffect(() => {
 *     const id = registerShortcut({
 *       key: 'ctrl+d',
 *       context: ShortcutContext.Canvas,
 *       action: () => duplicate(),
 *       description: 'Duplicate selected',
 *     })
 *     
 *     return () => unregisterShortcut(id)
 *   }, [])
 *   
 *   // Register modifier tracker
 *   useEffect(() => {
 *     const id = registerModifier({
 *       key: 'control',
 *       context: ShortcutContext.Tool,
 *       onPress: () => setCtrlPressed(true),
 *       onRelease: () => setCtrlPressed(false),
 *       description: 'Enable straight line mode',
 *     })
 *     
 *     return () => unregisterShortcut(id)
 *   }, [])
 *   
 *   return <div>...</div>
 * }
 * ```
 */
export function useShortcuts() {
  const context = useContext(ShortcutsContext)

  if (!context) {
    throw new Error('useShortcuts must be used within ShortcutsProvider')
  }

  // Add registerModifier from registry
  const registerModifier = (config: ModifierConfig): string => {
    return shortcutsRegistry.registerModifier(config)
  }

  return {
    ...context,
    registerModifier,
  }
}

/**
 * useShortcut - Convenience hook for registering a single shortcut
 * 
 * Automatically handles registration/cleanup
 * 
 * Usage:
 * ```typescript
 * function MyComponent() {
 *   const hasSelection = useSelector(state => state.hasSelection)
 *   
 *   useShortcut({
 *     key: 'delete',
 *     context: ShortcutContext.Canvas,
 *     action: () => deleteSelected(),
 *     description: 'Delete selected objects',
 *     enabled: () => hasSelection,
 *   }, [hasSelection])
 *   
 *   return <div>...</div>
 * }
 * ```
 */
export function useShortcut(
  config: ShortcutConfig,
  deps: React.DependencyList = []
): void {
  const { registerShortcut, unregisterShortcut } = useShortcuts()

  useEffect(() => {
    const id = registerShortcut(config)
    return () => unregisterShortcut(id)
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * useContextState - Hook to access and update shortcut context state
 * 
 * Usage:
 * ```typescript
 * function Canvas() {
 *   const { contextState, updateContextState } = useContextState()
 *   
 *   const handleFocus = () => {
 *     updateContextState({ isCanvasFocused: true })
 *   }
 *   
 *   return <div onFocus={handleFocus}>...</div>
 * }
 * ```
 */
export function useContextState() {
  const { contextState, updateContextState } = useShortcuts()
  return { contextState, updateContextState }
}

/**
 * useRegisterShortcuts - Bulk register shortcuts
 * 
 * Convenience hook for registering multiple shortcuts at once
 * 
 * Usage:
 * ```typescript
 * function Toolbar() {
 *   useRegisterShortcuts([
 *     {
 *       key: 'v',
 *       context: ShortcutContext.Canvas,
 *       action: () => setTool('select'),
 *       description: 'Select tool',
 *     },
 *     {
 *       key: 'p',
 *       context: ShortcutContext.Canvas,
 *       action: () => setTool('pen'),
 *       description: 'Pen tool',
 *     },
 *   ])
 * }
 * ```
 */
export function useRegisterShortcuts(
  configs: ShortcutConfig[],
  deps: React.DependencyList = []
): void {
  const { registerShortcut, unregisterShortcut } = useShortcuts()

  useEffect(() => {
    const ids = configs.map(config => registerShortcut(config))
    return () => ids.forEach(id => unregisterShortcut(id))
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * useModifier - Convenience hook for tracking a modifier key
 * 
 * Returns [isPressed, setIsPressed] like useState
 * 
 * Usage:
 * ```typescript
 * function DrawingCanvas() {
 *   const isCtrlPressed = useModifier({
 *     key: 'control',
 *     context: ShortcutContext.Tool,
 *     description: 'Enable straight line mode',
 *     enabled: () => isDrawing,
 *   }, [isDrawing])
 *   
 *   // Use isCtrlPressed in your drawing logic
 *   if (isCtrlPressed) {
 *     // Draw straight line
 *   }
 * }
 * ```
 */
export function useModifier(
  config: Omit<ModifierConfig, 'onPress' | 'onRelease'>,
  deps: React.DependencyList = []
): boolean {
  const { registerModifier, unregisterShortcut } = useShortcuts()
  const [isPressed, setIsPressed] = React.useState(false)

  useEffect(() => {
    const id = registerModifier({
      ...config,
      onPress: () => setIsPressed(true),
      onRelease: () => setIsPressed(false),
    })

    return () => {
      unregisterShortcut(id)
      setIsPressed(false) // Reset state on unmount
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  return isPressed
}

// Need React import for useState
import React from 'react'
