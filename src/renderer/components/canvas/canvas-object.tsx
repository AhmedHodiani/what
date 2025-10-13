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
      return (
        <TextWidget
          object={object}
          isSelected={isSelected}
          zoom={zoom}
          onUpdate={onUpdate}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
          onStartDrag={onStartDrag}
        />
      )

    case 'shape':
      return (
        <ShapeWidget
          object={object}
          isSelected={isSelected}
          zoom={zoom}
          onUpdate={onUpdate}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
          onStartDrag={onStartDrag}
        />
      )

    case 'freehand':
      return (
        <FreehandWidget
          object={object}
          isSelected={isSelected}
          zoom={zoom}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
          onStartDrag={onStartDrag}
        />
      )

    case 'arrow':
      return (
        <ArrowWidget
          object={object}
          isSelected={isSelected}
          zoom={zoom}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
          onStartDrag={onStartDrag}
        />
      )

    case 'youtube':
      return (
        <YouTubeWidget
          object={object}
          isSelected={isSelected}
          zoom={zoom}
          onUpdate={onUpdate}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
          onStartDrag={onStartDrag}
        />
      )

    case 'emoji':
      return (
        <EmojiWidget
          object={object}
          isSelected={isSelected}
          zoom={zoom}
          onUpdate={onUpdate}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
          onStartDrag={onStartDrag}
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
