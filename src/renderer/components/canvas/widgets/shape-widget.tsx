import type { ShapeObject, DrawingObject } from 'lib/types/canvas'
import { WidgetWrapper } from './widget-wrapper'

interface ShapeWidgetProps {
  object: ShapeObject
  isSelected: boolean
  zoom: number
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
  onSelect: (id: string) => void
  onContextMenu: (event: React.MouseEvent, id: string) => void
  onStartDrag: (e: React.MouseEvent, id: string) => void
}

/**
 * ShapeWidget - Renders geometric shapes
 *
 * Supported shapes:
 * - Rectangle (with optional rounded corners)
 * - Circle
 * - Ellipse
 * - Triangle
 * - Star
 * - Polygon
 */
export function ShapeWidget({
  object,
  isSelected,
  zoom,
  onUpdate,
  onSelect,
  onContextMenu,
  onStartDrag,
}: ShapeWidgetProps) {
  const {
    shapeType,
    fill = '#3b82f6',
    stroke = '#1e40af',
    strokeWidth = 2,
    cornerRadius = 0,
    points = 5,
    rotation = 0,
    opacity = 1,
  } = object.object_data

  const width = object.width
  const height = object.height

  // Add padding to accommodate rotation and stroke
  const padding = Math.max(strokeWidth * 2, 20)

  // Render different shapes based on shapeType
  const renderShape = () => {
    switch (shapeType) {
      case 'rectangle':
        return (
          <rect
            fill={fill}
            height={height}
            opacity={opacity}
            rx={cornerRadius}
            ry={cornerRadius}
            stroke={stroke}
            strokeWidth={strokeWidth}
            width={width}
            x={0}
            y={0}
          />
        )

      case 'circle': {
        const radius = Math.min(width, height) / 2
        const cx = width / 2
        const cy = height / 2
        return (
          <circle
            cx={cx}
            cy={cy}
            fill={fill}
            opacity={opacity}
            r={radius}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        )
      }

      case 'ellipse': {
        const rx = width / 2
        const ry = height / 2
        return (
          <ellipse
            cx={width / 2}
            cy={height / 2}
            fill={fill}
            opacity={opacity}
            rx={rx}
            ry={ry}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        )
      }

      case 'triangle': {
        const path = `M ${width / 2} 0 L ${width} ${height} L 0 ${height} Z`
        return (
          <path
            d={path}
            fill={fill}
            opacity={opacity}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        )
      }

      case 'star': {
        const centerX = width / 2
        const centerY = height / 2
        const outerRadius = Math.min(width, height) / 2
        const innerRadius = outerRadius * 0.4
        const numPoints = points || 5

        const pathData = `${Array.from({ length: numPoints * 2 })
          .map((_, i) => {
            const angle = (Math.PI * 2 * i) / (numPoints * 2) - Math.PI / 2
            const radius = i % 2 === 0 ? outerRadius : innerRadius
            const x = centerX + Math.cos(angle) * radius
            const y = centerY + Math.sin(angle) * radius
            return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
          })
          .join(' ')} Z`

        return (
          <path
            d={pathData}
            fill={fill}
            opacity={opacity}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        )
      }

      case 'polygon': {
        const centerX = width / 2
        const centerY = height / 2
        const radius = Math.min(width, height) / 2
        const numSides = points || 6

        const pathData = `${Array.from({ length: numSides })
          .map((_, i) => {
            const angle = (Math.PI * 2 * i) / numSides - Math.PI / 2
            const x = centerX + Math.cos(angle) * radius
            const y = centerY + Math.sin(angle) * radius
            return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
          })
          .join(' ')} Z`

        return (
          <path
            d={pathData}
            fill={fill}
            opacity={opacity}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        )
      }

      default:
        return null
    }
  }

  return (
    <WidgetWrapper
      isSelected={isSelected}
      object={object}
      onContextMenu={onContextMenu}
      onSelect={onSelect}
      onStartDrag={onStartDrag}
      onUpdate={onUpdate}
      zoom={zoom}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          overflow: 'visible',
          position: 'relative',
        }}
      >
        <svg
          height={height + padding * 2}
          style={{
            position: 'absolute',
            top: -padding,
            left: -padding,
            overflow: 'visible',
          }}
          viewBox={`0 0 ${width + padding * 2} ${height + padding * 2}`}
          width={width + padding * 2}
        >
          <g
            style={{ transformOrigin: 'center' }}
            transform={`translate(${width / 2 + padding}, ${height / 2 + padding})`}
          >
            <g transform={`rotate(${rotation})`}>
              <g transform={`translate(${-width / 2}, ${-height / 2})`}>
                {renderShape()}
              </g>
            </g>
          </g>
        </svg>
      </div>
    </WidgetWrapper>
  )
}
