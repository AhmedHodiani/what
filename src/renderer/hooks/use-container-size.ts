import { useState, useEffect, useRef, useCallback } from 'react'

interface Size {
  width: number
  height: number
}

/**
 * Hook that observes container size changes using ResizeObserver.
 * Perfect for tracking FlexLayout container resizing.
 * 
 * @param defaultSize - Fallback size before container is measured
 * @returns Object containing current size and ref to attach to container
 */
export function useContainerSize(defaultSize: Size = { width: 800, height: 600 }): {
  size: Size
  ref: React.RefObject<HTMLDivElement | null>
} {
  const [size, setSize] = useState<Size>(defaultSize)
  const ref = useRef<HTMLDivElement>(null)
  const observerRef = useRef<ResizeObserver | null>(null)

  const updateSize = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      // Only update if size actually changed (avoid unnecessary re-renders)
      setSize(prevSize => {
        if (prevSize.width === rect.width && prevSize.height === rect.height) {
          return prevSize
        }
        return { width: rect.width, height: rect.height }
      })
    }
  }, [])

  useEffect(() => {
    // Initial size measurement
    updateSize()

    // Create ResizeObserver
    observerRef.current = new ResizeObserver(() => {
      updateSize()
    })

    // Start observing if ref is available
    const element = ref.current
    if (element) {
      observerRef.current.observe(element)
    }

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [updateSize])

  return { size, ref }
}
