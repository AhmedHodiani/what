import { useState, useRef, useCallback, useEffect } from 'react'
import type { Viewport, Point } from 'lib/types/canvas'
import { CanvasUtils } from 'lib/utils/canvas'

interface InfiniteCanvasProps {
  initialViewport?: Viewport
  minZoom?: number
  maxZoom?: number
  children?: React.ReactNode
}

export function InfiniteCanvas({
  initialViewport = { x: 0, y: 0, zoom: 1 },
  minZoom = 0.1,
  maxZoom = 5,
  children,
}: InfiniteCanvasProps) {
  const [viewport, setViewport] = useState<Viewport>(initialViewport)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 })
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Update dimensions when container size changes
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Handle mouse wheel for zooming (with non-passive listener)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()

      const rect = container.getBoundingClientRect()

      // Mouse position relative to canvas
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // Current mouse position in world coordinates
      const worldPoint = CanvasUtils.screenToWorld(
        { x: mouseX, y: mouseY },
        viewport,
        dimensions
      )

      // Calculate new zoom
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = CanvasUtils.clampZoom(
        viewport.zoom * zoomDelta,
        minZoom,
        maxZoom
      )

      // Calculate new viewport position to keep mouse point fixed
      const newViewportX =
        worldPoint.x - (mouseX - dimensions.width / 2) / newZoom
      const newViewportY =
        worldPoint.y - (mouseY - dimensions.height / 2) / newZoom

      setViewport({
        x: newViewportX,
        y: newViewportY,
        zoom: newZoom,
      })
    }

    // Add wheel listener with passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [viewport, dimensions, minZoom, maxZoom])

  // Handle mouse down for panning
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only pan with left mouse button
      if (e.button !== 0) return

      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      setIsPanning(true)
      setPanStart({
        x: e.clientX,
        y: e.clientY,
      })

      // Change cursor
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grabbing'
      }
    },
    []
  )

  // Handle mouse move for panning
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isPanning) return

      const deltaX = e.clientX - panStart.x
      const deltaY = e.clientY - panStart.y

      setViewport(prev => ({
        ...prev,
        x: prev.x - deltaX / prev.zoom,
        y: prev.y - deltaY / prev.zoom,
      }))

      setPanStart({
        x: e.clientX,
        y: e.clientY,
      })
    },
    [isPanning, panStart]
  )

  // Handle mouse up to stop panning
  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    
    // Reset cursor
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab'
    }
  }, [])

  // Add global mouse event listeners for panning
  useEffect(() => {
    if (isPanning) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isPanning, handleMouseMove, handleMouseUp])

  // Calculate SVG viewBox for viewport transformation
  const viewBox = `${viewport.x - dimensions.width / (2 * viewport.zoom)} ${
    viewport.y - dimensions.height / (2 * viewport.zoom)
  } ${dimensions.width / viewport.zoom} ${dimensions.height / viewport.zoom}`

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
        {/* Grid pattern for visual reference */}
        <defs>
          <pattern
            id="grid"
            width={50}
            height={50}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 50 0 L 0 0 0 50"
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
          width={dimensions.width * 2 / viewport.zoom}
          height={dimensions.height * 2 / viewport.zoom}
          fill="url(#grid)"
        />

        {/* Content goes here */}
        {children}
      </svg>

      {/* Viewport info overlay */}
      <div className="absolute top-3 left-3 bg-black/80 text-teal-400 px-3 py-2 rounded-md text-xs font-mono pointer-events-none flex flex-col gap-1 border border-teal-400/30">
        <div>Zoom: {(viewport.zoom * 100).toFixed(0)}%</div>
        <div>
          Position: ({viewport.x.toFixed(0)}, {viewport.y.toFixed(0)})
        </div>
        <div className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-0.5 text-[11px] text-gray-500">
          <span>🖱️ Drag to pan</span>
          <span>🖲️ Scroll to zoom</span>
        </div>
      </div>
    </div>
  )
}
