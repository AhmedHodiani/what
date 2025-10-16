import type { ReactNode } from 'react'

interface BasePanelProps {
  title: string
  icon?: string
  children: ReactNode
}

/**
 * BasePanel - Shared wrapper for all properties panels
 * Provides consistent styling and layout
 */
export function BasePanel({ title, icon, children }: BasePanelProps) {
  return (
    <div className="absolute top-3 right-3 w-64 bg-black/90 backdrop-blur-sm border border-teal-400/30 rounded-lg shadow-xl overflow-hidden pointer-events-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-semibold text-teal-400 flex items-center gap-2">
          {icon && <span>{icon}</span>}
          {title}
        </h3>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

/**
 * Shared UI components for panels
 */

interface SectionProps {
  label: string
  children: ReactNode
}

export function PanelSection({ label, children }: SectionProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-300 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  )
}

interface ColorGridProps {
  colors: Array<{ name: string; value: string }>
  selectedColor: string
  onColorChange: (color: string) => void
}

export function ColorGrid({
  colors,
  selectedColor,
  onColorChange,
}: ColorGridProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {colors.map((color) => (
        <button
          key={color.value}
          type="button"
          onClick={() => onColorChange(color.value)}
          className={`
            w-full h-10 rounded border-2 transition-all
            ${
              selectedColor === color.value
                ? 'border-teal-400 scale-110'
                : 'border-white/20 hover:border-white/40'
            }
          `}
          style={{ backgroundColor: color.value }}
          title={color.name}
        />
      ))}
    </div>
  )
}

interface ButtonGroupProps {
  options: Array<{ label: string; value: any }>
  selected: any
  onChange: (value: any) => void
}

export function ButtonGroup({ options, selected, onChange }: ButtonGroupProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          className={`
            px-3 py-1.5 rounded text-sm font-medium transition-all
            ${
              selected === option.value
                ? 'bg-teal-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  unit?: string
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit = '',
}: SliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-300">{label}</span>
        <span className="text-xs text-teal-400 font-mono">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-thumb"
      />
    </div>
  )
}
