import { useCallback } from 'react'
import type { ShapeObject, DrawingObject } from 'lib/types/canvas'
import { BasePanel, PanelSection, ColorGrid, Slider } from './base-panel'

const PRESET_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Green', value: '#10b981' },
  { name: 'Orange', value: '#f59e0b' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Indigo', value: '#6366f1' },
]

const STROKE_COLORS = [
  { name: 'Dark Blue', value: '#1e40af' },
  { name: 'Dark Red', value: '#991b1b' },
  { name: 'Dark Green', value: '#065f46' },
  { name: 'Dark Orange', value: '#c2410c' },
  { name: 'Dark Purple', value: '#6b21a8' },
  { name: 'Dark Pink', value: '#9f1239' },
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#ffffff' },
]

interface ShapePanelProps {
  object: ShapeObject
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
}

/**
 * ShapePanel - Properties panel for shape objects
 * Clean, extracted version using BasePanel components
 */
export function ShapePanel({ object, onUpdate }: ShapePanelProps) {
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

  const updateProperty = useCallback(
    (updates: Partial<ShapeObject['object_data']>) => {
      onUpdate(object.id, {
        object_data: {
          ...object.object_data,
          ...updates,
        },
      })
    },
    [object.id, object.object_data, onUpdate]
  )

  return (
    <BasePanel icon="🔷" title="Shape Properties">
      {/* Shape Type (Read-only) */}
      <PanelSection label="Type">
        <div className="text-sm text-white capitalize px-3 py-2 bg-gray-900 rounded border border-gray-600">
          {shapeType}
        </div>
      </PanelSection>

      {/* Fill Color */}
      <PanelSection label="Fill Color">
        <ColorGrid
          colors={PRESET_COLORS}
          onColorChange={color => updateProperty({ fill: color })}
          selectedColor={fill}
        />
        <div className="flex items-center gap-2 pt-1">
          <input
            className="w-12 h-8 rounded cursor-pointer border border-white/20"
            onChange={e => updateProperty({ fill: e.target.value })}
            type="color"
            value={fill}
          />
          <span className="text-xs text-gray-500 font-mono">{fill}</span>
        </div>
      </PanelSection>

      {/* Stroke Color */}
      <PanelSection label="Stroke Color">
        <ColorGrid
          colors={STROKE_COLORS}
          onColorChange={color => updateProperty({ stroke: color })}
          selectedColor={stroke}
        />
        <div className="flex items-center gap-2 pt-1">
          <input
            className="w-12 h-8 rounded cursor-pointer border border-white/20"
            onChange={e => updateProperty({ stroke: e.target.value })}
            type="color"
            value={stroke}
          />
          <span className="text-xs text-gray-500 font-mono">{stroke}</span>
        </div>
      </PanelSection>

      {/* Stroke Width */}
      <PanelSection label="Stroke Width">
        <Slider
          label="Width"
          max={20}
          min={0}
          onChange={value => updateProperty({ strokeWidth: value })}
          step={1}
          unit="px"
          value={strokeWidth}
        />
      </PanelSection>

      {/* Corner Radius (for rectangles) */}
      {shapeType === 'rectangle' && (
        <PanelSection label="Corner Radius">
          <Slider
            label="Radius"
            max={50}
            min={0}
            onChange={value => updateProperty({ cornerRadius: value })}
            step={1}
            unit="px"
            value={cornerRadius}
          />
        </PanelSection>
      )}

      {/* Points (for stars) */}
      {shapeType === 'star' && (
        <PanelSection label="Star Points">
          <Slider
            label="Points"
            max={12}
            min={3}
            onChange={value => updateProperty({ points: value })}
            step={1}
            value={points}
          />
        </PanelSection>
      )}

      {/* Rotation */}
      <PanelSection label="Rotation">
        <Slider
          label="Angle"
          max={360}
          min={0}
          onChange={value => updateProperty({ rotation: value })}
          step={1}
          unit="°"
          value={rotation}
        />
      </PanelSection>

      {/* Opacity */}
      <PanelSection label="Opacity">
        <Slider
          label="Opacity"
          max={1}
          min={0}
          onChange={value => updateProperty({ opacity: value })}
          step={0.1}
          value={opacity}
        />
      </PanelSection>
    </BasePanel>
  )
}
