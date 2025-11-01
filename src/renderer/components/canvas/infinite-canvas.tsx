// React
import { useRef, useMemo, useCallback, useState, useEffect } from 'react'
// Types
import type {
  Viewport,
  DrawingObject,
  StickyNoteObject,
  FreehandObject,
  ArrowObject,
} from 'lib/types/canvas'
// Utils
import { logger } from '../../../shared/logger'
import { sanitizeViewport } from 'lib/types/canvas-validators'
import { generateId } from 'lib/utils/id-generator'
// Hooks
import { useContainerSize } from 'renderer/hooks/use-container-size'
import { useViewport } from 'renderer/hooks/use-viewport'
import { useCanvasPan } from 'renderer/hooks/use-canvas-pan'
import { useCanvasZoom } from 'renderer/hooks/use-canvas-zoom'
import { useClipboardPaste } from 'renderer/hooks/use-clipboard-paste'
import { useCanvasObjects } from 'renderer/hooks/use-canvas-objects'
import { useFreehandDrawing } from 'renderer/hooks/use-freehand-drawing'
import { useArrowDrawing } from 'renderer/hooks/use-arrow-drawing'
import { useCanvasFileOperations } from 'renderer/hooks/use-canvas-file-operations'
import { useCanvasDialogs } from 'renderer/hooks/use-canvas-dialogs'
import { useObjectDuplication } from 'renderer/hooks/use-object-duplication'
import { useRectangleSelection } from 'renderer/hooks/use-rectangle-selection'
import { useCanvasTool } from 'renderer/hooks/use-canvas-tool'
import { useShortcut, ShortcutContext } from 'renderer/shortcuts'
import { useActiveTab } from 'renderer/contexts'
// UI / Components
import { ErrorBoundary } from '../error-boundary'
import { CanvasGrid } from './canvas-grid'
import { CanvasObject } from './canvas-object'
import { FreehandPreview } from './freehand-preview'
import { ArrowPreview } from './arrow-preview'
import { YouTubeUrlDialog } from './youtube-url-dialog'
import { ShapePickerDialog } from './shape-picker-dialog'
import { SpreadsheetNameDialog } from './spreadsheet-name-dialog'
import { ExternalWebDialog } from './external-web-dialog'
import { ContextMenu } from './context-menu'
import { ConfirmationDialog } from './confirmation-dialog'
import { Toast, useToast } from '../ui/toast'


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

  // Toast notifications
  const { toasts, show: showToast, remove: removeToast } = useToast()

  // Active tab context for syncing state
  const { brushSettings, updateActiveTab } = useActiveTab()

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

  // File operations hook - handles image/file paste, drag-and-drop, text paste
  const {
    handleImagePaste,
    handleFileAdd,
    handleFilePaste,
    handleTextPaste,
    handleDragOver,
    handleDrop,
  } = useCanvasFileOperations({
    tabId: tabId || null,
    dimensions,
    objectsLength: objects.length,
    screenToWorld,
    addObject,
    selectObject,
    showToast,
  })

  useClipboardPaste({
    onImagePaste: handleImagePaste,
    onFilePaste: handleFilePaste,
    onTextPaste: handleTextPaste,
    enabled: isActive,
    containerRef, // Pass container ref for accurate mouse position tracking
  })

  // Dialog management hook - handles all dialogs (YouTube, Shape, Spreadsheet, Delete, Context menu)
  const {
    showYouTubeDialog,
    youtubeDialogPosition,
    openYouTubeDialog,
    handleYouTubeConfirm,
    handleYouTubeCancel,
    showShapeDialog,
    shapeDialogPosition,
    openShapeDialog,
    handleShapeSelect,
    handleShapeCancel,
    showSpreadsheetDialog,
    spreadsheetDialogPosition,
    openSpreadsheetDialog,
    handleSpreadsheetConfirm,
    handleSpreadsheetCancel,
    showExternalWebDialog,
    externalWebDialogPosition,
    openExternalWebDialog,
    handleExternalWebConfirm,
    handleExternalWebCancel,
    contextMenu,
    handleContextMenu,
    closeContextMenu,
    showDeleteConfirmation,
    objectToDelete,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    triggerDeleteConfirmation,
  } = useCanvasDialogs({
    objectsLength: objects.length,
    selectedObjectIds,
    addObject,
    deleteObject,
    selectObject,
    clearSelection,
    setTool,
  })

  // Object duplication hook - handles Ctrl+D duplication with asset copying
  const { duplicateObjects } = useObjectDuplication({
    tabId: tabId || null,
    objects,
    selectedObjectIds,
    isActive,
    screenToWorld,
    addObject,
    selectMultipleObjects,
    showToast,
  })

  // Rectangle selection hook - Windows 7-style right-click drag selection
  const {
    isRectangleSelecting,
    rectangleStart,
    rectangleEnd,
    handleRectangleContextMenu,
    handleRectangleMouseMove,
    handleRectangleMouseUp,
    handleRectangleMouseLeave,
  } = useRectangleSelection({
    objects,
    screenToWorld,
    selectMultipleObjects,
    clearSelection,
    closeContextMenu,
    isActive: isActive ?? true,
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
      let hasMoved = false // Track if any actual movement occurred

      const handleDragMove = (moveEvent: MouseEvent) => {
        const currentWorldPos = screenToWorld(
          moveEvent.clientX,
          moveEvent.clientY
        )
        const deltaX = currentWorldPos.x - startWorldPos.x
        const deltaY = currentWorldPos.y - startWorldPos.y

        // Mark as moved if threshold exceeded (1 pixel in world coordinates)
        if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
          hasMoved = true
        }

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

        // Only save if the object actually moved
        if (!hasMoved) {
          // Just a click, not a drag - don't save position
          return
        }

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
            // Random color from palette (excluding transparent)
            const colors = [
              '#fffacd', '#fddde6', '#d0e7f9', '#d8f4d8',
              '#ffe5b4', '#e8d5f9', '#d0fff0', '#ffcccb',
              '#f3e6ff', '#e0f7ff', '#fff8dc'
            ]
            const randomColor = colors[Math.floor(Math.random() * colors.length)]

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
                paperColor: randomColor,
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

          case 'file': {
            // Capture mouse position for file placement
            const clickX = e.clientX
            const clickY = e.clientY

            // Open file picker for any file type
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '*/*' // Accept all file types
            input.onchange = async event => {
              const file = (event.target as HTMLInputElement).files?.[0]
              if (!file) return

              try {
                await handleFileAdd(file, { x: clickX, y: clickY })
                showToast(`File "${file.name}" added to canvas`, 'success')
                setTool('select') // Switch back to select mode after creating
              } catch (error) {
                logger.error('Failed to add file:', error)
                showToast(`Failed to add file "${file.name}"`, 'error')
              }
            }
            input.click()
            break
          }

          case 'youtube': {
            const worldPos = screenToWorld(e.clientX, e.clientY)
            // Store position and show dialog
            openYouTubeDialog({ x: worldPos.x, y: worldPos.y })
            break
          }

          case 'shape': {
            const worldPos = screenToWorld(e.clientX, e.clientY)
            // Store position and show shape picker dialog
            openShapeDialog({ x: worldPos.x, y: worldPos.y })
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

          case 'spreadsheet': {
            const worldPos = screenToWorld(e.clientX, e.clientY)
            openSpreadsheetDialog(worldPos)
            break
          }

          case 'external-web': {
            const worldPos = screenToWorld(e.clientX, e.clientY)
            openExternalWebDialog(worldPos)
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
      handleFileAdd,
      showToast,
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

    // Trigger delete confirmation dialog
    triggerDeleteConfirmation()
  }, [triggerDeleteConfirmation])

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

  // Register Ctrl+D shortcut for duplicate
  // Register Ctrl+D shortcut for duplicate
  useShortcut(
    {
      key: 'ctrl+d',
      context: ShortcutContext.Canvas,
      action: duplicateObjects,
      description: 'Duplicate selected objects',
      enabled: () =>
        selectedObjectIdsRef.current.length > 0 && isActiveRef.current,
    },
    [duplicateObjects]
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
      onDragOver={handleDragOver}
      onDrop={handleDrop}
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
          handleRectangleContextMenu(e)
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
          handleRectangleMouseLeave()
          if (isFreehandDrawing) {
            handleFreehandEnd()
          } else if (isArrowDrawing) {
            handleArrowEnd()
          }
        }}
        onMouseMove={e => {
          if (isRectangleSelecting && rectangleStart) {
            handleRectangleMouseMove(e)
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
            handleRectangleMouseUp()
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
                  tabId={tabId}
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
                  tabId={tabId}
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
          <FreehandPreview
            path={freehandPath}
            strokeColor={brushSettings.strokeColor}
            strokeWidth={brushSettings.strokeWidth}
            opacity={brushSettings.opacity}
          />
        )}

        {/* Arrow drawing preview (with arrowhead) */}
        {isArrowDrawing && arrowPath.length > 0 && (
          <ArrowPreview
            path={arrowPath}
            strokeColor={brushSettings.strokeColor}
            strokeWidth={brushSettings.strokeWidth}
            opacity={brushSettings.opacity}
          />
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

      {/* Spreadsheet name dialog */}
      {showSpreadsheetDialog && (
        <SpreadsheetNameDialog
          onCancel={handleSpreadsheetCancel}
          onConfirm={handleSpreadsheetConfirm}
        />
      )}

      {/* External web URL dialog */}
      {showExternalWebDialog && (
        <ExternalWebDialog
          onCancel={handleExternalWebCancel}
          onConfirm={handleExternalWebConfirm}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          onClose={closeContextMenu}
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

      {/* Toast notifications */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          onClose={() => removeToast(toast.id)}
          type={toast.type}
        />
      ))}
    </div>
  )
}
