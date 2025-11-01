import { useMemo } from 'react'
import type { Viewport } from 'lib/types/canvas'

interface CanvasGridProps {
  viewport: Viewport
  dimensions: { width: number; height: number }
  gridSize?: number
  isDotted?: boolean // If true, shows dots; if false, shows grid lines
}

// Generate unique ID for each canvas instance to avoid conflicts
let gridIdCounter = 0

/**
 * Canvas grid pattern component.
 * Renders either a subtle grid or dots for visual reference.
 * Each instance gets a unique pattern ID to avoid conflicts when multiple canvases are open.
 */
export function CanvasGrid({
  viewport,
  dimensions,
  gridSize = 150,
  isDotted = true,
}: CanvasGridProps) {
  // Generate a unique pattern ID for this canvas instance (only once per mount)
  const patternId = useMemo(() => `grid-${++gridIdCounter}`, [])

  return (
    <>
      {/* Grid or dots pattern definition */}
      <defs>
        <pattern
          height={gridSize}
          id={patternId}
          patternUnits="userSpaceOnUse"
          width={gridSize}
        >
          {isDotted ? (
            // Dots mode: single dot at the corner of each grid cell
            <circle
              cx={0}
              cy={0}
              fill="rgba(255, 255, 255, 0.2)"
              r={2 / viewport.zoom}
            />
          ) : (
            // Grid lines mode: L-shaped corner lines
            <path
              d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth={1 / viewport.zoom}
            />
          )}
        </pattern>
      </defs>

      {/* Background grid or dots */}
      <rect
        fill={`url(#${patternId})`}
        height={(dimensions.height * 2) / viewport.zoom}
        width={(dimensions.width * 2) / viewport.zoom}
        x={viewport.x - dimensions.width / viewport.zoom}
        y={viewport.y - dimensions.height / viewport.zoom}
      />
    </>
  )
}
