import type { ComponentType } from 'react'
import type { DrawingObjectType } from 'lib/types/canvas'

/**
 * Widget Registry - Central registration system for all canvas widgets
 *
 * Benefits:
 * - Add new widgets without touching canvas-object.tsx
 * - Type-safe widget lookup
 * - Foundation for plugin system
 * - Easy to test and maintain
 *
 * Usage:
 * ```ts
 * // In your widget file (e.g., image-widget/index.ts)
 * widgetRegistry.register('image', ImageWidget)
 *
 * // In canvas-object.tsx
 * const Widget = widgetRegistry.get(object.type)
 * return <Widget {...props} />
 * ```
 */

export interface WidgetRegistration {
  type: DrawingObjectType
  component: ComponentType<any> // Allow any props for flexibility
  displayName?: string
  description?: string
}

class WidgetRegistry {
  private widgets = new Map<DrawingObjectType, WidgetRegistration>()

  /**
   * Register a widget component for a specific object type
   */
  register(
    type: DrawingObjectType,
    component: ComponentType<any>,
    metadata?: {
      displayName?: string
      description?: string
    }
  ): void {
    if (this.widgets.has(type)) {
      console.warn(
        `⚠️ Widget already registered for type "${type}". Overwriting...`
      )
    }

    this.widgets.set(type, {
      type,
      component,
      displayName: metadata?.displayName || type,
      description: metadata?.description,
    })

    // console.log(`✅ Widget registered: ${type}`)
  }

  /**
   * Get the widget component for a specific object type
   */
  get(type: DrawingObjectType): ComponentType<any> | null {
    const registration = this.widgets.get(type)
    return registration?.component || null
  }

  /**
   * Get full registration metadata for a type
   */
  getRegistration(type: DrawingObjectType): WidgetRegistration | null {
    return this.widgets.get(type) || null
  }

  /**
   * Check if a widget is registered for a type
   */
  has(type: DrawingObjectType): boolean {
    return this.widgets.has(type)
  }

  /**
   * Get all registered widget types
   */
  getTypes(): DrawingObjectType[] {
    return Array.from(this.widgets.keys())
  }

  /**
   * Get all registrations (useful for debugging)
   */
  getAll(): WidgetRegistration[] {
    return Array.from(this.widgets.values())
  }

  /**
   * Clear all registrations (mainly for testing)
   */
  clear(): void {
    this.widgets.clear()
  }

  /**
   * Unregister a specific widget type
   */
  unregister(type: DrawingObjectType): boolean {
    return this.widgets.delete(type)
  }
}

// Export singleton instance
export const widgetRegistry = new WidgetRegistry()

// Export class for testing
export { WidgetRegistry }
