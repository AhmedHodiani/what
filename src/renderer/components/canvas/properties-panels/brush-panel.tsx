import { useCallback } from 'react'
import type { FreehandObject, ArrowObject, DrawingObject } from 'lib/types/canvas'
import { BasePanel, PanelSection, ColorGrid, Slider } from './base-panel'

const PRESET_COLORS = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Gold', value: '#FFD700' },
  { name: 'Red', value: '#FF6B6B' },
  { name: 'Turquoise', value: '#4ECDC4' },
  { name: 'Blue', value: '#45B7D1' },
  { name: 'Mint', value: '#96CEB4' },
  { name: 'Orange', value: '#FECA57' },
  { name: 'Pink', value: '#FF9FF3' },
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
    ? (object.object_data.stroke || '#FFFFFF')
    : (liveStrokeColor || '#FFFFFF')
  const strokeWidth = isSelectionMode
    ? (object.object_data.strokeWidth || 2)
    : (liveStrokeWidth || 2)
  const opacity = isSelectionMode
    ? (object.object_data.opacity || 1)
    : (liveOpacity || 1)

  // Selection mode: Update object via registry pattern
  const updateProperty = useCallback(
    (updates: Partial<FreehandObject['object_data'] | ArrowObject['object_data']>) => {
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

  return (
    <BasePanel 
      title={isSelectionMode ? 'Brush Properties' : 'Drawing Brush'} 
      icon="✏️"
    >
      {/* Stroke Color */}
      <PanelSection label="Stroke Color">
        <ColorGrid
          colors={PRESET_COLORS}
          selectedColor={stroke}
          onColorChange={handleColorChange}
        />
        <div className="flex items-center gap-2 pt-1">
          <input
            className="w-12 h-8 rounded cursor-pointer border border-white/20"
            onChange={(e) => handleColorChange(e.target.value)}
            type="color"
            value={stroke}
          />
          <span className="text-xs text-gray-500 font-mono">{stroke}</span>
        </div>
      </PanelSection>

      {/* Stroke Width */}
      <PanelSection label="Brush Size">
        <Slider
          label="Width"
          value={strokeWidth}
          min={1}
          max={50}
          step={1}
          unit="px"
          onChange={handleWidthChange}
        />
      </PanelSection>

      {/* Opacity */}
      <PanelSection label="Opacity">
        <Slider
          label="Opacity"
          value={opacity}
          min={0}
          max={1}
          step={0.1}
          onChange={handleOpacityChange}
        />
      </PanelSection>
    </BasePanel>
  )
}
