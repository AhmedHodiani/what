import { useEffect, useRef } from 'react'

interface UseAutoResizeOptions {
  text: string
  fontSize: number
  fontFamily: string
  lineHeight: number
  fontWeight?: string
  fontStyle?: string
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  padding?: number
  onResize: (width: number, height: number) => void
}

/**
 * useAutoResize - Auto-resize text elements based on content
 * 
 * Calculates the natural size of text content and triggers resize callback
 * Uses a hidden canvas element for accurate text measurement
 */
export function useAutoResize({
  text,
  fontSize,
  fontFamily,
  lineHeight,
  fontWeight = 'normal',
  fontStyle = 'normal',
  minWidth = 100,
  minHeight = 50,
  maxWidth = 2000,
  maxHeight = 2000,
  padding = 32, // 16px * 2 (left + right or top + bottom)
  onResize,
}: UseAutoResizeOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    // Create or get canvas for text measurement
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set font properties
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`

    // Handle empty text
    if (!text || text.trim() === '') {
      onResize(minWidth, minHeight)
      return
    }

    // Split text into lines (including empty lines from Enter key)
    const lines = text.split('\n')
    
    // Calculate width based on longest line (or minimum if all lines are empty)
    let maxLineWidth = 0
    for (const line of lines) {
      if (line.length > 0) {
        const metrics = ctx.measureText(line)
        maxLineWidth = Math.max(maxLineWidth, metrics.width)
      }
    }

    // Calculate dimensions with proper line height handling
    const lineHeightPx = fontSize * lineHeight
    
    // Width: use measured width + padding, clamped to min/max
    const contentWidth = Math.ceil(
      Math.max(minWidth, Math.min(maxLineWidth + padding, maxWidth))
    )
    
    // Height: use actual line count (including empty lines) + padding
    const contentHeight = Math.ceil(
      Math.max(minHeight, Math.min(lines.length * lineHeightPx + padding, maxHeight))
    )

    // Trigger resize with calculated dimensions
    onResize(contentWidth, contentHeight)
  }, [
    text,
    fontSize,
    fontFamily,
    lineHeight,
    fontWeight,
    fontStyle,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    padding,
    onResize,
  ])

  // Cleanup
  useEffect(() => {
    return () => {
      canvasRef.current = null
    }
  }, [])
}
