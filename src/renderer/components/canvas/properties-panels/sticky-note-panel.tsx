import { useCallback } from 'react'
import type { StickyNoteObject, DrawingObject } from 'lib/types/canvas'
import { BasePanel, PanelSection, ColorGrid, ButtonGroup } from './base-panel'

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

const FONT_SIZES = [
  { label: '12', value: 12 },
  { label: '14', value: 14 },
  { label: '16', value: 16 },
  { label: '18', value: 18 },
  { label: '20', value: 20 },
  { label: '24', value: 24 },
  { label: '28', value: 28 },
  { label: '32', value: 32 },
]

interface StickyNotePanelProps {
  object: StickyNoteObject
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
}

/**
 * StickyNotePanel - Properties panel for sticky note objects
 * Clean, extracted version using BasePanel components
 */
export function StickyNotePanel({ object, onUpdate }: StickyNotePanelProps) {
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
    <BasePanel title="Sticky Note Properties" icon="📝">
      {/* Paper Color */}
      <PanelSection label="Paper Color">
        <ColorGrid
          colors={PAPER_COLORS}
          selectedColor={paperColor}
          onColorChange={handlePaperColorChange}
        />
        <div className="flex items-center gap-2 pt-1">
          <label className="text-xs text-gray-400" htmlFor="custom-paper-color">
            Custom:
          </label>
          <input
            className="w-12 h-8 rounded cursor-pointer border border-white/20"
            id="custom-paper-color"
            onChange={(e) => handlePaperColorChange(e.target.value)}
            type="color"
            value={paperColor}
          />
          <span className="text-xs text-gray-500 font-mono">{paperColor}</span>
        </div>
      </PanelSection>

      {/* Font Color */}
      <PanelSection label="Font Color">
        <ColorGrid
          colors={FONT_COLORS}
          selectedColor={fontColor}
          onColorChange={handleFontColorChange}
        />
        <div className="flex items-center gap-2 pt-1">
          <label className="text-xs text-gray-400" htmlFor="custom-font-color">
            Custom:
          </label>
          <input
            className="w-12 h-8 rounded cursor-pointer border border-white/20"
            id="custom-font-color"
            onChange={(e) => handleFontColorChange(e.target.value)}
            type="color"
            value={fontColor}
          />
          <span className="text-xs text-gray-500 font-mono">{fontColor}</span>
        </div>
      </PanelSection>

      {/* Font Size */}
      <PanelSection label="Font Size">
        <ButtonGroup
          options={FONT_SIZES}
          selected={fontSize}
          onChange={handleFontSizeChange}
        />
      </PanelSection>
    </BasePanel>
  )
}
