import { useCallback } from 'react'
import type { DrawingObject, SpreadsheetObject } from 'lib/types/canvas'
import { WidgetWrapper } from './widget-wrapper'
import { Sheet } from 'lucide-react'
import { logger } from 'shared/logger'

interface SpreadsheetWidgetProps {
  object: SpreadsheetObject
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
 * SpreadsheetWidget - Icon/Thumbnail for spreadsheet
 * 
 * Click to open the spreadsheet in a dedicated tab
 * Similar to FileWidget - just shows an icon and name
 */
export function SpreadsheetWidget({
  object,
  isSelected,
  zoom,
  currentTool,
  tabId,
  onUpdate,
  onSelect,
  onContextMenu,
  onStartDrag,
}: SpreadsheetWidgetProps) {
  
  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!tabId) {
      logger.error('❌ Cannot open spreadsheet: no parent tabId available')
      return
    }
    
    // Reload the object from database to get latest assetId
    const objects = await window.App.file.getObjects(tabId)
    const freshObject = objects.find((obj: any) => obj.id === object.id)
    const assetId = freshObject?.object_data?.assetId
    
    logger.debug('📊 Fresh object from DB:', {
      objectId: object.id,
      freshObject: freshObject,
      objectData: freshObject?.object_data,
      objectDataStringified: JSON.stringify(freshObject?.object_data),
      assetId: assetId,
      hasAssetId: 'assetId' in (freshObject?.object_data || {}),
      objectDataKeys: Object.keys(freshObject?.object_data || {}),
    })
    
    const splitView = !e.ctrlKey // Regular click = split (true), Ctrl+Click = full tab (false)
    
    logger.debug('📊 Opening spreadsheet:', {
      title: object.object_data.title,
      assetId: assetId,
      freshAssetId: assetId,
      mode: splitView ? 'split (50%)' : 'full tab (100%)',
      ctrlKey: e.ctrlKey,
      splitView,
    })
    
    try {
      await window.App.spreadsheet.open({
        parentTabId: tabId,
        objectId: object.id,
        title: object.object_data.title || 'Spreadsheet',
        assetId: assetId,
        splitView,
      })
    } catch (error) {
      logger.error('Failed to open spreadsheet tab:', error)
    }
  }, [object.id, object.object_data, tabId])

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
        className="relative w-full h-full bg-gradient-to-br from-green-50 to-teal-50 rounded-lg overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-shadow border-2 border-green-200"
        onClick={handleClick}
      >
        {/* Icon */}
        <div className="flex flex-col items-center justify-center h-full p-4">
          <Sheet className="w-12 h-12 text-green-600 mb-2" />
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-800 line-clamp-2">
              {object.object_data.title || 'Spreadsheet'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Click: Split view • Ctrl+Click: Full tab
            </div>
          </div>
        </div>

        {/* Decorative corner ribbon */}
        <div className="absolute top-0 right-0 w-12 h-12 bg-green-500 transform rotate-45 translate-x-6 -translate-y-6 opacity-20" />
      </div>
    </WidgetWrapper>
  )
}
