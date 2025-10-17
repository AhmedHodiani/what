import { useState, useCallback, useRef, useEffect } from 'react'
import type { Point, FreehandObject } from 'lib/types/canvas'
import { generateId } from 'lib/utils/id-generator'
import { useModifier, ShortcutContext } from 'renderer/shortcuts'

interface UseFreehandDrawingOptions {
  isEnabled: boolean
  strokeColor: string
  strokeWidth: number
  opacity: number
  onComplete: (object: FreehandObject) => Promise<void>
  screenToWorld: (screenX: number, screenY: number) => Point
}

/**
 * Hook for freehand drawing interaction
 * Handles mouse events to draw smooth paths
 */
export function useFreehandDrawing({
  isEnabled,
  strokeColor,
  strokeWidth,
  opacity,
  onComplete,
  screenToWorld,
}: UseFreehandDrawingOptions) {
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [currentObjectId, setCurrentObjectId] = useState<string | null>(null)
  const [straightLineStart, setStraightLineStart] = useState<Point | null>(null)

  // Ctrl key modifier tracking using KRS
  const isCtrlPressed = useModifier({
    key: 'control',
    context: ShortcutContext.Tool,
    description: 'Draw straight line (freehand)',
    enabled: () => isDrawing,
  }, [isDrawing])

  const pathRef = useRef<Point[]>([])

  // Sync path ref with state
  useEffect(() => {
    pathRef.current = currentPath
  }, [currentPath])

    // Update straight line start when Ctrl is pressed
  useEffect(() => {
    if (isCtrlPressed && isDrawing && currentPath.length > 0) {
      setStraightLineStart(currentPath[0])
    } else if (!isCtrlPressed) {
      setStraightLineStart(null)
    }
  }, [isCtrlPressed, isDrawing, currentPath])

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

    // Create the final freehand object
    const freehandObject: FreehandObject = {
      id: currentObjectId || generateId(),
      type: 'freehand',
      x: 0, // Freehand uses points array, not x/y
      y: 0,
      z_index: 0, // Will be set by parent
      object_data: {
        points: pathRef.current,
        stroke: strokeColor,
        strokeWidth,
        opacity,
      },
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }

    // Reset state
    setIsDrawing(false)
    setCurrentPath([])
    setCurrentObjectId(null)
    setStraightLineStart(null)

    // Notify parent
    await onComplete(freehandObject)
  }, [
    isDrawing,
    currentPath.length,
    currentObjectId,
    strokeColor,
    strokeWidth,
    opacity,
    onComplete,
  ])

  return {
    isDrawing,
    currentPath,
    currentObjectId,
    isCtrlPressed,
    handleDrawStart,
    handleDrawMove,
    handleDrawEnd,
  }
}
