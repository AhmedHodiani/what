import type { Viewport } from 'lib/types/canvas'

interface CanvasGridProps {
  viewport: Viewport
  dimensions: { width: number; height: number }
  gridSize?: number
}

/**
 * Canvas grid pattern component.
 * Renders a subtle grid for visual reference.
 */
export function CanvasGrid({ viewport, dimensions, gridSize = 50 }: CanvasGridProps) {
  return (
    <>
      {/* Grid pattern definition */}
      <defs>
        <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
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
        fill="url(#grid)"
      />
    </>
  )
}
