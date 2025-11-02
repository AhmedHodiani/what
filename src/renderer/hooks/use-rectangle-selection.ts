import { useCallback, useState } from 'react'
import type {
  ArrowObject,
  DrawingObject,
  FreehandObject,
} from '../../lib/types/canvas'
import { logger } from '../../shared/logger'

interface Point {
  x: number
  y: number
}

interface UseRectangleSelectionProps {
  objects: DrawingObject[]
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number }
  selectMultipleObjects: (ids: string[]) => void
  clearSelection: () => void
  closeContextMenu: () => void
  isActive: boolean
}

interface UseRectangleSelectionReturn {
  // State
  isRectangleSelecting: boolean
  rectangleStart: Point | null
  rectangleEnd: Point | null

  // Event handlers
  handleRectangleContextMenu: (
    e: React.MouseEvent<SVGSVGElement, MouseEvent>
  ) => void
  handleRectangleMouseMove: (
    e: React.MouseEvent<SVGSVGElement, MouseEvent>
  ) => void
  handleRectangleMouseUp: () => void
  handleRectangleMouseLeave: () => void
}

export function useRectangleSelection({
  objects,
  screenToWorld,
  selectMultipleObjects,
  clearSelection,
  closeContextMenu,
  isActive,
}: UseRectangleSelectionProps): UseRectangleSelectionReturn {
  // Rectangle selection state
  const [isRectangleSelecting, setIsRectangleSelecting] = useState(false)
  const [rectangleStart, setRectangleStart] = useState<Point | null>(null)
  const [rectangleEnd, setRectangleEnd] = useState<Point | null>(null)

  /**
   * Handle right-click to start rectangle selection
   */
  const handleRectangleContextMenu = useCallback(
    (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
      if (!isActive) return

      // Only start rectangle selection if not clicking on a widget
      const clickedOnWidget = (e as any)._clickedWidget
      if (!clickedOnWidget) {
        e.preventDefault()
        e.stopPropagation()
        const point = screenToWorld(e.clientX, e.clientY)
        logger.debug(
          'Right-click on canvas - starting rectangle selection',
          point
        )
        setIsRectangleSelecting(true)
        setRectangleStart(point)
        setRectangleEnd(point)
        closeContextMenu() // Close any existing context menu
      }
    },
    [isActive, screenToWorld, closeContextMenu]
  )

  /**
   * Update rectangle end point as mouse moves
   */
  const handleRectangleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
      if (!isActive || !isRectangleSelecting || !rectangleStart) return

      e.stopPropagation()
      const point = screenToWorld(e.clientX, e.clientY)
      setRectangleEnd(point)
    },
    [isActive, isRectangleSelecting, rectangleStart, screenToWorld]
  )

  /**
   * Calculate object bounds based on type
   */
  const getObjectBounds = useCallback((obj: DrawingObject) => {
    let objMinX = obj.x
    let objMaxX = obj.x + 100 // default size
    let objMinY = obj.y
    let objMaxY = obj.y + 100 // default size

    if (obj.type === 'freehand') {
      // For freehand, calculate bounds from points
      const freehandObj = obj as FreehandObject
      const points = freehandObj.object_data.points
      if (points && points.length > 0) {
        const xs = points.map((p: Point) => p.x)
        const ys = points.map((p: Point) => p.y)
        objMinX = Math.min(...xs)
        objMaxX = Math.max(...xs)
        objMinY = Math.min(...ys)
        objMaxY = Math.max(...ys)

        // Add stroke padding for easier selection
        const strokePadding = (freehandObj.object_data.strokeWidth || 5) * 2
        objMinX -= strokePadding
        objMaxX += strokePadding
        objMinY -= strokePadding
        objMaxY += strokePadding
      }
    } else if (obj.type === 'arrow') {
      // For arrow, calculate bounds from control points
      const arrowObj = obj as ArrowObject
      const points = arrowObj.object_data.controlPoints
      if (points && points.length > 0) {
        const xs = points.map((p: Point) => p.x)
        const ys = points.map((p: Point) => p.y)
        objMinX = Math.min(...xs)
        objMaxX = Math.max(...xs)
        objMinY = Math.min(...ys)
        objMaxY = Math.max(...ys)

        // Add stroke padding for easier selection
        const strokePadding = (arrowObj.object_data.strokeWidth || 5) * 2
        objMinX -= strokePadding
        objMaxX += strokePadding
        objMinY -= strokePadding
        objMaxY += strokePadding
      }
    } else if ('width' in obj && 'height' in obj) {
      // For objects with explicit dimensions
      objMaxX = obj.x + obj.width
      objMaxY = obj.y + obj.height
    }

    return { objMinX, objMaxX, objMinY, objMaxY }
  }, [])

  /**
   * Check if rectangle selection intersects with an object
   */
  const intersectsRectangle = useCallback(
    (
      obj: DrawingObject,
      minX: number,
      maxX: number,
      minY: number,
      maxY: number
    ) => {
      const { objMinX, objMaxX, objMinY, objMaxY } = getObjectBounds(obj)

      // Rectangle intersection test
      return (
        objMaxX >= minX && objMinX <= maxX && objMaxY >= minY && objMinY <= maxY
      )
    },
    [getObjectBounds]
  )

  /**
   * Complete rectangle selection on mouse up
   */
  const handleRectangleMouseUp = useCallback(() => {
    if (!isActive || !isRectangleSelecting || !rectangleStart || !rectangleEnd)
      return

    const minX = Math.min(rectangleStart.x, rectangleEnd.x)
    const maxX = Math.max(rectangleStart.x, rectangleEnd.x)
    const minY = Math.min(rectangleStart.y, rectangleEnd.y)
    const maxY = Math.max(rectangleStart.y, rectangleEnd.y)

    // Check if this was just a click (no drag) or an actual rectangle selection
    const isClick =
      Math.abs(rectangleEnd.x - rectangleStart.x) < 5 &&
      Math.abs(rectangleEnd.y - rectangleStart.y) < 5

    if (isClick) {
      // Just a right-click, clear selection
      clearSelection()
    } else {
      // Find all objects that intersect with the rectangle
      const selectedIds: string[] = []
      objects.forEach(obj => {
        if (intersectsRectangle(obj, minX, maxX, minY, maxY)) {
          selectedIds.push(obj.id)
        }
      })

      // Update selection
      if (selectedIds.length > 0) {
        selectMultipleObjects(selectedIds)
      } else {
        clearSelection()
      }
    }

    // Reset rectangle selection state
    setIsRectangleSelecting(false)
    setRectangleStart(null)
    setRectangleEnd(null)
  }, [
    isActive,
    isRectangleSelecting,
    rectangleStart,
    rectangleEnd,
    objects,
    intersectsRectangle,
    selectMultipleObjects,
    clearSelection,
  ])

  /**
   * Cancel rectangle selection if mouse leaves canvas
   */
  const handleRectangleMouseLeave = useCallback(() => {
    if (!isActive || !isRectangleSelecting) return

    setIsRectangleSelecting(false)
    setRectangleStart(null)
    setRectangleEnd(null)
  }, [isActive, isRectangleSelecting])

  return {
    // State
    isRectangleSelecting,
    rectangleStart,
    rectangleEnd,

    // Event handlers
    handleRectangleContextMenu,
    handleRectangleMouseMove,
    handleRectangleMouseUp,
    handleRectangleMouseLeave,
  }
}
