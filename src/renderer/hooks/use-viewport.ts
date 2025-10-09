import { useState, useEffect, useRef, useCallback } from 'react'
import type { Viewport } from 'lib/types/canvas'

interface UseViewportOptions {
  initialViewport?: Viewport
  onViewportChange?: (viewport: Viewport) => void
}

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 }

/**
 * Hook for managing viewport state with external update handling.
 * Handles internal viewport updates and notifies parent when needed.
 * Avoids stale closures by using refs for callbacks and current values.
 * 
 * @param options - Configuration for viewport behavior
 * @returns Viewport state and updater function
 */
export function useViewport({ initialViewport, onViewportChange }: UseViewportOptions = {}) {
  const [viewport, setViewport] = useState<Viewport>(initialViewport ?? DEFAULT_VIEWPORT)

  const onViewportChangeRef = useRef(onViewportChange)
  const isExternalUpdateRef = useRef(false)
  const isInitialMountRef = useRef(true)
  const viewportRef = useRef(viewport)
  const initialViewportRef = useRef(initialViewport)

  // Keep callback ref in sync (stable reference)
  useEffect(() => {
    onViewportChangeRef.current = onViewportChange
  }, [onViewportChange])

  // Keep viewport ref in sync for external access
  useEffect(() => {
    viewportRef.current = viewport
  }, [viewport])

  // Update viewport when initialViewport changes (e.g., when file is opened)
  // Only trigger if the object reference or values actually changed
  useEffect(() => {
    if (initialViewport && initialViewport !== initialViewportRef.current) {
      const hasChanged =
        initialViewport.x !== viewport.x ||
        initialViewport.y !== viewport.y ||
        initialViewport.zoom !== viewport.zoom

      if (hasChanged) {
        isExternalUpdateRef.current = true
        setViewport(initialViewport)
        initialViewportRef.current = initialViewport
      }
    }
  }, [initialViewport, viewport])

  // Notify parent when viewport changes (only for internal changes)
  useEffect(() => {
    // Skip notification on initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      return
    }

    // Skip notification if this was an external update
    if (isExternalUpdateRef.current) {
      isExternalUpdateRef.current = false
      return
    }

    // Notify parent of internal changes
    onViewportChangeRef.current?.(viewport)
  }, [viewport])

  // Stable updater function
  const updateViewport = useCallback((newViewport: Viewport | ((prev: Viewport) => Viewport)) => {
    setViewport(newViewport)
  }, [])

  return {
    viewport,
    setViewport: updateViewport,
    viewportRef, // For external access to current value without causing re-renders
  }
}
