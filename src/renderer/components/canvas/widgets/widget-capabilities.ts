import type { DrawingObject } from 'lib/types/canvas'

/**
 * Widget Capabilities System
 *
 * Allows widgets to declaratively opt-in to behaviors without inheritance.
 * Capabilities are registered alongside widgets in the registry.
 *
 * Benefits:
 * - Composition over inheritance
 * - Type-safe configuration
 * - Easy to extend with new capabilities
 * - Discoverable through registry inspection
 */

/**
 * External Tab Capability
 *
 * Enables a widget to open a dedicated editor tab when double-clicked.
 * Examples: Spreadsheet editor, Image viewer, PDF viewer, Code editor
 */
export interface ExternalTabCapability {
  /** Whether this widget can open an external tab */
  enabled: boolean

  /** The tab editor component name (must be registered in tabEditorRegistry) */
  componentName: string

  /** Extract widget-specific config to pass to the tab editor */
  getTabConfig: (
    object: DrawingObject,
    tabId: string
  ) => Record<string, any> | Promise<Record<string, any>>

  /** Generate tab title dynamically (optional, falls back to object.object_data.title) */
  tabTitle?: (object: DrawingObject) => string

  /** Icon to show in tab header (optional, defaults to '📄') */
  tabIcon?: string

  /** Default split view behavior (optional, defaults to true) */
  splitViewDefault?: boolean
}

/**
 * Future capabilities can be added here:
 *
 * - ContextMenuCapability: Custom right-click menus per widget
 * - PropertiesPanelCapability: Custom properties UI per widget
 * - SerializationCapability: Custom save/load logic per widget
 * - KeyboardCapability: Widget-specific keyboard shortcuts
 * - SnapshotCapability: Custom thumbnail generation for preview
 */

/**
 * Collection of all capabilities a widget can have
 */
export interface WidgetCapabilities {
  externalTab?: ExternalTabCapability
  // Future: Add more capabilities here
  // contextMenu?: ContextMenuCapability
  // propertiesPanel?: PropertiesPanelCapability
  // serialization?: SerializationCapability
  // keyboard?: KeyboardCapability
}

/**
 * Type guard to check if a widget has a specific capability
 */
export function hasCapability<K extends keyof WidgetCapabilities>(
  capabilities: WidgetCapabilities | undefined,
  capability: K
): capabilities is Required<Pick<WidgetCapabilities, K>> & WidgetCapabilities {
  return !!capabilities?.[capability]
}

/**
 * Get a specific capability from a widget's capabilities
 */
export function getCapability<K extends keyof WidgetCapabilities>(
  capabilities: WidgetCapabilities | undefined,
  capability: K
): WidgetCapabilities[K] | undefined {
  return capabilities?.[capability]
}
