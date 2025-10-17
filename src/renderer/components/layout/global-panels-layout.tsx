import type { ReactNode } from 'react'
import type { DrawingObject } from 'lib/types/canvas'
import { CanvasToolbar } from 'renderer/components/canvas/canvas-toolbar'
import { CanvasViewportDisplay } from 'renderer/components/canvas/canvas-viewport-display'
import { CanvasPropertiesPanel } from 'renderer/components/canvas/canvas-properties-panel'
import { BrushPanel } from 'renderer/components/canvas/properties-panels/brush-panel'
import { useGlobalTool, useActiveTab } from 'renderer/contexts'

interface GlobalPanelsLayoutProps {
  children: ReactNode
}

/**
 * Global panels layout wrapper
 * Renders global UI panels (toolbar, viewport display, properties, brush panel)
 * that persist across tabs and display data from the active tab
 *
 * Layout Structure:
 * - CanvasToolbar: Top center (global tool selection) ✅
 * - CanvasViewportDisplay: Top left (active tab's viewport) ✅
 * - CanvasPropertiesPanel: Right side (active tab's selection) ✅
 * - BrushPanel: Top left below viewport (when pen/arrow tool active) ✅
 * - children: Tab content (InfiniteCanvas instances)
 *
 * @example
 * ```tsx
 * <GlobalToolProvider>
 *   <ActiveTabProvider>
 *     <GlobalPanelsLayout>
 *       <TabLayout />
 *     </GlobalPanelsLayout>
 *   </ActiveTabProvider>
 * </GlobalToolProvider>
 * ```
 */
export function GlobalPanelsLayout({ children }: GlobalPanelsLayoutProps) {
  const { currentTool } = useGlobalTool()
  const { selectedObjectIds, objects, brushSettings, updateActiveTab } =
    useActiveTab()

  // Get selected object for properties panel
  const selectedObject =
    selectedObjectIds.length === 1
      ? objects.find(obj => obj.id === selectedObjectIds[0]) || null
      : null

  // Handle properties update
  const handleUpdateObject = (id: string, updates: Partial<DrawingObject>) => {
    // Update the object in the active tab's objects array
    const updatedObjects = objects.map(obj =>
      obj.id === id ? ({ ...obj, ...updates } as DrawingObject) : obj
    )
    updateActiveTab({ objects: updatedObjects })
  }

  // Handle brush settings changes
  const handleBrushChange = (changes: Partial<typeof brushSettings>) => {
    updateActiveTab({
      brushSettings: { ...brushSettings, ...changes },
    })
  }

  return (
    <div className="relative w-full h-full">
      {/* Global Toolbar - Top Center */}
      <CanvasToolbar />

      {/* Global Viewport Display - Top Left */}
      <CanvasViewportDisplay />

      {/* Global Brush Panel - Top Left Below Viewport (conditional) */}
      {(currentTool === 'freehand' || currentTool === 'arrow') && (
        <div className="absolute top-[250px] left-3 pointer-events-auto">
          <BrushPanel
            strokeColor={brushSettings.strokeColor}
            strokeWidth={brushSettings.strokeWidth}
            opacity={brushSettings.opacity}
            onStrokeColorChange={color =>
              handleBrushChange({ strokeColor: color })
            }
            onStrokeWidthChange={width =>
              handleBrushChange({ strokeWidth: width })
            }
            onOpacityChange={opacity => handleBrushChange({ opacity: opacity })}
          />
        </div>
      )}

      {/* Global Properties Panel - Right Side */}
      <CanvasPropertiesPanel
        selectedObject={selectedObject}
        onUpdate={handleUpdateObject}
      />

      {/* Tab Content */}
      {children}
    </div>
  )
}
