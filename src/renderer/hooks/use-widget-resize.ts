import { useState, useCallback, useRef } from 'react'

export type ResizeHandle = 'se' | 's' | 'e' | 'sw' | 'w' | 'nw' | 'n' | 'ne'

interface UseWidgetResizeOptions {
  objectId: string
  width: number
  height: number
  zoom: number
  minWidth?: number
  minHeight?: number
  lockAspectRatio?: boolean
  onUpdate: (
    id: string,
    updates: { width: number; height: number },
    options?: { skipSave?: boolean }
  ) => void
  onResizeStart?: () => void // Callback when resize starts
  onResizeEnd?: (width: number, height: number) => void // Callback when resize ends
}

/**
 * Reusable hook for handling widget resize operations
 * Supports all 8 resize handles (corners + sides)
 * Can lock aspect ratio if needed
 *
 * Performance optimized: Only updates database ONCE when resize completes
 */
export function useWidgetResize({
  objectId,
  width,
  height,
  zoom,
  minWidth = 50,
  minHeight = 50,
  lockAspectRatio = false,
  onUpdate,
  onResizeStart,
  onResizeEnd,
}: UseWidgetResizeOptions) {
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null)

  // Use ref to track the latest size during resize (avoids stale closure)
  const finalSizeRef = useRef<{ width: number; height: number } | null>(null)

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      e.preventDefault()
      e.stopPropagation()

      setIsResizing(true)
      setResizeHandle(handle)
      finalSizeRef.current = null

      // Notify parent that manual resize started
      onResizeStart?.()

      const startX = e.clientX
      const startY = e.clientY
      const startWidth = width
      const startHeight = height
      const aspectRatio = startWidth / startHeight

      const handleResizeMove = (moveEvent: MouseEvent) => {
        const deltaX = (moveEvent.clientX - startX) / zoom
        const deltaY = (moveEvent.clientY - startY) / zoom

        let newWidth = startWidth
        let newHeight = startHeight

        // Calculate based on handle position
        if (handle.includes('e'))
          newWidth = Math.max(minWidth, startWidth + deltaX)
        if (handle.includes('w'))
          newWidth = Math.max(minWidth, startWidth - deltaX)
        if (handle.includes('s'))
          newHeight = Math.max(minHeight, startHeight + deltaY)
        if (handle.includes('n'))
          newHeight = Math.max(minHeight, startHeight - deltaY)

        // Lock aspect ratio if needed (useful for images)
        if (lockAspectRatio) {
          if (handle.includes('e') || handle.includes('w')) {
            newHeight = newWidth / aspectRatio
          } else {
            newWidth = newHeight * aspectRatio
          }
        }

        const newSize = { width: newWidth, height: newHeight }

        // Update object state immediately for LIVE visual feedback
        // Skip database save during drag (only save once at the end)
        onUpdate(objectId, newSize, { skipSave: true })
        finalSizeRef.current = newSize
      }

      const handleResizeEnd = () => {
        setIsResizing(false)
        setResizeHandle(null)

        // NOW persist the final size to database
        // The onResizeEnd callback will trigger database save
        if (finalSizeRef.current) {
          onResizeEnd?.(finalSizeRef.current.width, finalSizeRef.current.height)
        }

        finalSizeRef.current = null

        document.removeEventListener('mousemove', handleResizeMove)
        document.removeEventListener('mouseup', handleResizeEnd)
      }

      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)
    },
    [
      objectId,
      width,
      height,
      zoom,
      minWidth,
      minHeight,
      lockAspectRatio,
      onUpdate,
      onResizeStart,
      onResizeEnd,
    ]
  )

  return {
    isResizing,
    resizeHandle,
    handleResizeStart,
  }
}
