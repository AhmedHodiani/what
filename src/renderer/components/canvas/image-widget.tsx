import { useState, useRef, useCallback } from 'react'
import type { ImageObject } from 'lib/types/canvas'

interface ImageWidgetProps {
  image: ImageObject
  isSelected: boolean
  zoom: number
  onUpdate: (id: string, updates: Partial<ImageObject>) => void
  onSelect: (id: string) => void
  onContextMenu: (event: React.MouseEvent, id: string) => void
  onStartDrag?: (e: React.MouseEvent, id: string) => void
  getImageUrl: (assetId: string) => string
}

type ResizeHandle = 'se' | 's' | 'e' | null

export function ImageWidget({
  image,
  isSelected,
  zoom,
  onUpdate,
  onSelect,
  onContextMenu,
  onStartDrag,
  getImageUrl,
}: ImageWidgetProps) {
  const [isResizing, setIsResizing] = useState(false)
  const [_resizeHandle, setResizeHandle] = useState<ResizeHandle>(null)
  const imageRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Check if this is a resize handle click
    const target = e.target as HTMLElement
    if (target.classList.contains('resize-handle')) {
      return // Let resize handles handle their own events
    }
    
    // Stop propagation to prevent canvas pan
    e.stopPropagation()
    
    if (!isResizing) {
      // Select the image first
      onSelect(image.id)
      
      // If we have a drag handler, start dragging
      if (onStartDrag) {
        onStartDrag(e, image.id)
      }
    }
  }, [isResizing, onSelect, onStartDrag, image.id])

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Check if this is a resize handle click
    const target = e.target as HTMLElement
    if (target.classList.contains('resize-handle')) {
      return // Let resize handles handle their own events
    }
    
    if (!isResizing) {
      e.stopPropagation()
      onSelect(image.id)
    }
  }, [isResizing, onSelect, image.id])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onContextMenu(e, image.id)
  }, [onContextMenu, image.id])

  const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsResizing(true)
    setResizeHandle(handle)
    
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = image.width
    const startHeight = image.height
    
    const handleResizeMove = (moveEvent: MouseEvent) => {
      // Calculate delta in screen coordinates, then adjust for zoom
      const deltaX = (moveEvent.clientX - startX) / zoom
      const deltaY = (moveEvent.clientY - startY) / zoom

      let newWidth = startWidth
      let newHeight = startHeight

      // Calculate new dimensions based on handle
      if (handle === 'se') {
        newWidth = Math.max(100, startWidth + deltaX)
        newHeight = Math.max(100, startHeight + deltaY)
      } else if (handle === 's') {
        newHeight = Math.max(100, startHeight + deltaY)
      } else if (handle === 'e') {
        newWidth = Math.max(100, startWidth + deltaX)
      }

      // Update the image dimensions immediately for real-time feedback
      onUpdate(image.id, {
        width: newWidth,
        height: newHeight,
      })
    }

    const handleResizeEnd = () => {
      setIsResizing(false)
      setResizeHandle(null)
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
    }

    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)
  }, [image.id, image.width, image.height, zoom, onUpdate])

  // Get image URL from asset
  const imageUrl = getImageUrl(image.object_data.assetId)

  return (
    <div
      ref={imageRef}
      className={`
        relative select-none rounded overflow-visible
        ${isSelected ? 'border-2 border-dashed border-[#007acc] cursor-move' : 'border-2 border-gray-300 cursor-grab'}
        ${isResizing ? 'shadow-[0_0_15px_rgba(0,122,204,0.6)] cursor-grabbing' : ''}
      `}
      style={{
        width: `${image.width}px`,
        height: `${image.height}px`,
        zIndex: image.z_index,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Image content */}
      <div 
        className="w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
        }}
      />
      
      {/* Resize handles when selected */}
      {isSelected && (
        <>
          {/* SE handle */}
          <div 
            className="resize-handle absolute w-5 h-5 bg-[#007acc] border-2 border-white rounded-sm shadow-md cursor-se-resize hover:bg-[#005999] hover:scale-110 z-[1000]"
            style={{ bottom: '-10px', right: '-10px', pointerEvents: 'all' }}
            onMouseDown={(e) => handleResizeStart(e, 'se')}
          />
          {/* S handle */}
          <div 
            className="resize-handle absolute w-5 h-5 bg-[#007acc] border-2 border-white rounded-sm shadow-md cursor-s-resize hover:bg-[#005999] hover:scale-110 z-[1000]"
            style={{ bottom: '-10px', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'all' }}
            onMouseDown={(e) => handleResizeStart(e, 's')}
          />
          {/* E handle */}
          <div 
            className="resize-handle absolute w-5 h-5 bg-[#007acc] border-2 border-white rounded-sm shadow-md cursor-e-resize hover:bg-[#005999] hover:scale-110 z-[1000]"
            style={{ right: '-10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'all' }}
            onMouseDown={(e) => handleResizeStart(e, 'e')}
          />
        </>
      )}
    </div>
  )
}
