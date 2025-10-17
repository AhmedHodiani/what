/**
 * System Shortcuts - Global application shortcuts
 * 
 * These are always active (lowest priority)
 * Can be overridden by higher-priority contexts
 */

import { ShortcutContext } from '../contexts'
import type { ShortcutsRegistry } from '../shortcuts-registry'
import { logger } from '../../../shared/logger'

/**
 * Register all system-level shortcuts
 */
export function registerSystemShortcuts(registry: ShortcutsRegistry): void {
  // Save file (Ctrl+S / Cmd+S)
  registry.register({
    key: 'mod+s',
    context: ShortcutContext.System,
    action: async () => {
      try {
        await window.App.file.save()
        logger.info('[System Shortcuts] File saved')
      } catch (error) {
        logger.error('[System Shortcuts] Save failed:', error)
      }
    },
    description: 'Save current file',
  })

  // Undo (Week 3 feature - placeholder for now)
  registry.register({
    key: 'mod+z',
    context: ShortcutContext.System,
    action: () => {
      logger.info('[System Shortcuts] Undo (Week 3 - not implemented yet)')
      // Future: commandManager.undo()
    },
    description: 'Undo last action',
  })

  // Redo (Ctrl+Y / Cmd+Y)
  registry.register({
    key: 'mod+y',
    context: ShortcutContext.System,
    action: () => {
      logger.info('[System Shortcuts] Redo (Week 3 - not implemented yet)')
      // Future: commandManager.redo()
    },
    description: 'Redo last action',
  })

  // Redo alternative (Ctrl+Shift+Z / Cmd+Shift+Z)
  registry.register({
    key: 'mod+shift+z',
    context: ShortcutContext.System,
    action: () => {
      logger.info('[System Shortcuts] Redo (Week 3 - not implemented yet)')
      // Future: commandManager.redo()
    },
    description: 'Redo last action',
  })

  // New file (Ctrl+N / Cmd+N)
  registry.register({
    key: 'mod+n',
    context: ShortcutContext.System,
    action: async () => {
      try {
        const result = await window.App.file.new()
        if (result) {
          logger.info('[System Shortcuts] New file created:', result.tabId)
        }
      } catch (error) {
        logger.error('[System Shortcuts] New file failed:', error)
      }
    },
    description: 'Create new file',
  })

  // Open file (Ctrl+O / Cmd+O)
  registry.register({
    key: 'mod+o',
    context: ShortcutContext.System,
    action: async () => {
      try {
        const result = await window.App.file.open()
        if (result) {
          logger.info('[System Shortcuts] File opened:', result.tabId)
        }
      } catch (error) {
        logger.error('[System Shortcuts] Open file failed:', error)
      }
    },
    description: 'Open file',
  })

  // Close tab (Ctrl+W / Cmd+W)
  registry.register({
    key: 'mod+w',
    context: ShortcutContext.Tab,
    action: async () => {
      try {
        const activeTabId = await window.App.tabs.getActiveId()
        if (activeTabId) {
          const closed = await window.App.file.close(activeTabId)
          if (closed) {
            logger.info('[System Shortcuts] Tab closed:', activeTabId)
          }
        }
      } catch (error) {
        logger.error('[System Shortcuts] Close tab failed:', error)
      }
    },
    description: 'Close current tab',
  })

  // Shortcuts help panel (Ctrl+/ or Cmd+/)
  registry.register({
    key: 'mod+/',
    context: ShortcutContext.System,
    action: () => {
      // Dispatch custom event to open help panel
      window.dispatchEvent(new CustomEvent('shortcuts:toggle-help'))
    },
    description: 'Show keyboard shortcuts help',
  })

  // Alternative help (Shift+?)
  registry.register({
    key: 'shift+/',
    context: ShortcutContext.System,
    action: () => {
      // Dispatch custom event to open help panel
      window.dispatchEvent(new CustomEvent('shortcuts:toggle-help'))
    },
    description: 'Show keyboard shortcuts help',
  })
}

