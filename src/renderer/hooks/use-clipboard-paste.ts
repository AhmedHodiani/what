import { useEffect, type RefObject } from 'react'

export interface PastedImage {
  file: File
  dataUrl: string
  width: number
  height: number
}

export interface PastedFile {
  file: File
}

export interface PastedText {
  text: string
}

interface UseClipboardPasteOptions {
  onImagePaste: (
    image: PastedImage,
    mousePosition?: { x: number; y: number }
  ) => void
  onFilePaste?: (
    file: PastedFile,
    mousePosition?: { x: number; y: number }
  ) => void
  onTextPaste?: (
    text: PastedText,
    mousePosition?: { x: number; y: number }
  ) => void
  enabled?: boolean
  containerRef?: RefObject<HTMLElement | null> // Reference to canvas container for position tracking
}

/**
 * Hook for handling clipboard paste events (Ctrl+V) for images, files, and text.
 * Automatically extracts data from clipboard and provides it to the appropriate callback.
 *
 * @param onImagePaste - Callback fired when an image is pasted
 * @param onFilePaste - Callback fired when a non-image file is pasted
 * @param onTextPaste - Callback fired when plain text is pasted
 * @param enabled - Whether paste handling is enabled (default: true)
 * @param containerRef - Reference to container element for accurate mouse position
 */
export function useClipboardPaste({
  onImagePaste,
  onFilePaste,
  onTextPaste,
  enabled = true,
  containerRef,
}: UseClipboardPasteOptions) {
  useEffect(() => {
    if (!enabled) return

    // Track last known mouse position
    let lastMousePosition = { x: 0, y: 0 }

    const handleMouseMove = (e: MouseEvent) => {
      lastMousePosition = { x: e.clientX, y: e.clientY }
    }

    const handlePaste = async (e: ClipboardEvent) => {
      // Check if clipboard has data
      const items = e.clipboardData?.items
      const files = e.clipboardData?.files

      if (!items && !files) return

      // Use last known mouse position, or fallback to container center
      let mousePosition = lastMousePosition

      // If no mouse movement detected yet, use container center
      if (
        mousePosition.x === 0 &&
        mousePosition.y === 0 &&
        containerRef?.current
      ) {
        const rect = containerRef.current.getBoundingClientRect()
        mousePosition = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        }
      }

      // Flag to track if we've already handled the paste
      let handled = false

      // FIRST: Try to process through items (more reliable for detecting type)
      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i]

          // Handle images
          if (item.type.indexOf('image') !== -1) {
            e.preventDefault()
            handled = true

            const file = item.getAsFile()
            if (!file) continue

            // Read the image to get dimensions
            const dataUrl = await new Promise<string>(resolve => {
              const reader = new FileReader()
              reader.onload = event => resolve(event.target?.result as string)
              reader.readAsDataURL(file)
            })

            // Get image dimensions
            const dimensions = await new Promise<{
              width: number
              height: number
            }>(resolve => {
              const img = new Image()
              img.onload = () =>
                resolve({ width: img.width, height: img.height })
              img.src = dataUrl
            })

            onImagePaste(
              {
                file,
                dataUrl,
                width: dimensions.width,
                height: dimensions.height,
              },
              mousePosition
            )

            return // Exit after handling
          }
          // Handle non-image files
          else if (item.kind === 'file' && onFilePaste) {
            e.preventDefault()
            handled = true

            const file = item.getAsFile()
            if (!file) continue

            onFilePaste({ file }, mousePosition)
            return // Exit after handling
          }
        }
      }

      // SECOND: Fallback to files array (for file manager copy/paste)
      // Only process if we haven't already handled the paste above
      if (!handled && files && files.length > 0) {
        const file = files[0]

        // Handle images
        if (file.type.startsWith('image/')) {
          e.preventDefault()
          handled = true

          // Read the image to get dimensions
          const dataUrl = await new Promise<string>(resolve => {
            const reader = new FileReader()
            reader.onload = event => resolve(event.target?.result as string)
            reader.readAsDataURL(file)
          })

          // Get image dimensions
          const dimensions = await new Promise<{
            width: number
            height: number
          }>(resolve => {
            const img = new Image()
            img.onload = () =>
              resolve({ width: img.width, height: img.height })
            img.src = dataUrl
          })

          onImagePaste(
            {
              file,
              dataUrl,
              width: dimensions.width,
              height: dimensions.height,
            },
            mousePosition
          )
        }
        // Handle non-image files
        else if (onFilePaste) {
          e.preventDefault()
          handled = true
          onFilePaste({ file }, mousePosition)
        }
      }

      // THIRD: Handle plain text paste (only if nothing else was handled)
      if (!handled && onTextPaste && e.clipboardData) {
        const text = e.clipboardData.getData('text/plain')
        
        // Only process if there's actual text content
        if (text && text.trim().length > 0) {
          e.preventDefault()
          onTextPaste({ text: text.trim() }, mousePosition)
        }
      }
    }

    // Track mouse position globally for paste events
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('paste', handlePaste)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('paste', handlePaste)
    }
  }, [onImagePaste, onFilePaste, onTextPaste, enabled, containerRef])
}
