import { useRef, useEffect, useState } from 'react'
import { createUniver } from '@univerjs/presets'
import { LocaleType } from '@univerjs/core'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US'

// Import Univer preset styles
import '@univerjs/preset-sheets-core/lib/index.css'

interface SpreadsheetEditorProps {
  objectId: string
  title: string
  workbookData?: any
  onSave?: (workbookData: any) => void
}

/**
 * SpreadsheetEditor - Full-screen Univer spreadsheet in a dedicated tab
 * 
 * Opened when user clicks a spreadsheet widget on the canvas
 */
export function SpreadsheetEditor({
  objectId,
  title,
  workbookData,
  onSave,
}: SpreadsheetEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const univerRef = useRef<any>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initialWorkbookRef = useRef(workbookData) // Store initial data, don't react to changes
  const isInitializedRef = useRef(false)

  // Track container size with debouncing
  useEffect(() => {
    if (!containerRef.current) return

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        
        console.log('📐 Size change detected:', { width: rect.width, height: rect.height })
        
        // Debounce resize to avoid recreating Univer too frequently
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current)
        }
        
        resizeTimeoutRef.current = setTimeout(() => {
          console.log('📐 Applying new container size:', rect.width, rect.height)
          setContainerSize(prev => {
            // Only update if actually different (>10px change)
            const widthChanged = Math.abs(rect.width - prev.width) > 10
            const heightChanged = Math.abs(rect.height - prev.height) > 10
            
            if (!widthChanged && !heightChanged) {
              console.log('📐 Size change too small, ignoring')
              return prev
            }
            
            return { width: rect.width, height: rect.height }
          })
        }, 500) // Wait 500ms after resize stops
      }
    }

    // Initial size (no debounce)
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      console.log('📏 Initial container size:', rect.width, rect.height)
      setContainerSize({ width: rect.width, height: rect.height })
    }

    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(containerRef.current)

    return () => {
      console.log('🧹 Cleaning up resize observer')
      resizeObserver.disconnect()
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, []) // NO DEPENDENCIES - only run once on mount

  // Initialize Univer spreadsheet - ONLY ONCE on mount
  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    if (isInitializedRef.current) {
      return // Already initialized, don't recreate
    }

    // Wait for container to have actual size
    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      console.log('⏳ Waiting for container to have size...')
      return
    }

    console.log('📊 Initializing Univer once with size:', rect.width, rect.height)

    // Create Univer using official preset
    const { univer, univerAPI } = createUniver({
      locale: LocaleType.EN_US,
      locales: {
        [LocaleType.EN_US]: UniverPresetSheetsCoreEnUS,
      },
      presets: [
        UniverSheetsCorePreset({
          container: containerRef.current,
        }),
      ],
    })

    // Load existing workbook or create new one
    const initialWorkbook = initialWorkbookRef.current || {
      name: title || 'Spreadsheet',
      sheetOrder: ['sheet-1'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet1',
          cellData: {},
          rowCount: 1000,
          columnCount: 20,
          defaultColumnWidth: 100,
          defaultRowHeight: 27,
        },
      },
    }

    // Create workbook
    univerAPI.createWorkbook(initialWorkbook)
    console.log('✅ Univer spreadsheet editor initialized')

    univerRef.current = { univer, univerAPI }
    isInitializedRef.current = true

    // Cleanup on unmount ONLY
    return () => {
      if (univerRef.current) {
        console.log('🧹 Disposing Univer editor on component unmount...')
        univerRef.current.univer.dispose()
        univerRef.current = null
        isInitializedRef.current = false
      }
    }
  }, [title]) // Only title dependency - containerSize removed!

  // Handle resize after initialization - tell Univer canvas to resize
  useEffect(() => {
    if (!isInitializedRef.current || !univerRef.current || !containerRef.current) {
      return
    }

    if (containerSize.width === 0 || containerSize.height === 0) {
      return
    }

    console.log('🔄 Resizing Univer to:', containerSize)

    // Trigger Univer's resize by dispatching window resize event
    // Univer listens to window resize and recalculates its canvas
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 0)

  }, [containerSize])

  return (
    <div className="w-full h-full bg-white overflow-hidden" style={{ position: 'relative', zIndex: 50 }}>
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
