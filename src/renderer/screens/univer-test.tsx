import { useRef, useEffect } from 'react'
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

// Import Univer styles
import '@univerjs/design/lib/index.css'
import '@univerjs/ui/lib/index.css'
import '@univerjs/docs-ui/lib/index.css'
import '@univerjs/sheets-ui/lib/index.css'

/**
 * ISOLATED Univer Test Screen
 * 
 * This screen is completely isolated from the app's shortcuts, 
 * clipboard handlers, and context providers.
 * 
 * Access via: http://localhost:5173/univer-test
 */
export function UniverTestScreen() {
  const containerRef = useRef<HTMLDivElement>(null)
  const univerRef = useRef<Univer | null>(null)

  useEffect(() => {
    if (!containerRef.current || univerRef.current) return

    console.log('🧪 Initializing ISOLATED Univer test...')

    // Add global event logger to debug what's happening
    const logKeyEvent = (e: KeyboardEvent) => {
      console.log('⌨️ KEYDOWN:', {
        key: e.key,
        code: e.code,
        target: e.target,
        defaultPrevented: e.defaultPrevented,
      })
    }
    document.addEventListener('keydown', logKeyEvent, true)

    // Create Univer instance
    const univer = new Univer({
      theme: defaultTheme,
      locale: LocaleType.EN_US,
      locales: {
        [LocaleType.EN_US]: {},
      },
      logLevel: LogLevel.VERBOSE, // Show all logs for debugging
    })

    // Register plugins IN ORDER (order matters!)
    univer.registerPlugin(UniverRenderEnginePlugin)
    univer.registerPlugin(UniverFormulaEnginePlugin)
    
    // UI must come before sheets
    univer.registerPlugin(UniverUIPlugin, {
      container: containerRef.current,
      header: true,
      footer: true,
    })
    
    // Docs must come before sheets (sheets uses docs for cell editing)
    univer.registerPlugin(UniverDocsPlugin)
    univer.registerPlugin(UniverDocsUIPlugin)
    
    // Sheets plugins
    univer.registerPlugin(UniverSheetsPlugin)
    univer.registerPlugin(UniverSheetsUIPlugin)
    univer.registerPlugin(UniverSheetsFormulaPlugin)

    // Create test workbook with sample data
    const workbookData = {
      id: 'test-workbook',
      name: 'Test Spreadsheet',
      sheetOrder: ['sheet-1'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet1',
          cellData: {
            0: {
              0: { v: 'Product' },
              1: { v: 'Q1 Sales' },
              2: { v: 'Q2 Sales' },
              3: { v: 'Total' },
            },
            1: {
              0: { v: 'Laptops' },
              1: { v: 45000, t: 2 },
              2: { v: 52000, t: 2 },
              3: { v: '', f: '=B2+C2' },
            },
            2: {
              0: { v: 'Phones' },
              1: { v: 38000, t: 2 },
              2: { v: 41000, t: 2 },
              3: { v: '', f: '=B3+C3' },
            },
            3: {
              0: { v: 'Tablets' },
              1: { v: 22000, t: 2 },
              2: { v: 28000, t: 2 },
              3: { v: '', f: '=B4+C4' },
            },
          },
          rowCount: 1000,
          columnCount: 20,
          defaultColumnWidth: 120,
          defaultRowHeight: 27,
        },
      },
    }

    univer.createUnit(UniverInstanceType.UNIVER_SHEET, workbookData)
    console.log('✅ ISOLATED Univer test initialized')
    console.log('📝 Try:')
    console.log('  - Double-click any cell')
    console.log('  - Select a cell and press F2')
    console.log('  - Select a cell and just start typing')

    univerRef.current = univer

    return () => {
      console.log('🧹 Disposing ISOLATED Univer...')
      document.removeEventListener('keydown', logKeyEvent, true)
      univer.dispose()
      univerRef.current = null
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col">
      {/* Header */}
      <div className="h-16 bg-black/30 backdrop-blur-lg border-b border-white/10 flex items-center px-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <h1 className="ml-6 text-2xl font-bold text-white">
          🧪 Isolated Univer Test
        </h1>
        <div className="ml-auto flex items-center gap-4">
          <a
            href="#/main"
            className="text-sm text-blue-300 hover:text-blue-200 underline"
          >
            ← Back to App
          </a>
          <div className="text-sm text-gray-300">
            No shortcuts, no clipboard handlers, no interference
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-500/10 border-b border-blue-500/20 px-6 py-4">
        <div className="flex gap-8 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-blue-300">💡</span>
            <span className="text-gray-200">Double-click a cell to edit</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-300">⌨️</span>
            <span className="text-gray-200">Select cell + F2 to edit</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-300">✏️</span>
            <span className="text-gray-200">Select cell + type to edit</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-300">🔧</span>
            <span className="text-gray-200">Check DevTools Console (F12) for logs</span>
          </div>
        </div>
      </div>

      {/* Spreadsheet Container */}
      <div className="flex-1 p-8 overflow-hidden">
        <div className="w-full h-full bg-white rounded-xl shadow-2xl overflow-hidden">
          <div
            ref={containerRef}
            className="w-full h-full"
            style={{
              // Ensure Univer can handle all events
              pointerEvents: 'auto',
              userSelect: 'auto',
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="h-12 bg-black/30 backdrop-blur-lg border-t border-white/10 flex items-center px-6 text-xs text-gray-400">
        <div className="flex gap-6">
          <span>✅ No ShortcutsProvider</span>
          <span>✅ No clipboard paste handler</span>
          <span>✅ No global event listeners</span>
          <span>✅ Pure Univer instance</span>
        </div>
        <div className="ml-auto">
          Press <kbd className="px-2 py-1 bg-white/10 rounded">Ctrl+Shift+I</kbd> to open DevTools
        </div>
      </div>
    </div>
  )
}
