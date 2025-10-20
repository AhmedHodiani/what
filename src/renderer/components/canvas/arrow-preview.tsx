interface Point {
  x: number
  y: number
}

interface ArrowPreviewProps {
  path: Point[]
  strokeColor: string
  strokeWidth: number
  opacity: number
}

/**
 * Renders a smooth preview of an arrow drawing path with arrowhead
 * Uses quadratic Bezier curves for the path and custom arrowhead rendering
 */
export function ArrowPreview({
  path,
  strokeColor,
  strokeWidth,
  opacity,
}: ArrowPreviewProps) {
  if (path.length === 0) return null

  // Generate SVG path data with smooth curves (same as freehand)
  const pathData =
    path.length === 1
      ? `M ${path[0].x} ${path[0].y} L ${path[0].x} ${path[0].y}`
      : path.length === 2
        ? `M ${path[0].x} ${path[0].y} L ${path[1].x} ${path[1].y}`
        : `M ${path[0].x} ${path[0].y} ${path
            .slice(1)
            .map((point, i) => {
              if (i === path.length - 2) {
                return `L ${point.x} ${point.y}`
              }
              const next = path[i + 2]
              const midX = (point.x + next.x) / 2
              const midY = (point.y + next.y) / 2
              return `Q ${point.x} ${point.y} ${midX} ${midY}`
            })
            .join(' ')}`

  // Calculate arrowhead if we have at least 2 points
  const renderArrowhead = () => {
    if (path.length < 2) return null

    const lastPoint = path[path.length - 1]

    // Look back further for stable angle - avoid jitter
    let referencePoint = path[path.length - 2]
    const lookbackDistance = 20

    for (let i = path.length - 2; i >= 0; i--) {
      const dist = Math.sqrt(
        (lastPoint.x - path[i].x) ** 2 + (lastPoint.y - path[i].y) ** 2
      )
      if (dist >= lookbackDistance) {
        referencePoint = path[i]
        break
      }
    }

    const angle = Math.atan2(
      lastPoint.y - referencePoint.y,
      lastPoint.x - referencePoint.x
    )

    // Better proportions for hand-drawn look
    const arrowLength = Math.max(strokeWidth * 3, 15)
    const arrowWidth = arrowLength * 0.5
    const tipX = lastPoint.x
    const tipY = lastPoint.y
    const baseX = tipX - arrowLength * Math.cos(angle)
    const baseY = tipY - arrowLength * Math.sin(angle)
    const leftX = baseX - arrowWidth * Math.sin(angle)
    const leftY = baseY + arrowWidth * Math.cos(angle)
    const rightX = baseX + arrowWidth * Math.sin(angle)
    const rightY = baseY - arrowWidth * Math.cos(angle)

    // Add curve for hand-drawn feel
    const curveDepth = arrowLength * 0.3
    const leftCtrlX =
      baseX - curveDepth * Math.cos(angle) - arrowWidth * 0.7 * Math.sin(angle)
    const leftCtrlY =
      baseY - curveDepth * Math.sin(angle) + arrowWidth * 0.7 * Math.cos(angle)
    const rightCtrlX =
      baseX - curveDepth * Math.cos(angle) + arrowWidth * 0.7 * Math.sin(angle)
    const rightCtrlY =
      baseY - curveDepth * Math.sin(angle) - arrowWidth * 0.7 * Math.cos(angle)

    return (
      <path
        d={`M ${tipX} ${tipY} 
          Q ${leftCtrlX} ${leftCtrlY}, ${leftX} ${leftY}
          L ${rightX} ${rightY}
          Q ${rightCtrlX} ${rightCtrlY}, ${tipX} ${tipY}
          Z`}
        fill={strokeColor}
        opacity={opacity}
        stroke={strokeColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth * 0.5}
      />
    )
  }

  return (
    <>
      {/* Main path */}
      <path
        d={pathData}
        fill="none"
        stroke={strokeColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={opacity}
        strokeWidth={strokeWidth}
      />
      {/* Arrowhead */}
      {renderArrowhead()}
    </>
  )
}
