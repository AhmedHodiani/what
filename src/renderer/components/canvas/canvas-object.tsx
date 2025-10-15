import { useCallback } from 'react'
import type { DrawingObject } from 'lib/types/canvas'
import { ImageWidget } from './image-widget'
import { StickyNoteWidget } from './widgets/sticky-note-widget'
import { TextWidget } from './widgets/text-widget'
import { FreehandWidget } from './widgets/freehand-widget'
import { ArrowWidget } from './widgets/arrow-widget'
import { YouTubeWidget } from './widgets/youtube-widget'
import { ShapeWidget } from './widgets/shape-widget'
import { EmojiWidget } from './widgets/emoji-widget'

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

  // Render the appropriate widget based on object type
  switch (object.type) {
    case 'image':
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

    case 'sticky-note':
      return (
        <StickyNoteWidget
          isSelected={isSelected}
          object={object}
          onContextMenu={onContextMenu}
          onSelect={onSelect}
          onStartDrag={onStartDrag}
          onUpdate={onUpdate}
          zoom={zoom}
        />
      )

    case 'text':
      return (
        <TextWidget
          isSelected={isSelected}
          object={object}
          onContextMenu={onContextMenu}
          onSelect={onSelect}
          onStartDrag={onStartDrag}
          onUpdate={onUpdate}
          zoom={zoom}
        />
      )

    case 'shape':
      return (
        <ShapeWidget
          isSelected={isSelected}
          object={object}
          onContextMenu={onContextMenu}
          onSelect={onSelect}
          onStartDrag={onStartDrag}
          onUpdate={onUpdate}
          zoom={zoom}
        />
      )

    case 'freehand':
      return (
        <FreehandWidget
          isSelected={isSelected}
          object={object}
          onContextMenu={onContextMenu}
          onSelect={onSelect}
          onStartDrag={onStartDrag}
          zoom={zoom}
        />
      )

    case 'arrow':
      return (
        <ArrowWidget
          isSelected={isSelected}
          object={object}
          onContextMenu={onContextMenu}
          onSelect={onSelect}
          onStartDrag={onStartDrag}
          zoom={zoom}
        />
      )

    case 'youtube':
      return (
        <YouTubeWidget
          isSelected={isSelected}
          object={object}
          onContextMenu={onContextMenu}
          onSelect={onSelect}
          onStartDrag={onStartDrag}
          onUpdate={onUpdate}
          zoom={zoom}
        />
      )

    case 'emoji':
      return (
        <EmojiWidget
          isSelected={isSelected}
          object={object}
          onContextMenu={onContextMenu}
          onSelect={onSelect}
          onStartDrag={onStartDrag}
          onUpdate={onUpdate}
          zoom={zoom}
        />
      )

    default:
      return (
        <div className="text-red-400">
          Unknown object type: {(object as any).type}
        </div>
      )
  }
}
