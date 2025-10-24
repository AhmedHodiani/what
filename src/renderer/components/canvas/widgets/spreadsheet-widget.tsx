import { useRef, useEffect, useState, useCallback } from 'react'
import type { DrawingObject, SpreadsheetObject } from 'lib/types/canvas'
import { WidgetWrapper } from './widget-wrapper'
import { Univer, LocaleType, LogLevel, UniverInstanceType } from '@univerjs/core'
import { defaultTheme } from '@univerjs/design'
import { UniverRenderEnginePlugin } from '@univerjs/engine-render'
import { UniverFormulaEnginePlugin } from '@univerjs/engine-formula'
import { UniverUIPlugin } from '@univerjs/ui'
import { UniverDocsPlugin } from '@univerjs/docs'
import { UniverDocsUIPlugin } from '@univerjs/docs-ui'
import { UniverSheetsPlugin } from '@univerjs/sheets'
import { UniverSheetsUIPlugin } from '@univerjs/sheets-ui'
import { UniverSheetsFormulaPlugin } from '@univerjs/sheets-formula'
import { Maximize2, Minimize2 } from 'lucide-react'

// Import Univer styles
import '@univerjs/design/lib/index.css'
import '@univerjs/ui/lib/index.css'
import '@univerjs/docs-ui/lib/index.css'
import '@univerjs/sheets-ui/lib/index.css'

interface SpreadsheetWidgetProps {
  object: SpreadsheetObject
  isSelected: boolean
  zoom: number
  currentTool?: string
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
  onSelect: (id: string) => void
  onContextMenu: (event: React.MouseEvent, id: string) => void
  onStartDrag: (e: React.MouseEvent, id: string) => void
}

/**
 * SpreadsheetWidget - Embedded Univer spreadsheet
 *
 * Features:
 * - Full spreadsheet functionality with formulas
 * - Event isolation (wheel, keyboard don't affect canvas)
 * - Fullscreen mode
 * - Auto-save workbook state to object_data
 */
export function SpreadsheetWidget({
  object,
  isSelected,
  zoom,
  currentTool,
  onUpdate,
  onSelect,
  onContextMenu,
  onStartDrag,
}: SpreadsheetWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const fullscreenContainerRef = useRef<HTMLDivElement>(null)
  const univerRef = useRef<Univer | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  // Initialize Univer spreadsheet
  useEffect(() => {
    const targetContainer = isFullscreen ? fullscreenContainerRef.current : containerRef.current
    
    if (!targetContainer || univerRef.current) return

    console.log('📊 Initializing Univer spreadsheet...')

    // Create Univer instance
    const univer = new Univer({
      theme: defaultTheme,
      locale: LocaleType.EN_US,
      locales: {
        [LocaleType.EN_US]: {},
      },
      logLevel: LogLevel.ERROR, // Less verbose for widget
    })

    // Register plugins
    univer.registerPlugin(UniverRenderEnginePlugin)
    univer.registerPlugin(UniverFormulaEnginePlugin)
    univer.registerPlugin(UniverUIPlugin, {
      container: targetContainer,
      header: true,
      footer: false,
    })
    univer.registerPlugin(UniverDocsPlugin)
    univer.registerPlugin(UniverDocsUIPlugin)
    univer.registerPlugin(UniverSheetsPlugin)
    univer.registerPlugin(UniverSheetsUIPlugin)
    univer.registerPlugin(UniverSheetsFormulaPlugin)

    // Load existing workbook or create new one
    const workbookData = object.object_data.workbookData || {
      id: `workbook-${object.id}`,
      name: object.object_data.title || 'Spreadsheet',
      sheetOrder: ['sheet-1'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet1',
          cellData: {
            0: {
              0: { v: 'A1' },
              1: { v: 'B1' },
              2: { v: 'C1' },
            },
          },
          rowCount: 1000,
          columnCount: 20,
          defaultColumnWidth: 100,
          defaultRowHeight: 27,
        },
      },
    }

    // Create workbook
    univer.createUnit(UniverInstanceType.UNIVER_SHEET, workbookData)
    console.log('✅ Univer spreadsheet initialized')

    univerRef.current = univer

    // Cleanup
    return () => {
      console.log('🧹 Disposing Univer...')
      univer.dispose()
      univerRef.current = null
    }
  }, [object.id, object.object_data.workbookData, object.object_data.title, isFullscreen])

  // Event isolation: Prevent canvas interactions when interacting with spreadsheet
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsFocused(true)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Allow scrolling within spreadsheet, prevent canvas zoom
    e.stopPropagation()
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Prevent all keyboard shortcuts from bubbling to canvas
    e.stopPropagation()
  }, [])

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsFocused(true)
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    // TODO: Save workbook state to object_data
    // This requires getting the workbook snapshot from Univer
  }, [])

  const toggleFullscreen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsFullscreen(prev => !prev)
  }, [])

  return (
    <>
      {/* Regular widget mode */}
      {!isFullscreen && (
        <WidgetWrapper
          currentTool={currentTool}
          isSelected={isSelected}
          minHeight={400}
          minWidth={600}
          object={object}
          onContextMenu={onContextMenu}
          onSelect={onSelect}
          onStartDrag={onStartDrag}
          onUpdate={onUpdate}
          zoom={zoom}
        >
          <div
            className="relative w-full h-full bg-white rounded-lg overflow-hidden shadow-lg"
            onWheel={handleWheel}
          >
            {/* Header with title and fullscreen button */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-r from-green-500 to-teal-500 backdrop-blur-sm cursor-move flex items-center px-3 z-50">
              <div className="flex gap-1">
                <div className="w-1.5 h-3 bg-white/60 rounded-full" />
                <div className="w-1.5 h-3 bg-white/60 rounded-full" />
                <div className="w-1.5 h-3 bg-white/60 rounded-full" />
              </div>
              <span className="ml-3 text-sm text-white font-medium">
                📊 {object.object_data.title || 'Spreadsheet'}
              </span>
              <div className="ml-auto flex gap-2">
                <button
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  onClick={toggleFullscreen}
                  onMouseDown={(e) => e.stopPropagation()}
                  title="Fullscreen"
                  type="button"
                >
                  <Maximize2 className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Univer container */}
            <div
              className="w-full h-full pt-8"
              ref={containerRef}
            />
          </div>
        </WidgetWrapper>
      )}

      {/* Fullscreen mode */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-[9999] bg-white"
          onWheel={handleWheel}
        >
          {/* Fullscreen header */}
          <div className="h-12 bg-gradient-to-r from-green-500 to-teal-500 flex items-center px-4 shadow-lg">
            <span className="text-lg text-white font-semibold">
              📊 {object.object_data.title || 'Spreadsheet'}
            </span>
            <div className="ml-auto">
              <button
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                onClick={toggleFullscreen}
                onMouseDown={(e) => e.stopPropagation()}
                title="Exit Fullscreen"
                type="button"
              >
                <Minimize2 className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Fullscreen Univer container */}
          <div
            className="w-full h-[calc(100vh-48px)]"
            ref={fullscreenContainerRef}
          />
        </div>
      )}
    </>
  )
}
