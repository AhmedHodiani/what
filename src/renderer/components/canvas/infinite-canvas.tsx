import { useRef, useMemo } from 'react'
import type { Viewport } from 'lib/types/canvas'
import { sanitizeViewport } from 'lib/types/canvas-validators'
import { useContainerSize } from 'renderer/hooks/use-container-size'
import { useViewport } from 'renderer/hooks/use-viewport'
import { useCanvasPan } from 'renderer/hooks/use-canvas-pan'
import { useCanvasZoom } from 'renderer/hooks/use-canvas-zoom'
import { CanvasGrid } from './canvas-grid'
import { CanvasViewportDisplay } from './canvas-viewport-display'

interface InfiniteCanvasProps {
  initialViewport?: Viewport
  minZoom?: number
  maxZoom?: number
  onViewportChange?: (viewport: Viewport) => void
  showViewportInfo?: boolean
  showGrid?: boolean
  children?: React.ReactNode
}

/**
 * InfiniteCanvas - A zoomable, pannable SVG canvas component.
 * 
 * Features:
 * - Pan with left-click drag
 * - Zoom with mouse wheel (towards cursor)
 * - Responsive to container size changes
 * - Optional grid and viewport display
 * 
 * @example
 * ```tsx
 * <InfiniteCanvas
 *   initialViewport={{ x: 0, y: 0, zoom: 1 }}
 *   onViewportChange={(viewport) => saveViewport(viewport)}
 * >
 *   <circle cx={0} cy={0} r={50} fill="teal" />
 * </InfiniteCanvas>
 * ```
 */
export function InfiniteCanvas({
  initialViewport,
  minZoom = 0.1,
  maxZoom = 5,
  onViewportChange,
  showViewportInfo = true,
  showGrid = true,
  children,
}: InfiniteCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  // Sanitize initial viewport to ensure valid values
  const safeInitialViewport = useMemo(
    () => (initialViewport ? sanitizeViewport(initialViewport, minZoom, maxZoom) : undefined),
    [initialViewport, minZoom, maxZoom]
  )

  // Use our custom hooks for clean separation of concerns
  const { size: dimensions, ref: containerRef } = useContainerSize()
  const { viewport, setViewport } = useViewport({
    initialViewport: safeInitialViewport,
    onViewportChange,
  })

  // Handle panning - use functional update to always get latest viewport
  const { handleMouseDown } = useCanvasPan(containerRef, (deltaX, deltaY) => {
    setViewport((prev) => ({
      x: prev.x - deltaX / prev.zoom,
      y: prev.y - deltaY / prev.zoom,
      zoom: prev.zoom,
    }))
  })

  // Handle zooming
  useCanvasZoom({
    containerRef,
    viewport,
    dimensions,
    minZoom,
    maxZoom,
    onZoom: setViewport,
  })

  // Calculate SVG viewBox for viewport transformation
  // Memoize to avoid recalculating on every render
  const viewBox = useMemo(() => {
    const halfWidth = dimensions.width / (2 * viewport.zoom)
    const halfHeight = dimensions.height / (2 * viewport.zoom)
    return `${viewport.x - halfWidth} ${viewport.y - halfHeight} ${
      dimensions.width / viewport.zoom
    } ${dimensions.height / viewport.zoom}`
  }, [viewport, dimensions])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-[#0a0a0a] cursor-grab select-none active:cursor-grabbing"
      onMouseDown={handleMouseDown}
    >
      <svg
        ref={svgRef}
        className="block w-full h-full"
        width={dimensions.width}
        height={dimensions.height}
        viewBox={viewBox}
      >
        {/* Grid pattern */}
        {showGrid && <CanvasGrid viewport={viewport} dimensions={dimensions} />}

        {/* Canvas content */}
        {children}
      </svg>

      {/* Viewport info overlay */}
      {showViewportInfo && <CanvasViewportDisplay viewport={viewport} />}
    </div>
  )
}
