import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  DrawingObject,
  FreehandObject,
  ArrowObject,
  Viewport,
  CanvasSize,
} from 'lib/types/canvas'
import type { RenderType } from 'shared/types/what-file'
import { logger } from '../../shared/logger'

interface UseCanvasObjectsOptions {
  tabId?: string
  viewport?: Viewport
  containerSize?: CanvasSize
  renderType?: RenderType
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
  viewport,
  containerSize,
  renderType = 'normal',
  onLoad,
  onError,
}: UseCanvasObjectsOptions = {}) {
  const [objects, setObjects] = useState<
    (DrawingObject & { _imageUrl?: string })[]
  >([])
  const [totalObjectCount, setTotalObjectCount] = useState(0)
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Use ref to always have access to current objects without causing re-renders
  const objectsRef = useRef<(DrawingObject & { _imageUrl?: string })[]>([])

  // Track the last loaded tabId to prevent duplicate loads
  const lastLoadedTabIdRef = useRef<string | undefined>(undefined)
  
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const loadedChunksRef = useRef(new Set<string>())
  const CHUNK_SIZE = 2000

  // Keep ref in sync with state
  useEffect(() => {
    objectsRef.current = objects
  }, [objects])

  // Reset cache when tabId changes
  useEffect(() => {
    loadedChunksRef.current.clear()
    setObjects([])
    objectsRef.current = []
    lastLoadedTabIdRef.current = undefined
  }, [tabId])

  // Load objects from database on mount or when tabId/viewport changes
  useEffect(() => {
    if (!tabId || !viewport || !containerSize) return

    // Debounce loading to prevent excessive IPC calls during pan/zoom
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current)
    }

    // Adjust debounce time based on renderType
    // 'fast' mode waits longer (500ms) to ensure interaction is finished
    // 'normal' mode updates more frequently (100ms)
    const debounceTime = renderType === 'fast' ? 500 : 100

    loadTimeoutRef.current = setTimeout(() => {
      const loadObjects = async () => {
        try {
          // Calculate visible bounds in world coordinates
          // We use a buffer to pre-load surrounding areas
          // 'fast' mode has NO buffer (0), 'normal' mode has 1000px buffer
          const PRELOAD_BUFFER = renderType === 'fast' ? 0 : 1000 / viewport.zoom
          const halfWidth = containerSize.width / (2 * viewport.zoom)
          const halfHeight = containerSize.height / (2 * viewport.zoom)
          
          const viewBounds = {
            minX: viewport.x - halfWidth - PRELOAD_BUFFER,
            maxX: viewport.x + halfWidth + PRELOAD_BUFFER,
            minY: viewport.y - halfHeight - PRELOAD_BUFFER,
            maxY: viewport.y + halfHeight + PRELOAD_BUFFER
          }

          // Identify which chunks cover the visible area
          const startChunkX = Math.floor(viewBounds.minX / CHUNK_SIZE)
          const endChunkX = Math.floor(viewBounds.maxX / CHUNK_SIZE)
          const startChunkY = Math.floor(viewBounds.minY / CHUNK_SIZE)
          const endChunkY = Math.floor(viewBounds.maxY / CHUNK_SIZE)

          const missingChunks: {x: number, y: number}[] = []

          for (let x = startChunkX; x <= endChunkX; x++) {
            for (let y = startChunkY; y <= endChunkY; y++) {
              const key = `${x},${y}`
              if (!loadedChunksRef.current.has(key)) {
                missingChunks.push({x, y})
              }
            }
          }

          // If no new chunks to load, skip
          if (missingChunks.length === 0 && lastLoadedTabIdRef.current === tabId) {
            return
          }

          lastLoadedTabIdRef.current = tabId

          // Calculate bounding box of all missing chunks to fetch them in one go
          let fetchParams = undefined
          
          if (missingChunks.length > 0) {
             let minChunkX = Infinity, maxChunkX = -Infinity
             let minChunkY = Infinity, maxChunkY = -Infinity

             missingChunks.forEach(c => {
               minChunkX = Math.min(minChunkX, c.x)
               maxChunkX = Math.max(maxChunkX, c.x)
               minChunkY = Math.min(minChunkY, c.y)
               maxChunkY = Math.max(maxChunkY, c.y)
             })

             const fetchBounds = {
               minX: minChunkX * CHUNK_SIZE,
               maxX: (maxChunkX + 1) * CHUNK_SIZE,
               minY: minChunkY * CHUNK_SIZE,
               maxY: (maxChunkY + 1) * CHUNK_SIZE
             }
             
             const width = fetchBounds.maxX - fetchBounds.minX
             const height = fetchBounds.maxY - fetchBounds.minY
             
             fetchParams = {
               x: fetchBounds.minX + width / 2,
               y: fetchBounds.minY + height / 2,
               width,
               height,
               zoom: 1 // Use zoom 1 to get consistent buffer from backend
             }
             
             // Mark chunks as loaded
             missingChunks.forEach(c => loadedChunksRef.current.add(`${c.x},${c.y}`))
          } else {
             return
          }

          const loadedObjects = await window.App.file.getObjects(tabId, fetchParams)
          
          // Fetch total object count
          const count = await window.App.file.getObjectCount(tabId)
          setTotalObjectCount(count)

          logger.objects.debug(
            `Loaded ${loadedObjects.length} objects from database for ${missingChunks.length} chunks. Total in DB: ${count}`
          )

          // Load asset data URLs for image objects
          const objectsWithAssets = await Promise.all(
            loadedObjects.map(async (obj: DrawingObject) => {
              if (obj.type === 'image') {
                // Check if we already have the asset URL in memory to avoid re-fetching
                const existing = objectsRef.current.find(o => o.id === obj.id)
                if (existing && existing._imageUrl) {
                  return { ...obj, _imageUrl: existing._imageUrl }
                }

                const dataUrl = await window.App.file.getAssetDataUrl(
                  obj.object_data.assetId,
                  tabId
                )
                return { ...obj, _imageUrl: dataUrl }
              }
              return obj
            })
          )

          // Merge with existing objects
          // We use a Map to deduplicate by ID, preferring the newly loaded version
          // But we keep existing objects that might be off-screen (to avoid them disappearing if we pan back)
          // Note: This means memory usage grows as you explore, which is usually desired behavior
          setObjects(prev => {
            const objectMap = new Map(prev.map(o => [o.id, o]))
            
            // Update/Add loaded objects
            objectsWithAssets.forEach(obj => {
              objectMap.set(obj.id, obj as any)
            })
            
            const newObjects = Array.from(objectMap.values())
            objectsRef.current = newObjects
            return newObjects
          })
          
          onLoad?.(objectsWithAssets as any)
        } catch (error) {
          logger.objects.error('Failed to load objects:', error)
          onError?.(error as Error)
        } finally {
          setIsLoading(false)
        }
      }

      loadObjects()
    }, debounceTime)

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
      }
    }
  }, [tabId, viewport, containerSize, renderType]) // Re-run when viewport changes

  // Add a new object
  const addObject = useCallback(
    async (object: DrawingObject & { _imageUrl?: string }) => {
      setObjects(prev => {
        const newObjects = [...prev, object]
        // CRITICAL: Update ref synchronously
        objectsRef.current = newObjects
        return newObjects
      })
      
      setTotalObjectCount(prev => prev + 1)

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
      // Get the object before deleting to check its type
      const objectToDelete = objectsRef.current.find(obj => obj.id === id)

      setObjects(prev => {
        const newObjects = prev.filter(obj => obj.id !== id)
        // CRITICAL: Update ref synchronously
        objectsRef.current = newObjects
        return newObjects
      })
      
      setTotalObjectCount(prev => Math.max(0, prev - 1))

      // If it's an external-tab widget (spreadsheet, external-web, etc.), close its tab
      if (objectToDelete && tabId && window.__handleWidgetDelete) {
        window.__handleWidgetDelete(id, tabId)
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
    totalObjectCount,
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
