import { useMemo } from 'react'
import type { ArrowObject, Point } from 'lib/types/canvas'

interface ArrowWidgetProps {
  object: ArrowObject
  isSelected: boolean
  zoom: number
  onSelect: (id: string, event?: React.MouseEvent) => void
  onContextMenu: (event: React.MouseEvent, id: string) => void
  onStartDrag: (e: React.MouseEvent, id: string) => void
}

/**
 * ArrowWidget - Arrow drawing (path with arrowhead at end)
 *
 * Features:
 * - Same as freehand but with arrow marker at end
 * - SVG path from points array
 * - Smooth curves or straight lines (Ctrl mode)
 * - Customizable stroke color, width, and opacity
 * - Arrowhead size scales with stroke width
 */
export function ArrowWidget({
  object,
  isSelected,
  zoom,
  onSelect,
  onContextMenu,
  onStartDrag,
}: ArrowWidgetProps) {
  const stroke = object.object_data.stroke || '#FFFFFF'
  const strokeWidth = object.object_data.strokeWidth || 5
  const opacity = object.object_data.opacity || 1
  const points = (object.object_data.controlPoints || []) as Point[]

  // Convert points array to SVG path string (same as freehand)
  const pathData = useMemo(() => {
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
  }, [points])

  // Calculate arrowhead position and angle
  const arrowhead = useMemo(() => {
    if (!points || points.length < 2) return null

    const lastPoint = points[points.length - 1]

    // Look back further for more stable angle calculation
    // Use a point that's at least 20 pixels away or 1/4 of the path back
    let referencePoint = points[points.length - 2]
    const lookbackDistance = 20 // minimum distance to look back

    for (let i = points.length - 2; i >= 0; i--) {
      const dist = Math.sqrt(
        (lastPoint.x - points[i].x) ** 2 + (lastPoint.y - points[i].y) ** 2
      )
      if (dist >= lookbackDistance) {
        referencePoint = points[i]
        break
      }
    }

    // Calculate angle from reference point to last point
    const angle = Math.atan2(
      lastPoint.y - referencePoint.y,
      lastPoint.x - referencePoint.x
    )

    // Arrowhead size based on stroke width - more proportional
    const arrowLength = Math.max(strokeWidth * 3, 15) // Longer for better look
    const arrowWidth = arrowLength * 0.5 // Narrower, more elegant

    // Calculate arrow head points
    const tipX = lastPoint.x
    const tipY = lastPoint.y

    // Back from tip along the line
    const baseX = tipX - arrowLength * Math.cos(angle)
    const baseY = tipY - arrowLength * Math.sin(angle)

    // Perpendicular offset for the sides
    const leftX = baseX - arrowWidth * Math.sin(angle)
    const leftY = baseY + arrowWidth * Math.cos(angle)

    const rightX = baseX + arrowWidth * Math.sin(angle)
    const rightY = baseY - arrowWidth * Math.cos(angle)

    // Add slight curve to the arrowhead for hand-drawn feel
    // Control point for curves (slightly behind the base)
    const curveDepth = arrowLength * 0.3
    const leftCtrlX =
      baseX - curveDepth * Math.cos(angle) - arrowWidth * 0.7 * Math.sin(angle)
    const leftCtrlY =
      baseY - curveDepth * Math.sin(angle) + arrowWidth * 0.7 * Math.cos(angle)

    const rightCtrlX =
      baseX - curveDepth * Math.cos(angle) + arrowWidth * 0.7 * Math.sin(angle)
    const rightCtrlY =
      baseY - curveDepth * Math.sin(angle) - arrowWidth * 0.7 * Math.cos(angle)

    return {
      tipX,
      tipY,
      leftX,
      leftY,
      rightX,
      rightY,
      leftCtrlX,
      leftCtrlY,
      rightCtrlX,
      rightCtrlY,
    }
  }, [points, strokeWidth])

  // Calculate bounding box for hit detection
  const bounds = useMemo(() => {
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
  }, [points, object.x, object.y])

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
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseDown={handleMouseDown}
        stroke="transparent"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={Math.max(strokeWidth + 10, 20)}
        style={{
          cursor: isSelected ? 'grab' : 'pointer',
          pointerEvents: 'stroke',
        }}
      />

      {/* Actual visible path */}
      <path
        d={pathData}
        fill="none"
        opacity={opacity}
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        style={{ pointerEvents: 'none' }}
      />

      {/* Arrowhead */}
      {arrowhead && (
        <path
          d={`M ${arrowhead.tipX} ${arrowhead.tipY} 
              Q ${arrowhead.leftCtrlX} ${arrowhead.leftCtrlY}, ${arrowhead.leftX} ${arrowhead.leftY}
              L ${arrowhead.rightX} ${arrowhead.rightY}
              Q ${arrowhead.rightCtrlX} ${arrowhead.rightCtrlY}, ${arrowhead.tipX} ${arrowhead.tipY}
              Z`}
          fill={stroke}
          opacity={opacity}
          stroke={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth * 0.5}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Selection indicator - bounding box */}
      {isSelected && (
        <>
          {/* Bounding box */}
          <rect
            fill="none"
            height={bounds.maxY - bounds.minY + hitPadding * 2}
            stroke="#007acc"
            strokeDasharray={`${8 / zoom} ${4 / zoom}`}
            strokeWidth={2 / zoom}
            style={{ pointerEvents: 'none' }}
            width={bounds.maxX - bounds.minX + hitPadding * 2}
            x={bounds.minX - hitPadding}
            y={bounds.minY - hitPadding}
          />

          {/* Corner indicators */}
          {[
            [bounds.minX, bounds.minY],
            [bounds.maxX, bounds.minY],
            [bounds.minX, bounds.maxY],
            [bounds.maxX, bounds.maxY],
          ].map(([x, y], i) => (
            <circle
              cx={x}
              cy={y}
              fill="#007acc"
              key={i}
              r={4 / zoom}
              style={{ pointerEvents: 'none' }}
            />
          ))}
        </>
      )}
    </g>
  )
}
