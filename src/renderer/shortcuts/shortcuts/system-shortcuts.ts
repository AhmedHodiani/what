/**
 * System Shortcuts - Global application shortcuts
 * 
 * These are always active (lowest priority)
 * Can be overridden by higher-priority contexts
 */

import { ShortcutContext } from '../contexts'
import type { ShortcutsRegistry } from '../shortcuts-registry'

/**
 * Register all system-level shortcuts
 */
export function registerSystemShortcuts(registry: ShortcutsRegistry): void {
  // Save file (Week 4 feature - placeholder for now)
  registry.register({
    key: 'mod+s',
    context: ShortcutContext.System,
    action: async () => {
      console.log('[System] Save file (Week 4 - not implemented yet)')
      // Future: window.App.saveCurrentFile()
    },
    description: 'Save current file',
  })

  // Undo (Week 3 feature - placeholder for now)
  registry.register({
    key: 'mod+z',
    context: ShortcutContext.System,
    action: () => {
      console.log('[System] Undo (Week 3 - not implemented yet)')
      // Future: commandManager.undo()
    },
    description: 'Undo last action',
  })

  // Redo (Week 3 feature - placeholder for now)
  registry.register({
    key: 'mod+y',
    context: ShortcutContext.System,
    action: () => {
      console.log('[System] Redo (Week 3 - not implemented yet)')
      // Future: commandManager.redo()
    },
    description: 'Redo last action',
  })

  // Redo (alternative)
  registry.register({
    key: 'mod+shift+z',
    context: ShortcutContext.System,
    action: () => {
      console.log('[System] Redo (Week 3 - not implemented yet)')
      // Future: commandManager.redo()
    },
    description: 'Redo last action',
  })

  // New file (future feature)
  registry.register({
    key: 'mod+n',
    context: ShortcutContext.System,
    action: () => {
      console.log('[System] New file (future feature)')
      // Future: window.App.createNewFile()
    },
    description: 'Create new file',
  })

  // Open file (future feature)
  registry.register({
    key: 'mod+o',
    context: ShortcutContext.System,
    action: () => {
      console.log('[System] Open file (future feature)')
      // Future: window.App.openFileDialog()
    },
    description: 'Open file',
  })

  // Close tab
  registry.register({
    key: 'mod+w',
    context: ShortcutContext.Tab,
    action: () => {
      console.log('[System] Close tab (future feature)')
      // Future: closeCurrentTab()
    },
    description: 'Close current tab',
  })

  // Shortcuts help panel
  registry.register({
    key: 'mod+/',
    context: ShortcutContext.System,
    action: () => {
      console.log('[System] Show shortcuts help (Phase 4)')
      // Phase 4: showShortcutsHelpPanel()
    },
    description: 'Show keyboard shortcuts help',
  })

  // Alternative help
  registry.register({
    key: 'shift+/',
    context: ShortcutContext.System,
    action: () => {
      console.log('[System] Show shortcuts help (Phase 4)')
      // Phase 4: showShortcutsHelpPanel()
    },
    description: 'Show keyboard shortcuts help',
  })
}
