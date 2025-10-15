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
      isResizable={true}
      isSelected={isSelected}
      lockAspectRatio={true}
      minHeight={40}
      minWidth={40}
      object={object}
      onContextMenu={onContextMenu}
      onSelect={onSelect}
      onStartDrag={onStartDrag}
      onUpdate={onUpdate}
      zoom={zoom}
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
