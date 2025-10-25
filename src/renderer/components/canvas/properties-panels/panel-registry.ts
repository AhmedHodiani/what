import type { ComponentType } from 'react'
import type { DrawingObject, DrawingObjectType } from 'lib/types/canvas'

/**
 * Properties Panel Registry - Central registration system for property panels
 *
 * Benefits:
 * - Add new panels without touching the container
 * - Type-safe panel lookup
 * - Consistent with widget registry pattern
 * - Easy to test and maintain
 *
 * Usage:
 * ```ts
 * // Register a panel
 * panelRegistry.register('sticky-note', StickyNotePanel)
 *
 * // Get a panel component
 * const Panel = panelRegistry.get(object.type)
 * return <Panel object={object} onUpdate={onUpdate} />
 * ```
 */

export interface PanelProps<T extends DrawingObject = DrawingObject> {
  object: T
  onUpdate: (id: string, updates: Partial<T>) => void
}

export interface PanelRegistration {
  type: DrawingObjectType
  component: ComponentType<PanelProps<any>>
  displayName?: string
}

class PropertiesPanelRegistry {
  private panels = new Map<DrawingObjectType, PanelRegistration>()

  /**
   * Register a properties panel for a specific object type
   */
  register(
    type: DrawingObjectType,
    component: ComponentType<PanelProps<any>>,
    metadata?: {
      displayName?: string
    }
  ): void {
    if (this.panels.has(type)) {
      console.warn(
        `⚠️ Properties panel already registered for type "${type}". Overwriting...`
      )
    }

    this.panels.set(type, {
      type,
      component,
      displayName: metadata?.displayName || type,
    })

    // console.log(`✅ Properties panel registered: ${type}`)
  }

  /**
   * Get the panel component for a specific object type
   */
  get(type: DrawingObjectType): ComponentType<PanelProps<any>> | null {
    const registration = this.panels.get(type)
    return registration?.component || null
  }

  /**
   * Check if a panel is registered for a type
   */
  has(type: DrawingObjectType): boolean {
    return this.panels.has(type)
  }

  /**
   * Get all registered panel types
   */
  getTypes(): DrawingObjectType[] {
    return Array.from(this.panels.keys())
  }

  /**
   * Get all registrations (for debugging)
   */
  getAll(): PanelRegistration[] {
    return Array.from(this.panels.values())
  }

  /**
   * Clear all registrations (for testing)
   */
  clear(): void {
    this.panels.clear()
  }

  /**
   * Unregister a specific panel type
   */
  unregister(type: DrawingObjectType): boolean {
    return this.panels.delete(type)
  }
}

// Export singleton instance
export const panelRegistry = new PropertiesPanelRegistry()

// Export class for testing
export { PropertiesPanelRegistry }
