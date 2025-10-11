import { useEffect } from 'react'

export interface PastedImage {
  file: File
  dataUrl: string
  width: number
  height: number
}

interface UseClipboardPasteOptions {
  onImagePaste: (image: PastedImage, mousePosition?: { x: number; y: number }) => void
  enabled?: boolean
}

/**
 * Hook for handling clipboard paste events (Ctrl+V) for images.
 * Automatically extracts image data from clipboard and provides it to the callback.
 * 
 * @param onImagePaste - Callback fired when an image is pasted
 * @param enabled - Whether paste handling is enabled (default: true)
 */
export function useClipboardPaste({ onImagePaste, enabled = true }: UseClipboardPasteOptions) {
  useEffect(() => {
    if (!enabled) return

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

          // Get mouse position at time of paste (if available)
          const mousePosition = {
            x: window.innerWidth / 2,  // Default to center if no mouse position
            y: window.innerHeight / 2,
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

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [onImagePaste, enabled])
}
