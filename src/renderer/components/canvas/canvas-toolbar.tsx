import type { DrawingObjectType } from 'lib/types/canvas'

interface CanvasToolbarProps {
  selectedTool: DrawingObjectType | 'select'
  onToolSelect: (tool: DrawingObjectType | 'select') => void
}

interface Tool {
  type: DrawingObjectType | 'select'
  label: string
  icon: string
  shortcut?: string
}

const tools: Tool[] = [
  { type: 'select', label: 'Select', icon: '↖', shortcut: 'V' },
  { type: 'sticky-note', label: 'Sticky Note', icon: '📝', shortcut: 'S' },
  { type: 'text', label: 'Text', icon: '📄', shortcut: 'T' },
  { type: 'shape', label: 'Shape', icon: '⬜', shortcut: 'R' },
  { type: 'freehand', label: 'Pen', icon: '✏️', shortcut: 'P' },
  { type: 'arrow', label: 'Arrow', icon: '→', shortcut: 'A' },
  { type: 'image', label: 'Image', icon: '🖼️', shortcut: 'I' },
  { type: 'youtube', label: 'YouTube', icon: '📺', shortcut: 'Y' },
]

/**
 * Canvas toolbar for selecting drawing tools.
 * Positioned below the viewport display for easy access.
 * 
 * @example
 * ```tsx
 * <CanvasToolbar
 *   selectedTool={currentTool}
 *   onToolSelect={(tool) => setCurrentTool(tool)}
 * />
 * ```
 */
export function CanvasToolbar({ selectedTool, onToolSelect }: CanvasToolbarProps) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-auto">
      <div className="bg-black/80 backdrop-blur-sm border border-teal-400/30 rounded-lg shadow-lg">
        <div className="flex items-center gap-1 p-2">
          {tools.map((tool) => (
            <button
              key={tool.type}
              onClick={() => onToolSelect(tool.type)}
              title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
              className={`
                group relative flex flex-col items-center justify-center
                w-14 h-14 rounded-md transition-all
                ${
                  selectedTool === tool.type
                    ? 'bg-teal-500/20 border-2 border-teal-400'
                    : 'border-2 border-transparent hover:bg-white/10 hover:border-teal-400/50'
                }
              `}
            >
              {/* Icon */}
              <span className="text-2xl mb-0.5">{tool.icon}</span>
              
              {/* Label */}
              <span className="text-[9px] text-gray-400 font-medium">
                {tool.label.split(' ')[0]}
              </span>
              
              {/* Shortcut hint */}
              {tool.shortcut && (
                <span
                  className={`
                    absolute -top-1 -right-1 text-[8px] font-mono
                    px-1 py-0.5 rounded bg-black/90 border
                    ${
                      selectedTool === tool.type
                        ? 'text-teal-300 border-teal-400'
                        : 'text-gray-500 border-gray-600'
                    }
                  `}
                >
                  {tool.shortcut}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
