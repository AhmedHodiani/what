import { useCallback } from 'react'
import type {
  DrawingObject,
  StickyNoteObject,
  FileObject,
  Point,
} from 'lib/types/canvas'
import { logger } from 'shared/logger'
import { generateId } from 'lib/utils/id-generator'

interface UseCanvasFileOperationsOptions {
  tabId: string | null
  dimensions: { width: number; height: number }
  objectsLength: number
  screenToWorld: (screenX: number, screenY: number) => Point
  addObject: (object: DrawingObject) => Promise<void>
  selectObject: (id: string) => void
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
}

/**
 * Hook for handling file operations on the canvas:
 * - Image paste and drag-drop
 * - File paste and drag-drop
 * - Text paste (creates sticky note)
 * 
 * Separates all file I/O concerns from the main canvas component.
 */
export function useCanvasFileOperations({
  tabId,
  dimensions,
  objectsLength,
  screenToWorld,
  addObject,
  selectObject,
  showToast,
}: UseCanvasFileOperationsOptions) {
  /**
   * Handle clipboard paste for images
   */
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
          z_index: objectsLength,
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
    [dimensions, screenToWorld, objectsLength, addObject, selectObject, tabId]
  )

  /**
   * Handle file addition (for non-image files)
   */
  const handleFileAdd = useCallback(
    async (file: File, mousePosition?: { x: number; y: number }) => {
      try {
        // Read file as array buffer
        const arrayBuffer = await file.arrayBuffer()

        // Save asset
        const assetId = await window.App.file.saveAsset(
          file.name,
          arrayBuffer,
          file.type || 'application/octet-stream',
          tabId || undefined
        )

        // Get world position (use mouse position if available, otherwise center)
        const worldPos = mousePosition
          ? screenToWorld(mousePosition.x, mousePosition.y)
          : screenToWorld(dimensions.width / 2, dimensions.height / 2)

        // Create file object
        const newFile: FileObject = {
          id: `file-${Date.now()}`,
          type: 'file',
          x: worldPos.x - 75, // Center (150px width / 2)
          y: worldPos.y - 75, // Center (150px height / 2)
          width: 250,
          height: 320,
          z_index: objectsLength,
          object_data: {
            assetId,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || 'application/octet-stream',
          },
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        }

        await addObject(newFile)
        selectObject(newFile.id)
      } catch (error) {
        logger.error('Failed to add file:', error)
        showToast(`Failed to add file "${file.name}"`, 'error')
      }
    },
    [
      dimensions,
      screenToWorld,
      objectsLength,
      addObject,
      selectObject,
      tabId,
      showToast,
    ]
  )

  /**
   * Handle file paste (non-image files) from clipboard
   */
  const handleFilePaste = useCallback(
    async (
      pastedFile: { file: File },
      mousePosition?: { x: number; y: number }
    ) => {
      try {
        await handleFileAdd(pastedFile.file, mousePosition)
        showToast(`File "${pastedFile.file.name}" added to canvas`, 'success')
      } catch (error) {
        logger.error('Failed to paste file:', error)
        showToast(`Failed to add file "${pastedFile.file.name}"`, 'error')
      }
    },
    [handleFileAdd, showToast]
  )

  /**
   * Handle text paste from clipboard (creates sticky note)
   */
  const handleTextPaste = useCallback(
    async (
      pastedText: { text: string },
      mousePosition?: { x: number; y: number }
    ) => {
      try {
        // Random color from palette (excluding transparent)
        const colors = [
          '#fffacd',
          '#fddde6',
          '#d0e7f9',
          '#d8f4d8',
          '#ffe5b4',
          '#e8d5f9',
          '#d0fff0',
          '#ffcccb',
          '#f3e6ff',
          '#e0f7ff',
          '#fff8dc',
        ]
        const randomColor = colors[Math.floor(Math.random() * colors.length)]

        // Get world position (use mouse position if available, otherwise center)
        const worldPos = mousePosition
          ? screenToWorld(mousePosition.x, mousePosition.y)
          : screenToWorld(dimensions.width / 2, dimensions.height / 2)

        const stickyNote: StickyNoteObject = {
          id: generateId(),
          type: 'sticky-note',
          x: worldPos.x - 100, // Center the note
          y: worldPos.y - 100,
          width: 200,
          height: 200,
          z_index: objectsLength,
          object_data: {
            text: pastedText.text,
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
        showToast('Sticky note created from pasted text', 'success')
      } catch (error) {
        logger.error('Failed to paste text:', error)
        showToast('Failed to create sticky note from text', 'error')
      }
    },
    [
      screenToWorld,
      dimensions,
      objectsLength,
      addObject,
      selectObject,
      showToast,
    ]
  )

  /**
   * Handle drag-over event (allows drop)
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Show that drop is allowed
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  /**
   * Handle file drop event (supports images and generic files)
   */
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const files = Array.from(e.dataTransfer.files)
      if (files.length === 0) return

      const file = files[0] // Only handle the first file

      // Check if it's an image
      const isImage = file.type.startsWith('image/')

      if (isImage) {
        // Handle as image
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
                { x: e.clientX, y: e.clientY }
              )

              showToast(`Image "${file.name}" added to canvas`, 'success')
            }
            img.onerror = () => {
              showToast(`Failed to load image "${file.name}"`, 'error')
              logger.error(`Failed to load dropped image: ${file.name}`)
            }
            img.src = dataUrl
          }
          reader.onerror = () => {
            showToast(`Failed to read file "${file.name}"`, 'error')
            logger.error(`Failed to read dropped file: ${file.name}`)
          }
          reader.readAsDataURL(file)
        } catch (error) {
          showToast(`Error processing file "${file.name}"`, 'error')
          logger.error('Failed to process dropped file:', error)
        }
      } else {
        // Handle as generic file
        try {
          await handleFileAdd(file, { x: e.clientX, y: e.clientY })
          showToast(`File "${file.name}" added to canvas`, 'success')
        } catch (error) {
          showToast(`Error processing file "${file.name}"`, 'error')
          logger.error('Failed to process dropped file:', error)
        }
      }
    },
    [handleImagePaste, handleFileAdd, showToast]
  )

  return {
    handleImagePaste,
    handleFileAdd,
    handleFilePaste,
    handleTextPaste,
    handleDragOver,
    handleDrop,
  }
}
