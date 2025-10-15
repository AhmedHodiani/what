import { useEffect, useRef, useCallback } from 'react'
import type { Viewport } from 'lib/types/canvas'
import type { Point } from 'lib/types/canvas'
import { CanvasUtils } from 'lib/utils/canvas'

interface UseCanvasZoomOptions {
  containerRef: React.RefObject<HTMLDivElement | null>
  viewport: Viewport
  dimensions: { width: number; height: number }
  minZoom?: number
  maxZoom?: number
  onZoom: (newViewport: Viewport) => void
}

/**
 * Hook for handling canvas zoom with mouse wheel.
 * Keeps the mouse point fixed during zoom (zoom towards cursor).
 * Uses refs to avoid recreating the wheel listener on every render.
 *
 * @param options - Zoom configuration
 */
export function useCanvasZoom({
  containerRef,
  viewport,
  dimensions,
  minZoom = 0.1,
  maxZoom = 5,
  onZoom,
}: UseCanvasZoomOptions) {
  // Use refs to avoid recreating listener on every viewport/dimension change
  const viewportRef = useRef(viewport)
  const dimensionsRef = useRef(dimensions)
  const onZoomRef = useRef(onZoom)
  const minZoomRef = useRef(minZoom)
  const maxZoomRef = useRef(maxZoom)

  // Keep refs in sync
  useEffect(() => {
    viewportRef.current = viewport
  }, [viewport])

  useEffect(() => {
    dimensionsRef.current = dimensions
  }, [dimensions])

  useEffect(() => {
    onZoomRef.current = onZoom
  }, [onZoom])

  useEffect(() => {
    minZoomRef.current = minZoom
  }, [minZoom])

  useEffect(() => {
    maxZoomRef.current = maxZoom
  }, [maxZoom])

  // Stable wheel handler (no dependencies!)
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const currentViewport = viewportRef.current
      const currentDimensions = dimensionsRef.current

      // Mouse position relative to canvas
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // Current mouse position in world coordinates
      const worldPoint: Point = CanvasUtils.screenToWorld(
        { x: mouseX, y: mouseY },
        currentViewport,
        currentDimensions
      )

      // Calculate new zoom
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = CanvasUtils.clampZoom(
        currentViewport.zoom * zoomDelta,
        minZoomRef.current,
        maxZoomRef.current
      )

      // Calculate new viewport position to keep mouse point fixed
      const newViewportX =
        worldPoint.x - (mouseX - currentDimensions.width / 2) / newZoom
      const newViewportY =
        worldPoint.y - (mouseY - currentDimensions.height / 2) / newZoom

      onZoomRef.current({
        x: newViewportX,
        y: newViewportY,
        zoom: newZoom,
      })
    },
    [containerRef]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Add wheel listener with passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [containerRef, handleWheel])
}
