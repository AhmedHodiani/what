/**
 * Dialog Shortcuts - Modal dialog operations
 *
 * Highest priority context - overrides all other shortcuts
 * Active when any modal dialog is open
 */

import { ShortcutContext } from '../contexts'
import type { ShortcutsRegistry } from '../shortcuts-registry'

/**
 * Dialog shortcut handlers interface
 */
export interface DialogShortcutHandlers {
  /** Close/cancel the dialog */
  onClose?: () => void

  /** Confirm/submit the dialog */
  onConfirm?: () => void

  /** Check if dialog is open (for conditional enabling) */
  isOpen?: () => boolean
}

/**
 * Register dialog-specific shortcuts
 */
export function registerDialogShortcuts(
  registry: ShortcutsRegistry,
  handlers: DialogShortcutHandlers
): string[] {
  const ids: string[] = []

  // Close dialog (Escape)
  if (handlers.onClose) {
    ids.push(
      registry.register({
        key: 'escape',
        context: ShortcutContext.Dialog,
        action: () => handlers.onClose?.(),
        description: 'Close dialog',
        enabled: handlers.isOpen,
      })
    )
  }

  // Confirm dialog (Enter)
  if (handlers.onConfirm) {
    ids.push(
      registry.register({
        key: 'enter',
        context: ShortcutContext.Dialog,
        action: () => handlers.onConfirm?.(),
        description: 'Confirm action',
        enabled: handlers.isOpen,
      })
    )
  }

  return ids
}
