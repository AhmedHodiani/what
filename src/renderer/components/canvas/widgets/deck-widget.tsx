import type { DrawingObject, DeckObject } from 'lib/types/canvas'
import { WidgetWrapper } from './widget-wrapper'
import { LayersIcon } from 'lucide-react'
import { useWidgetCapabilities } from 'renderer/hooks'

interface DeckWidgetProps {
  object: DeckObject
  isSelected: boolean
  zoom: number
  currentTool?: string
  tabId?: string | null // Parent canvas file's tab ID
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
  onSelect: (id: string) => void
  onContextMenu: (event: React.MouseEvent, id: string) => void
  onStartDrag: (e: React.MouseEvent, id: string) => void
}

/**
 * DeckWidget - Icon/Thumbnail for deck (flashcard system)
 *
 * Click to open the deck editor in a dedicated tab
 * Similar to SpreadsheetWidget - just shows an icon and name
 */
export function DeckWidget({
  object,
  isSelected,
  zoom,
  currentTool,
  tabId,
  onUpdate,
  onSelect,
  onContextMenu,
  onStartDrag,
}: DeckWidgetProps) {
  // Use capability system for external tab behavior
  const { handleExternalTabOpen } = useWidgetCapabilities(
    object.type,
    object,
    tabId || undefined
  )

  return (
    <WidgetWrapper
      currentTool={currentTool}
      isSelected={isSelected}
      minHeight={120}
      minWidth={180}
      object={object}
      onContextMenu={onContextMenu}
      onSelect={onSelect}
      onStartDrag={onStartDrag}
      onUpdate={onUpdate}
      zoom={zoom}
    >
      <div
        className="relative w-full h-full bg-linear-to-br from-purple-50 to-indigo-50 rounded-lg overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-shadow border-2 border-purple-200"
        onDoubleClick={handleExternalTabOpen}
      >
        {/* Icon */}
        <div className="flex flex-col items-center justify-center h-full p-4">
          <LayersIcon className="w-12 h-12 text-purple-600 mb-2" />
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-800 line-clamp-2">
              {object.object_data.title || 'Deck'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Double-click: Full tab
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Ctrl+Double-click: Split view
            </div>
          </div>
        </div>

        {/* Decorative corner ribbon */}
        <div className="absolute top-0 right-0 w-12 h-12 bg-purple-500 transform rotate-45 translate-x-6 -translate-y-6 opacity-20" />
      </div>
    </WidgetWrapper>
  )
}
