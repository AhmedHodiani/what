import { useMemo } from 'react'
import type { FreehandObject } from 'lib/types/canvas'

interface FreehandWidgetProps {
  object: FreehandObject
  isSelected: boolean
  zoom: number
  onSelect: (id: string, event?: React.MouseEvent) => void
  onContextMenu: (event: React.MouseEvent, id: string) => void
  onStartDrag: (e: React.MouseEvent, id: string) => void
}

/**
 * FreehandWidget - Pen/brush drawing strokes
 * 
 * Features:
 * - SVG path from points array
 * - Smooth curves
 * - Customizable stroke color, width, and opacity
 * - No resize handles (strokes are immutable after drawing)
 * - Selection highlights the path
 */
export function FreehandWidget({
  object,
  isSelected,
  zoom,
  onSelect,
  onContextMenu,
  onStartDrag,
}: FreehandWidgetProps) {
  const stroke = object.object_data.stroke || '#FFFFFF'
  const strokeWidth = object.object_data.strokeWidth || 5
  const opacity = object.object_data.opacity || 1

  // Convert points array to SVG path string
  const pathData = useMemo(() => {
    const points = object.object_data.points
    if (!points || points.length === 0) return ''
    if (points.length === 1) {
      // Single point - draw a small circle
      return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`
    }
    
    // Create smooth path through points
    let path = `M ${points[0].x} ${points[0].y}`
    
    // If only 2 points (straight line mode), just draw a line
    if (points.length === 2) {
      path += ` L ${points[1].x} ${points[1].y}`
      return path
    }
    
    // For 3+ points, use quadratic curves for smoothing
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2
      const yc = (points[i].y + points[i + 1].y) / 2
      path += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`
    }
    
    // Draw line to last point
    const lastPoint = points[points.length - 1]
    path += ` L ${lastPoint.x} ${lastPoint.y}`
    
    return path
  }, [object.object_data.points])

  // Calculate bounding box for hit detection
  const bounds = useMemo(() => {
    const points = object.object_data.points
    if (!points || points.length === 0) {
      return { minX: object.x, minY: object.y, maxX: object.x, maxY: object.y }
    }
    
    const xs = points.map(p => p.x)
    const ys = points.map(p => p.y)
    
    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    }
  }, [object.object_data.points, object.x, object.y])

  const handleClick = (e: React.MouseEvent) => {
    // Don't change selection on right-click (context menu)
    if (e.button === 2) return
    
    e.stopPropagation()
    ;(e as any)._clickedWidget = true
    onSelect(object.id, e)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't change selection on right-click (context menu)
    if (e.button === 2) return
    
    e.stopPropagation()
    ;(e as any)._clickedWidget = true
    onSelect(object.id, e)
    onStartDrag(e, object.id)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onContextMenu(e, object.id)
  }

  // Add padding for hit area
  const hitPadding = Math.max(strokeWidth / 2 + 5, 10)

  return (
    <g>
      {/* Invisible hit area for easier selection */}
      <path
        d={pathData}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(strokeWidth + 10, 20)}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ cursor: isSelected ? 'grab' : 'pointer', pointerEvents: 'stroke' }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
      />
      
      {/* Actual visible path */}
      <path
        d={pathData}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={opacity}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Selection indicator - bounding box */}
      {isSelected && (
        <>
          {/* Bounding box */}
          <rect
            x={bounds.minX - hitPadding}
            y={bounds.minY - hitPadding}
            width={bounds.maxX - bounds.minX + hitPadding * 2}
            height={bounds.maxY - bounds.minY + hitPadding * 2}
            fill="none"
            stroke="#007acc"
            strokeWidth={2 / zoom}
            strokeDasharray={`${8 / zoom} ${4 / zoom}`}
            style={{ pointerEvents: 'none' }}
          />
          
          {/* Corner indicators */}
          {[
            [bounds.minX, bounds.minY],
            [bounds.maxX, bounds.minY],
            [bounds.minX, bounds.maxY],
            [bounds.maxX, bounds.maxY],
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={4 / zoom}
              fill="#007acc"
              style={{ pointerEvents: 'none' }}
            />
          ))}
        </>
      )}
    </g>
  )
}
