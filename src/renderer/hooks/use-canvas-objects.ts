import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  DrawingObject,
  FreehandObject,
  ArrowObject,
} from 'lib/types/canvas'
import { logger } from '../../shared/logger'

interface UseCanvasObjectsOptions {
  tabId?: string
  onLoad?: (objects: DrawingObject[]) => void
  onError?: (error: Error) => void
}

/**
 * useCanvasObjects - Generic hook for managing all drawing objects
 * Handles CRUD operations, loading, saving, and state management
 * Works with any DrawingObject type
 */
export function useCanvasObjects({
  tabId,
  onLoad,
  onError,
}: UseCanvasObjectsOptions = {}) {
  const [objects, setObjects] = useState<
    (DrawingObject & { _imageUrl?: string })[]
  >([])
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Use ref to always have access to current objects without causing re-renders
  const objectsRef = useRef<(DrawingObject & { _imageUrl?: string })[]>([])

  // Track the last loaded tabId to prevent duplicate loads
  const lastLoadedTabIdRef = useRef<string | undefined>(undefined)

  // Keep ref in sync with state
  useEffect(() => {
    objectsRef.current = objects
  }, [objects])

  // Load objects from database on mount or when tabId changes
  // Note: Will only load once per unique tabId
  useEffect(() => {
    // Skip if we already loaded this tabId
    if (lastLoadedTabIdRef.current === tabId) {
      return
    }

    lastLoadedTabIdRef.current = tabId

    const loadObjects = async () => {
      try {
        const loadedObjects = await window.App.file.getObjects(tabId)

        logger.objects.debug(
          'Raw loaded objects from database:',
          loadedObjects.map((obj: any) => ({
            id: obj.id,
            type: obj.type,
            x: obj.x,
            y: obj.y,
            width: obj.width,
            height: obj.height,
            object_data: obj.object_data,
          }))
        )

        // Load asset data URLs for image objects (and other asset-based types in future)
        const objectsWithAssets = await Promise.all(
          loadedObjects.map(async (obj: DrawingObject) => {
            if (obj.type === 'image') {
              const dataUrl = await window.App.file.getAssetDataUrl(
                obj.object_data.assetId,
                tabId
              )
              return { ...obj, _imageUrl: dataUrl }
            }
            return obj
          })
        )

        setObjects(objectsWithAssets as any)
        onLoad?.(objectsWithAssets)
      } catch (error) {
        logger.objects.error('Failed to load objects:', error)
        onError?.(error as Error)
      } finally {
        setIsLoading(false)
      }
    }

    loadObjects()
    // Only re-run if tabId changes (not when callbacks change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId])

  // Add a new object
  const addObject = useCallback(
    async (object: DrawingObject & { _imageUrl?: string }) => {
      setObjects(prev => {
        const newObjects = [...prev, object]
        // CRITICAL: Update ref synchronously
        objectsRef.current = newObjects
        return newObjects
      })

      // Save to database (exclude temporary fields like _imageUrl)
      const { _imageUrl, ...objectToSave } = object
      try {
        await window.App.file.saveObject(objectToSave, tabId)
      } catch (error) {
        logger.objects.error('Failed to save new object:', error)
      }
    },
    [tabId]
  )

  // Update an existing object
  const updateObject = useCallback(
    async (
      id: string,
      updates: Partial<DrawingObject>,
      options?: { skipSave?: boolean } // Option to skip database save (for live resize)
    ) => {
      // Use ref to get current objects without stale closure
      const currentObjects = objectsRef.current
      const existingObject = currentObjects.find(obj => obj.id === id)

      if (!existingObject) {
        // Silently return if object doesn't exist yet (happens during initial load)
        // This is normal when components mount before objects are fully loaded
        return
      }

      logger.objects.debug('Updating object:', {
        id,
        existingObjectData: existingObject.object_data,
        updates,
        hasObjectDataInUpdates: !!updates.object_data,
        skipSave: options?.skipSave,
      })

      // Create the updated object with proper merging
      // If updates contains object_data, merge it deeply to preserve existing fields
      const updated = {
        ...existingObject,
        ...updates,
        // Deep merge object_data if it exists in updates
        ...(updates.object_data
          ? {
              object_data: {
                ...existingObject.object_data,
                ...updates.object_data,
              },
            }
          : {}),
        updated: new Date().toISOString(),
      } as DrawingObject & { _imageUrl?: string }

      logger.objects.debug('Updated object_data:', updated.object_data)

      // Update state
      setObjects(prev => {
        const newObjects = prev.map(obj => (obj.id === id ? updated : obj))
        // CRITICAL: Update ref synchronously to ensure any subsequent operations get latest data
        objectsRef.current = newObjects
        return newObjects
      })

      // Save to database (unless skipSave is true)
      if (!options?.skipSave) {
        const { _imageUrl, ...objectToSave } = updated
        try {
          await window.App.file.saveObject(objectToSave, tabId)
          logger.objects.success('Saved object:', id)
        } catch (error) {
          logger.objects.error('Failed to save object update:', error)
        }
      } else {
        logger.objects.debug('Skipped database save (live update)')
      }
    },
    [tabId]
  )

  // Delete an object
  const deleteObject = useCallback(
    async (id: string) => {
      // Get the object before deleting to check if it's a spreadsheet
      const objectToDelete = objectsRef.current.find(obj => obj.id === id)

      setObjects(prev => {
        const newObjects = prev.filter(obj => obj.id !== id)
        // CRITICAL: Update ref synchronously
        objectsRef.current = newObjects
        return newObjects
      })

      // If it's a spreadsheet, close its tab
      if (
        objectToDelete?.type === 'spreadsheet' &&
        tabId &&
        window.__closeSpreadsheetTabs
      ) {
        window.__closeSpreadsheetTabs(id, tabId)
      }

      // If it's an external web, close its tab
      if (
        objectToDelete?.type === 'external-web' &&
        tabId &&
        window.__closeExternalWebTabs
      ) {
        window.__closeExternalWebTabs(id, tabId)
      }

      // Delete from database
      try {
        await window.App.file.deleteObject(id, tabId)
      } catch (error) {
        logger.objects.error('Failed to delete object:', error)
      }
    },
    [tabId]
  )

  // Select an object (or multiple with Ctrl)
  const selectObject = useCallback(
    (id: string | null, addToSelection = false) => {
      if (id === null) {
        setSelectedObjectIds([])
      } else if (addToSelection) {
        setSelectedObjectIds(
          prev =>
            prev.includes(id)
              ? prev.filter(objId => objId !== id) // Toggle off if already selected
              : [...prev, id] // Add to selection
        )
      } else {
        setSelectedObjectIds([id])
      }
    },
    []
  )

  // Select multiple objects (for selection box)
  const selectMultipleObjects = useCallback((ids: string[]) => {
    setSelectedObjectIds(ids)
  }, [])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedObjectIds([])
  }, [])

  // Move an object (used by drag system)
  const moveObject = useCallback((id: string, x: number, y: number) => {
    setObjects(prev => {
      const newObjects = prev.map(obj => {
        if (obj.id !== id) return obj

        // Calculate the delta from current position
        const deltaX = x - obj.x
        const deltaY = y - obj.y

        // For freehand objects, also move all points
        if (obj.type === 'freehand') {
          const freehandObj = obj as FreehandObject
          return {
            ...freehandObj,
            x,
            y,
            object_data: {
              ...freehandObj.object_data,
              points: freehandObj.object_data.points.map(
                (point: { x: number; y: number }) => ({
                  x: point.x + deltaX,
                  y: point.y + deltaY,
                })
              ),
            },
            updated: new Date().toISOString(),
          }
        }

        // For arrow objects, also move start and end points
        if (obj.type === 'arrow') {
          const arrowObj = obj as ArrowObject
          return {
            ...arrowObj,
            x,
            y,
            object_data: {
              ...arrowObj.object_data,
              startX: arrowObj.object_data.startX + deltaX,
              startY: arrowObj.object_data.startY + deltaY,
              endX: arrowObj.object_data.endX + deltaX,
              endY: arrowObj.object_data.endY + deltaY,
              // Also move control points if they exist
              ...(arrowObj.object_data.controlPoints && {
                controlPoints: arrowObj.object_data.controlPoints.map(
                  (point: { x: number; y: number }) => ({
                    x: point.x + deltaX,
                    y: point.y + deltaY,
                  })
                ),
              }),
            },
            updated: new Date().toISOString(),
          }
        }

        // For other objects, just update x and y
        return { ...obj, x, y, updated: new Date().toISOString() }
      })

      // CRITICAL: Update ref synchronously to ensure saveObjectPosition gets latest data
      objectsRef.current = newObjects

      return newObjects
    })
  }, [])

  // Save object position after drag (persists to database)
  const saveObjectPosition = useCallback(
    async (id: string, x: number, y: number) => {
      // Skip saving if no file is open (no tabId)
      if (!tabId) return

      const object = objectsRef.current.find(obj => obj.id === id)
      if (!object) return

      try {
        // Only save position fields to avoid overwriting object_data with stale state
        await window.App.file.saveObject(
          {
            id,
            x,
            y,
            updated: new Date().toISOString(),
          },
          tabId
        )
      } catch (error) {
        logger.objects.error('Failed to save object position:', error)
      }
    },
    [tabId]
  )

  return {
    objects,
    selectedObjectIds,
    isLoading,
    addObject,
    updateObject,
    deleteObject,
    selectObject,
    selectMultipleObjects,
    clearSelection,
    moveObject,
    saveObjectPosition,
  }
}
