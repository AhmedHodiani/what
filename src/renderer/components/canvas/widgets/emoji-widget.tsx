import type { DrawingObject, EmojiObject } from 'lib/types/canvas'
import { WidgetWrapper } from './widget-wrapper'

interface EmojiWidgetProps {
  object: EmojiObject
  isSelected: boolean
  zoom: number
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
  onSelect: (id: string, event?: React.MouseEvent) => void
  onContextMenu: (event: React.MouseEvent, id: string) => void
  onStartDrag: (e: React.MouseEvent, id: string) => void
}

/**
 * EmojiWidget - Display and resize emoji on canvas
 * 
 * Features:
 * - Emoji scaled to fit widget bounds
 * - Resizable with aspect ratio maintained
 * - Simple emoji character display
 */
export function EmojiWidget({
  object,
  isSelected,
  zoom,
  onUpdate,
  onSelect,
  onContextMenu,
  onStartDrag,
}: EmojiWidgetProps) {
  // Calculate font size based on widget dimensions (80% of smallest dimension)
  const fontSize = Math.min(object.width, object.height) * 0.8

  return (
    <WidgetWrapper
      object={object}
      isSelected={isSelected}
      zoom={zoom}
      onUpdate={onUpdate}
      onSelect={onSelect}
      onContextMenu={onContextMenu}
      onStartDrag={onStartDrag}
      isResizable={true}
      lockAspectRatio={true}
      minWidth={40}
      minHeight={40}
    >
      <div className="flex items-center justify-center w-full h-full select-none">
        <span
          className="leading-none"
          style={{
            fontSize: `${fontSize}px`,
          }}
        >
          {object.object_data.emoji}
        </span>
      </div>
    </WidgetWrapper>
  )
}
