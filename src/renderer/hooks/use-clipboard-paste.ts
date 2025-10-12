import { useEffect, RefObject } from 'react'

export interface PastedImage {
  file: File
  dataUrl: string
  width: number
  height: number
}

interface UseClipboardPasteOptions {
  onImagePaste: (image: PastedImage, mousePosition?: { x: number; y: number }) => void
  enabled?: boolean
  containerRef?: RefObject<HTMLElement | null> // Reference to canvas container for position tracking
}

/**
 * Hook for handling clipboard paste events (Ctrl+V) for images.
 * Automatically extracts image data from clipboard and provides it to the callback.
 * 
 * @param onImagePaste - Callback fired when an image is pasted
 * @param enabled - Whether paste handling is enabled (default: true)
 * @param containerRef - Reference to container element for accurate mouse position
 */
export function useClipboardPaste({ onImagePaste, enabled = true, containerRef }: UseClipboardPasteOptions) {
  useEffect(() => {
    if (!enabled) return

    // Track last known mouse position
    let lastMousePosition = { x: 0, y: 0 }

    const handleMouseMove = (e: MouseEvent) => {
      lastMousePosition = { x: e.clientX, y: e.clientY }
    }

    const handlePaste = async (e: ClipboardEvent) => {
      // Check if clipboard has image data
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        
        // Check if this item is an image
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault()
          
          const file = item.getAsFile()
          if (!file) continue

          // Read the image to get dimensions
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = (event) => resolve(event.target?.result as string)
            reader.readAsDataURL(file)
          })

          // Get image dimensions
          const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
            const img = new Image()
            img.onload = () => resolve({ width: img.width, height: img.height })
            img.src = dataUrl
          })

          // Use last known mouse position, or fallback to container center
          let mousePosition = lastMousePosition
          
          // If no mouse movement detected yet, use container center
          if (mousePosition.x === 0 && mousePosition.y === 0 && containerRef?.current) {
            const rect = containerRef.current.getBoundingClientRect()
            mousePosition = {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            }
          }

          onImagePaste(
            {
              file,
              dataUrl,
              width: dimensions.width,
              height: dimensions.height,
            },
            mousePosition
          )
          
          break // Only handle first image
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
  }, [onImagePaste, enabled, containerRef])
}
