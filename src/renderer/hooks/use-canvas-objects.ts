import { useState, useCallback, useEffect, useRef } from 'react'
import type { DrawingObject, FreehandObject, ArrowObject } from 'lib/types/canvas'

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
export function useCanvasObjects({ tabId, onLoad, onError }: UseCanvasObjectsOptions = {}) {
  const [objects, setObjects] = useState<(DrawingObject & { _imageUrl?: string })[]>([])
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Use ref to always have access to current objects without causing re-renders
  const objectsRef = useRef<(DrawingObject & { _imageUrl?: string })[]>([])
  
  // Keep ref in sync with state
  useEffect(() => {
    objectsRef.current = objects
  }, [objects])

  // Load objects from database on mount
  useEffect(() => {
    const loadObjects = async () => {
      try {
        const loadedObjects = await window.App.file.getObjects(tabId)
        
        // Load asset data URLs for image objects (and other asset-based types in future)
        const objectsWithAssets = await Promise.all(
          loadedObjects.map(async (obj: DrawingObject) => {
            if (obj.type === 'image') {
              const dataUrl = await window.App.file.getAssetDataUrl(obj.object_data.assetId, tabId)
              return { ...obj, _imageUrl: dataUrl }
            }
            return obj
          })
        )
        
        console.log(`✅ Loaded ${objectsWithAssets.length} objects for tab ${tabId}`)
        setObjects(objectsWithAssets as any)
        onLoad?.(objectsWithAssets)
      } catch (error) {
        console.error('Failed to load objects:', error)
        onError?.(error as Error)
      } finally {
        setIsLoading(false)
      }
    }

    loadObjects()
  }, [tabId, onLoad, onError])

  // Add a new object
  const addObject = useCallback(async (object: DrawingObject & { _imageUrl?: string }) => {
    setObjects(prev => [...prev, object])
    
    // Save to database (exclude temporary fields like _imageUrl)
    const { _imageUrl, ...objectToSave } = object
    try {
      await window.App.file.saveObject(objectToSave, tabId)
    } catch (error) {
      console.error('Failed to save new object:', error)
    }
  }, [tabId])

  // Update an existing object
  const updateObject = useCallback(async (id: string, updates: Partial<DrawingObject>) => {
    // Use ref to get current objects without stale closure
    const currentObjects = objectsRef.current
    const existingObject = currentObjects.find(obj => obj.id === id)
    
    if (!existingObject) {
      console.error('❌ No object found with id:', id)
      return
    }
    
    // Create the updated object
    const updated = { 
      ...existingObject, 
      ...updates, 
      updated: new Date().toISOString() 
    } as DrawingObject & { _imageUrl?: string }
    
    // Update state
    setObjects(prev => prev.map(obj => obj.id === id ? updated : obj))
    
    // Save to database (without _imageUrl)
    const { _imageUrl, ...objectToSave } = updated
    try {
      await window.App.file.saveObject(objectToSave, tabId)
      console.log('✅ Saved object:', id)
    } catch (error) {
      console.error('❌ Failed to save object update:', error)
    }
  }, [tabId])

  // Delete an object
  const deleteObject = useCallback(async (id: string) => {
    setObjects(prev => prev.filter(obj => obj.id !== id))
    
    // Delete from database
    try {
      await window.App.file.deleteObject(id, tabId)
    } catch (error) {
      console.error('Failed to delete object:', error)
    }
  }, [tabId])

  // Select an object (or multiple with Ctrl)
  const selectObject = useCallback((id: string | null, addToSelection = false) => {
    if (id === null) {
      setSelectedObjectIds([])
    } else if (addToSelection) {
      setSelectedObjectIds(prev => 
        prev.includes(id) 
          ? prev.filter(objId => objId !== id) // Toggle off if already selected
          : [...prev, id] // Add to selection
      )
    } else {
      setSelectedObjectIds([id])
    }
  }, [])

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
    setObjects(prev => prev.map(obj => {
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
            points: freehandObj.object_data.points.map((point: { x: number; y: number }) => ({
              x: point.x + deltaX,
              y: point.y + deltaY
            }))
          },
          updated: new Date().toISOString()
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
              controlPoints: arrowObj.object_data.controlPoints.map((point: { x: number; y: number }) => ({
                x: point.x + deltaX,
                y: point.y + deltaY
              }))
            })
          },
          updated: new Date().toISOString()
        }
      }
      
      // For other objects, just update x and y
      return { ...obj, x, y, updated: new Date().toISOString() }
    }))
  }, [])

  // Save object position after drag (persists to database)
  const saveObjectPosition = useCallback(async (id: string, x: number, y: number) => {
    // Skip saving if no file is open (no tabId)
    if (!tabId) return
    
    const object = objectsRef.current.find(obj => obj.id === id)
    if (!object) return

    const { _imageUrl, ...objectToSave } = object
    try {
      await window.App.file.saveObject({
        ...objectToSave,
        x,
        y,
        updated: new Date().toISOString()
      }, tabId)
      console.log(`Saved object ${id} position: (${x}, ${y})`)
    } catch (error) {
      console.error('Failed to save object position:', error)
    }
  }, [tabId])

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
