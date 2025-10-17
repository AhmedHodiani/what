import type { ShortcutContext } from './contexts'

/**
 * Shortcut event type
 */
export enum ShortcutEventType {
  /** Fires on key press */
  KeyDown = 'keydown',

  /** Fires on key release */
  KeyUp = 'keyup',

  /** Fires on both press and release (for modifier tracking) */
  Both = 'both',
}

/**
 * Shortcut action function
 * Called when the shortcut is triggered
 */
export type ShortcutAction = (event: KeyboardEvent) => void

/**
 * Shortcut enabled condition
 * Return true to enable the shortcut, false to disable
 */
export type ShortcutEnabledFn = () => boolean

/**
 * Shortcut registration configuration
 */
export interface ShortcutConfig {
  /**
   * Key combination (e.g., 'ctrl+s', 'delete', 'escape')
   *
   * Format:
   * - Single keys: 'a', 'delete', 'escape', 'enter'
   * - With modifiers: 'ctrl+s', 'shift+delete', 'ctrl+shift+z'
   * - Arrow keys: 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'
   * - Platform-aware: 'mod+s' → Mac: Cmd+S, Windows: Ctrl+S
   * - Modifier-only: 'control', 'shift', 'alt', 'meta' (for modifier tracking)
   */
  key: string

  /**
   * Context priority level
   * Higher priority contexts override lower ones
   */
  context: ShortcutContext

  /**
   * Action to execute when shortcut is triggered
   */
  action: ShortcutAction

  /**
   * Human-readable description (shown in help panel)
   */
  description: string

  /**
   * Event type to listen for
   * Default: KeyDown
   */
  eventType?: ShortcutEventType

  /**
   * Optional condition to enable/disable shortcut
   * If not provided, shortcut is always enabled
   */
  enabled?: ShortcutEnabledFn

  /**
   * Whether to prevent default browser behavior
   * Default: true
   */
  preventDefault?: boolean

  /**
   * Whether to stop event propagation
   * Default: true
   */
  stopPropagation?: boolean
}

/**
 * Internal shortcut registration (includes generated ID)
 */
export interface ShortcutRegistration extends ShortcutConfig {
  /** Auto-generated unique ID */
  id: string
}

/**
 * Modifier tracking configuration
 * Special type for tracking modifier key state (press/release)
 */
export interface ModifierConfig {
  /**
   * Modifier key: 'control', 'shift', 'alt', or 'meta'
   */
  key: 'control' | 'shift' | 'alt' | 'meta'

  /**
   * Context priority level
   */
  context: ShortcutContext

  /**
   * Called when modifier is pressed
   */
  onPress: (event: KeyboardEvent) => void

  /**
   * Called when modifier is released
   */
  onRelease: (event: KeyboardEvent) => void

  /**
   * Human-readable description
   */
  description: string

  /**
   * Optional condition to enable/disable tracking
   */
  enabled?: ShortcutEnabledFn
}

/**
 * Normalized key combination for internal lookup
 * e.g., 'ctrl+shift+s' → { ctrl: true, shift: true, key: 's' }
 */
export interface NormalizedKey {
  ctrl: boolean
  shift: boolean
  alt: boolean
  meta: boolean
  key: string
}

/**
 * Shortcut conflict information (for debugging)
 */
export interface ShortcutConflict {
  key: string
  context: ShortcutContext
  registrations: ShortcutRegistration[]
}

/**
 * Registry statistics (for debugging/monitoring)
 */
export interface RegistryStats {
  totalShortcuts: number
  byContext: Record<ShortcutContext, number>
  conflicts: ShortcutConflict[]
}
