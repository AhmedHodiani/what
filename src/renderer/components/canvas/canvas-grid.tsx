import { useMemo } from 'react'
import type { Viewport } from 'lib/types/canvas'

interface CanvasGridProps {
  viewport: Viewport
  dimensions: { width: number; height: number }
  gridSize?: number
}

// Generate unique ID for each canvas instance to avoid conflicts
let gridIdCounter = 0

/**
 * Canvas grid pattern component.
 * Renders a subtle grid for visual reference.
 * Each instance gets a unique pattern ID to avoid conflicts when multiple canvases are open.
 */
export function CanvasGrid({ viewport, dimensions, gridSize = 50 }: CanvasGridProps) {
  // Generate a unique pattern ID for this canvas instance (only once per mount)
  const patternId = useMemo(() => `grid-${++gridIdCounter}`, [])

  return (
    <>
      {/* Grid pattern definition */}
      <defs>
        <pattern id={patternId} width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
          <path
            d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={1 / viewport.zoom}
          />
        </pattern>
      </defs>

      {/* Background grid */}
      <rect
        x={viewport.x - dimensions.width / viewport.zoom}
        y={viewport.y - dimensions.height / viewport.zoom}
        width={(dimensions.width * 2) / viewport.zoom}
        height={(dimensions.height * 2) / viewport.zoom}
        fill={`url(#${patternId})`}
      />
    </>
  )
}
