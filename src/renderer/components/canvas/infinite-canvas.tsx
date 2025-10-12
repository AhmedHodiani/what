import { useRef, useMemo, useCallback } from 'react'
import type { Viewport, DrawingObject } from 'lib/types/canvas'
import { sanitizeViewport } from 'lib/types/canvas-validators'
import { useContainerSize } from 'renderer/hooks/use-container-size'
import { useViewport } from 'renderer/hooks/use-viewport'
import { useCanvasPan } from 'renderer/hooks/use-canvas-pan'
import { useCanvasZoom } from 'renderer/hooks/use-canvas-zoom'
import { useClipboardPaste } from 'renderer/hooks/use-clipboard-paste'
import { useCanvasObjects } from 'renderer/hooks/use-canvas-objects'
import { ErrorBoundary } from '../error-boundary'
import { CanvasGrid } from './canvas-grid'
import { CanvasViewportDisplay } from './canvas-viewport-display'
import { CanvasObject } from './canvas-object'

interface InfiniteCanvasProps {
  initialViewport?: Viewport
  minZoom?: number
  maxZoom?: number
  onViewportChange?: (viewport: Viewport) => void
  showViewportInfo?: boolean
  showGrid?: boolean
  tabId?: string | null
  isActive?: boolean // Whether this canvas is the active tab
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
  tabId,
  isActive = true, // Default to true for backwards compatibility
  children,
}: InfiniteCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  // Use generic canvas objects hook
  const {
    objects,
    selectedObjectId,
    addObject,
    updateObject,
    selectObject,
    moveObject,
    saveObjectPosition,
  } = useCanvasObjects({ tabId: tabId || undefined })

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

    // Handle clipboard paste for images
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
        'image/png',
        tabId || undefined
      )
      
      // Get asset as data URL for display
      const assetDataUrl = await window.App.file.getAssetDataUrl(assetId, tabId || undefined)
      if (!assetDataUrl) {
        throw new Error('Failed to retrieve asset data URL')
      }
      
      // Get world position (use mouse position if available, otherwise center)
      const worldPos = mousePosition 
        ? screenToWorld(mousePosition.x, mousePosition.y)
        : screenToWorld(dimensions.width / 2, dimensions.height / 2)
      
      // Create image object with data URL
      const newImage: DrawingObject & { _imageUrl?: string } = {
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
      
      await addObject(newImage)
      selectObject(newImage.id)
    } catch (error) {
      console.error('Failed to paste image:', error)
    }
  }, [dimensions, screenToWorld, objects.length, addObject, selectObject, tabId])

  useClipboardPaste({ 
    onImagePaste: handleImagePaste, 
    enabled: isActive,
    containerRef, // Pass container ref for accurate mouse position tracking
  })

  // Object management callbacks - now using generic methods
  const handleUpdateObject = useCallback(async (id: string, updates: Partial<DrawingObject>) => {
    await updateObject(id, updates)
  }, [updateObject])

  const handleSelectObject = useCallback((id: string) => {
    selectObject(id)
  }, [selectObject])

  const handleContextMenu = useCallback((event: React.MouseEvent, id: string) => {
    // TODO: Show context menu for object
    console.log('Context menu for object:', id, event)
  }, [])

  // Handle object dragging - generic for all object types
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

      moveObject(objectId, finalX, finalY)
    }

    const handleDragEnd = async () => {
      document.removeEventListener('mousemove', handleDragMove)
      document.removeEventListener('mouseup', handleDragEnd)
      
      // Save final position to database
      await saveObjectPosition(objectId, finalX, finalY)
    }

    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('mouseup', handleDragEnd)
  }, [objects, screenToWorld, moveObject, saveObjectPosition])

  // Handle canvas click (deselect objects when clicking on background)
  const handleCanvasBackgroundClick = useCallback((e: React.MouseEvent) => {
    // Check if we clicked on a widget (marked by widget-wrapper)
    if ((e as any)._clickedWidget) {
      return // Don't deselect if we clicked on a widget
    }
    
    // Otherwise, deselect (clicked on canvas background)
    selectObject(null)
  }, [selectObject])

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
    >
      <svg
        ref={svgRef}
        className="block w-full h-full"
        width={dimensions.width}
        height={dimensions.height}
        viewBox={viewBox}
        onClick={handleCanvasBackgroundClick}
      >
        {/* Grid pattern */}
        {showGrid && <CanvasGrid viewport={viewport} dimensions={dimensions} />}

        {/* Canvas content */}
        {children}
        
        {/* Render all drawing objects */}
        {objects.map(obj => {
          // Get width/height for foreignObject (freehand doesn't have explicit dimensions)
          const width = 'width' in obj ? obj.width : 100
          const height = 'height' in obj ? obj.height : 100
          
          return (
            <ErrorBoundary
              key={obj.id}
              fallback={(error) => (
                <text x={obj.x} y={obj.y} fill="#ff0000" fontSize="12">
                  ❌ Error rendering {obj.type}: {error.message}
                </text>
              )}
            >
              <foreignObject
                x={obj.x}
                y={obj.y}
                width={width}
                height={height}
              >
                <CanvasObject
                  object={obj}
                  isSelected={selectedObjectId === obj.id}
                  zoom={viewport.zoom}
                  onUpdate={handleUpdateObject}
                  onSelect={handleSelectObject}
                  onContextMenu={handleContextMenu}
                  onStartDrag={handleStartDrag}
                />
              </foreignObject>
            </ErrorBoundary>
          )
        })}
      </svg>

      {/* Viewport info overlay */}
      {showViewportInfo && <CanvasViewportDisplay viewport={viewport} />}
    </div>
  )
}
