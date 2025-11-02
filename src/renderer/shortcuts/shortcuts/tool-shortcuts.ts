/**
 * Tool Shortcuts - Tool selection shortcuts
 *
 * Keyboard shortcuts to quickly switch tools
 * Active in Canvas context
 */

import { ShortcutContext } from '../contexts'
import type { ShortcutsRegistry } from '../shortcuts-registry'

// Use string literals for tool types (matches CanvasTool from use-canvas-tool.ts)
export type ToolType =
  | 'select'
  | 'sticky-note'
  | 'text'
  | 'shape'
  | 'freehand'
  | 'arrow'
  | 'image'
  | 'file'
  | 'youtube'
  | 'emoji'
  | 'spreadsheet'
  | 'external-web'

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

  ids.push(
    registry.register({
      key: 'escape',
      context: ShortcutContext.Tool,
      action: () => handlers.onToolChange('select'),
      description: 'Switch to select tool',
    })
  )

  ids.push(
    registry.register({
      key: '1',
      context: ShortcutContext.Tool,
      action: () => handlers.onToolChange('sticky-note'),
      description: 'Sticky note tool',
    })
  )

  ids.push(
    registry.register({
      key: '2',
      context: ShortcutContext.Tool,
      action: () => handlers.onToolChange('shape'),
      description: 'Shape tool',
    })
  )

  ids.push(
    registry.register({
      key: '3',
      context: ShortcutContext.Tool,
      action: () => handlers.onToolChange('freehand'),
      description: 'Freehand pen tool',
    })
  )

  ids.push(
    registry.register({
      key: '4',
      context: ShortcutContext.Tool,
      action: () => handlers.onToolChange('arrow'),
      description: 'Arrow tool',
    })
  )

  ids.push(
    registry.register({
      key: '5',
      context: ShortcutContext.Tool,
      action: () => handlers.onToolChange('youtube'),
      description: 'YouTube video tool',
    })
  )

  ids.push(
    registry.register({
      key: '6',
      context: ShortcutContext.Tool,
      action: () => handlers.onToolChange('emoji'),
      description: 'Emoji tool',
    })
  )

  ids.push(
    registry.register({
      key: '7',
      context: ShortcutContext.Tool,
      action: () => handlers.onToolChange('image'),
      description: 'Image tool',
    })
  )

  ids.push(
    registry.register({
      key: '8',
      context: ShortcutContext.Tool,
      action: () => handlers.onToolChange('file'),
      description: 'File tool',
    })
  )

  ids.push(
    registry.register({
      key: '9',
      context: ShortcutContext.Tool,
      action: () => handlers.onToolChange('spreadsheet'),
      description: 'Spreadsheet tool',
    })
  )

  ids.push(
    registry.register({
      key: 'w',
      context: ShortcutContext.Tool,
      action: () => handlers.onToolChange('external-web'),
      description: 'External web tool',
    })
  )

  return ids
}
