import { useState, useCallback } from 'react'

export type ResizeHandle = 'se' | 's' | 'e' | 'sw' | 'w' | 'nw' | 'n' | 'ne'

interface UseWidgetResizeOptions {
  objectId: string
  width: number
  height: number
  zoom: number
  minWidth?: number
  minHeight?: number
  lockAspectRatio?: boolean
  onUpdate: (id: string, updates: { width: number; height: number }) => void
}

/**
 * Reusable hook for handling widget resize operations
 * Supports all 8 resize handles (corners + sides)
 * Can lock aspect ratio if needed
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
}: UseWidgetResizeOptions) {
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null)

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      e.preventDefault()
      e.stopPropagation()

      setIsResizing(true)
      setResizeHandle(handle)

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
        if (handle.includes('e')) newWidth = Math.max(minWidth, startWidth + deltaX)
        if (handle.includes('w')) newWidth = Math.max(minWidth, startWidth - deltaX)
        if (handle.includes('s')) newHeight = Math.max(minHeight, startHeight + deltaY)
        if (handle.includes('n')) newHeight = Math.max(minHeight, startHeight - deltaY)

        // Lock aspect ratio if needed (useful for images)
        if (lockAspectRatio) {
          if (handle.includes('e') || handle.includes('w')) {
            newHeight = newWidth / aspectRatio
          } else {
            newWidth = newHeight * aspectRatio
          }
        }

        onUpdate(objectId, { width: newWidth, height: newHeight })
      }

      const handleResizeEnd = () => {
        setIsResizing(false)
        setResizeHandle(null)
        document.removeEventListener('mousemove', handleResizeMove)
        document.removeEventListener('mouseup', handleResizeEnd)
      }

      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)
    },
    [objectId, width, height, zoom, minWidth, minHeight, lockAspectRatio, onUpdate]
  )

  return {
    isResizing,
    resizeHandle,
    handleResizeStart,
  }
}
