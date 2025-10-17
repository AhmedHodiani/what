/**
 * Shortcut Contexts - Priority-based execution contexts
 * 
 * Higher values = Higher priority
 * When multiple shortcuts are registered for the same key,
 * the one with the highest context priority wins.
 * 
 * Example:
 * - Dialog context (100) overrides Canvas context (60)
 * - So pressing Escape in a dialog closes the dialog,
 *   not the canvas selection
 */

export enum ShortcutContext {
  /**
   * Dialog Context - Highest Priority
   * Active when any modal dialog is open
   * Examples: Escape to close, Enter to confirm
   */
  Dialog = 100,

  /**
   * Tool Context - Tool-specific shortcuts
   * Active when a specific tool is selected
   * Examples: Drawing tool shortcuts, shape tool options
   */
  Tool = 80,

  /**
   * Canvas Context - Canvas operations
   * Active when canvas has focus
   * Examples: Delete, Arrow keys, Copy/Paste
   */
  Canvas = 60,

  /**
   * Tab Context - Tab-specific operations
   * Active for the current tab
   * Examples: Close tab, switch tabs
   */
  Tab = 40,

  /**
   * System Context - Lowest Priority
   * Global shortcuts that are always active
   * Examples: Save, Undo, Redo, New File
   */
  System = 20,
}

/**
 * Context state for conditional shortcuts
 * Components can provide this to enable/disable shortcuts
 */
export interface ShortcutContextState {
  /** Is any dialog currently open? */
  hasActiveDialog: boolean

  /** Currently active tool (if any) */
  activeTool: string | null

  /** Is canvas focused? */
  isCanvasFocused: boolean

  /** Current tab ID */
  activeTabId: string | null

  /** Is there a selection? */
  hasSelection: boolean

  /** Are we currently typing in an input? */
  isTypingInInput: boolean
}

/**
 * Helper to check if we should block shortcuts
 * (e.g., when typing in an input field)
 */
export function shouldBlockShortcuts(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName.toLowerCase()
  const isEditable = target.isContentEditable

  // Block shortcuts when typing in these elements
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    isEditable
  )
}

/**
 * Platform detection for modifier keys
 */
export const isMac = 
  typeof navigator !== 'undefined' &&
  navigator.platform.toUpperCase().indexOf('MAC') >= 0

/**
 * Get the primary modifier key for the current platform
 * Mac: 'cmd' (⌘)
 * Others: 'ctrl'
 */
export const modKey = isMac ? 'cmd' : 'ctrl'

/**
 * Display names for contexts (for help panel)
 */
export const contextDisplayNames: Record<ShortcutContext, string> = {
  [ShortcutContext.Dialog]: 'Dialog',
  [ShortcutContext.Tool]: 'Tool',
  [ShortcutContext.Canvas]: 'Canvas',
  [ShortcutContext.Tab]: 'Tab',
  [ShortcutContext.System]: 'System',
}
