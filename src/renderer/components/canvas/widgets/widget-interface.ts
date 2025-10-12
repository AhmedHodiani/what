import type { DrawingObject } from 'lib/types/canvas'

/**
 * Base props that all widget components should accept
 */
export interface BaseWidgetProps<T extends DrawingObject> {
  object: T & { _imageUrl?: string }
  isSelected: boolean
  zoom: number
  onUpdate: (id: string, updates: Partial<T>) => void
  onSelect: (id: string) => void
  onContextMenu: (event: React.MouseEvent, id: string) => void
  onStartDrag: (e: React.MouseEvent, id: string) => void
}

/**
 * Props for resizable widgets (images, sticky notes, text boxes, etc.)
 */
export interface ResizableWidgetProps<T extends DrawingObject> extends BaseWidgetProps<T> {
  minWidth?: number
  minHeight?: number
  lockAspectRatio?: boolean
}
