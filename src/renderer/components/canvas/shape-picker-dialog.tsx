import { useState } from 'react'
import { useShortcut, ShortcutContext } from 'renderer/shortcuts'

export type ShapeType =
  | 'rectangle'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'star'
  | 'polygon'

interface ShapePickerDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelectShape: (shapeType: ShapeType) => void
}

const shapes: Array<{ type: ShapeType; icon: string; label: string }> = [
  { type: 'rectangle', icon: '⬜', label: 'Rectangle' },
  { type: 'circle', icon: '⚫', label: 'Circle' },
  { type: 'ellipse', icon: '⬭', label: 'Ellipse' },
  { type: 'triangle', icon: '🔺', label: 'Triangle' },
  { type: 'star', icon: '⭐', label: 'Star' },
  { type: 'polygon', icon: '⬡', label: 'Hexagon' },
]

/**
 * ShapePickerDialog - Modal to select which shape to create
 */
export function ShapePickerDialog({
  isOpen,
  onClose,
  onSelectShape,
}: ShapePickerDialogProps) {
  const [hoveredShape, setHoveredShape] = useState<ShapeType | null>(null)

  // Register dialog shortcut
  useShortcut({
    key: 'escape',
    context: ShortcutContext.Dialog,
    action: onClose,
    description: 'Close shape picker',
    enabled: () => isOpen,
  }, [onClose, isOpen])

  if (!isOpen) return null

  const handleSelectShape = (shapeType: ShapeType) => {
    onSelectShape(shapeType)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-black/90 rounded-lg shadow-xl border border-teal-400/30 p-6 min-w-[400px]"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-teal-400 mb-4">
          Choose a Shape
        </h2>

        <div className="grid grid-cols-3 gap-3">
          {shapes.map(shape => (
            <button
              className={`
                p-6 rounded-lg border-2 transition-all
                flex flex-col items-center justify-center gap-2
                ${
                  hoveredShape === shape.type
                    ? 'border-teal-400 bg-teal-400/10 scale-105'
                    : 'border-teal-400/30 bg-black/50 hover:bg-black/70'
                }
              `}
              key={shape.type}
              onClick={() => handleSelectShape(shape.type)}
              onMouseEnter={() => setHoveredShape(shape.type)}
              onMouseLeave={() => setHoveredShape(null)}
              type="button"
            >
              <span className="text-4xl">{shape.icon}</span>
              <span className="text-sm text-gray-300">{shape.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-white transition-colors border border-gray-600"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
