import { useRef, useMemo, useCallback, useState, useEffect } from 'react'
import type {
  Viewport,
  DrawingObject,
  StickyNoteObject,
  FreehandObject,
  ArrowObject,
  YouTubeVideoObject,
  ShapeObject,
} from 'lib/types/canvas'
import { logger } from '../../../shared/logger'
import { sanitizeViewport } from 'lib/types/canvas-validators'
import { generateId } from 'lib/utils/id-generator'
import { useContainerSize } from 'renderer/hooks/use-container-size'
import { useViewport } from 'renderer/hooks/use-viewport'
import { useCanvasPan } from 'renderer/hooks/use-canvas-pan'
import { useCanvasZoom } from 'renderer/hooks/use-canvas-zoom'
import { useClipboardPaste } from 'renderer/hooks/use-clipboard-paste'
import { useCanvasObjects } from 'renderer/hooks/use-canvas-objects'
import { useFreehandDrawing } from 'renderer/hooks/use-freehand-drawing'
import { useArrowDrawing } from 'renderer/hooks/use-arrow-drawing'
import { ErrorBoundary } from '../error-boundary'
import { CanvasGrid } from './canvas-grid'
import { CanvasObject } from './canvas-object'
import { YouTubeUrlDialog } from './youtube-url-dialog'
import { ShapePickerDialog } from './shape-picker-dialog'
import type { ShapeType } from './shape-picker-dialog'
import { ContextMenu } from './context-menu'
import { ConfirmationDialog } from './confirmation-dialog'
import { useCanvasTool } from 'renderer/hooks/use-canvas-tool'
import { useShortcut, ShortcutContext } from 'renderer/shortcuts'
import { useActiveTab } from 'renderer/contexts'

interface InfiniteCanvasProps {
  initialViewport?: Viewport
  minZoom?: number
  maxZoom?: number
  onViewportChange?: (viewport: Viewport) => void
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
  showGrid = true,
  tabId,
  isActive = true, // Default to true for backwards compatibility
  children,
}: InfiniteCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  // Track active drag handlers for cleanup
  const activeDragHandlersRef = useRef<{
    handleDragMove?: (e: MouseEvent) => void
    handleDragEnd?: () => void
    trackMouseEvent?: (e: MouseEvent) => void
  }>({})

  // Tool selection
  const { currentTool, setTool } = useCanvasTool()

  // Active tab context for syncing state
  const { brushSettings, updateActiveTab } = useActiveTab()

  // YouTube dialog state
  const [showYouTubeDialog, setShowYouTubeDialog] = useState(false)
  const [youtubeDialogPosition, setYoutubeDialogPosition] = useState({
    x: 0,
    y: 0,
  })

  // Shape picker dialog state
  const [showShapeDialog, setShowShapeDialog] = useState(false)
  const [shapeDialogPosition, setShapeDialogPosition] = useState({ x: 0, y: 0 })

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    objectId: string
  } | null>(null)

  // Confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [objectToDelete, setObjectToDelete] = useState<
    string | 'multiple' | null
  >(null)

  // Rectangle selection state
  const [isRectangleSelecting, setIsRectangleSelecting] = useState(false)
  const [rectangleStart, setRectangleStart] = useState<{
    x: number
    y: number
  } | null>(null)
  const [rectangleEnd, setRectangleEnd] = useState<{
    x: number
    y: number
  } | null>(null)

  // Use generic canvas objects hook
  const {
    objects,
    selectedObjectIds,
    addObject,
    updateObject,
    deleteObject,
    selectObject,
    selectMultipleObjects,
    clearSelection,
    moveObject,
    saveObjectPosition,
  } = useCanvasObjects({ tabId: tabId || undefined })

  // Sanitize initial viewport to ensure valid values
  const safeInitialViewport = useMemo(
    () =>
      initialViewport
        ? sanitizeViewport(initialViewport, minZoom, maxZoom)
        : undefined,
    [initialViewport, minZoom, maxZoom]
  )

  // Use our custom hooks for clean separation of concerns
  const { size: dimensions, ref: containerRef } = useContainerSize()
  const { viewport, setViewport } = useViewport({
    initialViewport: safeInitialViewport,
    onViewportChange,
  })

  // Sync with ActiveTabContext when this canvas is active
  useEffect(() => {
    if (isActive && tabId) {
      updateActiveTab({
        tabId,
        viewport,
        selectedObjectIds,
        objects,
        updateObject, // Pass the updateObject function so properties panels can trigger saves
      })
    }
  }, [isActive, tabId, viewport, selectedObjectIds, objects, updateObject, updateActiveTab])

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return { x: 0, y: 0 }

      const halfWidth = dimensions.width / (2 * viewport.zoom)
      const halfHeight = dimensions.height / (2 * viewport.zoom)

      const relativeX = screenX - rect.left
      const relativeY = screenY - rect.top

      const worldX = viewport.x - halfWidth + relativeX / viewport.zoom
      const worldY = viewport.y - halfHeight + relativeY / viewport.zoom

      return { x: worldX, y: worldY }
    },
    [containerRef, dimensions, viewport]
  )

  // Freehand drawing
  const {
    isDrawing: isFreehandDrawing,
    currentPath: freehandPath,
    handleDrawStart: handleFreehandStart,
    handleDrawMove: handleFreehandMove,
    handleDrawEnd: handleFreehandEnd,
  } = useFreehandDrawing({
    isEnabled: currentTool === 'freehand',
    screenToWorld,
    strokeColor: brushSettings.strokeColor,
    strokeWidth: brushSettings.strokeWidth,
    opacity: brushSettings.opacity,
    onComplete: useCallback(
      async (freehandObject: FreehandObject) => {
        await addObject(freehandObject)
        // Don't select after drawing - keep drawing mode active
      },
      [addObject]
    ),
  })

  // Arrow drawing
  const {
    isDrawing: isArrowDrawing,
    currentPath: arrowPath,
    handleDrawStart: handleArrowStart,
    handleDrawMove: handleArrowMove,
    handleDrawEnd: handleArrowEnd,
  } = useArrowDrawing({
    isEnabled: currentTool === 'arrow',
    screenToWorld,
    strokeColor: brushSettings.strokeColor,
    strokeWidth: brushSettings.strokeWidth,
    opacity: brushSettings.opacity,
    onComplete: useCallback(
      async (arrowObject: ArrowObject) => {
        await addObject(arrowObject)
        // Don't select after drawing - keep drawing mode active
      },
      [addObject]
    ),
  })

  // Handle clipboard paste for images
  const handleImagePaste = useCallback(
    async (
      image: { file: File; dataUrl: string; width: number; height: number },
      mousePosition?: { x: number; y: number }
    ) => {
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
        const assetDataUrl = await window.App.file.getAssetDataUrl(
          assetId,
          tabId || undefined
        )
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
        logger.error('Failed to paste image:', error)
      }
    },
    [dimensions, screenToWorld, objects.length, addObject, selectObject, tabId]
  )

  useClipboardPaste({
    onImagePaste: handleImagePaste,
    enabled: isActive,
    containerRef, // Pass container ref for accurate mouse position tracking
  })

  // Object management callbacks - now using generic methods
  const handleUpdateObject = useCallback(
    async (
      id: string,
      updates: Partial<DrawingObject>,
      options?: { skipSave?: boolean }
    ) => {
      await updateObject(id, updates, options)
    },
    [updateObject]
  )

  const handleSelectObject = useCallback(
    (id: string, event?: React.MouseEvent) => {
      const isCtrlPressed = event ? event.ctrlKey || event.metaKey : false
      selectObject(id, isCtrlPressed)
    },
    [selectObject]
  )

  const handleContextMenu = useCallback(
    (event: React.MouseEvent, id: string) => {
      event.preventDefault()
      event.stopPropagation()

      // If the right-clicked object is not in the current selection, select only it
      // If it's already selected as part of multi-selection, keep the multi-selection
      if (!selectedObjectIds.includes(id)) {
        selectObject(id)
      }

      // Show context menu at mouse position
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        objectId: id,
      })
    },
    [selectedObjectIds, selectObject]
  )

  // Handle object dragging - generic for all object types
  const handleStartDrag = useCallback(
    (e: React.MouseEvent, objectId: string) => {
      e.stopPropagation() // Stop canvas pan from triggering

      const object = objects.find(o => o.id === objectId)
      if (!object) return

      // Check if the clicked object is in the current selection
      const isObjectSelected = selectedObjectIds.includes(objectId)
      let objectsToMove = selectedObjectIds

      if (!isObjectSelected) {
        // If not selected, select only this object
        objectsToMove = [objectId]
        selectObject(objectId)
      }

      // Store original positions for all objects that will be moved
      const originalPositions = new Map<string, { x: number; y: number }>()
      objects.forEach(obj => {
        if (objectsToMove.includes(obj.id)) {
          originalPositions.set(obj.id, { x: obj.x, y: obj.y })
        }
      })

      const startWorldPos = screenToWorld(e.clientX, e.clientY)

      const handleDragMove = (moveEvent: MouseEvent) => {
        const currentWorldPos = screenToWorld(
          moveEvent.clientX,
          moveEvent.clientY
        )
        const deltaX = currentWorldPos.x - startWorldPos.x
        const deltaY = currentWorldPos.y - startWorldPos.y

        // Move all selected objects by the same delta
        objectsToMove.forEach(objId => {
          const originalPos = originalPositions.get(objId)
          if (originalPos) {
            const finalX = originalPos.x + deltaX
            const finalY = originalPos.y + deltaY
            moveObject(objId, finalX, finalY)
          }
        })
      }

      const handleDragEnd = async () => {
        document.removeEventListener('mousemove', handleDragMove)
        document.removeEventListener('mouseup', handleDragEnd)
        document.removeEventListener('mousemove', trackMouseEvent)

        // Clear from active handlers
        activeDragHandlersRef.current = {}

        // Save final positions to database for all moved objects
        const currentWorldPos = screenToWorld(
          (window as any).lastMouseEvent?.clientX || e.clientX,
          (window as any).lastMouseEvent?.clientY || e.clientY
        )
        const deltaX = currentWorldPos.x - startWorldPos.x
        const deltaY = currentWorldPos.y - startWorldPos.y

        // Save all object positions
        for (const objId of objectsToMove) {
          const originalPos = originalPositions.get(objId)
          if (originalPos) {
            const finalX = originalPos.x + deltaX
            const finalY = originalPos.y + deltaY
            await saveObjectPosition(objId, finalX, finalY)
          }
        }
      }

      // Track last mouse event for saving positions
      const trackMouseEvent = (e: MouseEvent) => {
        ;(window as any).lastMouseEvent = e
      }

      // Store handlers for cleanup
      activeDragHandlersRef.current = {
        handleDragMove,
        handleDragEnd,
        trackMouseEvent,
      }

      document.addEventListener('mousemove', trackMouseEvent)
      document.addEventListener('mousemove', handleDragMove)
      document.addEventListener('mouseup', handleDragEnd)
    },
    [
      objects,
      selectedObjectIds,
      screenToWorld,
      moveObject,
      saveObjectPosition,
      selectObject,
    ]
  )

  // Handle canvas click (deselect objects when clicking on background)
  const handleCanvasBackgroundClick = useCallback(
    async (e: React.MouseEvent) => {
      // Check if we clicked on a widget (marked by widget-wrapper)
      if ((e as any)._clickedWidget) {
        return // Don't deselect if we clicked on a widget
      }

      // If a creation tool is selected, create that object type
      if (currentTool !== 'select') {
        const worldPos = screenToWorld(e.clientX, e.clientY)

        switch (currentTool) {
          case 'sticky-note': {
            const stickyNote: StickyNoteObject = {
              id: generateId(),
              type: 'sticky-note',
              x: worldPos.x - 100, // Center the note
              y: worldPos.y - 100,
              width: 200,
              height: 200,
              z_index: objects.length,
              object_data: {
                text: '',
                paperColor: '#ffd700', // Classic yellow
                fontColor: '#333333',
                fontSize: 16,
                fontFamily: 'Kalam',
              },
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
            }
            await addObject(stickyNote)
            selectObject(stickyNote.id)
            setTool('select') // Switch back to select mode after creating
            break
          }

          case 'image': {
            // Capture mouse position for image placement
            const clickX = e.clientX
            const clickY = e.clientY

            // Open file picker for image
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.onchange = async event => {
              const file = (event.target as HTMLInputElement).files?.[0]
              if (!file) return

              try {
                // Read file as data URL
                const reader = new FileReader()
                reader.onload = async readerEvent => {
                  const dataUrl = readerEvent.target?.result as string

                  // Load image to get dimensions
                  const img = new Image()
                  img.onload = async () => {
                    await handleImagePaste(
                      {
                        file,
                        dataUrl,
                        width: img.width,
                        height: img.height,
                      },
                      { x: clickX, y: clickY }
                    )

                    setTool('select') // Switch back to select mode after creating
                  }
                  img.src = dataUrl
                }
                reader.readAsDataURL(file)
              } catch (error) {
                logger.error('Failed to load image:', error)
              }
            }
            input.click()
            break
          }

          case 'youtube': {
            const worldPos = screenToWorld(e.clientX, e.clientY)
            // Store position and show dialog
            setYoutubeDialogPosition({ x: worldPos.x, y: worldPos.y })
            setShowYouTubeDialog(true)
            break
          }

          case 'shape': {
            const worldPos = screenToWorld(e.clientX, e.clientY)
            // Store position and show shape picker dialog
            setShapeDialogPosition({ x: worldPos.x, y: worldPos.y })
            setShowShapeDialog(true)
            break
          }

          case 'emoji': {
            const worldPos = screenToWorld(e.clientX, e.clientY)
            const newEmoji = {
              id: `emoji_${Date.now()}`,
              type: 'emoji' as const,
              x: worldPos.x - 40, // Center horizontally (80px / 2)
              y: worldPos.y - 40, // Center vertically (80px / 2)
              width: 80,
              height: 80,
              z_index: objects.length,
              object_data: {
                emoji: '😀', // Default emoji
              },
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
            }
            await addObject(newEmoji)
            selectObject(newEmoji.id)
            setTool('select')
            break
          }

          // TODO: Add other object types
        }
        return
      }

      // Otherwise, deselect (clicked on canvas background)
      selectObject(null)
    },
    [
      currentTool,
      screenToWorld,
      objects.length,
      addObject,
      selectObject,
      setTool,
      handleImagePaste,
    ]
  )

  // Handle panning - use functional update to always get latest viewport
  const { handleMouseDown } = useCanvasPan(containerRef, (deltaX, deltaY) => {
    setViewport(prev => ({
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

  // YouTube dialog handlers
  const handleYouTubeConfirm = useCallback(
    async (url: string, videoId: string) => {
      const youtubeVideo: YouTubeVideoObject = {
        id: generateId(),
        type: 'youtube',
        x: youtubeDialogPosition.x - 280, // Center the video
        y: youtubeDialogPosition.y - 158,
        width: 560,
        height: 315, // 16:9 aspect ratio
        z_index: objects.length,
        object_data: {
          videoUrl: url,
          videoId: videoId,
          title: `Video ${videoId}`,
        },
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      }
      await addObject(youtubeVideo)
      selectObject(youtubeVideo.id)
      setShowYouTubeDialog(false)
      setTool('select')
    },
    [youtubeDialogPosition, objects.length, addObject, selectObject, setTool]
  )

  const handleYouTubeCancel = useCallback(() => {
    setShowYouTubeDialog(false)
    setTool('select')
  }, [setTool])

  // Shape picker dialog handlers
  const handleShapeSelect = useCallback(
    async (shapeType: ShapeType) => {
      const shape: ShapeObject = {
        id: generateId(),
        type: 'shape',
        x: shapeDialogPosition.x - 100, // Center the shape
        y: shapeDialogPosition.y - 100,
        width: 200,
        height: 200,
        z_index: objects.length,
        object_data: {
          shapeType: shapeType,
          fill: '#3b82f6',
          stroke: '#1e40af',
          strokeWidth: 2,
          cornerRadius: 0,
          points: shapeType === 'star' ? 5 : 6,
          rotation: 0,
          opacity: 1,
        },
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      }
      await addObject(shape)
      selectObject(shape.id)
      setShowShapeDialog(false)
      setTool('select')
    },
    [shapeDialogPosition, objects.length, addObject, selectObject, setTool]
  )

  const handleShapeCancel = useCallback(() => {
    setShowShapeDialog(false)
    setTool('select')
  }, [setTool])

  // Delete handlers
  const handleDeleteClick = useCallback(() => {
    if (contextMenu) {
      // If the right-clicked object is part of multi-selection, delete all selected objects
      if (
        selectedObjectIds.includes(contextMenu.objectId) &&
        selectedObjectIds.length > 1
      ) {
        setObjectToDelete('multiple')
      } else {
        setObjectToDelete(contextMenu.objectId)
      }
      setShowDeleteConfirmation(true)
      setContextMenu(null)
    }
  }, [contextMenu, selectedObjectIds])

  const handleDeleteConfirm = useCallback(async () => {
    if (objectToDelete === 'multiple') {
      // Delete all selected objects
      for (const id of selectedObjectIds) {
        await deleteObject(id)
      }
      clearSelection()
    } else if (objectToDelete) {
      // Delete single object
      await deleteObject(objectToDelete)
    }
    setShowDeleteConfirmation(false)
    setObjectToDelete(null)
  }, [objectToDelete, selectedObjectIds, deleteObject, clearSelection])

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirmation(false)
    setObjectToDelete(null)
  }, [])

  // Refs for shortcuts (prevent re-registration)
  const selectedObjectIdsRef = useRef(selectedObjectIds)
  const isActiveRef = useRef(isActive)

  useEffect(() => {
    selectedObjectIdsRef.current = selectedObjectIds
    isActiveRef.current = isActive
  }, [selectedObjectIds, isActive])

  // Canvas shortcut: Delete selected objects
  const handleDeleteShortcut = useCallback(() => {
    const ids = selectedObjectIdsRef.current
    const active = isActiveRef.current

    if (ids.length === 0 || !active) return

    // For single selection, use the ID. For multiple, use 'multiple' marker
    setObjectToDelete(ids.length === 1 ? ids[0] : 'multiple')
    setShowDeleteConfirmation(true)
  }, [])

  // Register Delete key shortcut (only once!)
  useShortcut(
    {
      key: 'delete',
      context: ShortcutContext.Canvas,
      action: handleDeleteShortcut,
      description: 'Delete selected objects',
      enabled: () =>
        selectedObjectIdsRef.current.length > 0 && isActiveRef.current,
    },
    [handleDeleteShortcut]
  )

  // Register Backspace key shortcut (alternative delete)
  useShortcut(
    {
      key: 'backspace',
      context: ShortcutContext.Canvas,
      action: handleDeleteShortcut,
      description: 'Delete selected objects',
      enabled: () =>
        selectedObjectIdsRef.current.length > 0 && isActiveRef.current,
    },
    [handleDeleteShortcut]
  )

  // Cleanup drag handlers on unmount to prevent stale event listeners
  useEffect(() => {
    return () => {
      const handlers = activeDragHandlersRef.current
      if (handlers.handleDragMove) {
        document.removeEventListener('mousemove', handlers.handleDragMove)
      }
      if (handlers.handleDragEnd) {
        document.removeEventListener('mouseup', handlers.handleDragEnd)
      }
      if (handlers.trackMouseEvent) {
        document.removeEventListener('mousemove', handlers.trackMouseEvent)
      }
      activeDragHandlersRef.current = {}
    }
  }, [])

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[#0a0a0a] select-none"
      onMouseDown={handleMouseDown}
      ref={containerRef}
      style={{
        cursor:
          currentTool === 'freehand' || currentTool === 'arrow'
            ? 'crosshair'
            : isFreehandDrawing || isArrowDrawing
              ? 'grabbing'
              : 'grab',
      }}
    >
      <svg
        className="block w-full h-full"
        height={dimensions.height}
        onClick={handleCanvasBackgroundClick}
        onContextMenu={e => {
          // Handle right-click for rectangle selection on canvas background
          const clickedOnWidget = (e as any)._clickedWidget
          if (!clickedOnWidget) {
            e.preventDefault()
            e.stopPropagation()
            const point = screenToWorld(e.clientX, e.clientY)
            logger.debug(
              'Right-click on canvas - starting rectangle selection',
              point
            )
            setIsRectangleSelecting(true)
            setRectangleStart(point)
            setRectangleEnd(point)
            setContextMenu(null) // Close any existing context menu
          }
        }}
        onMouseDown={e => {
          // Handle freehand drawing
          if (currentTool === 'freehand') {
            e.stopPropagation()
            const started = handleFreehandStart(
              e,
              containerRef as React.RefObject<HTMLDivElement>
            )
            if (started) {
              e.preventDefault()
            }
          }
          // Handle arrow drawing
          else if (currentTool === 'arrow') {
            e.stopPropagation()
            const started = handleArrowStart(
              e,
              containerRef as React.RefObject<HTMLDivElement>
            )
            if (started) {
              e.preventDefault()
            }
          }
        }}
        onMouseLeave={() => {
          // Cancel rectangle selection if mouse leaves canvas
          if (isRectangleSelecting) {
            setIsRectangleSelecting(false)
            setRectangleStart(null)
            setRectangleEnd(null)
          } else if (isFreehandDrawing) {
            handleFreehandEnd()
          } else if (isArrowDrawing) {
            handleArrowEnd()
          }
        }}
        onMouseMove={e => {
          if (isRectangleSelecting && rectangleStart) {
            // Update rectangle selection end point
            e.stopPropagation()
            const point = screenToWorld(e.clientX, e.clientY)
            setRectangleEnd(point)
          } else if (isFreehandDrawing) {
            e.stopPropagation()
            handleFreehandMove(e.nativeEvent)
          } else if (isArrowDrawing) {
            e.stopPropagation()
            handleArrowMove(e.nativeEvent)
          }
        }}
        onMouseUp={() => {
          if (isRectangleSelecting && rectangleStart && rectangleEnd) {
            // Complete rectangle selection
            const minX = Math.min(rectangleStart.x, rectangleEnd.x)
            const maxX = Math.max(rectangleStart.x, rectangleEnd.x)
            const minY = Math.min(rectangleStart.y, rectangleEnd.y)
            const maxY = Math.max(rectangleStart.y, rectangleEnd.y)

            // Check if this was just a click (no drag) or an actual rectangle selection
            const isClick =
              Math.abs(rectangleEnd.x - rectangleStart.x) < 5 &&
              Math.abs(rectangleEnd.y - rectangleStart.y) < 5

            if (isClick) {
              // Just a right-click, clear selection
              clearSelection()
            } else {
              // Find all objects that intersect with the rectangle
              const selectedIds: string[] = []
              objects.forEach(obj => {
                let objMinX = obj.x
                let objMaxX = obj.x + 100 // default size
                let objMinY = obj.y
                let objMaxY = obj.y + 100 // default size

                // Get actual dimensions based on object type
                if (obj.type === 'freehand') {
                  // For freehand, calculate bounds from points
                  const freehandObj = obj as FreehandObject
                  const points = freehandObj.object_data.points
                  if (points && points.length > 0) {
                    const xs = points.map(p => p.x)
                    const ys = points.map(p => p.y)
                    objMinX = Math.min(...xs)
                    objMaxX = Math.max(...xs)
                    objMinY = Math.min(...ys)
                    objMaxY = Math.max(...ys)

                    // Add stroke padding for easier selection
                    const strokePadding =
                      (freehandObj.object_data.strokeWidth || 5) * 2
                    objMinX -= strokePadding
                    objMaxX += strokePadding
                    objMinY -= strokePadding
                    objMaxY += strokePadding
                  }
                } else if (obj.type === 'arrow') {
                  // For arrow, calculate bounds from control points
                  const arrowObj = obj as ArrowObject
                  const points = arrowObj.object_data.controlPoints
                  if (points && points.length > 0) {
                    const xs = points.map(p => p.x)
                    const ys = points.map(p => p.y)
                    objMinX = Math.min(...xs)
                    objMaxX = Math.max(...xs)
                    objMinY = Math.min(...ys)
                    objMaxY = Math.max(...ys)

                    // Add stroke padding for easier selection
                    const strokePadding =
                      (arrowObj.object_data.strokeWidth || 5) * 2
                    objMinX -= strokePadding
                    objMaxX += strokePadding
                    objMinY -= strokePadding
                    objMaxY += strokePadding
                  }
                } else if ('width' in obj && 'height' in obj) {
                  // For objects with explicit dimensions
                  objMaxX = obj.x + obj.width
                  objMaxY = obj.y + obj.height
                }

                // Rectangle intersection test
                if (
                  objMaxX >= minX &&
                  objMinX <= maxX &&
                  objMaxY >= minY &&
                  objMinY <= maxY
                ) {
                  selectedIds.push(obj.id)
                }
              })

              // Update selection
              if (selectedIds.length > 0) {
                selectMultipleObjects(selectedIds)
              } else {
                clearSelection()
              }
            }

            // Reset rectangle selection state
            setIsRectangleSelecting(false)
            setRectangleStart(null)
            setRectangleEnd(null)
          } else if (isFreehandDrawing) {
            handleFreehandEnd()
          } else if (isArrowDrawing) {
            handleArrowEnd()
          }
        }}
        ref={svgRef}
        viewBox={viewBox}
        width={dimensions.width}
      >
        {/* Grid pattern */}
        {showGrid && <CanvasGrid dimensions={dimensions} viewport={viewport} />}

        {/* Canvas content */}
        {children}

        {/* Render all drawing objects */}
        {objects.map(obj => {
          // Freehand and arrow objects render directly as SVG (not in foreignObject)
          if (obj.type === 'freehand' || obj.type === 'arrow') {
            return (
              <ErrorBoundary
                fallback={error => (
                  <text fill="#ff0000" fontSize="12" x={obj.x} y={obj.y}>
                    ❌ Error rendering {obj.type}: {error.message}
                  </text>
                )}
                key={obj.id}
              >
                <CanvasObject
                  isSelected={selectedObjectIds.includes(obj.id)}
                  object={obj}
                  onContextMenu={handleContextMenu}
                  onSelect={handleSelectObject}
                  onStartDrag={handleStartDrag}
                  onUpdate={handleUpdateObject}
                  zoom={viewport.zoom}
                />
              </ErrorBoundary>
            )
          }

          // Other objects use foreignObject wrapper
          const width = 'width' in obj ? obj.width : 100
          const height = 'height' in obj ? obj.height : 100

          return (
            <ErrorBoundary
              fallback={error => (
                <text fill="#ff0000" fontSize="12" x={obj.x} y={obj.y}>
                  ❌ Error rendering {obj.type}: {error.message}
                </text>
              )}
              key={obj.id}
            >
              <foreignObject height={height} width={width} x={obj.x} y={obj.y}>
                <CanvasObject
                  currentTool={currentTool}
                  isSelected={selectedObjectIds.includes(obj.id)}
                  object={obj}
                  onContextMenu={handleContextMenu}
                  onSelect={handleSelectObject}
                  onStartDrag={handleStartDrag}
                  onUpdate={handleUpdateObject}
                  zoom={viewport.zoom}
                />
              </foreignObject>
            </ErrorBoundary>
          )
        })}

        {/* Freehand/Arrow drawing preview */}
        {isFreehandDrawing && freehandPath.length > 0 && (
          <path
            d={
              freehandPath.length === 1
                ? `M ${freehandPath[0].x} ${freehandPath[0].y} L ${freehandPath[0].x} ${freehandPath[0].y}`
                : freehandPath.length === 2
                  ? `M ${freehandPath[0].x} ${freehandPath[0].y} L ${freehandPath[1].x} ${freehandPath[1].y}`
                  : `M ${freehandPath[0].x} ${freehandPath[0].y} ${freehandPath
                      .slice(1)
                      .map((point, i) => {
                        if (i === freehandPath.length - 2) {
                          return `L ${point.x} ${point.y}`
                        }
                        const next = freehandPath[i + 2]
                        const midX = (point.x + next.x) / 2
                        const midY = (point.y + next.y) / 2
                        return `Q ${point.x} ${point.y} ${midX} ${midY}`
                      })
                      .join(' ')}`
            }
            fill="none"
            stroke={brushSettings.strokeColor}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={brushSettings.opacity}
            strokeWidth={brushSettings.strokeWidth}
          />
        )}

        {/* Arrow drawing preview (with arrowhead) */}
        {isArrowDrawing && arrowPath.length > 0 && (
          <>
            <path
              d={
                arrowPath.length === 1
                  ? `M ${arrowPath[0].x} ${arrowPath[0].y} L ${arrowPath[0].x} ${arrowPath[0].y}`
                  : arrowPath.length === 2
                    ? `M ${arrowPath[0].x} ${arrowPath[0].y} L ${arrowPath[1].x} ${arrowPath[1].y}`
                    : `M ${arrowPath[0].x} ${arrowPath[0].y} ${arrowPath
                        .slice(1)
                        .map((point, i) => {
                          if (i === arrowPath.length - 2) {
                            return `L ${point.x} ${point.y}`
                          }
                          const next = arrowPath[i + 2]
                          const midX = (point.x + next.x) / 2
                          const midY = (point.y + next.y) / 2
                          return `Q ${point.x} ${point.y} ${midX} ${midY}`
                        })
                        .join(' ')}`
              }
              fill="none"
              stroke={brushSettings.strokeColor}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={brushSettings.opacity}
              strokeWidth={brushSettings.strokeWidth}
            />
            {/* Preview arrowhead */}
            {arrowPath.length >= 2 &&
              (() => {
                const lastPoint = arrowPath[arrowPath.length - 1]

                // Look back further for stable angle - avoid jitter
                let referencePoint = arrowPath[arrowPath.length - 2]
                const lookbackDistance = 20

                for (let i = arrowPath.length - 2; i >= 0; i--) {
                  const dist = Math.sqrt(
                    (lastPoint.x - arrowPath[i].x) ** 2 +
                      (lastPoint.y - arrowPath[i].y) ** 2
                  )
                  if (dist >= lookbackDistance) {
                    referencePoint = arrowPath[i]
                    break
                  }
                }

                const angle = Math.atan2(
                  lastPoint.y - referencePoint.y,
                  lastPoint.x - referencePoint.x
                )

                // Better proportions for hand-drawn look
                const arrowLength = Math.max(brushSettings.strokeWidth * 3, 15)
                const arrowWidth = arrowLength * 0.5
                const tipX = lastPoint.x
                const tipY = lastPoint.y
                const baseX = tipX - arrowLength * Math.cos(angle)
                const baseY = tipY - arrowLength * Math.sin(angle)
                const leftX = baseX - arrowWidth * Math.sin(angle)
                const leftY = baseY + arrowWidth * Math.cos(angle)
                const rightX = baseX + arrowWidth * Math.sin(angle)
                const rightY = baseY - arrowWidth * Math.cos(angle)

                // Add curve for hand-drawn feel
                const curveDepth = arrowLength * 0.3
                const leftCtrlX =
                  baseX -
                  curveDepth * Math.cos(angle) -
                  arrowWidth * 0.7 * Math.sin(angle)
                const leftCtrlY =
                  baseY -
                  curveDepth * Math.sin(angle) +
                  arrowWidth * 0.7 * Math.cos(angle)
                const rightCtrlX =
                  baseX -
                  curveDepth * Math.cos(angle) +
                  arrowWidth * 0.7 * Math.sin(angle)
                const rightCtrlY =
                  baseY -
                  curveDepth * Math.sin(angle) -
                  arrowWidth * 0.7 * Math.cos(angle)

                return (
                  <path
                    d={`M ${tipX} ${tipY} 
                      Q ${leftCtrlX} ${leftCtrlY}, ${leftX} ${leftY}
                      L ${rightX} ${rightY}
                      Q ${rightCtrlX} ${rightCtrlY}, ${tipX} ${tipY}
                      Z`}
                    fill={brushSettings.strokeColor}
                    opacity={brushSettings.opacity}
                    stroke={brushSettings.strokeColor}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={brushSettings.strokeWidth * 0.5}
                  />
                )
              })()}
          </>
        )}

        {/* Rectangle selection visual */}
        {isRectangleSelecting && rectangleStart && rectangleEnd && (
          <rect
            fill="rgba(0, 255, 255, 0.1)"
            height={Math.abs(rectangleEnd.y - rectangleStart.y)}
            pointerEvents="none"
            stroke="#00ffff"
            strokeDasharray={`${5 / viewport.zoom},${5 / viewport.zoom}`}
            strokeWidth={2 / viewport.zoom}
            width={Math.abs(rectangleEnd.x - rectangleStart.x)}
            x={Math.min(rectangleStart.x, rectangleEnd.x)}
            y={Math.min(rectangleStart.y, rectangleEnd.y)}
          />
        )}
      </svg>

      {/* Dialogs - Still rendered here (not global) */}
      {/* YouTube URL dialog */}
      {showYouTubeDialog && (
        <YouTubeUrlDialog
          onCancel={handleYouTubeCancel}
          onConfirm={handleYouTubeConfirm}
        />
      )}

      {/* Shape picker dialog */}
      {showShapeDialog && (
        <ShapePickerDialog
          isOpen={showShapeDialog}
          onClose={handleShapeCancel}
          onSelectShape={handleShapeSelect}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          onClose={() => setContextMenu(null)}
          onDelete={handleDeleteClick}
          x={contextMenu.x}
          y={contextMenu.y}
        />
      )}

      {/* Delete confirmation dialog */}
      <ConfirmationDialog
        cancelText="Cancel"
        confirmText="Delete"
        isOpen={showDeleteConfirmation}
        message={
          objectToDelete === 'multiple'
            ? `Are you sure you want to delete ${selectedObjectIds.length} objects? This action cannot be undone.`
            : 'Are you sure you want to delete this object? This action cannot be undone.'
        }
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={
          objectToDelete === 'multiple'
            ? 'Delete Multiple Objects'
            : 'Delete Object'
        }
        variant="danger"
      />
    </div>
  )
}
