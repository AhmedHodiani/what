import type {
  ShortcutConfig,
  ShortcutRegistration,
  ModifierConfig,
  NormalizedKey,
  ShortcutConflict,
  RegistryStats,
} from './types'
import { ShortcutContext, shouldBlockShortcuts, modKey } from './contexts'
import { logger } from '../../shared/logger'

/**
 * Internal modifier registration
 */
interface ModifierRegistration extends ModifierConfig {
  id: string
}

/**
 * ShortcutsRegistry - Central registry for keyboard shortcuts
 * 
 * Features:
 * - Context-aware priority system
 * - Conflict detection
 * - Dynamic registration/unregistration
 * - Platform-specific key handling
 * - Modifier state tracking (keydown + keyup)
 * - Separate keydown/keyup event handling
 * 
 * Usage:
 * ```typescript
 * const registry = new ShortcutsRegistry()
 * 
 * // Regular shortcut
 * const id = registry.register({
 *   key: 'ctrl+s',
 *   context: ShortcutContext.System,
 *   action: () => saveFile(),
 *   description: 'Save file',
 * })
 * 
 * // Modifier tracking
 * const modId = registry.registerModifier({
 *   key: 'control',
 *   context: ShortcutContext.Tool,
 *   onPress: () => setCtrlPressed(true),
 *   onRelease: () => setCtrlPressed(false),
 *   description: 'Enable straight line mode',
 * })
 * ```
 */
export class ShortcutsRegistry {
  private shortcuts = new Map<string, ShortcutRegistration[]>()
  private modifiers = new Map<string, ModifierRegistration[]>()
  private idCounter = 0

  /**
   * Register a new keyboard shortcut
   * Returns a unique ID for later unregistration
   */
  register(config: ShortcutConfig): string {
    const id = `shortcut-${++this.idCounter}`
    const registration: ShortcutRegistration = {
      ...config,
      id,
      eventType: config.eventType ?? 'keydown' as any,
      preventDefault: config.preventDefault ?? true,
      stopPropagation: config.stopPropagation ?? true,
    }

    const normalizedKey = this.normalizeKeyString(config.key)
    const existing = this.shortcuts.get(normalizedKey) || []
    
    this.shortcuts.set(normalizedKey, [...existing, registration])

    // Log in dev mode
    if (process.env.NODE_ENV === 'development') {
      logger.info(
        `[Shortcuts] Registered: ${config.key} (${ShortcutContext[config.context]}) - ${config.description}`
      )
    }

    return id
  }

  /**
   * Register a modifier key tracker (Ctrl, Shift, Alt, Meta)
   * Automatically handles both keydown and keyup events
   * Returns a unique ID for later unregistration
   */
  registerModifier(config: ModifierConfig): string {
    const id = `modifier-${++this.idCounter}`
    const registration: ModifierRegistration = {
      ...config,
      id,
    }

    const normalizedKey = config.key.toLowerCase()
    const existing = this.modifiers.get(normalizedKey) || []
    
    this.modifiers.set(normalizedKey, [...existing, registration])

    // Log in dev mode
    if (process.env.NODE_ENV === 'development') {
      logger.info(
        `[Shortcuts] Registered Modifier: ${config.key} (${ShortcutContext[config.context]}) - ${config.description}`
      )
    }

    return id
  }

  /**
   * Unregister a shortcut or modifier by ID
   */
  unregister(id: string): boolean {
    // Try shortcuts first
    for (const [key, registrations] of this.shortcuts.entries()) {
      const filtered = registrations.filter(r => r.id !== id)
      
      if (filtered.length !== registrations.length) {
        if (filtered.length === 0) {
          this.shortcuts.delete(key)
        } else {
          this.shortcuts.set(key, filtered)
        }
        return true
      }
    }

    // Try modifiers
    for (const [key, registrations] of this.modifiers.entries()) {
      const filtered = registrations.filter(r => r.id !== id)
      
      if (filtered.length !== registrations.length) {
        if (filtered.length === 0) {
          this.modifiers.delete(key)
        } else {
          this.modifiers.set(key, filtered)
        }
        return true
      }
    }

    return false
  }

  /**
   * Handle a keyboard event (keydown or keyup)
   * Returns true if a shortcut was triggered
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    return this.handleKeyEvent(event, 'keydown')
  }

  /**
   * Handle a keyboard event (keyup)
   * Returns true if a shortcut was triggered
   */
  handleKeyUp(event: KeyboardEvent): boolean {
    return this.handleKeyEvent(event, 'keyup')
  }

  /**
   * Internal: Handle keyboard event for both keydown and keyup
   */
  private handleKeyEvent(event: KeyboardEvent, eventType: 'keydown' | 'keyup'): boolean {
    // Block shortcuts when typing in inputs
    if (shouldBlockShortcuts(event.target)) {
      return false
    }

    // Handle modifier keys first (they use both keydown and keyup)
    const modifierKey = this.getModifierKey(event.key)
    if (modifierKey) {
      return this.handleModifierEvent(event, modifierKey, eventType)
    }

    // Only handle shortcuts on the correct event type
    const normalized = this.normalizeKeyEvent(event)
    const keyString = this.keyToString(normalized)
    const registrations = this.shortcuts.get(keyString)

    if (!registrations || registrations.length === 0) {
      return false
    }

    // Filter by event type
    const matchingRegistrations = registrations.filter(r => {
      const regEventType = r.eventType || 'keydown'
      return regEventType === eventType || regEventType === 'both'
    })

    if (matchingRegistrations.length === 0) {
      return false
    }

    // Sort by context priority (highest first)
    const sorted = [...matchingRegistrations].sort((a, b) => b.context - a.context)

    // Find first enabled shortcut
    for (const registration of sorted) {
      if (registration.enabled && !registration.enabled()) {
        continue
      }

      // Found a match! Execute it
      if (registration.preventDefault) {
        event.preventDefault()
      }
      if (registration.stopPropagation) {
        event.stopPropagation()
      }

      registration.action(event)

      if (process.env.NODE_ENV === 'development') {
        logger.info(
          `[Shortcuts] Triggered: ${registration.key} (${ShortcutContext[registration.context]}) - ${registration.description}`
        )
      }

      return true
    }

    return false
  }

  /**
   * Handle modifier key events (Ctrl, Shift, Alt, Meta)
   */
  private handleModifierEvent(
    event: KeyboardEvent,
    modifierKey: string,
    eventType: 'keydown' | 'keyup'
  ): boolean {
    const registrations = this.modifiers.get(modifierKey)
    
    if (!registrations || registrations.length === 0) {
      return false
    }

    // Sort by context priority (highest first)
    const sorted = [...registrations].sort((a, b) => b.context - a.context)

    // Find first enabled modifier tracker
    for (const registration of sorted) {
      if (registration.enabled && !registration.enabled()) {
        continue
      }

      // Call appropriate handler
      if (eventType === 'keydown') {
        registration.onPress(event)
      } else {
        registration.onRelease(event)
      }

      if (process.env.NODE_ENV === 'development') {
        logger.info(
          `[Shortcuts] Modifier ${eventType}: ${registration.key} (${ShortcutContext[registration.context]})`
        )
      }

      return true
    }

    return false
  }

  /**
   * Get modifier key name from event.key
   * Returns normalized key name or null if not a modifier
   */
  private getModifierKey(key: string): string | null {
    const normalized = key.toLowerCase()
    if (normalized === 'control') return 'control'
    if (normalized === 'shift') return 'shift'
    if (normalized === 'alt') return 'alt'
    if (normalized === 'meta') return 'meta'
    return null
  }

  /**
   * Get all registered shortcuts
   */
  getAll(): ShortcutRegistration[] {
    const all: ShortcutRegistration[] = []
    for (const registrations of this.shortcuts.values()) {
      all.push(...registrations)
    }
    return all
  }

  /**
   * Get shortcuts for a specific context
   */
  getByContext(context: ShortcutContext): ShortcutRegistration[] {
    return this.getAll().filter(s => s.context === context)
  }

  /**
   * Detect conflicting shortcuts (same key, same context)
   */
  detectConflicts(): ShortcutConflict[] {
    const conflicts: ShortcutConflict[] = []

    for (const [key, registrations] of this.shortcuts.entries()) {
      // Group by context
      const byContext = new Map<ShortcutContext, ShortcutRegistration[]>()
      
      for (const reg of registrations) {
        const existing = byContext.get(reg.context) || []
        byContext.set(reg.context, [...existing, reg])
      }

      // Check for conflicts in same context
      for (const [context, regs] of byContext.entries()) {
        if (regs.length > 1) {
          conflicts.push({
            key,
            context,
            registrations: regs,
          })
        }
      }
    }

    return conflicts
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const all = this.getAll()
    const byContext: Record<ShortcutContext, number> = {
      [ShortcutContext.Dialog]: 0,
      [ShortcutContext.Tool]: 0,
      [ShortcutContext.Canvas]: 0,
      [ShortcutContext.Tab]: 0,
      [ShortcutContext.System]: 0,
    }

    for (const shortcut of all) {
      byContext[shortcut.context]++
    }

    return {
      totalShortcuts: all.length,
      byContext,
      conflicts: this.detectConflicts(),
    }
  }

  /**
   * Clear all shortcuts (useful for testing)
   */
  clear(): void {
    this.shortcuts.clear()
    this.modifiers.clear()
    this.idCounter = 0
  }

  /**
   * Normalize a key string (e.g., 'Ctrl+S' → 'ctrl+s')
   */
  private normalizeKeyString(keyString: string): string {
    // Replace 'mod' with platform-specific modifier
    let normalized = keyString.toLowerCase().replace('mod', modKey)

    // Split into parts
    const parts = normalized.split('+')
    const modifiers = parts.slice(0, -1).sort()
    const key = parts[parts.length - 1]

    // Rebuild in consistent order: ctrl, shift, alt, meta, key
    return [...modifiers, key].join('+')
  }

  /**
   * Normalize a keyboard event to a key object
   */
  private normalizeKeyEvent(event: KeyboardEvent): NormalizedKey {
    return {
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey,
      key: event.key.toLowerCase(),
    }
  }

  /**
   * Convert normalized key to string
   */
  private keyToString(normalized: NormalizedKey): string {
    const parts: string[] = []

    if (normalized.ctrl) parts.push('ctrl')
    if (normalized.shift) parts.push('shift')
    if (normalized.alt) parts.push('alt')
    if (normalized.meta) parts.push('meta')
    parts.push(normalized.key)

    return parts.join('+')
  }
}

/**
 * Singleton registry instance
 */
export const shortcutsRegistry = new ShortcutsRegistry()
