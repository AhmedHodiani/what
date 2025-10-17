/**
 * Keyboard Shortcuts System - Public API
 *
 * Context-aware, registry-based keyboard shortcuts
 */

// Core
export { ShortcutsRegistry, shortcutsRegistry } from './shortcuts-registry'
export { ShortcutsProvider } from './ShortcutsProvider'
export {
  useShortcuts,
  useShortcut,
  useContextState,
  useRegisterShortcuts,
  useModifier,
} from './use-shortcuts'
export { ShortcutsHelpPanel, useShortcutsHelp } from './ShortcutsHelpPanel'

// Contexts
export {
  ShortcutContext,
  shouldBlockShortcuts,
  isMac,
  modKey,
} from './contexts'
export type { ShortcutContextState } from './contexts'

// Types
export type {
  ShortcutAction,
  ShortcutEnabledFn,
  ShortcutConfig,
  ShortcutRegistration,
  ModifierConfig,
  NormalizedKey,
  ShortcutConflict,
  RegistryStats,
} from './types'
export { ShortcutEventType } from './types'

// Shortcut Registrars
export { registerSystemShortcuts } from './shortcuts/system-shortcuts'
export { registerCanvasShortcuts } from './shortcuts/canvas-shortcuts'
export type { CanvasShortcutHandlers } from './shortcuts/canvas-shortcuts'
export { registerToolShortcuts } from './shortcuts/tool-shortcuts'
export type { ToolShortcutHandlers, ToolType } from './shortcuts/tool-shortcuts'
export { registerDialogShortcuts } from './shortcuts/dialog-shortcuts'
export type { DialogShortcutHandlers } from './shortcuts/dialog-shortcuts'

// Auto-register
export { registerAllShortcuts } from './register-all'
