import { useCallback, useState, useEffect, useRef } from 'react'
import type {
  FreehandObject,
  ArrowObject,
  DrawingObject,
} from 'lib/types/canvas'

const PRESET_COLORS = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Black', value: '#000000' },
  { name: 'Gold', value: '#FFD700' },
  { name: 'Red', value: '#FF6B6B' },
  { name: 'Turquoise', value: '#4ECDC4' },
  { name: 'Blue', value: '#45B7D1' },
  { name: 'Mint', value: '#96CEB4' },
  { name: 'Orange', value: '#FECA57' },
  { name: 'Pink', value: '#FF9FF3' },
]

const BRUSH_SIZES = [
  { name: 'S', value: 2, label: 'Small (2px)' },
  { name: 'M', value: 5, label: 'Medium (5px)' },
  { name: 'L', value: 15, label: 'Large (15px)' },
  { name: 'XL', value: 25, label: 'Extra Large (25px)' },
  { name: 'XXL', value: 40, label: 'Extra Extra Large (40px)' },
]

interface BrushPanelProps {
  // Selection mode (from registry)
  object?: FreehandObject | ArrowObject
  onUpdate?: (id: string, updates: Partial<DrawingObject>) => void

  // Live drawing mode (from infinite-canvas)
  strokeColor?: string
  strokeWidth?: number
  opacity?: number
  onStrokeColorChange?: (color: string) => void
  onStrokeWidthChange?: (width: number) => void
  onOpacityChange?: (opacity: number) => void
}

/**
 * BrushPanel - Unified brush properties panel
 *
 * Modes:
 * 1. Selection mode: Shows properties of selected freehand/arrow object
 * 2. Live drawing mode: Shows properties for active drawing tool
 *
 * This replaces both:
 * - Old brush-properties-panel.tsx (257 lines)
 * - Old freehand-panel.tsx (90 lines)
 *
 * Benefits:
 * - Single source of truth
 * - Zero UI duplication
 * - Consistent BasePanel styling
 * - Supports both use cases cleanly
 */
export function BrushPanel({
  object,
  onUpdate,
  strokeColor: liveStrokeColor,
  strokeWidth: liveStrokeWidth,
  opacity: liveOpacity,
  onStrokeColorChange,
  onStrokeWidthChange,
  onOpacityChange,
}: BrushPanelProps) {
  // Determine mode and get current values
  const isSelectionMode = !!object
  const stroke = isSelectionMode
    ? object.object_data.stroke || '#FFFFFF'
    : liveStrokeColor || '#FFFFFF'
  const strokeWidth = isSelectionMode
    ? object.object_data.strokeWidth || 2
    : liveStrokeWidth || 2
  const opacity = isSelectionMode
    ? object.object_data.opacity || 1
    : liveOpacity || 1

  // Selection mode: Update object via registry pattern
  const updateProperty = useCallback(
    (
      updates: Partial<
        FreehandObject['object_data'] | ArrowObject['object_data']
      >
    ) => {
      if (!isSelectionMode || !object || !onUpdate) return

      onUpdate(object.id, {
        object_data: {
          ...object.object_data,
          ...updates,
        },
      } as Partial<DrawingObject>)
    },
    [isSelectionMode, object, onUpdate]
  )

  // Live mode: Update via callbacks
  const handleColorChange = useCallback(
    (color: string) => {
      if (isSelectionMode) {
        updateProperty({ stroke: color })
      } else {
        onStrokeColorChange?.(color)
      }
    },
    [isSelectionMode, updateProperty, onStrokeColorChange]
  )

  const handleWidthChange = useCallback(
    (width: number) => {
      if (isSelectionMode) {
        updateProperty({ strokeWidth: width })
      } else {
        onStrokeWidthChange?.(width)
      }
    },
    [isSelectionMode, updateProperty, onStrokeWidthChange]
  )

  const handleOpacityChange = useCallback(
    (newOpacity: number) => {
      if (isSelectionMode) {
        updateProperty({ opacity: newOpacity })
      } else {
        onOpacityChange?.(newOpacity)
      }
    },
    [isSelectionMode, updateProperty, onOpacityChange]
  )

  // Dropdown states
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false)
  const [opacityDropdownOpen, setOpacityDropdownOpen] = useState(false)
  
  const colorDropdownRef = useRef<HTMLDivElement>(null)
  const opacityDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        colorDropdownRef.current &&
        !colorDropdownRef.current.contains(event.target as Node)
      ) {
        setColorDropdownOpen(false)
      }
      if (
        opacityDropdownRef.current &&
        !opacityDropdownRef.current.contains(event.target as Node)
      ) {
        setOpacityDropdownOpen(false)
      }
    }

    if (colorDropdownOpen || opacityDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [colorDropdownOpen, opacityDropdownOpen])

  return (
    <div className="bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-2xl">
      {/* Horizontal Toolbar Layout */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        {/* Brush Size Buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 mr-1">Size:</span>
          {BRUSH_SIZES.map(size => (
            <button
              key={size.value}
              onClick={() => handleWidthChange(size.value)}
              title={size.label}
              className={`
                w-9 h-9 rounded-md font-semibold text-sm
                transition-all duration-150
                ${
                  strokeWidth === size.value
                    ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              `}
            >
              {size.name}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-white/10" />

        {/* Color Dropdown */}
        <div className="relative" ref={colorDropdownRef}>
          <button
            onClick={() => setColorDropdownOpen(!colorDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
          >
            <span className="text-xs text-gray-400">Color:</span>
            <div
              className="w-6 h-6 rounded border-2 border-white/20"
              style={{ backgroundColor: stroke }}
            />
            <span className="text-xs text-gray-500">▼</span>
          </button>

          {colorDropdownOpen && (
            <div className="absolute top-full mt-2 left-0 bg-gray-900 border border-white/20 rounded-lg shadow-2xl p-3 z-50 min-w-[170px]">
              <div className="grid grid-cols-3 gap-2 mb-3">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => {
                      handleColorChange(color.value)
                      setColorDropdownOpen(false)
                    }}
                    title={color.name}
                    className={`
                      h-10 rounded-md border-2 transition-all
                      ${
                        stroke === color.value
                          ? 'border-teal-400 shadow-lg shadow-teal-400/30'
                          : 'border-white/20 hover:border-white/40'
                      }
                    `}
                    style={{ backgroundColor: color.value }}
                  />
                ))}
              </div>
              
              {/* Custom color picker */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <input
                  type="color"
                  value={stroke}
                  onChange={e => handleColorChange(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-white/20"
                />
                <span className="text-xs text-gray-400 font-mono">{stroke}</span>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-white/10" />

        {/* Opacity Dropdown */}
        <div className="relative" ref={opacityDropdownRef}>
          <button
            onClick={() => setOpacityDropdownOpen(!opacityDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
          >
            <span className="text-xs text-gray-400">Opacity:</span>
            <span className="text-sm text-white font-semibold min-w-[2.5rem]">
              {Math.round(opacity * 100)}%
            </span>
            <span className="text-xs text-gray-500">▼</span>
          </button>

          {opacityDropdownOpen && (
            <div className="absolute top-full mt-2 left-0 bg-gray-900 border border-white/20 rounded-lg shadow-2xl p-4 z-50 w-64">
              <div className="flex flex-col gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(opacity * 100)}
                  onChange={e =>
                    handleOpacityChange(Number.parseInt(e.target.value) / 100)
                  }
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                
                {/* Quick presets */}
                <div className="flex gap-2">
                  {[25, 50, 75, 100].map(preset => (
                    <button
                      key={preset}
                      onClick={() => {
                        handleOpacityChange(preset / 100)
                        setOpacityDropdownOpen(false)
                      }}
                      className={`
                        flex-1 py-1.5 text-xs rounded
                        ${
                          Math.round(opacity * 100) === preset
                            ? 'bg-teal-500 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }
                      `}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
