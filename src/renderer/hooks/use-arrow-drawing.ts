import { useState, useCallback, useRef, useEffect } from 'react'
import type { Point, ArrowObject } from 'lib/types/canvas'
import { generateId } from 'lib/utils/id-generator'

interface UseArrowDrawingOptions {
  isEnabled: boolean
  strokeColor: string
  strokeWidth: number
  opacity: number
  onComplete: (object: ArrowObject) => Promise<void>
  screenToWorld: (screenX: number, screenY: number) => Point
}

/**
 * Hook for arrow drawing interaction
 * Same as freehand drawing but creates arrow objects with arrowhead
 */
export function useArrowDrawing({
  isEnabled,
  strokeColor,
  strokeWidth,
  opacity,
  onComplete,
  screenToWorld,
}: UseArrowDrawingOptions) {
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [currentObjectId, setCurrentObjectId] = useState<string | null>(null)
  const [isCtrlPressed, setIsCtrlPressed] = useState(false)
  const [straightLineStart, setStraightLineStart] = useState<Point | null>(null)

  const pathRef = useRef<Point[]>([])

  // Sync path ref with state
  useEffect(() => {
    pathRef.current = currentPath
  }, [currentPath])

  // Listen for Ctrl key for straight line mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.ctrlKey) {
        setIsCtrlPressed(true)
        // If currently drawing, remember the start point
        if (isDrawing && currentPath.length > 0) {
          setStraightLineStart(currentPath[0])
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || !e.ctrlKey) {
        setIsCtrlPressed(false)
        setStraightLineStart(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isDrawing, currentPath])

  const handleDrawStart = useCallback(
    (e: React.MouseEvent, containerRef: React.RefObject<HTMLDivElement>) => {
      if (!isEnabled) return false

      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return false

      const worldPoint = screenToWorld(e.clientX, e.clientY)

      setIsDrawing(true)
      setCurrentPath([worldPoint])
      setCurrentObjectId(generateId())

      if (isCtrlPressed) {
        setStraightLineStart(worldPoint)
      }

      return true // Indicates drawing started
    },
    [isEnabled, screenToWorld, isCtrlPressed]
  )

  const handleDrawMove = useCallback(
    (e: MouseEvent) => {
      if (!isDrawing || !isEnabled) return

      const worldPoint = screenToWorld(e.clientX, e.clientY)

      if (isCtrlPressed && straightLineStart) {
        // Straight line mode: only keep start and current point
        setCurrentPath([straightLineStart, worldPoint])
      } else {
        // Freehand mode: add points continuously
        setCurrentPath(prev => [...prev, worldPoint])
      }
    },
    [isDrawing, isEnabled, screenToWorld, isCtrlPressed, straightLineStart]
  )

  const handleDrawEnd = useCallback(async () => {
    if (!isDrawing || currentPath.length === 0) return

    // Calculate bounding box for the arrow
    const xs = currentPath.map(p => p.x)
    const ys = currentPath.map(p => p.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const maxX = Math.max(...xs)
    const maxY = Math.max(...ys)

    // Create the final arrow object
    const arrowObject: ArrowObject = {
      id: currentObjectId || generateId(),
      type: 'arrow',
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      z_index: 0, // Will be set by parent
      object_data: {
        startX: currentPath[0].x,
        startY: currentPath[0].y,
        endX: currentPath[currentPath.length - 1].x,
        endY: currentPath[currentPath.length - 1].y,
        stroke: strokeColor,
        strokeWidth,
        opacity,
        arrowEnd: true, // Arrow at end
        controlPoints: currentPath, // Store full path for rendering
      },
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }

    // Reset state
    setIsDrawing(false)
    setCurrentPath([])
    setCurrentObjectId(null)
    setStraightLineStart(null)

    // Save the arrow
    await onComplete(arrowObject)
  }, [
    isDrawing,
    currentPath,
    currentObjectId,
    strokeColor,
    strokeWidth,
    opacity,
    onComplete,
  ])

  return {
    isDrawing,
    currentPath,
    handleDrawStart,
    handleDrawMove,
    handleDrawEnd,
  }
}
