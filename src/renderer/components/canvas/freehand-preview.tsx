interface Point {
  x: number
  y: number
}

interface FreehandPreviewProps {
  path: Point[]
  strokeColor: string
  strokeWidth: number
  opacity: number
}

/**
 * Renders a smooth preview of a freehand drawing path
 * Uses quadratic Bezier curves for smooth transitions between points
 */
export function FreehandPreview({
  path,
  strokeColor,
  strokeWidth,
  opacity,
}: FreehandPreviewProps) {
  if (path.length === 0) return null

  // Generate SVG path data with smooth curves
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

  return (
    <path
      d={pathData}
      fill="none"
      stroke={strokeColor}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity={opacity}
      strokeWidth={strokeWidth}
    />
  )
}
