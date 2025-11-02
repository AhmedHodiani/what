import type { ComponentType } from 'react'

/**
 * Tab Editor Registry
 *
 * Maps widget types to their full-screen editor components.
 * Used by FlexLayout factory to dynamically render tab content.
 *
 * Example:
 * - 'spreadsheet' → SpreadsheetEditor component
 * - 'external-web' → ExternalWebEditor component
 * - 'image-viewer' → ImageViewerEditor component
 */

interface TabEditorRegistration {
  componentName: string
  component: ComponentType<any>
  description?: string
}

class TabEditorRegistry {
  private editors = new Map<string, TabEditorRegistration>()

  /**
   * Register a tab editor component
   */
  register(
    componentName: string,
    component: ComponentType<any>,
    metadata?: {
      description?: string
    }
  ): void {
    if (this.editors.has(componentName)) {
      console.warn(
        `⚠️ Tab editor already registered for "${componentName}". Overwriting...`
      )
    }

    this.editors.set(componentName, {
      componentName,
      component,
      description: metadata?.description,
    })

    console.log(`✅ Tab editor registered: ${componentName}`)
  }

  /**
   * Get a tab editor component by name
   */
  get(componentName: string): ComponentType<any> | null {
    const registration = this.editors.get(componentName)
    return registration?.component || null
  }

  /**
   * Check if a tab editor is registered
   */
  has(componentName: string): boolean {
    return this.editors.has(componentName)
  }

  /**
   * Get all registered tab editor names
   */
  getNames(): string[] {
    return Array.from(this.editors.keys())
  }

  /**
   * Get all registrations (useful for debugging)
   */
  getAll(): TabEditorRegistration[] {
    return Array.from(this.editors.values())
  }

  /**
   * Unregister a tab editor
   */
  unregister(componentName: string): boolean {
    return this.editors.delete(componentName)
  }

  /**
   * Clear all registrations (mainly for testing)
   */
  clear(): void {
    this.editors.clear()
  }
}

// Export singleton instance
export const tabEditorRegistry = new TabEditorRegistry()

/**
 * Get tab editor component by name (convenience function)
 */
export function getTabEditor(componentName: string): ComponentType<any> | null {
  return tabEditorRegistry.get(componentName)
}

// Export class for testing
export { TabEditorRegistry }
