/**
 * Register All Shortcuts - Auto-register built-in shortcuts
 *
 * This file registers all system-level shortcuts that are always active.
 * Canvas/dialog/tool-specific shortcuts are registered by components when they mount.
 */

import { shortcutsRegistry } from './shortcuts-registry'
import { registerSystemShortcuts } from './shortcuts/system-shortcuts'

/**
 * Register all built-in system shortcuts
 * Call this once at app startup
 */
export function registerAllShortcuts(): void {
  // Register system-level shortcuts (always active)
  registerSystemShortcuts(shortcutsRegistry)

  // Canvas/dialog/tool shortcuts are registered dynamically by components
  // See:
  // - canvas-shortcuts.ts (registerCanvasShortcuts)
  // - tool-shortcuts.ts (registerToolShortcuts)
  // - dialog-shortcuts.ts (registerDialogShortcuts)
}
