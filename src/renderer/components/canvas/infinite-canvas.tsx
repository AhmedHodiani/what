import { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import type { Viewport, ImageObject } from 'lib/types/canvas'
import { sanitizeViewport } from 'lib/types/canvas-validators'
import { useContainerSize } from 'renderer/hooks/use-container-size'
import { useViewport } from 'renderer/hooks/use-viewport'
import { useCanvasPan } from 'renderer/hooks/use-canvas-pan'
import { useCanvasZoom } from 'renderer/hooks/use-canvas-zoom'
import { useClipboardPaste } from 'renderer/hooks/use-clipboard-paste'
import { CanvasGrid } from './canvas-grid'
import { CanvasViewportDisplay } from './canvas-viewport-display'
import { ImageWidget } from './image-widget'

interface InfiniteCanvasProps {
  initialViewport?: Viewport
  minZoom?: number
  maxZoom?: number
  onViewportChange?: (viewport: Viewport) => void
  showViewportInfo?: boolean
  showGrid?: boolean
  children?: React.ReactNode
}

/**
 * InfiniteCanvas - A zoomable, pannable SVG canvas component.
 * 
 * Features:
 * - Pan with left-click drag
 * - Zoom with mouse wheel (towards cursor)
 * - Responsive to container size changes
 * - Optional grid and viewport display
 * 
 * @example
 * ```tsx
 * <InfiniteCanvas
 *   initialViewport={{ x: 0, y: 0, zoom: 1 }}
 *   onViewportChange={(viewport) => saveViewport(viewport)}
 * >
 *   <circle cx={0} cy={0} r={50} fill="teal" />
 * </InfiniteCanvas>
 * ```
 */
export function InfiniteCanvas({
  initialViewport,
  minZoom = 0.1,
  maxZoom = 5,
  onViewportChange,
  showViewportInfo = true,
  showGrid = true,
  children,
}: InfiniteCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [objects, setObjects] = useState<ImageObject[]>([])
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null)
  const [_isLoading, setIsLoading] = useState(true)

  // Load objects from database on mount
  useEffect(() => {
    const loadObjects = async () => {
      try {
        const loadedObjects = await window.App.file.getObjects()
        console.log('Loaded objects from database:', loadedObjects)
        
        // Load asset data URLs for each image object
        const objectsWithUrls = await Promise.all(
          loadedObjects.map(async (obj: any) => {
            if (obj.type === 'image') {
              const dataUrl = await window.App.file.getAssetDataUrl(obj.object_data.assetId)
              console.log(`Loaded data URL for object ${obj.id}:`, dataUrl ? 'success' : 'failed')
              return { ...obj, _imageUrl: dataUrl }
            }
            return obj
          })
        )
        
        console.log('Objects with URLs:', objectsWithUrls)
        setObjects(objectsWithUrls as ImageObject[])
      } catch (error) {
        console.error('Failed to load objects:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadObjects()
  }, [])

  // Sanitize initial viewport to ensure valid values
  const safeInitialViewport = useMemo(
    () => (initialViewport ? sanitizeViewport(initialViewport, minZoom, maxZoom) : undefined),
    [initialViewport, minZoom, maxZoom]
  )

  // Use our custom hooks for clean separation of concerns
  const { size: dimensions, ref: containerRef } = useContainerSize()
  const { viewport, setViewport } = useViewport({
    initialViewport: safeInitialViewport,
    onViewportChange,
  })

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    
    const halfWidth = dimensions.width / (2 * viewport.zoom)
    const halfHeight = dimensions.height / (2 * viewport.zoom)
    
    const relativeX = screenX - rect.left
    const relativeY = screenY - rect.top
    
    const worldX = viewport.x - halfWidth + (relativeX / viewport.zoom)
    const worldY = viewport.y - halfHeight + (relativeY / viewport.zoom)
    
    return { x: worldX, y: worldY }
  }, [containerRef, dimensions, viewport])

  // Handle clipboard paste
  const handleImagePaste = useCallback(async (image: { file: File; dataUrl: string; width: number; height: number }, mousePosition?: { x: number; y: number }) => {
    try {
      // Convert data URL to buffer
      const base64 = image.dataUrl.split(',')[1]
      const binaryString = atob(base64)
      const buffer = new ArrayBuffer(binaryString.length)
      const view = new Uint8Array(buffer)
      for (let i = 0; i < binaryString.length; i++) {
        view[i] = binaryString.charCodeAt(i)
      }
      
      // Save asset
      const assetId = await window.App.file.saveAsset(
        `image-${Date.now()}.png`,
        buffer,
        'image/png'
      )
      
      // Get asset as data URL for display
      const assetDataUrl = await window.App.file.getAssetDataUrl(assetId)
      if (!assetDataUrl) {
        throw new Error('Failed to retrieve asset data URL')
      }
      
      // Get world position (use mouse position if available, otherwise center)
      const worldPos = mousePosition 
        ? screenToWorld(mousePosition.x, mousePosition.y)
        : screenToWorld(dimensions.width / 2, dimensions.height / 2)
      
      // Create image object with data URL
      const newImage: ImageObject & { _imageUrl?: string } = {
        id: `img-${Date.now()}`,
        type: 'image',
        x: worldPos.x - image.width / 2,
        y: worldPos.y - image.height / 2,
        width: image.width,
        height: image.height,
        z_index: objects.length,
        object_data: {
          assetId,
          originalWidth: image.width,
          originalHeight: image.height,
        },
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        _imageUrl: assetDataUrl, // Store data URL for immediate display
      }
      
      setObjects(prev => [...prev, newImage])
      setSelectedObjectId(newImage.id)
      
      // Save to database (without _imageUrl which is not in schema)
      const { _imageUrl, ...objectToSave } = newImage
      await window.App.file.saveObject(objectToSave)
    } catch (error) {
      console.error('Failed to paste image:', error)
    }
  }, [dimensions, screenToWorld, objects.length])

  useClipboardPaste({ onImagePaste: handleImagePaste })

  // Object management callbacks
  const handleUpdateObject = useCallback(async (id: string, updates: Partial<ImageObject>) => {
    const updatedObject = { ...updates, id, updated: new Date().toISOString() }
    
    setObjects(prev => prev.map(obj => 
      obj.id === id ? { ...obj, ...updatedObject } : obj
    ))
    
    // Save to database
    try {
      await window.App.file.saveObject(updatedObject)
    } catch (error) {
      console.error('Failed to save object update:', error)
    }
  }, [])

  const handleSelectObject = useCallback((id: string) => {
    setSelectedObjectId(id)
  }, [])

  const handleContextMenu = useCallback((event: React.MouseEvent, id: string) => {
    // TODO: Show context menu for object
    console.log('Context menu for object:', id, event)
  }, [])

  const getImageUrl = useCallback((assetId: string) => {
    // Find object with this asset and return cached URL
    const obj = objects.find(o => o.object_data.assetId === assetId) as (ImageObject & { _imageUrl?: string }) | undefined
    return obj?._imageUrl || ''
  }, [objects])

  // Handle object dragging
  const handleStartDrag = useCallback((e: React.MouseEvent, objectId: string) => {
    e.stopPropagation() // Stop canvas pan from triggering
    
    const object = objects.find(o => o.id === objectId)
    if (!object) return

    const startWorldPos = screenToWorld(e.clientX, e.clientY)
    const startObjectX = object.x
    const startObjectY = object.y
    let finalX = startObjectX
    let finalY = startObjectY

    const handleDragMove = (moveEvent: MouseEvent) => {
      const currentWorldPos = screenToWorld(moveEvent.clientX, moveEvent.clientY)
      const deltaX = currentWorldPos.x - startWorldPos.x
      const deltaY = currentWorldPos.y - startWorldPos.y

      finalX = startObjectX + deltaX
      finalY = startObjectY + deltaY

      setObjects(prev => prev.map(obj =>
        obj.id === objectId
          ? { ...obj, x: finalX, y: finalY, updated: new Date().toISOString() }
          : obj
      ))
    }

    const handleDragEnd = async () => {
      document.removeEventListener('mousemove', handleDragMove)
      document.removeEventListener('mouseup', handleDragEnd)
      
      // Get the full updated object from state and save to database
      setObjects(prev => {
        const updatedObject = prev.find(obj => obj.id === objectId)
        if (updatedObject) {
          // Save to database (exclude _imageUrl)
          const { _imageUrl, ...objectToSave } = updatedObject as ImageObject & { _imageUrl?: string }
          window.App.file.saveObject({
            ...objectToSave,
            x: finalX,
            y: finalY,
            updated: new Date().toISOString()
          }).then(() => {
            console.log(`Saved object ${objectId} position: (${finalX}, ${finalY})`)
          }).catch(error => {
            console.error('Failed to save object position:', error)
          })
        }
        return prev
      })
    }

    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('mouseup', handleDragEnd)
  }, [objects, screenToWorld])

  // Handle canvas click (deselect objects)
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Only deselect if clicking on the canvas itself, not on an object
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg') {
      setSelectedObjectId(null)
    }
  }, [])

  // Handle panning - use functional update to always get latest viewport
  const { handleMouseDown } = useCanvasPan(containerRef, (deltaX, deltaY) => {
    setViewport((prev) => ({
      x: prev.x - deltaX / prev.zoom,
      y: prev.y - deltaY / prev.zoom,
      zoom: prev.zoom,
    }))
  })

  // Handle zooming
  useCanvasZoom({
    containerRef,
    viewport,
    dimensions,
    minZoom,
    maxZoom,
    onZoom: setViewport,
  })

  // Calculate SVG viewBox for viewport transformation
  // Memoize to avoid recalculating on every render
  const viewBox = useMemo(() => {
    const halfWidth = dimensions.width / (2 * viewport.zoom)
    const halfHeight = dimensions.height / (2 * viewport.zoom)
    return `${viewport.x - halfWidth} ${viewport.y - halfHeight} ${
      dimensions.width / viewport.zoom
    } ${dimensions.height / viewport.zoom}`
  }, [viewport, dimensions])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-[#0a0a0a] cursor-grab select-none active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onClick={handleCanvasClick}
    >
      <svg
        ref={svgRef}
        className="block w-full h-full"
        width={dimensions.width}
        height={dimensions.height}
        viewBox={viewBox}
      >
        {/* Grid pattern */}
        {showGrid && <CanvasGrid viewport={viewport} dimensions={dimensions} />}

        {/* Canvas content */}
        {children}
        
        {/* Render image objects */}
        {objects.map(obj => (
          <foreignObject
            key={obj.id}
            x={obj.x}
            y={obj.y}
            width={obj.width}
            height={obj.height}
          >
            <ImageWidget
              image={obj}
              isSelected={selectedObjectId === obj.id}
              zoom={viewport.zoom}
              onUpdate={handleUpdateObject}
              onSelect={handleSelectObject}
              onContextMenu={handleContextMenu}
              onStartDrag={handleStartDrag}
              getImageUrl={getImageUrl}
            />
          </foreignObject>
        ))}
      </svg>

      {/* Viewport info overlay */}
      {showViewportInfo && <CanvasViewportDisplay viewport={viewport} />}
    </div>
  )
}
