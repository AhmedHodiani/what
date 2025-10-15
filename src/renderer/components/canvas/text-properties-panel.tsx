import type { TextObject, DrawingObject } from 'lib/types/canvas'

interface TextPropertiesPanelProps {
  selectedObject: TextObject
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
}

const FONT_FAMILIES = [
  { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'ui-monospace, monospace', label: 'Monospace' },
  { value: 'Kalam, cursive', label: 'Kalam' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Times New Roman, serif', label: 'Times' },
  { value: 'Courier New, monospace', label: 'Courier' },
]

const TEXT_COLORS = [
  '#FFFFFF', // White
  '#000000', // Black
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#6B7280', // Gray
  '#A1A1AA', // Light gray
]

/**
 * TextPropertiesPanel - Properties panel for text objects
 *
 * Features:
 * - Font family selection
 * - Font size slider (12-72px)
 * - Text color picker
 * - Font weight (normal/bold)
 * - Font style (normal/italic)
 * - Text alignment (left/center/right)
 * - Background color picker
 */
export function TextPropertiesPanel({
  selectedObject,
  onUpdate,
}: TextPropertiesPanelProps) {
  const fontSize = selectedObject.object_data.fontSize || 24
  const fontFamily =
    selectedObject.object_data.fontFamily || 'Inter, system-ui, sans-serif'
  const fontWeight = selectedObject.object_data.fontWeight || 'normal'
  const fontStyle = selectedObject.object_data.fontStyle || 'normal'
  const textAlign = selectedObject.object_data.textAlign || 'left'
  const color = selectedObject.object_data.color || '#FFFFFF'
  const backgroundColor =
    selectedObject.object_data.backgroundColor || 'transparent'

  const updateProperty = <K extends keyof TextObject['object_data']>(
    key: K,
    value: TextObject['object_data'][K]
  ) => {
    onUpdate(selectedObject.id, {
      object_data: {
        ...selectedObject.object_data,
        [key]: value,
      },
    })
  }

  return (
    <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg shadow-2xl border border-teal-400/30 p-4 w-64 z-[100]">
      <h3 className="text-sm font-semibold text-teal-400 mb-3 flex items-center gap-2">
        <span>📝</span>
        <span>Text Properties</span>
      </h3>

      <div className="space-y-4">
        {/* Font Family */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">
            Font Family
          </label>
          <select
            className="w-full px-2 py-1.5 bg-gray-900 text-white rounded border border-gray-600 text-sm focus:border-teal-400 focus:outline-none"
            onChange={e => updateProperty('fontFamily', e.target.value)}
            value={fontFamily}
          >
            {FONT_FAMILIES.map(font => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">
            Font Size: {fontSize}px
          </label>
          <input
            className="w-full accent-teal-500"
            max="72"
            min="12"
            onChange={e => updateProperty('fontSize', Number(e.target.value))}
            type="range"
            value={fontSize}
          />
        </div>

        {/* Text Color */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">
            Text Color
          </label>
          <div className="grid grid-cols-6 gap-1.5">
            {TEXT_COLORS.map(c => (
              <button
                className={`w-8 h-8 rounded border-2 transition-all ${
                  color === c
                    ? 'border-teal-400 scale-110'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
                key={c}
                onClick={() => updateProperty('color', c)}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* Font Weight & Style */}
        <div className="flex gap-2">
          <button
            className={`flex-1 px-3 py-2 rounded text-sm font-bold transition-all ${
              fontWeight === 'bold'
                ? 'bg-teal-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            onClick={() =>
              updateProperty(
                'fontWeight',
                fontWeight === 'bold' ? 'normal' : 'bold'
              )
            }
          >
            B
          </button>
          <button
            className={`flex-1 px-3 py-2 rounded text-sm italic transition-all ${
              fontStyle === 'italic'
                ? 'bg-teal-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            onClick={() =>
              updateProperty(
                'fontStyle',
                fontStyle === 'italic' ? 'normal' : 'italic'
              )
            }
          >
            I
          </button>
        </div>

        {/* Text Alignment */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">
            Text Align
          </label>
          <div className="flex gap-2">
            {(['left', 'center', 'right'] as const).map(align => (
              <button
                className={`flex-1 px-3 py-2 rounded text-sm transition-all ${
                  textAlign === align
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                key={align}
                onClick={() => updateProperty('textAlign', align)}
              >
                {align === 'left' && '⬅'}
                {align === 'center' && '↔'}
                {align === 'right' && '➡'}
              </button>
            ))}
          </div>
        </div>

        {/* Background Color */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">
            Background
          </label>
          <div className="grid grid-cols-6 gap-1.5">
            <button
              className={`w-8 h-8 rounded border-2 transition-all relative ${
                backgroundColor === 'transparent'
                  ? 'border-teal-400 scale-110'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onClick={() => updateProperty('backgroundColor', 'transparent')}
              style={{
                background:
                  'linear-gradient(45deg, #444 25%, transparent 25%, transparent 75%, #444 75%, #444), linear-gradient(45deg, #444 25%, #666 25%, #666 75%, #444 75%, #444)',
                backgroundSize: '8px 8px',
                backgroundPosition: '0 0, 4px 4px',
              }}
              title="Transparent"
            />
            {TEXT_COLORS.map(c => (
              <button
                className={`w-8 h-8 rounded border-2 transition-all ${
                  backgroundColor === c
                    ? 'border-teal-400 scale-110'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
                key={c}
                onClick={() => updateProperty('backgroundColor', c)}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
