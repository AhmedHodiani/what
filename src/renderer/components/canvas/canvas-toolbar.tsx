import type { DrawingObjectType } from 'lib/types/canvas'
import { shortcutsRegistry } from 'renderer/shortcuts'
import { ShortcutContext } from 'renderer/shortcuts'
import { useGlobalTool } from 'renderer/contexts'

// No props needed - uses global context now!
interface CanvasToolbarProps {}

interface Tool {
  type: DrawingObjectType | 'select'
  label: string
  icon: string
  shortcut?: string
}

const tools: Tool[] = [
  { type: 'select', label: 'Select', icon: '↖' },
  { type: 'sticky-note', label: 'Sticky Note', icon: '📝' },
  { type: 'shape', label: 'Shape', icon: '⬜' },
  { type: 'freehand', label: 'Pen', icon: '✏️' },
  { type: 'arrow', label: 'Arrow', icon: '➡️' },
  { type: 'image', label: 'Image', icon: '🖼️' },
  { type: 'youtube', label: 'YouTube', icon: '📺' },
  { type: 'emoji', label: 'Emoji', icon: '😀' },
]

/**
 * Get shortcut key for a tool from KRS
 */
function getToolShortcut(
  toolType: DrawingObjectType | 'select'
): string | undefined {
  const allShortcuts = shortcutsRegistry.getAll()

  // Map tool types to expected description keywords
  const descriptionMap: Record<string, string[]> = {
    select: ['select tool'],
    'sticky-note': ['sticky note tool'],
    shape: ['shape tool'],
    freehand: ['pen', 'freehand'],
    arrow: ['arrow tool'],
    image: ['image tool'],
    youtube: ['youtube video tool'],
    emoji: ['emoji tool'],
  }

  const keywords = descriptionMap[toolType] || []

  // Find shortcut that matches this tool in Tool context
  const shortcut = allShortcuts.find(
    s =>
      s.context === ShortcutContext.Tool &&
      keywords.some(keyword => s.description.toLowerCase().includes(keyword))
  )

  if (!shortcut) return undefined

  // Format the key for display (uppercase single letter)
  return shortcut.key.toUpperCase()
}

/**
 * Canvas toolbar for selecting drawing tools.
 * Now GLOBAL - uses GlobalToolContext, tool persists across tabs!
 * Positioned below the viewport display for easy access.
 *
 * @example
 * ```tsx
 * <CanvasToolbar />
 * ```
 */
export function CanvasToolbar(_props: CanvasToolbarProps) {
  const { currentTool, setTool } = useGlobalTool()
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-auto">
      <div className="bg-black/80 backdrop-blur-sm border border-teal-400/30 rounded-lg shadow-lg">
        <div className="flex items-center gap-1 p-2">
          {tools.map(tool => (
            <button
              className={`
                group relative flex flex-col items-center justify-center
                w-14 h-14 rounded-md transition-all
                ${
                  currentTool === tool.type
                    ? 'bg-teal-500/20 border-2 border-teal-400'
                    : 'border-2 border-transparent hover:bg-white/10 hover:border-teal-400/50'
                }
              `}
              key={tool.type}
              onClick={() => setTool(tool.type)}
              title={`${tool.label}${getToolShortcut(tool.type) ? ` (${getToolShortcut(tool.type)})` : ''}`}
            >
              {/* Icon */}
              <span className="text-2xl mb-0.5">{tool.icon}</span>

              {/* Label */}
              <span className="text-[9px] text-gray-400 font-medium">
                {tool.label.split(' ')[0]}
              </span>

              {/* Shortcut hint */}
              {getToolShortcut(tool.type) && (
                <span
                  className={`
                    absolute -top-1 -right-1 text-[8px] font-mono
                    px-1 py-0.5 rounded bg-black/90 border
                    ${
                      currentTool === tool.type
                        ? 'text-teal-300 border-teal-400'
                        : 'text-gray-500 border-gray-600'
                    }
                  `}
                >
                  {getToolShortcut(tool.type)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
