/**
 * Canvas Shortcuts - Canvas-specific operations
 * 
 * These are active when the canvas has focus
 * Includes: Delete, Arrow keys, Copy/Paste, Select all, etc.
 */

import { ShortcutContext } from '../contexts'
import type { ShortcutsRegistry } from '../shortcuts-registry'

/**
 * Canvas shortcut handlers interface
 * Components pass these handlers when registering canvas shortcuts
 */
export interface CanvasShortcutHandlers {
  /** Delete selected objects */
  onDelete?: () => void
  
  /** Select all objects */
  onSelectAll?: () => void
  
  /** Clear selection */
  onClearSelection?: () => void
  
  /** Duplicate selected objects */
  onDuplicate?: () => void
  
  /** Copy selected objects */
  onCopy?: () => void
  
  /** Cut selected objects */
  onCut?: () => void
  
  /** Paste from clipboard */
  onPaste?: () => void
  
  /** Move selected objects */
  onMove?: (direction: 'up' | 'down' | 'left' | 'right') => void
  
  /** Check if there's a selection (for conditional enabling) */
  hasSelection?: () => boolean
}

/**
 * Register canvas-specific shortcuts
 */
export function registerCanvasShortcuts(
  registry: ShortcutsRegistry,
  handlers: CanvasShortcutHandlers
): string[] {
  const ids: string[] = []

  // Delete selected objects (Delete or Backspace)
  if (handlers.onDelete) {
    ids.push(
      registry.register({
        key: 'delete',
        context: ShortcutContext.Canvas,
        action: () => handlers.onDelete?.(),
        description: 'Delete selected objects',
        enabled: handlers.hasSelection,
      })
    )

    ids.push(
      registry.register({
        key: 'backspace',
        context: ShortcutContext.Canvas,
        action: () => handlers.onDelete?.(),
        description: 'Delete selected objects',
        enabled: handlers.hasSelection,
      })
    )
  }

  // Select all objects
  if (handlers.onSelectAll) {
    ids.push(
      registry.register({
        key: 'mod+a',
        context: ShortcutContext.Canvas,
        action: () => handlers.onSelectAll?.(),
        description: 'Select all objects',
      })
    )
  }

  // Clear selection (Escape)
  if (handlers.onClearSelection) {
    ids.push(
      registry.register({
        key: 'escape',
        context: ShortcutContext.Canvas,
        action: () => handlers.onClearSelection?.(),
        description: 'Clear selection',
        enabled: handlers.hasSelection,
      })
    )
  }

  // Duplicate selected objects
  if (handlers.onDuplicate) {
    ids.push(
      registry.register({
        key: 'mod+d',
        context: ShortcutContext.Canvas,
        action: () => handlers.onDuplicate?.(),
        description: 'Duplicate selected objects',
        enabled: handlers.hasSelection,
      })
    )
  }

  // Copy selected objects
  if (handlers.onCopy) {
    ids.push(
      registry.register({
        key: 'mod+c',
        context: ShortcutContext.Canvas,
        action: () => handlers.onCopy?.(),
        description: 'Copy selected objects',
        enabled: handlers.hasSelection,
      })
    )
  }

  // Cut selected objects
  if (handlers.onCut) {
    ids.push(
      registry.register({
        key: 'mod+x',
        context: ShortcutContext.Canvas,
        action: () => handlers.onCut?.(),
        description: 'Cut selected objects',
        enabled: handlers.hasSelection,
      })
    )
  }

  // Paste from clipboard
  if (handlers.onPaste) {
    ids.push(
      registry.register({
        key: 'mod+v',
        context: ShortcutContext.Canvas,
        action: () => handlers.onPaste?.(),
        description: 'Paste from clipboard',
      })
    )
  }

  // Arrow key movement
  if (handlers.onMove) {
    // Move up
    ids.push(
      registry.register({
        key: 'arrowup',
        context: ShortcutContext.Canvas,
        action: () => handlers.onMove?.('up'),
        description: 'Move selected objects up',
        enabled: handlers.hasSelection,
      })
    )

    // Move down
    ids.push(
      registry.register({
        key: 'arrowdown',
        context: ShortcutContext.Canvas,
        action: () => handlers.onMove?.('down'),
        description: 'Move selected objects down',
        enabled: handlers.hasSelection,
      })
    )

    // Move left
    ids.push(
      registry.register({
        key: 'arrowleft',
        context: ShortcutContext.Canvas,
        action: () => handlers.onMove?.('left'),
        description: 'Move selected objects left',
        enabled: handlers.hasSelection,
      })
    )

    // Move right
    ids.push(
      registry.register({
        key: 'arrowright',
        context: ShortcutContext.Canvas,
        action: () => handlers.onMove?.('right'),
        description: 'Move selected objects right',
        enabled: handlers.hasSelection,
      })
    )
  }

  return ids
}
