import { useMemo, useRef } from 'react'
import type { DrawingObject, Viewport, CanvasSize } from 'lib/types/canvas'

interface UseCanvasVirtualizationProps {
  objects: DrawingObject[]
  viewport: Viewport
  containerSize: CanvasSize
  buffer?: number // Buffer in pixels around the viewport (default: 500)
}

interface ObjectBounds {
  id: string
  left: number
  top: number
  right: number
  bottom: number
}

/**
 * Helper to calculate accurate bounds for any object type
 */
function calculateObjectBounds(obj: DrawingObject): ObjectBounds {
  let left = obj.x
  let top = obj.y
  let right = obj.x
  let bottom = obj.y

  if (obj.type === 'arrow') {
    // Arrow objects: bounds depend on start/end points and control points
    const { startX, startY, endX, endY, controlPoints } = obj.object_data
    
    // Points are absolute world coordinates
    const points = [
      { x: startX, y: startY },
      { x: endX, y: endY },
      ...(controlPoints || [])
    ]

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    points.forEach(p => {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    })

    // Add padding for stroke width and arrowhead
    // Arrowhead length is approx 3x stroke width
    const strokeWidth = obj.object_data.strokeWidth || 2
    const padding = strokeWidth * 4 + 40
    
    left = minX - padding
    top = minY - padding
    right = maxX + padding
    bottom = maxY + padding

  } else if (obj.type === 'freehand') {
    // Freehand objects: iterate points to find bounds
    const points = obj.object_data.points || []
    
    if (points.length > 0) {
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      points.forEach(p => {
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
      })

      // Add padding for stroke width
      const padding = (obj.object_data.strokeWidth || 5) + 20

      left = minX - padding
      top = minY - padding
      right = maxX + padding
      bottom = maxY + padding
    } else {
      // Fallback for empty freehand (shouldn't happen)
      right = obj.x + 100
      bottom = obj.y + 100
    }

  } else if ('width' in obj && 'height' in obj) {
    // Standard objects with width/height
    right = obj.x + obj.width
    bottom = obj.y + obj.height
  }

  return { id: obj.id, left, top, right, bottom }
}

/**
 * Hook to filter objects that are not visible in the current viewport.
 * Drastically improves performance for large canvases.
 */
export function useCanvasVirtualization({
  objects,
  viewport,
  containerSize,
  buffer = 1000, // Generous buffer to prevent pop-in during fast pans
}: UseCanvasVirtualizationProps) {
  
  // Cache for object bounds to avoid recalculating unchanged objects
  // WeakMap allows garbage collection of old objects
  const boundsCache = useRef(new WeakMap<DrawingObject, ObjectBounds>())

  // 1. Calculate bounds for all objects
  // Only re-calculates when objects array changes (add/remove/update)
  // Uses cache to skip recalculation for objects that haven't changed reference
  const objectBounds = useMemo(() => {
    return objects.map(obj => {
      // Check cache first
      const cached = boundsCache.current.get(obj)
      if (cached) {
        return cached
      }

      // Calculate and cache
      const bounds = calculateObjectBounds(obj)
      boundsCache.current.set(obj, bounds)
      return bounds
    })
  }, [objects])

  // 2. Filter objects based on current viewport
  // Runs on every pan/zoom, but is very fast (simple number comparisons)
  const visibleObjects = useMemo(() => {
    // Calculate visible world bounds
    const halfWidth = containerSize.width / (2 * viewport.zoom)
    const halfHeight = containerSize.height / (2 * viewport.zoom)

    const viewLeft = viewport.x - halfWidth - buffer / viewport.zoom
    const viewRight = viewport.x + halfWidth + buffer / viewport.zoom
    const viewTop = viewport.y - halfHeight - buffer / viewport.zoom
    const viewBottom = viewport.y + halfHeight + buffer / viewport.zoom

    // Create a Set of visible IDs for O(1) lookup
    const visibleIds = new Set<string>()

    for (const bounds of objectBounds) {
      if (
        bounds.right >= viewLeft &&
        bounds.left <= viewRight &&
        bounds.bottom >= viewTop &&
        bounds.top <= viewBottom
      ) {
        visibleIds.add(bounds.id)
      }
    }

    // Return the actual objects that match
    return objects.filter(obj => visibleIds.has(obj.id))
  }, [objects, objectBounds, viewport, containerSize, buffer])

  return visibleObjects
}
