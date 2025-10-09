import { useState, useCallback, useEffect, useRef } from 'react'
import type { Point } from 'lib/types/canvas'

/**
 * Hook for handling canvas panning (drag to move).
 * Returns panning state and event handlers.
 * Manages cursor state and global mouse event listeners automatically.
 * 
 * @param containerRef - Ref to the container element
 * @param onPan - Callback fired on pan with deltaX and deltaY
 * @returns Object with isPanning state and handleMouseDown handler
 */
export function useCanvasPan(
  containerRef: React.RefObject<HTMLDivElement | null>,
  onPan: (deltaX: number, deltaY: number) => void
) {
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef<Point>({ x: 0, y: 0 })
  const onPanRef = useRef(onPan)
  const isPanningRef = useRef(false)

  // Keep refs in sync
  useEffect(() => {
    onPanRef.current = onPan
  }, [onPan])

  useEffect(() => {
    isPanningRef.current = isPanning
  }, [isPanning])

  // Stable mouse move handler (no dependencies on state)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanningRef.current) return

    const currentPanStart = panStartRef.current

    const deltaX = e.clientX - currentPanStart.x
    const deltaY = e.clientY - currentPanStart.y

    // Call the callback with deltas
    onPanRef.current(deltaX, deltaY)

    // Update pan start for next move
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
    }
  }, [])

  // Stable mouse up handler
  const handleMouseUp = useCallback(() => {
    setIsPanning(false)

    // Reset cursor
    const container = containerRef.current
    if (container) {
      container.style.cursor = 'grab'
    }
  }, [containerRef])

  // Mouse down handler (starts panning)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only pan with left mouse button
      if (e.button !== 0) return

      e.stopPropagation()

      const container = containerRef.current
      if (!container) return

      setIsPanning(true)
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
      }

      // Change cursor
      container.style.cursor = 'grabbing'
    },
    [containerRef]
  )

  // Add/remove global mouse event listeners for panning
  useEffect(() => {
    if (isPanning) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)

      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isPanning, handleMouseMove, handleMouseUp])

  // Cleanup on unmount - stop panning and reset cursor
  useEffect(() => {
    return () => {
      const container = containerRef.current
      if (container) {
        container.style.cursor = 'grab'
      }
    }
  }, [containerRef])

  return {
    isPanning,
    handleMouseDown,
  }
}
