/**
 * Tool Shortcuts - Tool selection shortcuts
 * 
 * Keyboard shortcuts to quickly switch tools
 * Active in Canvas context
 */

import { ShortcutContext } from '../contexts'
import type { ShortcutsRegistry } from '../shortcuts-registry'

// Use string literals for tool types (matches CanvasTool from use-canvas-tool.ts)
export type ToolType = 'select' | 'sticky-note' | 'text' | 'shape' | 'freehand' | 'arrow' | 'image' | 'youtube' | 'emoji'

/**
 * Tool shortcut handlers interface
 */
export interface ToolShortcutHandlers {
  /** Set the current tool */
  onToolChange: (tool: ToolType) => void
}

/**
 * Register tool selection shortcuts
 */
export function registerToolShortcuts(
  registry: ShortcutsRegistry,
  handlers: ToolShortcutHandlers
): string[] {
  const ids: string[] = []

  // Select tool (V or Escape)
  ids.push(
    registry.register({
      key: 'v',
      context: ShortcutContext.Canvas,
      action: () => handlers.onToolChange('select'),
      description: 'Select tool',
    })
  )

  ids.push(
    registry.register({
      key: 'escape',
      context: ShortcutContext.Tool,
      action: () => handlers.onToolChange('select'),
      description: 'Switch to select tool',
    })
  )

  // Sticky note tool (S)
  ids.push(
    registry.register({
      key: 's',
      context: ShortcutContext.Canvas,
      action: () => handlers.onToolChange('sticky-note'),
      description: 'Sticky note tool',
    })
  )

  // Text tool (T)
  ids.push(
    registry.register({
      key: 't',
      context: ShortcutContext.Canvas,
      action: () => handlers.onToolChange('text'),
      description: 'Text tool',
    })
  )

  // Shape tool (R for Rectangle)
  ids.push(
    registry.register({
      key: 'r',
      context: ShortcutContext.Canvas,
      action: () => handlers.onToolChange('shape'),
      description: 'Shape tool',
    })
  )

  // Freehand/Pen tool (P)
  ids.push(
    registry.register({
      key: 'p',
      context: ShortcutContext.Canvas,
      action: () => handlers.onToolChange('freehand'),
      description: 'Freehand pen tool',
    })
  )

  // Arrow tool (A)
  ids.push(
    registry.register({
      key: 'a',
      context: ShortcutContext.Canvas,
      action: () => handlers.onToolChange('arrow'),
      description: 'Arrow tool',
    })
  )

  // Image tool (I)
  ids.push(
    registry.register({
      key: 'i',
      context: ShortcutContext.Canvas,
      action: () => handlers.onToolChange('image'),
      description: 'Image tool',
    })
  )

  // YouTube tool (Y)
  ids.push(
    registry.register({
      key: 'y',
      context: ShortcutContext.Canvas,
      action: () => handlers.onToolChange('youtube'),
      description: 'YouTube video tool',
    })
  )

  // Emoji tool (E)
  ids.push(
    registry.register({
      key: 'e',
      context: ShortcutContext.Canvas,
      action: () => handlers.onToolChange('emoji'),
      description: 'Emoji tool',
    })
  )

  return ids
}
