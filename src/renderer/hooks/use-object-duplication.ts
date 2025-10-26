import { useCallback, useRef, useEffect } from 'react'
import type { DrawingObject, Point } from 'lib/types/canvas'
import { logger } from 'shared/logger'

interface UseObjectDuplicationOptions {
  tabId: string | null
  objects: DrawingObject[]
  selectedObjectIds: string[]
  isActive: boolean
  screenToWorld: (screenX: number, screenY: number) => Point
  addObject: (object: DrawingObject) => Promise<void>
  selectMultipleObjects: (ids: string[]) => void
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
}

const DUPLICATE_DEBOUNCE_MS = 300 // 300ms cooldown between duplicates
const STANDARD_OBJECT_OFFSET = 20 // Offset for standard objects

/**
 * Hook for duplicating canvas objects with Ctrl+D
 * 
 * Features:
 * - Duplicates all selected objects at mouse position
 * - Handles asset duplication for images and files (creates separate copies)
 * - Special positioning for freehand/arrow objects (point-based)
 * - Debounce protection (prevents spam)
 * - Auto-selects duplicated objects
 * - Toast notifications
 */
export function useObjectDuplication({
  tabId,
  objects,
  selectedObjectIds,
  isActive,
  screenToWorld,
  addObject,
  selectMultipleObjects,
  showToast,
}: UseObjectDuplicationOptions) {
  // Track mouse position for duplicate placement
  const lastMousePositionRef = useRef({ x: 0, y: 0 })
  const lastDuplicateTimeRef = useRef<number>(0)

  // Refs for callback stability
  const selectedObjectIdsRef = useRef(selectedObjectIds)
  const isActiveRef = useRef(isActive)
  const objectsRef = useRef(objects)

  useEffect(() => {
    selectedObjectIdsRef.current = selectedObjectIds
    isActiveRef.current = isActive
    objectsRef.current = objects
  }, [selectedObjectIds, isActive, objects])

  // Track mouse position globally
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      lastMousePositionRef.current = { x: e.clientX, y: e.clientY }
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [])

  /**
   * Duplicate asset (image or file) - creates a new copy in storage
   */
  const duplicateAsset = useCallback(
    async (
      assetId: string,
      fileName: string,
      mimeType: string
    ): Promise<string | null> => {
      try {
        // Get original asset data
        const assetDataUrl = await window.App.file.getAssetDataUrl(
          assetId,
          tabId || undefined
        )
        if (!assetDataUrl) return null

        // Convert data URL to buffer
        const base64Data = assetDataUrl.split(',')[1]
        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }

        // Save as new asset
        const newAssetId = await window.App.file.saveAsset(
          fileName,
          bytes.buffer,
          mimeType,
          tabId || undefined
        )

        return newAssetId
      } catch (error) {
        logger.error('Failed to duplicate asset:', error)
        return null
      }
    },
    [tabId]
  )

  /**
   * Duplicate a freehand object (offset all points to mouse position)
   */
  const duplicateFreehandObject = useCallback(
    (
      originalObject: DrawingObject,
      newId: string,
      worldPos: Point,
      zIndex: number,
      objectData: Record<string, any>
    ): DrawingObject => {
      // Use the already-cloned objectData instead of reading from originalObject
      const points = (objectData.points as Point[]) || []

      // Calculate the center of the original points
      const xs = points.map(p => p.x)
      const ys = points.map(p => p.y)
      const centerX = (Math.min(...xs) + Math.max(...xs)) / 2
      const centerY = (Math.min(...ys) + Math.max(...ys)) / 2

      // Calculate offset from original center to mouse position
      const offsetX = worldPos.x - centerX
      const offsetY = worldPos.y - centerY

      // Offset all points
      const offsetPoints = points.map(p => ({
        x: p.x + offsetX,
        y: p.y + offsetY,
      }))

      return {
        ...originalObject,
        id: newId,
        x: 0, // Freehand x/y stay at 0
        y: 0,
        z_index: zIndex,
        object_data: { ...objectData, points: offsetPoints },
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      } as DrawingObject
    },
    []
  )

  /**
   * Duplicate an arrow object (offset control points, recalculate bounding box)
   */
  const duplicateArrowObject = useCallback(
    (
      originalObject: DrawingObject,
      newId: string,
      worldPos: Point,
      zIndex: number,
      objectData: Record<string, any>
    ): DrawingObject => {
      // Use the already-cloned objectData instead of reading from originalObject
      const points = (objectData.controlPoints as Point[]) || []

      // Calculate the center of the original points
      const xs = points.map(p => p.x)
      const ys = points.map(p => p.y)
      const centerX = (Math.min(...xs) + Math.max(...xs)) / 2
      const centerY = (Math.min(...ys) + Math.max(...ys)) / 2

      // Calculate offset from original center to mouse position
      const offsetX = worldPos.x - centerX
      const offsetY = worldPos.y - centerY

      // Offset all points
      const offsetPoints = points.map(p => ({
        x: p.x + offsetX,
        y: p.y + offsetY,
      }))

      // Calculate new bounding box
      const newXs = offsetPoints.map(p => p.x)
      const newYs = offsetPoints.map(p => p.y)
      const minX = Math.min(...newXs)
      const minY = Math.min(...newYs)
      const maxX = Math.max(...newXs)
      const maxY = Math.max(...newYs)

      return {
        ...originalObject,
        id: newId,
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        z_index: zIndex,
        object_data: {
          ...objectData,
          controlPoints: offsetPoints,
          startX: offsetPoints[0].x,
          startY: offsetPoints[0].y,
          endX: offsetPoints[offsetPoints.length - 1].x,
          endY: offsetPoints[offsetPoints.length - 1].y,
        },
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      } as DrawingObject
    },
    []
  )

  /**
   * Duplicate a standard object (sticky, image, file, shape, emoji, youtube)
   */
  const duplicateStandardObject = useCallback(
    (
      originalObject: DrawingObject,
      newId: string,
      worldPos: Point,
      zIndex: number,
      objectData: Record<string, any>
    ): DrawingObject => {
      // Center the object on the mouse cursor (like when creating new objects)
      const width = 'width' in originalObject ? originalObject.width : 0
      const height = 'height' in originalObject ? originalObject.height : 0
      const centeredX = worldPos.x - (width / 2)
      const centeredY = worldPos.y - (height / 2)
      
      return {
        ...originalObject,
        id: newId,
        x: centeredX,
        y: centeredY,
        z_index: zIndex,
        object_data: objectData,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      } as DrawingObject
    },
    []
  )

  /**
   * Main duplication handler - duplicates all selected objects
   */
  const duplicateObjects = useCallback(async () => {
    const ids = selectedObjectIdsRef.current
    const active = isActiveRef.current
    const currentObjects = objectsRef.current

    if (ids.length === 0 || !active) return

    // Debounce check - prevent rapid consecutive duplicates
    const now = Date.now()
    if (now - lastDuplicateTimeRef.current < DUPLICATE_DEBOUNCE_MS) {
      return // Ignore this duplicate request
    }
    lastDuplicateTimeRef.current = now

    const newObjectIds: string[] = []

    // Get mouse world position for placement
    const mousePos = lastMousePositionRef.current
    const worldPos = screenToWorld(mousePos.x, mousePos.y)

    for (const id of ids) {
      const originalObject = currentObjects.find(obj => obj.id === id)
      if (!originalObject) continue

      try {
        // CRITICAL: Deep clone the entire original object to prevent any mutations
        const originalObjectClone = JSON.parse(JSON.stringify(originalObject))
        
        // Generate new ID
        const newId = `${originalObjectClone.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        // Deep clone object data (JSON parse/stringify to avoid reference issues)
        let newObjectData = JSON.parse(JSON.stringify(originalObjectClone.object_data))

        // Handle asset duplication for images, files, and spreadsheets
        if (originalObjectClone.type === 'image' || originalObjectClone.type === 'file' || originalObjectClone.type === 'spreadsheet') {
          const assetId = originalObjectClone.object_data.assetId as string
          
          if (assetId) {
            let fileName: string
            let mimeType: string
            
            if (originalObjectClone.type === 'file') {
              fileName = (originalObjectClone.object_data.fileName as string)
              mimeType = (originalObjectClone.object_data.mimeType as string)
            } else if (originalObjectClone.type === 'spreadsheet') {
              fileName = `spreadsheet-${Date.now()}.json`
              mimeType = 'application/json'
            } else {
              // image
              fileName = `image-${Date.now()}.png`
              mimeType = 'image/png'
            }

            const newAssetId = await duplicateAsset(assetId, fileName, mimeType)
            if (newAssetId) {
              newObjectData = { ...newObjectData, assetId: newAssetId }
            }
          }
        }

        // Create duplicated object based on type
        let duplicatedObject: DrawingObject

        const zIndex = currentObjects.length + newObjectIds.length

        if (originalObjectClone.type === 'freehand') {
          duplicatedObject = duplicateFreehandObject(
            originalObjectClone,
            newId,
            worldPos,
            zIndex,
            newObjectData
          )
        } else if (originalObjectClone.type === 'arrow') {
          duplicatedObject = duplicateArrowObject(
            originalObjectClone,
            newId,
            worldPos,
            zIndex,
            newObjectData
          )
        } else {
          duplicatedObject = duplicateStandardObject(
            originalObjectClone,
            newId,
            worldPos,
            zIndex,
            newObjectData
          )
        }

        // Add image URL for immediate display (images only)
        if (originalObjectClone.type === 'image' && '_imageUrl' in originalObject) {
          const assetDataUrl = await window.App.file.getAssetDataUrl(
            (newObjectData as any).assetId,
            tabId || undefined
          )
          if (assetDataUrl) {
            ;(duplicatedObject as any)._imageUrl = assetDataUrl
          }
        }

        await addObject(duplicatedObject)
        newObjectIds.push(newId)
      } catch (error) {
        logger.error(`Failed to duplicate object ${id}:`, error)
      }
    }

    // Select the duplicated objects
    if (newObjectIds.length > 0) {
      selectMultipleObjects(newObjectIds)
      showToast(
        `Duplicated ${newObjectIds.length} object${newObjectIds.length > 1 ? 's' : ''}`,
        'success'
      )
    }
  }, [
    screenToWorld,
    addObject,
    selectMultipleObjects,
    showToast,
    tabId,
    duplicateAsset,
    duplicateFreehandObject,
    duplicateArrowObject,
    duplicateStandardObject,
  ])

  return {
    duplicateObjects,
  }
}
