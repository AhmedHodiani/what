import { useCallback } from 'react'
import type { DrawingObject } from 'lib/types/canvas'
import { widgetRegistry } from './widgets/widget-registry'
import './widgets/register-all' // Auto-registers all widgets
import { ImageWidget } from './widgets/image-widget' // Special case: needs getImageUrl

interface CanvasObjectProps {
  object: DrawingObject & { _imageUrl?: string }
  isSelected: boolean
  zoom: number
  currentTool?: string
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
  onSelect: (id: string) => void
  onContextMenu: (event: React.MouseEvent, id: string) => void
  onStartDrag: (e: React.MouseEvent, id: string) => void
}

/**
 * CanvasObject - Generic wrapper that renders any drawing object type
 * Uses the widget registry to dynamically load the correct widget component
 *
 * To add a new widget:
 * 1. Create your widget component
 * 2. Register it in widgets/register-all.ts
 * 3. That's it! No need to edit this file.
 */
export function CanvasObject({
  object,
  isSelected,
  zoom,
  currentTool,
  onUpdate,
  onSelect,
  onContextMenu,
  onStartDrag,
}: CanvasObjectProps) {
  // Asset URL getter for image objects (can be extended for other asset-based types)
  const getImageUrl = useCallback(
    (_assetId: string) => {
      // For now, we get the image URL from the _imageUrl field loaded by the hook
      // In future, we could fetch on-demand based on assetId if needed
      if (object.type === 'image' && '_imageUrl' in object) {
        return object._imageUrl || ''
      }
      return ''
    },
    [object]
  )

  // Special case: Image widget needs getImageUrl prop
  if (object.type === 'image') {
    return (
      <ImageWidget
        getImageUrl={getImageUrl}
        isSelected={isSelected}
        object={object}
        onContextMenu={onContextMenu}
        onSelect={onSelect}
        onStartDrag={onStartDrag}
        onUpdate={onUpdate}
        zoom={zoom}
      />
    )
  }

  // Get widget component from registry
  const WidgetComponent = widgetRegistry.get(object.type)

  if (!WidgetComponent) {
    return (
      <div 
        className="text-red-400 p-4 bg-red-900/20 rounded border border-red-600 cursor-pointer select-none"
        onClick={(e) => {
          e.stopPropagation()
          onSelect(object.id)
        }}
        onContextMenu={(e) => {
          e.stopPropagation()
          onContextMenu(e, object.id)
        }}
        onMouseDown={(e) => {
          e.stopPropagation()
          onStartDrag(e, object.id)
        }}
        style={{
          outline: isSelected ? '2px solid #ef4444' : 'none',
          outlineOffset: '2px',
        }}
      >
        <p className="font-bold">⚠️ Unknown widget type: {object.type}</p>
        <p className="text-sm mt-1">
          This widget is not registered. Check widgets/register-all.ts
        </p>
        <p className="text-xs mt-2 opacity-70">
          Right-click to delete this orphaned object
        </p>
      </div>
    )
  }

  // Render the widget component
  return (
    <WidgetComponent
      currentTool={currentTool}
      isSelected={isSelected}
      object={object}
      onContextMenu={onContextMenu}
      onSelect={onSelect}
      onStartDrag={onStartDrag}
      onUpdate={onUpdate}
      zoom={zoom}
    />
  )
}
