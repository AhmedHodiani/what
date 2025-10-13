import { useCallback } from 'react'
import type { DrawingObject } from 'lib/types/canvas'

interface BrushPropertiesPanelProps {
  selectedObject: DrawingObject | null
  strokeColor: string
  strokeWidth: number
  opacity: number
  onStrokeColorChange: (color: string) => void
  onStrokeWidthChange: (width: number) => void
  onOpacityChange: (opacity: number) => void
  onUpdate?: (id: string, updates: Partial<DrawingObject>) => void
}

const PRESET_COLORS = [
  '#FFFFFF', // White
  '#FFD700', // Gold
  '#FF6B6B', // Coral Red
  '#4ECDC4', // Turquoise
  '#45B7D1', // Sky Blue
  '#96CEB4', // Mint Green
  '#FECA57', // Orange
  '#FF9FF3', // Pink
  '#54A0FF', // Bright Blue
  '#5F27CD', // Purple
  '#00D2D3', // Cyan
  '#FF9F43', // Peach
  '#C44569', // Rose
  '#A3CB38', // Lime Green
  '#FD79A8', // Hot Pink
  '#FDCB6E', // Light Orange
]

/**
 * Brush properties panel for freehand drawing
 * Shows when freehand tool is selected or a freehand object is selected
 */
export function BrushPropertiesPanel({
  selectedObject,
  strokeColor,
  strokeWidth,
  opacity,
  onStrokeColorChange,
  onStrokeWidthChange,
  onOpacityChange,
  onUpdate,
}: BrushPropertiesPanelProps) {
  // Update selected freehand object when properties change
  const handleColorChange = useCallback((color: string) => {
    onStrokeColorChange(color)
    if (selectedObject?.type === 'freehand' && onUpdate) {
      onUpdate(selectedObject.id, {
        object_data: {
          ...selectedObject.object_data,
          stroke: color,
        },
      })
    }
  }, [selectedObject, onStrokeColorChange, onUpdate])

  const handleWidthChange = useCallback((width: number) => {
    onStrokeWidthChange(width)
    if (selectedObject?.type === 'freehand' && onUpdate) {
      onUpdate(selectedObject.id, {
        object_data: {
          ...selectedObject.object_data,
          strokeWidth: width,
        },
      })
    }
  }, [selectedObject, onStrokeWidthChange, onUpdate])

  const handleOpacityChange = useCallback((newOpacity: number) => {
    onOpacityChange(newOpacity)
    if (selectedObject?.type === 'freehand' && onUpdate) {
      onUpdate(selectedObject.id, {
        object_data: {
          ...selectedObject.object_data,
          opacity: newOpacity,
        },
      })
    }
  }, [selectedObject, onOpacityChange, onUpdate])

  return (
    <div className="absolute top-20 right-3 w-64 bg-black/90 backdrop-blur-sm border border-teal-400/30 rounded-lg shadow-xl overflow-hidden pointer-events-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-semibold text-teal-400 flex items-center gap-2">
          ✏️ Brush Properties
        </h3>
      </div>

      <div className="p-4 space-y-5">
        {/* Color Section */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300 uppercase tracking-wide">
            Color
          </label>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                title={color}
                className={`
                  w-full aspect-square rounded-md transition-all
                  hover:scale-110 hover:shadow-lg
                  ${
                    strokeColor === color
                      ? 'ring-2 ring-teal-400 ring-offset-2 ring-offset-black/90 scale-105'
                      : 'hover:ring-2 hover:ring-white/30'
                  }
                `}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {/* Custom color picker */}
          <div className="flex items-center gap-2 pt-1">
            <label htmlFor="custom-stroke-color" className="text-xs text-gray-400">
              Custom:
            </label>
            <input
              id="custom-stroke-color"
              type="color"
              value={strokeColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-12 h-8 rounded cursor-pointer border border-white/20"
            />
            <span className="text-xs text-gray-500 font-mono">{strokeColor}</span>
          </div>
        </div>

        {/* Thickness Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-300 uppercase tracking-wide">
              Thickness
            </label>
            <span className="text-sm font-semibold text-teal-400">{strokeWidth}px</span>
          </div>
          <input
            type="range"
            min="1"
            max="50"
            value={strokeWidth}
            onChange={(e) => handleWidthChange(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-teal-400
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:hover:bg-teal-300
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-moz-range-thumb]:w-4
              [&::-moz-range-thumb]:h-4
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-teal-400
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer
              [&::-moz-range-thumb]:hover:bg-teal-300"
          />
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>1px</span>
            <span>50px</span>
          </div>
        </div>

        {/* Opacity Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-300 uppercase tracking-wide">
              Opacity
            </label>
            <span className="text-sm font-semibold text-teal-400">
              {Math.round(opacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={opacity}
            onChange={(e) => handleOpacityChange(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-teal-400
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:hover:bg-teal-300
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-moz-range-thumb]:w-4
              [&::-moz-range-thumb]:h-4
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-teal-400
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer
              [&::-moz-range-thumb]:hover:bg-teal-300"
          />
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>10%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300 uppercase tracking-wide">
            Preview
          </label>
          <div className="bg-white/5 rounded-lg p-3 h-12 flex items-center">
            <svg width="100%" height="100%" className="overflow-visible">
              <line
                x1="5%"
                y1="50%"
                x2="95%"
                y2="50%"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                opacity={opacity}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Tip */}
        <div className="text-[10px] text-gray-500 italic border-t border-white/10 pt-3">
          💡 Tip: Hold Ctrl while drawing for straight lines
        </div>
      </div>
    </div>
  )
}
