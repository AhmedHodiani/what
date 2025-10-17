import { useCallback } from 'react'
import type { TextObject, DrawingObject } from 'lib/types/canvas'
import {
  BasePanel,
  PanelSection,
  ButtonGroup,
  Slider,
  ColorGrid,
} from './base-panel'

const FONT_FAMILIES = [
  { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Mono', value: 'ui-monospace, monospace' },
  { label: 'Kalam', value: 'Kalam, cursive' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times', value: 'Times New Roman, serif' },
]

const TEXT_COLORS = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Black', value: '#000000' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
]

const FONT_WEIGHTS = [
  { label: 'Normal', value: 'normal' },
  { label: 'Bold', value: 'bold' },
]

const FONT_STYLES = [
  { label: 'Normal', value: 'normal' },
  { label: 'Italic', value: 'italic' },
]

const TEXT_ALIGNMENTS = [
  { label: '⬅️', value: 'left' },
  { label: '⬆️', value: 'center' },
  { label: '➡️', value: 'right' },
]

interface TextPanelProps {
  object: TextObject
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
}

/**
 * TextPanel - Properties panel for text objects
 * Clean, extracted version using BasePanel components
 */
export function TextPanel({ object, onUpdate }: TextPanelProps) {
  const fontSize = object.object_data.fontSize || 24
  const fontFamily =
    object.object_data.fontFamily || 'Inter, system-ui, sans-serif'
  const fontWeight = object.object_data.fontWeight || 'normal'
  const fontStyle = object.object_data.fontStyle || 'normal'
  const textAlign = object.object_data.textAlign || 'left'
  const color = object.object_data.color || '#FFFFFF'
  const backgroundColor = object.object_data.backgroundColor || 'transparent'

  const updateProperty = useCallback(
    <K extends keyof TextObject['object_data']>(
      key: K,
      value: TextObject['object_data'][K]
    ) => {
      onUpdate(object.id, {
        object_data: {
          ...object.object_data,
          [key]: value,
        },
      })
    },
    [object.id, object.object_data, onUpdate]
  )

  return (
    <BasePanel icon="📝" title="Text Properties">
      {/* Font Family */}
      <PanelSection label="Font Family">
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
      </PanelSection>

      {/* Font Size */}
      <PanelSection label="Font Size">
        <Slider
          label="Size"
          max={72}
          min={12}
          onChange={value => updateProperty('fontSize', value)}
          step={1}
          unit="px"
          value={fontSize}
        />
      </PanelSection>

      {/* Text Color */}
      <PanelSection label="Text Color">
        <ColorGrid
          colors={TEXT_COLORS}
          onColorChange={c => updateProperty('color', c)}
          selectedColor={color}
        />
        <div className="flex items-center gap-2 pt-1">
          <input
            className="w-12 h-8 rounded cursor-pointer border border-white/20"
            onChange={e => updateProperty('color', e.target.value)}
            type="color"
            value={color}
          />
          <span className="text-xs text-gray-500 font-mono">{color}</span>
        </div>
      </PanelSection>

      {/* Font Weight */}
      <PanelSection label="Font Weight">
        <ButtonGroup
          onChange={value => updateProperty('fontWeight', value)}
          options={FONT_WEIGHTS}
          selected={fontWeight}
        />
      </PanelSection>

      {/* Font Style */}
      <PanelSection label="Font Style">
        <ButtonGroup
          onChange={value => updateProperty('fontStyle', value)}
          options={FONT_STYLES}
          selected={fontStyle}
        />
      </PanelSection>

      {/* Text Alignment */}
      <PanelSection label="Text Alignment">
        <ButtonGroup
          onChange={value => updateProperty('textAlign', value)}
          options={TEXT_ALIGNMENTS}
          selected={textAlign}
        />
      </PanelSection>

      {/* Background Color */}
      <PanelSection label="Background">
        <div className="flex gap-2">
          <button
            className={`
              px-3 py-2 rounded text-sm
              ${
                backgroundColor === 'transparent'
                  ? 'bg-teal-500 text-white'
                  : 'bg-white/10 text-gray-300'
              }
            `}
            onClick={() => updateProperty('backgroundColor', 'transparent')}
            type="button"
          >
            None
          </button>
          <input
            className="flex-1 h-10 rounded cursor-pointer border border-white/20"
            disabled={backgroundColor === 'transparent'}
            onChange={e => updateProperty('backgroundColor', e.target.value)}
            type="color"
            value={
              backgroundColor === 'transparent' ? '#000000' : backgroundColor
            }
          />
        </div>
      </PanelSection>
    </BasePanel>
  )
}
