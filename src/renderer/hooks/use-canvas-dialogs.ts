import { useState, useCallback } from 'react'
import type {
  DrawingObject,
  StickyNoteObject,
  YouTubeVideoObject,
  ShapeObject,
  Point,
} from 'lib/types/canvas'
import type { ShapeType } from 'renderer/components/canvas/shape-picker-dialog'
import type { CanvasTool } from 'renderer/hooks/use-canvas-tool'
import { generateId } from 'lib/utils/id-generator'

interface UseCanvasDialogsOptions {
  objectsLength: number
  selectedObjectIds: string[]
  addObject: (object: DrawingObject) => Promise<void>
  deleteObject: (id: string) => Promise<void>
  selectObject: (id: string) => void
  clearSelection: () => void
  setTool: (tool: CanvasTool) => void
}

export interface ContextMenuState {
  x: number
  y: number
  objectId: string
}

/**
 * Hook for managing all canvas dialogs:
 * - YouTube URL dialog
 * - Shape picker dialog
 * - Delete confirmation dialog
 * - Context menu
 * 
 * Consolidates dialog state and handlers for cleaner separation of concerns.
 */
export function useCanvasDialogs({
  objectsLength,
  selectedObjectIds,
  addObject,
  deleteObject,
  selectObject,
  clearSelection,
  setTool,
}: UseCanvasDialogsOptions) {
  // YouTube dialog state
  const [showYouTubeDialog, setShowYouTubeDialog] = useState(false)
  const [youtubeDialogPosition, setYoutubeDialogPosition] = useState<Point>({
    x: 0,
    y: 0,
  })

  // Shape picker dialog state
  const [showShapeDialog, setShowShapeDialog] = useState(false)
  const [shapeDialogPosition, setShapeDialogPosition] = useState<Point>({
    x: 0,
    y: 0,
  })

  // Spreadsheet name dialog state
  const [showSpreadsheetDialog, setShowSpreadsheetDialog] = useState(false)
  const [spreadsheetDialogPosition, setSpreadsheetDialogPosition] = useState<Point>({
    x: 0,
    y: 0,
  })

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  // Confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [objectToDelete, setObjectToDelete] = useState<
    string | 'multiple' | null
  >(null)

  // ========== YouTube Dialog Handlers ==========

  /**
   * Open YouTube dialog at a specific position
   */
  const openYouTubeDialog = useCallback((position: Point) => {
    setYoutubeDialogPosition(position)
    setShowYouTubeDialog(true)
  }, [])

  /**
   * Handle YouTube URL confirmation - creates YouTubeVideoObject
   */
  const handleYouTubeConfirm = useCallback(
    async (url: string, videoId: string) => {
      const youtubeVideo: YouTubeVideoObject = {
        id: generateId(),
        type: 'youtube',
        x: youtubeDialogPosition.x - 280, // Center the video
        y: youtubeDialogPosition.y - 158,
        width: 560,
        height: 315, // 16:9 aspect ratio
        z_index: objectsLength,
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
    [youtubeDialogPosition, objectsLength, addObject, selectObject, setTool]
  )

  /**
   * Handle YouTube dialog cancellation
   */
  const handleYouTubeCancel = useCallback(() => {
    setShowYouTubeDialog(false)
    setTool('select')
  }, [setTool])

  // ========== Shape Picker Dialog Handlers ==========

  /**
   * Open shape picker dialog at a specific position
   */
  const openShapeDialog = useCallback((position: Point) => {
    setShapeDialogPosition(position)
    setShowShapeDialog(true)
  }, [])

  /**
   * Handle shape selection - creates ShapeObject
   */
  const handleShapeSelect = useCallback(
    async (shapeType: ShapeType) => {
      const shape: ShapeObject = {
        id: generateId(),
        type: 'shape',
        x: shapeDialogPosition.x - 100, // Center the shape
        y: shapeDialogPosition.y - 100,
        width: 200,
        height: 200,
        z_index: objectsLength,
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
    [shapeDialogPosition, objectsLength, addObject, selectObject, setTool]
  )

  /**
   * Handle shape picker cancellation
   */
  const handleShapeCancel = useCallback(() => {
    setShowShapeDialog(false)
    setTool('select')
  }, [setTool])

  // ========== Spreadsheet Name Dialog Handlers ==========

  /**
   * Open spreadsheet name dialog at a specific position
   */
  const openSpreadsheetDialog = useCallback((position: Point) => {
    setSpreadsheetDialogPosition(position)
    setShowSpreadsheetDialog(true)
  }, [])

  /**
   * Handle spreadsheet name confirmation - creates SpreadsheetObject
   */
  const handleSpreadsheetConfirm = useCallback(
    async (name: string) => {
      const newSpreadsheet = {
        id: generateId(),
        type: 'spreadsheet' as const,
        x: spreadsheetDialogPosition.x - 90, // Center horizontally (180px / 2)
        y: spreadsheetDialogPosition.y - 60, // Center vertically (120px / 2)
        width: 180,
        height: 120,
        z_index: objectsLength,
        object_data: {
          title: name,
          workbookData: undefined, // Will be initialized when opened in tab
        },
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      }
      await addObject(newSpreadsheet)
      selectObject(newSpreadsheet.id)
      setShowSpreadsheetDialog(false)
      setTool('select')
    },
    [spreadsheetDialogPosition, objectsLength, addObject, selectObject, setTool]
  )

  /**
   * Handle spreadsheet dialog cancellation
   */
  const handleSpreadsheetCancel = useCallback(() => {
    setShowSpreadsheetDialog(false)
    setTool('select')
  }, [setTool])

  // ========== Context Menu Handlers ==========

  /**
   * Handle right-click context menu on objects
   */
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

  /**
   * Close context menu
   */
  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  // ========== Delete Confirmation Dialog Handlers ==========

  /**
   * Handle delete click from context menu
   */
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

  /**
   * Handle delete confirmation - actually deletes the objects
   */
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

  /**
   * Handle delete cancellation
   */
  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirmation(false)
    setObjectToDelete(null)
  }, [])

  /**
   * Trigger delete confirmation for selected objects (used by keyboard shortcut)
   */
  const triggerDeleteConfirmation = useCallback(() => {
    if (selectedObjectIds.length === 0) return

    setObjectToDelete(selectedObjectIds.length === 1 ? selectedObjectIds[0] : 'multiple')
    setShowDeleteConfirmation(true)
  }, [selectedObjectIds])

  return {
    // YouTube dialog
    showYouTubeDialog,
    youtubeDialogPosition,
    openYouTubeDialog,
    handleYouTubeConfirm,
    handleYouTubeCancel,

    // Shape picker dialog
    showShapeDialog,
    shapeDialogPosition,
    openShapeDialog,
    handleShapeSelect,
    handleShapeCancel,

    // Spreadsheet name dialog
    showSpreadsheetDialog,
    spreadsheetDialogPosition,
    openSpreadsheetDialog,
    handleSpreadsheetConfirm,
    handleSpreadsheetCancel,

    // Context menu
    contextMenu,
    handleContextMenu,
    closeContextMenu,

    // Delete confirmation dialog
    showDeleteConfirmation,
    objectToDelete,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    triggerDeleteConfirmation,
  }
}
