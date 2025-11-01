import { useCallback } from 'react'
import type { DrawingObject, ExternalWebObject } from 'lib/types/canvas'
import { WidgetWrapper } from './widget-wrapper'
import { Globe } from 'lucide-react'
import { logger } from 'shared/logger'

interface ExternalWebWidgetProps {
  object: ExternalWebObject
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
 * ExternalWebWidget - Icon/Thumbnail for external website
 * 
 * Double-click to open the website in a split view (50%)
 * Ctrl+Double-click to open in a full tab
 */
export function ExternalWebWidget({
  object,
  isSelected,
  zoom,
  currentTool,
  tabId,
  onUpdate,
  onSelect,
  onContextMenu,
  onStartDrag,
}: ExternalWebWidgetProps) {
  
  const handleDoubleClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!tabId) {
      logger.error('❌ Cannot open external web: no parent tabId available')
      return
    }
    
    // Reload the object from database to get latest URL
    const objects = await window.App.file.getObjects(tabId)
    const freshObject = objects.find((obj: any) => obj.id === object.id)
    const url = freshObject?.object_data?.url
    
    if (!url) {
      logger.error('❌ No URL found in object data')
      return
    }
    
    const splitView = !e.ctrlKey // Regular double-click = split (true), Ctrl+Double-click = full tab (false)
    
    try {
      await window.App.externalWeb.open({
        parentTabId: tabId,
        objectId: object.id,
        title: object.object_data.title || new URL(url).hostname,
        url: url,
        splitView,
      })
    } catch (error) {
      logger.error('Failed to open external web tab:', error)
    }
  }, [object.id, object.object_data, tabId])

  // Extract hostname for display
  const displayUrl = (() => {
    try {
      const urlObj = new URL(object.object_data.url)
      return urlObj.hostname
    } catch {
      return object.object_data.url
    }
  })()

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
        className="relative w-full h-full bg-linear-to-br from-blue-50 to-cyan-50 rounded-lg overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-shadow border-2 border-blue-200"
        onDoubleClick={handleDoubleClick}
      >
        {/* Icon */}
        <div className="flex flex-col items-center justify-center h-full p-4">
          <Globe className="w-12 h-12 text-blue-600 mb-2" />
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-800 line-clamp-2 mb-1">
              {object.object_data.title || 'External Website'}
            </div>
            <div className="text-xs text-gray-600 line-clamp-1 mb-2 font-mono">
              {displayUrl}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Double-click: Split view
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Ctrl+Double-click: Full tab
            </div>
          </div>
        </div>

        {/* Decorative corner ribbon */}
        <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500 transform rotate-45 translate-x-6 -translate-y-6 opacity-20" />
      </div>
    </WidgetWrapper>
  )
}
