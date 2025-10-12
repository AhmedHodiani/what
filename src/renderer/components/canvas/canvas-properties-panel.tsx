import { useCallback } from 'react'
import type { StickyNoteObject, DrawingObject } from 'lib/types/canvas'

interface CanvasPropertiesPanelProps {
  selectedObject: DrawingObject | null
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
}

// Preset color palettes
const PAPER_COLORS = [
  { name: 'Yellow', value: '#ffd700' },
  { name: 'Pink', value: '#ffb3d9' },
  { name: 'Blue', value: '#87ceeb' },
  { name: 'Green', value: '#98fb98' },
  { name: 'Orange', value: '#ffa500' },
  { name: 'Purple', value: '#dda0dd' },
  { name: 'Mint', value: '#98ffcc' },
  { name: 'Peach', value: '#ffcccb' },
]

const FONT_COLORS = [
  { name: 'Dark Gray', value: '#333333' },
  { name: 'Black', value: '#000000' },
  { name: 'Blue', value: '#0066cc' },
  { name: 'Red', value: '#cc0000' },
  { name: 'Green', value: '#006600' },
  { name: 'Purple', value: '#6600cc' },
  { name: 'Brown', value: '#8b4513' },
  { name: 'White', value: '#ffffff' },
]

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32]

/**
 * CanvasPropertiesPanel - Context-sensitive properties panel
 * Shows different controls based on selected object type
 */
export function CanvasPropertiesPanel({
  selectedObject,
  onUpdate,
}: CanvasPropertiesPanelProps) {
  // Don't show panel if nothing is selected
  if (!selectedObject) {
    return null
  }

  // Render different panels based on object type
  switch (selectedObject.type) {
    case 'sticky-note':
      return (
        <StickyNotePropertiesPanel
          object={selectedObject}
          onUpdate={onUpdate}
        />
      )

    // TODO: Add other object type panels
    case 'text':
    case 'shape':
    case 'image':
    default:
      return null
  }
}

/**
 * Properties panel specifically for sticky notes
 */
function StickyNotePropertiesPanel({
  object,
  onUpdate,
}: {
  object: StickyNoteObject
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
}) {
  const paperColor = object.object_data.paperColor || '#ffd700'
  const fontColor = object.object_data.fontColor || '#333333'
  const fontSize = object.object_data.fontSize || 16

  const handlePaperColorChange = useCallback(
    (color: string) => {
      onUpdate(object.id, {
        object_data: { ...object.object_data, paperColor: color },
      })
    },
    [object.id, object.object_data, onUpdate]
  )

  const handleFontColorChange = useCallback(
    (color: string) => {
      onUpdate(object.id, {
        object_data: { ...object.object_data, fontColor: color },
      })
    },
    [object.id, object.object_data, onUpdate]
  )

  const handleFontSizeChange = useCallback(
    (size: number) => {
      onUpdate(object.id, {
        object_data: { ...object.object_data, fontSize: size },
      })
    },
    [object.id, object.object_data, onUpdate]
  )

  return (
    <div className="absolute top-3 right-3 w-64 bg-black/90 backdrop-blur-sm border border-teal-400/30 rounded-lg shadow-xl overflow-hidden pointer-events-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-semibold text-teal-400 flex items-center gap-2">
          📝 Sticky Note Properties
        </h3>
      </div>

      <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
        {/* Paper Color Section */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300 uppercase tracking-wide">
            Paper Color
          </label>
          <div className="grid grid-cols-4 gap-2">
            {PAPER_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => handlePaperColorChange(color.value)}
                title={color.name}
                className={`
                  w-full aspect-square rounded-md transition-all
                  hover:scale-110 hover:shadow-lg
                  ${
                    paperColor === color.value
                      ? 'ring-2 ring-teal-400 ring-offset-2 ring-offset-black/90 scale-105'
                      : 'hover:ring-2 hover:ring-white/30'
                  }
                `}
                style={{ backgroundColor: color.value }}
              />
            ))}
          </div>

          {/* Custom color picker */}
          <div className="flex items-center gap-2 pt-1">
            <label
              htmlFor="custom-paper-color"
              className="text-xs text-gray-400"
            >
              Custom:
            </label>
            <input
              id="custom-paper-color"
              type="color"
              value={paperColor}
              onChange={(e) => handlePaperColorChange(e.target.value)}
              className="w-12 h-8 rounded cursor-pointer border border-white/20"
            />
            <span className="text-xs text-gray-500 font-mono">{paperColor}</span>
          </div>
        </div>

        {/* Font Color Section */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300 uppercase tracking-wide">
            Font Color
          </label>
          <div className="grid grid-cols-4 gap-2">
            {FONT_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => handleFontColorChange(color.value)}
                title={color.name}
                className={`
                  w-full aspect-square rounded-md transition-all
                  hover:scale-110 hover:shadow-lg
                  ${
                    fontColor === color.value
                      ? 'ring-2 ring-teal-400 ring-offset-2 ring-offset-black/90 scale-105'
                      : 'hover:ring-2 hover:ring-white/30'
                  }
                  ${color.value === '#ffffff' ? 'border border-gray-600' : ''}
                `}
                style={{ backgroundColor: color.value }}
              />
            ))}
          </div>

          {/* Custom color picker */}
          <div className="flex items-center gap-2 pt-1">
            <label
              htmlFor="custom-font-color"
              className="text-xs text-gray-400"
            >
              Custom:
            </label>
            <input
              id="custom-font-color"
              type="color"
              value={fontColor}
              onChange={(e) => handleFontColorChange(e.target.value)}
              className="w-12 h-8 rounded cursor-pointer border border-white/20"
            />
            <span className="text-xs text-gray-500 font-mono">{fontColor}</span>
          </div>
        </div>

        {/* Font Size Section */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300 uppercase tracking-wide">
            Font Size
          </label>
          <div className="grid grid-cols-4 gap-2">
            {FONT_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => handleFontSizeChange(size)}
                className={`
                  px-3 py-2 rounded-md text-xs font-medium transition-all
                  ${
                    fontSize === size
                      ? 'bg-teal-500 text-white shadow-lg scale-105'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                {size}px
              </button>
            ))}
          </div>

          {/* Custom size slider */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="custom-font-size"
                className="text-xs text-gray-400"
              >
                Custom:
              </label>
              <span className="text-sm font-semibold text-teal-400">
                {fontSize}px
              </span>
            </div>
            <input
              id="custom-font-size"
              type="range"
              min="10"
              max="48"
              value={fontSize}
              onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
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
              <span>10px</span>
              <span>48px</span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(20, 184, 166, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(20, 184, 166, 0.7);
        }
      `}</style>
    </div>
  )
}
