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
            x={0}
            y={0}
            width={width}
            height={height}
            rx={cornerRadius}
            ry={cornerRadius}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
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
            r={radius}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
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
            rx={rx}
            ry={ry}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
        )
      }

      case 'triangle': {
        const path = `M ${width / 2} 0 L ${width} ${height} L 0 ${height} Z`
        return (
          <path
            d={path}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
        )
      }

      case 'star': {
        const centerX = width / 2
        const centerY = height / 2
        const outerRadius = Math.min(width, height) / 2
        const innerRadius = outerRadius * 0.4
        const numPoints = points || 5

        const pathData = Array.from({ length: numPoints * 2 })
          .map((_, i) => {
            const angle = (Math.PI * 2 * i) / (numPoints * 2) - Math.PI / 2
            const radius = i % 2 === 0 ? outerRadius : innerRadius
            const x = centerX + Math.cos(angle) * radius
            const y = centerY + Math.sin(angle) * radius
            return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
          })
          .join(' ') + ' Z'

        return (
          <path
            d={pathData}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
        )
      }

      case 'polygon': {
        const centerX = width / 2
        const centerY = height / 2
        const radius = Math.min(width, height) / 2
        const numSides = points || 6

        const pathData = Array.from({ length: numSides })
          .map((_, i) => {
            const angle = (Math.PI * 2 * i) / numSides - Math.PI / 2
            const x = centerX + Math.cos(angle) * radius
            const y = centerY + Math.sin(angle) * radius
            return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
          })
          .join(' ') + ' Z'

        return (
          <path
            d={pathData}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
        )
      }

      default:
        return null
    }
  }

  return (
    <WidgetWrapper
      object={object}
      isSelected={isSelected}
      zoom={zoom}
      onUpdate={onUpdate}
      onSelect={onSelect}
      onContextMenu={onContextMenu}
      onStartDrag={onStartDrag}
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
          width={width + padding * 2}
          height={height + padding * 2}
          viewBox={`0 0 ${width + padding * 2} ${height + padding * 2}`}
          style={{
            position: 'absolute',
            top: -padding,
            left: -padding,
            overflow: 'visible',
          }}
        >
          <g 
            transform={`translate(${width / 2 + padding}, ${height / 2 + padding})`}
            style={{ transformOrigin: 'center' }}
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
