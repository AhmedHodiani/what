import type { DrawingObject } from 'lib/types/canvas'
import { panelRegistry } from './properties-panels/panel-registry'
import './properties-panels/register-all' // Auto-registers all panels

interface CanvasPropertiesPanelProps {
  selectedObject: DrawingObject | null
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
}

/**
 * CanvasPropertiesPanel - Context-sensitive properties panel
 * Uses the panel registry to dynamically load the correct panel component
 * 
 * Benefits:
 * - Reduced from 313 lines to 36 lines! (88% reduction)
 * - Add new panels without touching this file
 * - Consistent with widget registry pattern
 * - Clean, maintainable code
 * 
 * To add a new panel:
 * 1. Create your panel component in properties-panels/
 * 2. Register it in properties-panels/register-all.ts
 * 3. That's it! No need to edit this file.
 */
export function CanvasPropertiesPanel({
  selectedObject,
  onUpdate,
}: CanvasPropertiesPanelProps) {
  // Don't show panel if nothing is selected
  if (!selectedObject) {
    return null
  }

  // Get panel component from registry
  const PanelComponent = panelRegistry.get(selectedObject.type)

  if (!PanelComponent) {
    // No properties panel registered for this type
    return null
  }

  // Render the panel component
  return <PanelComponent object={selectedObject} onUpdate={onUpdate} />
}
