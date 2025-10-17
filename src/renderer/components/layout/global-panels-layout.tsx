import { useEffect } from 'react'
import type { ReactNode } from 'react'
import type { DrawingObject } from 'lib/types/canvas'
import { CanvasToolbar } from 'renderer/components/canvas/canvas-toolbar'
import { CanvasViewportDisplay } from 'renderer/components/canvas/canvas-viewport-display'
import { CanvasPropertiesPanel } from 'renderer/components/canvas/canvas-properties-panel'
import { BrushPanel } from 'renderer/components/canvas/properties-panels/brush-panel'
import { useGlobalTool, useActiveTab } from 'renderer/contexts'
import { shortcutsRegistry, registerToolShortcuts } from 'renderer/shortcuts'
import type { ToolType } from 'renderer/shortcuts/shortcuts/tool-shortcuts'

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
  const { currentTool, setTool } = useGlobalTool()
  const { selectedObjectIds, objects, brushSettings, updateActiveTab } =
    useActiveTab()

  // Register tool shortcuts using the centralized registry
  useEffect(() => {
    const shortcutIds = registerToolShortcuts(shortcutsRegistry, {
      onToolChange: (tool: ToolType) => setTool(tool),
    })

    // Cleanup: unregister shortcuts when component unmounts
    return () => {
      for (const id of shortcutIds) {
        shortcutsRegistry.unregister(id)
      }
    }
  }, [setTool])

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
      {/* Tab Content */}
      {children}

      {/* Global Panels - Rendered on top with z-index */}
      <div
        className="absolute inset-0 pointer-events-none mt-8"
        style={{ zIndex: 10 }}
      >
        {/* Global Toolbar - Top Center */}
        <CanvasToolbar />

        {/* Global Viewport Display - Top Left */}
        <CanvasViewportDisplay />

        {/* Global Brush Panel - Below Toolbar (conditional) */}
        {/* Only show when pen/arrow tool is active (for live drawing only) */}
        {(currentTool === 'freehand' || currentTool === 'arrow') && (
          <div className="absolute top-[90px] left-1/2 -translate-x-1/2 pointer-events-auto">
            <BrushPanel
              onOpacityChange={opacity =>
                handleBrushChange({ opacity: opacity })
              }
              onStrokeColorChange={color =>
                handleBrushChange({ strokeColor: color })
              }
              onStrokeWidthChange={width =>
                handleBrushChange({ strokeWidth: width })
              }
              opacity={brushSettings.opacity}
              strokeColor={brushSettings.strokeColor}
              strokeWidth={brushSettings.strokeWidth}
            />
          </div>
        )}

        {/* Global Properties Panel - Right Side */}
        <CanvasPropertiesPanel
          onUpdate={handleUpdateObject}
          selectedObject={selectedObject}
        />
      </div>
    </div>
  )
}
