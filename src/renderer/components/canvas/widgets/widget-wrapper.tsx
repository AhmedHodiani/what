import { useCallback } from 'react'
import type { DrawingObject } from 'lib/types/canvas'
import { logger } from '../../../../shared/logger'
import {
  useWidgetResize,
  type ResizeHandle,
} from 'renderer/hooks/use-widget-resize'

interface WidgetWrapperProps {
  object: DrawingObject & { _imageUrl?: string }
  isSelected: boolean
  zoom: number
  currentTool?: string // Current active tool (freehand/arrow disables interactions)
  isResizable?: boolean
  lockAspectRatio?: boolean
  minWidth?: number
  minHeight?: number
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
  onSelect: (id: string, event?: React.MouseEvent) => void
  onContextMenu: (event: React.MouseEvent, id: string) => void
  onStartDrag: (e: React.MouseEvent, id: string) => void
  onManualResize?: () => void // Callback when user manually resizes
  children: React.ReactNode
}

/**
 * WidgetWrapper - Reusable wrapper for all canvas objects
 *
 * Handles:
 * - Selection state & styling
 * - Drag interaction
 * - Resize handles (if resizable)
 * - Context menu
 *
 * This eliminates ~200 lines of duplicated code per widget!
 */
export function WidgetWrapper({
  object,
  isSelected,
  zoom,
  currentTool,
  isResizable = true,
  lockAspectRatio = false,
  minWidth = 50,
  minHeight = 50,
  onUpdate,
  onSelect,
  onContextMenu,
  onStartDrag,
  onManualResize,
  children,
}: WidgetWrapperProps) {
  const width = 'width' in object ? object.width : 100
  const height = 'height' in object ? object.height : 100

  // Callback to save to database when resize completes
  const handleResizeEnd = useCallback(
    (finalWidth: number, finalHeight: number) => {
      // Now do a final save to the database with the final size
      logger.success(
        ' Resize complete, saving to database:',
        finalWidth,
        finalHeight
      )
      onUpdate(object.id, { width: finalWidth, height: finalHeight })
    },
    [object.id, onUpdate]
  )

  const { isResizing, handleResizeStart } = useWidgetResize({
    objectId: object.id,
    width,
    height,
    zoom,
    minWidth,
    minHeight,
    lockAspectRatio,
    onUpdate,
    onResizeStart: onManualResize,
    onResizeEnd: handleResizeEnd,
  })

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // When drawing tools are active, don't intercept - let canvas handle it
      if (currentTool === 'freehand' || currentTool === 'arrow') {
        // Don't stop propagation - let the event reach the canvas for drawing
        return
      }

      const target = e.target as HTMLElement
      if (target.classList.contains('resize-handle')) return

      // Don't change selection on right-click (context menu)
      if (e.button === 2) return

      e.stopPropagation()
      if (!isResizing) {
        onSelect(object.id, e)
        onStartDrag(e, object.id)
      }
    },
    [currentTool, isResizing, onSelect, onStartDrag, object.id]
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // When drawing tools are active, don't intercept - let canvas handle it
      if (currentTool === 'freehand' || currentTool === 'arrow') {
        // Don't stop propagation - let the event reach the canvas for drawing
        return
      }

      const target = e.target as HTMLElement
      if (target.classList.contains('resize-handle')) return

      // Don't change selection on right-click (context menu)
      if (e.button === 2) return

      // Select the widget but DON'T stop propagation
      // This allows the canvas to detect if we clicked on a widget or background
      if (!isResizing) {
        onSelect(object.id, e)
        // Mark that we clicked on a widget (not background)
        ;(e as any)._clickedWidget = true
      }
    },
    [currentTool, isResizing, onSelect, object.id]
  )

  const handleContextMenuClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onContextMenu(e, object.id)
    },
    [onContextMenu, object.id]
  )

  const isDrawingMode = currentTool === 'freehand' || currentTool === 'arrow'

  return (
    <div
      className={`
        relative select-none rounded overflow-visible
        ${!isDrawingMode && isSelected ? 'border-2 border-dashed border-[#007acc]' : 'border-2 border-transparent'}
        ${isResizing ? 'shadow-[0_0_15px_rgba(0,122,204,0.6)]' : ''}
      `}
      onClick={handleClick}
      onContextMenu={handleContextMenuClick}
      onMouseDown={handleMouseDown}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        zIndex: object.z_index,
        cursor: isDrawingMode ? 'crosshair' : isResizing ? 'grabbing' : 'grab',
        pointerEvents: isDrawingMode ? 'none' : 'auto',
      }}
    >
      {children}

      {/* Resize handles when selected - E (right-side), SE (right-bottom), S (bottom-side) */}
      {!isDrawingMode &&
        isSelected &&
        isResizable &&
        (['e', 'se', 's'] as ResizeHandle[]).map(handle => (
          <ResizeHandleComponent
            handle={handle}
            key={handle}
            onResizeStart={handleResizeStart}
            zoom={zoom}
          />
        ))}
    </div>
  )
}

/**
 * Individual resize handle component
 * Scales inversely with zoom to maintain constant screen size
 */
function ResizeHandleComponent({
  handle,
  zoom,
  onResizeStart,
}: {
  handle: ResizeHandle
  zoom: number
  onResizeStart: (e: React.MouseEvent, handle: ResizeHandle) => void
}) {
  // Base size in pixels (will be scaled inversely with zoom)
  const scaledSize = 20
  const offset = 3 // Center the handle on the edge, max 3px

  const positions: Record<ResizeHandle, React.CSSProperties> = {
    se: { bottom: `-${offset}px`, right: `-${offset}px` },
    s: {
      bottom: `-${offset}px`,
      left: '50%',
      transform: `translateX(-50%) scale(${1 / zoom})`,
      transformOrigin: 'center',
    },
    e: {
      right: `-${offset}px`,
      top: '50%',
      transform: `translateY(-50%) scale(${1 / zoom})`,
      transformOrigin: 'center',
    },
    sw: { bottom: `-${offset}px`, left: `-${offset}px` },
    w: {
      left: `-${offset}px`,
      top: '50%',
      transform: `translateY(-50%) scale(${1 / zoom})`,
      transformOrigin: 'center',
    },
    nw: { top: `-${offset}px`, left: `-${offset}px` },
    n: {
      top: `-${offset}px`,
      left: '50%',
      transform: `translateX(-50%) scale(${1 / zoom})`,
      transformOrigin: 'center',
    },
    ne: { top: `-${offset}px`, right: `-${offset}px` },
  }

  // Map resize handles to proper CSS cursor values
  const cursors: Record<ResizeHandle, string> = {
    se: 'se-resize',
    s: 's-resize',
    e: 'e-resize',
    sw: 'sw-resize',
    w: 'w-resize',
    nw: 'nw-resize',
    n: 'n-resize',
    ne: 'ne-resize',
  }

  return (
    <div
      className="resize-handle absolute bg-[#007acc] border-2 border-white rounded-sm shadow-md hover:bg-[#005999] hover:scale-110 z-[1000]"
      onMouseDown={e => onResizeStart(e, handle)}
      style={{
        width: `${scaledSize}px`,
        height: `${scaledSize}px`,
        ...positions[handle],
        cursor: cursors[handle],
        pointerEvents: 'all',
        // Maintain visual consistency regardless of zoom
        transform: positions[handle].transform || `scale(${1 / zoom})`,
        transformOrigin: positions[handle].transformOrigin || 'center',
      }}
    />
  )
}
