import type { ShapeObject, DrawingObject } from 'lib/types/canvas'

interface ShapePropertiesPanelProps {
  object: ShapeObject
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
}

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Orange
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#6366f1', // Indigo
  '#000000', // Black
  '#ffffff', // White
]

/**
 * ShapePropertiesPanel - Controls for customizing shapes
 */
export function ShapePropertiesPanel({
  object,
  onUpdate,
}: ShapePropertiesPanelProps) {
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

  const updateProperty = (updates: Partial<ShapeObject['object_data']>) => {
    onUpdate(object.id, {
      object_data: {
        ...object.object_data,
        ...updates,
      },
    })
  }

  return (
    <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg shadow-2xl border border-teal-400/30 p-4 w-64 z-[100] max-h-[calc(100vh-2rem)] overflow-y-auto">
      <h3 className="text-sm font-semibold text-teal-400 mb-3 flex items-center gap-2">
        <span>🔷</span>
        <span>Shape Properties</span>
      </h3>

      <div className="space-y-4">
        {/* Shape Type */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Type</label>
          <div className="text-sm text-white capitalize px-2 py-1.5 bg-gray-900 rounded border border-gray-600">
            {shapeType}
          </div>
        </div>

        {/* Fill Color */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">
            Fill Color
          </label>
          <div className="flex gap-2 flex-wrap mb-2">
            {PRESET_COLORS.map(color => (
              <button
                className={`w-8 h-8 rounded border-2 transition-all ${
                  fill === color ? 'border-white scale-110' : 'border-gray-600'
                }`}
                key={color}
                onClick={() => updateProperty({ fill: color })}
                style={{ backgroundColor: color }}
                title={color}
                type="button"
              />
            ))}
          </div>
          <input
            className="w-full h-8 rounded bg-gray-900 border border-gray-600"
            onChange={e => updateProperty({ fill: e.target.value })}
            type="color"
            value={fill}
          />
        </div>

        {/* Stroke Color */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">
            Stroke Color
          </label>
          <input
            className="w-full h-8 rounded bg-gray-900 border border-gray-600"
            onChange={e => updateProperty({ stroke: e.target.value })}
            type="color"
            value={stroke}
          />
        </div>

        {/* Stroke Width */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">
            Stroke Width: {strokeWidth}px
          </label>
          <input
            className="w-full accent-teal-400"
            max="20"
            min="0"
            onChange={e =>
              updateProperty({ strokeWidth: Number(e.target.value) })
            }
            type="range"
            value={strokeWidth}
          />
        </div>

        {/* Corner Radius (Rectangle only) */}
        {shapeType === 'rectangle' && (
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Corner Radius: {cornerRadius}px
            </label>
            <input
              className="w-full accent-teal-400"
              max="50"
              min="0"
              onChange={e =>
                updateProperty({ cornerRadius: Number(e.target.value) })
              }
              type="range"
              value={cornerRadius}
            />
          </div>
        )}

        {/* Points (Star/Polygon only) */}
        {(shapeType === 'star' || shapeType === 'polygon') && (
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              {shapeType === 'star' ? 'Points' : 'Sides'}: {points}
            </label>
            <input
              className="w-full accent-teal-400"
              max="12"
              min="3"
              onChange={e => updateProperty({ points: Number(e.target.value) })}
              type="range"
              value={points}
            />
          </div>
        )}

        {/* Rotation */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">
            Rotation: {rotation}°
          </label>
          <input
            className="w-full accent-teal-400"
            max="360"
            min="0"
            onChange={e => updateProperty({ rotation: Number(e.target.value) })}
            type="range"
            value={rotation}
          />
        </div>

        {/* Opacity */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">
            Opacity: {Math.round(opacity * 100)}%
          </label>
          <input
            className="w-full accent-teal-400"
            max="1"
            min="0"
            onChange={e => updateProperty({ opacity: Number(e.target.value) })}
            step="0.1"
            type="range"
            value={opacity}
          />
        </div>
      </div>
    </div>
  )
}
