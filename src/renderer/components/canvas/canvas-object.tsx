import { useCallback } from 'react'
import type { DrawingObject } from 'lib/types/canvas'
import { ImageWidget } from './image-widget'
import { StickyNoteWidget } from './widgets/sticky-note-widget'

interface CanvasObjectProps {
  object: DrawingObject & { _imageUrl?: string }
  isSelected: boolean
  zoom: number
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
  onSelect: (id: string) => void
  onContextMenu: (event: React.MouseEvent, id: string) => void
  onStartDrag: (e: React.MouseEvent, id: string) => void
}

/**
 * CanvasObject - Generic wrapper that renders any drawing object type
 * Delegates to type-specific widgets based on object.type
 */
export function CanvasObject({
  object,
  isSelected,
  zoom,
  onUpdate,
  onSelect,
  onContextMenu,
  onStartDrag,
}: CanvasObjectProps) {
  // Asset URL getter for image objects (can be extended for other asset-based types)
  const getImageUrl = useCallback((_assetId: string) => {
    // For now, we get the image URL from the _imageUrl field loaded by the hook
    // In future, we could fetch on-demand based on assetId if needed
    if (object.type === 'image' && '_imageUrl' in object) {
      return object._imageUrl || ''
    }
    return ''
  }, [object])

  // Render the appropriate widget based on object type
  switch (object.type) {
    case 'image':
      return (
        <ImageWidget
          object={object}
          isSelected={isSelected}
          zoom={zoom}
          onUpdate={onUpdate}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
          onStartDrag={onStartDrag}
          getImageUrl={getImageUrl}
        />
      )

    case 'sticky-note':
      return (
        <StickyNoteWidget
          object={object}
          isSelected={isSelected}
          zoom={zoom}
          onUpdate={onUpdate}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
          onStartDrag={onStartDrag}
        />
      )

    case 'text':
      // TODO: Implement TextWidget
      return (
        <div className="text-white">
          Text Widget - Coming Soon
        </div>
      )

    case 'shape':
      // TODO: Implement ShapeWidget
      return (
        <div className="text-blue-400">
          Shape Widget - Coming Soon
        </div>
      )

    case 'freehand':
      // TODO: Implement FreehandWidget
      return (
        <div className="text-green-400">
          Freehand Widget - Coming Soon
        </div>
      )

    case 'arrow':
      // TODO: Implement ArrowWidget
      return (
        <div className="text-purple-400">
          Arrow Widget - Coming Soon
        </div>
      )

    default:
      return (
        <div className="text-red-400">
          Unknown object type: {(object as any).type}
        </div>
      )
  }
}
