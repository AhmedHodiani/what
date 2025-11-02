import { useCallback } from 'react'
import type { StickyNoteObject, DrawingObject } from 'lib/types/canvas'
import { BasePanel, PanelSection, ColorGrid, ButtonGroup } from './base-panel'

const PAPER_COLORS = [
  // Light theme colors
  { name: 'Yellow', value: '#fffacd' },
  { name: 'Pink', value: '#fddde6' },
  { name: 'Blue', value: '#d0e7f9' },
  { name: 'Green', value: '#d8f4d8' },
  { name: 'Orange', value: '#ffe5b4' },
  { name: 'Purple', value: '#e8d5f9' },
  { name: 'Mint', value: '#d0fff0' },
  { name: 'Peach', value: '#ffcccb' },
  { name: 'Lavender', value: '#f3e6ff' },
  { name: 'Sky', value: '#e0f7ff' },
  { name: 'Cream', value: '#fff8dc' },
  // Dark theme colors
  { name: 'Dark Gray', value: '#2d2d2d' },
  { name: 'Dark Blue', value: '#1a365d' },
  { name: 'Dark Green', value: '#1a2e1a' },
  { name: 'Dark Purple', value: '#2d1b3d' },
  { name: 'Dark Red', value: '#3d1a1a' },
  { name: 'Dark Brown', value: '#2c1810' },
  { name: 'Charcoal', value: '#36454f' },
  { name: 'Slate', value: '#2f4f4f' },
  { name: 'NoColor', value: '#00000000' },
]

const FONT_COLORS = [
  // Light theme colors
  { name: 'Dark Gray', value: '#333333' },
  { name: 'Black', value: '#000000' },
  { name: 'Blue', value: '#0066cc' },
  { name: 'Red', value: '#cc0000' },
  { name: 'Green', value: '#006600' },
  { name: 'Purple', value: '#6600cc' },
  { name: 'Brown', value: '#8b4513' },
  // Dark theme colors
  { name: 'White', value: '#ffffff' },
  { name: 'Light Gray', value: '#cccccc' },
  { name: 'Light Blue', value: '#66b3ff' },
  { name: 'Light Red', value: '#ff6666' },
  { name: 'Light Green', value: '#66cc66' },
  { name: 'Light Purple', value: '#cc66ff' },
  { name: 'Light Orange', value: '#ffaa66' },
  { name: 'Light Yellow', value: '#ffff99' },
]

const FONT_SIZES = [
  { label: '16', value: 16 },
  { label: '20', value: 20 },
  { label: '28', value: 28 },
  { label: '36', value: 36 },
  { label: '44', value: 44 },
  { label: '48', value: 48 },
  { label: '52', value: 52 },
  { label: '56', value: 56 },
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
    <BasePanel icon="📝" title="Sticky Note Properties">
      {/* Paper Color */}
      <PanelSection label="Paper Color">
        <ColorGrid
          colors={PAPER_COLORS}
          onColorChange={handlePaperColorChange}
          selectedColor={paperColor}
        />
        <div className="flex items-center gap-2 pt-1">
          <label className="text-xs text-gray-400" htmlFor="custom-paper-color">
            Custom:
          </label>
          <input
            className="w-12 h-8 rounded cursor-pointer border border-white/20"
            id="custom-paper-color"
            onChange={e => handlePaperColorChange(e.target.value)}
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
          onColorChange={handleFontColorChange}
          selectedColor={fontColor}
        />
        <div className="flex items-center gap-2 pt-1">
          <label className="text-xs text-gray-400" htmlFor="custom-font-color">
            Custom:
          </label>
          <input
            className="w-12 h-8 rounded cursor-pointer border border-white/20"
            id="custom-font-color"
            onChange={e => handleFontColorChange(e.target.value)}
            type="color"
            value={fontColor}
          />
          <span className="text-xs text-gray-500 font-mono">{fontColor}</span>
        </div>
      </PanelSection>

      {/* Font Size */}
      <PanelSection label="Font Size">
        <ButtonGroup
          onChange={handleFontSizeChange}
          options={FONT_SIZES}
          selected={fontSize}
        />
      </PanelSection>
    </BasePanel>
  )
}
