import { useRef, useEffect, useState, useCallback } from 'react'
import { createUniver } from '@univerjs/presets'
import { LocaleType } from '@univerjs/core'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US'
import { logger } from 'shared/logger'

// Import Univer preset styles
import '@univerjs/preset-sheets-core/lib/index.css'

// Default workbook structure
function createDefaultWorkbook(name: string) {
  return {
    name: name || 'Spreadsheet',
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
}

interface SpreadsheetEditorProps {
  tabId: string // FlexLayout tab ID (passed from factory)
  objectId: string
  parentTabId: string
  title: string
  assetId?: string
}

/**
 * SpreadsheetEditor - Full-screen Univer spreadsheet in a dedicated tab
 * 
 * Opened when user clicks a spreadsheet widget on the canvas
 * Data is stored as a JSON asset file in the .what archive
 */
export function SpreadsheetEditor({
  tabId,
  objectId,
  parentTabId,
  title,
  assetId,
}: SpreadsheetEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const univerRef = useRef<any>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isInitializedRef = useRef(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentAssetIdRef = useRef<string | undefined>(assetId)
  const [isDirty, setIsDirty] = useState(false)
  const [fileSize, setFileSize] = useState<number>(0)
  const lastSaveTimeRef = useRef<number>(0)

  // Track container size with debouncing
  useEffect(() => {
    if (!containerRef.current) return

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        
        // console.log('📐 Size change detected:', { width: rect.width, height: rect.height })
        
        // Debounce resize to avoid recreating Univer too frequently
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current)
        }
        
        resizeTimeoutRef.current = setTimeout(() => {
          // console.log('📐 Applying new container size:', rect.width, rect.height)
          setContainerSize(prev => {
            // Only update if actually different (>10px change)
            const widthChanged = Math.abs(rect.width - prev.width) > 10
            const heightChanged = Math.abs(rect.height - prev.height) > 10
            
            if (!widthChanged && !heightChanged) {
              // console.log('📐 Size change too small, ignoring')
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
      setContainerSize({ width: rect.width, height: rect.height })
    }

    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(containerRef.current)

    return () => {
      // console.log('🧹 Cleaning up resize observer')
      resizeObserver.disconnect()
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, []) // NO DEPENDENCIES - only run once on mount

  // Save workbook to asset file (debounced)
  const saveWorkbook = useCallback(async () => {
    if (!univerRef.current) return

    try {
      // Check if object still exists before saving (race condition protection)
      const objects = await window.App.file.getObjects(parentTabId)
      const objectExists = objects.some((obj: any) => obj.id === objectId)
      
      if (!objectExists) {
        logger.warn('⚠️ Object deleted, skipping save:', objectId)
        return
      }

      const workbook = univerRef.current.univerAPI.getActiveWorkbook()
      if (!workbook) {
        logger.error('❌ No active workbook to save')
        return
      }

      // Get workbook snapshot as JSON
      const workbookData = workbook.save()
      const workbookJson = JSON.stringify(workbookData)
      
      // Convert to ArrayBuffer
      const buffer = new TextEncoder().encode(workbookJson).buffer
      
      let finalAssetId = currentAssetIdRef.current
      
      // If we already have an assetId, update the existing file
      if (currentAssetIdRef.current) {
        await window.App.file.updateAsset(
          currentAssetIdRef.current,
          buffer,
          'application/json',
          parentTabId
        )
      } else {
        // First save - create new asset
        logger.debug('📝 Creating new spreadsheet asset')
        finalAssetId = await window.App.file.saveAsset(
          `spreadsheet-${objectId}.json`,
          buffer,
          'application/json',
          parentTabId
        )
        
        // Get current object to preserve all fields
        const objects = await window.App.file.getObjects(parentTabId)
        const currentObject = objects.find((obj: any) => obj.id === objectId)
        
        logger.debug('📝 Current object before save:', currentObject)
        
        // Update the object in database with the assetId
        const updatedObject = {
          ...currentObject,
          object_data: {
            ...currentObject.object_data,
            title: title,
            assetId: finalAssetId,
          },
        }
        
        logger.debug('💾 About to save object with:', {
          objectId,
          updatedObject,
        })
        
        await window.App.file.saveObject(updatedObject, parentTabId)
        
        logger.debug('💾 Object saved - verifying...', { objectId })
        
        // Verify the update worked
        const allObjects = await window.App.file.getObjects(parentTabId)
        const savedObject = allObjects.find((obj: any) => obj.id === objectId)
        
        logger.debug('💾 Object after save:', {
          objectId,
          savedObject,
          objectData: savedObject?.object_data,
          assetIdInDb: savedObject?.object_data?.assetId,
        })
        
        currentAssetIdRef.current = finalAssetId
      }
      
      // Update file size and clear dirty flag
      setFileSize(workbookJson.length)
      setIsDirty(false)
      lastSaveTimeRef.current = Date.now()
      
      logger.debug('💾 Spreadsheet saved to asset:', {
        objectId,
        assetId: finalAssetId,
        sizeKB: (workbookJson.length / 1024).toFixed(2),
      })
    } catch (error) {
      logger.error('Failed to save spreadsheet:', error)
    }
  }, [objectId, parentTabId, title])

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
      logger.debug('⏳ Waiting for container to have size...')
      return
    }

    // Initialize Univer
    const initializeUniver = async () => {
      // Create Univer using official preset
      const { univer, univerAPI } = createUniver({
        locale: LocaleType.EN_US,
        locales: {
          [LocaleType.EN_US]: UniverPresetSheetsCoreEnUS,
        },
        presets: [
          UniverSheetsCorePreset({
            container: containerRef.current!,
          }),
        ],
      })

      // Load workbook data from asset if it exists
      let initialWorkbook: any

      if (assetId) {
        try {
          const assetContent = await window.App.file.getAssetContent(assetId, parentTabId)
          
          if (assetContent) {
            try {
              initialWorkbook = JSON.parse(assetContent)
              // Set initial file size when loading existing workbook
              setFileSize(assetContent.length)
              logger.debug('✅ Workbook loaded from asset')
            } catch (parseError) {
              logger.error('❌ Failed to parse workbook JSON (corrupted file):', parseError)
              initialWorkbook = createDefaultWorkbook(title)
            }
          } else {
            logger.error('❌ Asset not found:', assetId)
            initialWorkbook = createDefaultWorkbook(title)
          }
        } catch (error) {
          logger.error('Failed to load workbook from asset:', error)
          initialWorkbook = createDefaultWorkbook(title)
        }
      } else {
        // No asset yet, create default workbook
        logger.debug('📝 Creating new default workbook')
        initialWorkbook = createDefaultWorkbook(title)
      }

      // Create workbook in Univer
      univerAPI.createWorkbook(initialWorkbook)
      
      univerRef.current = { univer, univerAPI }
      isInitializedRef.current = true

      // Set up periodic auto-save (every 5 seconds if data changed)
      // We'll track if the workbook has been modified
      let lastSaveTime = Date.now()
      let hasUnsavedChanges = false

      const autoSaveInterval = setInterval(() => {
        if (hasUnsavedChanges && Date.now() - lastSaveTime > 1000) {
          saveWorkbook()
          hasUnsavedChanges = false
          lastSaveTime = Date.now()
        }
      }, 2000)

      // Mark as dirty on any user interaction (keyboard/mouse in the container)
      const markDirty = () => {
        hasUnsavedChanges = true
        setIsDirty(true)
      }

      const container = containerRef.current
      if (container) {
        container.addEventListener('keydown', markDirty)
        container.addEventListener('mouseup', markDirty)
        container.addEventListener('paste', markDirty)
      }

      // Store interval and cleanup function
      if (!univerRef.current.cleanup) {
        univerRef.current.cleanup = []
      }
      
      univerRef.current.cleanup.push(() => {
        clearInterval(autoSaveInterval)
        if (container) {
          container.removeEventListener('keydown', markDirty)
          container.removeEventListener('mouseup', markDirty)
          container.removeEventListener('paste', markDirty)
        }
      })

      // logger.debug('✅ Univer spreadsheet editor initialized')
    }

    initializeUniver()

    // Cleanup on unmount ONLY
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      
      if (univerRef.current) {
        logger.debug('🧹 Disposing Univer editor on component unmount')
        
        // Run all cleanup functions
        if (univerRef.current.cleanup) {
          for (const cleanupFn of univerRef.current.cleanup) {
            cleanupFn()
          }
        }
        
        univerRef.current.univer.dispose()
        univerRef.current = null
        isInitializedRef.current = false
      }
    }
  }, [assetId, objectId, parentTabId, title, saveWorkbook]) // Dependencies for initialization

  // Handle resize after initialization - tell Univer canvas to resize
  useEffect(() => {
    if (!isInitializedRef.current || !univerRef.current || !containerRef.current) {
      return
    }

    if (containerSize.width === 0 || containerSize.height === 0) {
      return
    }

    // console.log('🔄 Resizing Univer to:', containerSize)

    // Trigger Univer's resize by dispatching window resize event
    // Univer listens to window resize and recalculates its canvas
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 0)

  }, [containerSize])

  // Allow system shortcuts (Ctrl+Tab, etc.) to work even when spreadsheet is focused
  // We need to re-dispatch these events to trigger our global shortcut handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if this is a re-dispatched event from us (avoid infinite loop)
      if ((e as any).__fromSpreadsheet) {
        return // Let it through to the shortcut handlers
      }
      
      // System shortcuts that should always work
      const isSystemShortcut = 
        (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) ||     // Ctrl+Tab (next tab)
        (e.ctrlKey && e.shiftKey && e.key === 'Tab') ||      // Ctrl+Shift+Tab (prev tab)
        (e.ctrlKey && e.key === 's') ||                       // Ctrl+S (save)
        (e.ctrlKey && e.key === 'n') ||                       // Ctrl+N (new)
        (e.ctrlKey && e.key === 'o') ||                       // Ctrl+O (open)
        (e.ctrlKey && e.key === 'w')                          // Ctrl+W (close)
      
      if (isSystemShortcut) {
        console.log('📌 System shortcut detected - preventing Univer, re-dispatching:', {
          key: e.key,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
        })
        
        // Stop Univer from seeing this event
        e.stopImmediatePropagation()
        e.preventDefault()
        
        // Re-dispatch the event to document with a marker to avoid infinite loop
        const newEvent = new KeyboardEvent('keydown', {
          key: e.key,
          code: e.code,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          metaKey: e.metaKey,
          bubbles: true,
          cancelable: true,
        })
        
        // Mark this as a re-dispatched event
        ;(newEvent as any).__fromSpreadsheet = true
        
        console.log('📌 Re-dispatching to document (marked to avoid loop)')
        document.dispatchEvent(newEvent)
      }
    }

    // Use capture phase to intercept before Univer's handlers
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [])

  // Update tab name with dirty indicator and file size
  useEffect(() => {
    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes}B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
    }
    
    const dirtyIndicator = isDirty ? '● ' : ''
    const sizeIndicator = fileSize > 0 ? ` (${formatSize(fileSize)})` : ''
    const newName = `${dirtyIndicator}${title}${sizeIndicator}`
    
    // Notify main-with-tabs to update the tab name
    if (window.__updateTabName) {
      window.__updateTabName(tabId, newName)
    }
  }, [isDirty, fileSize, title, tabId])

  return (
    <div className="w-full h-full bg-white overflow-hidden" style={{ position: 'relative', zIndex: 50 }}>
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
        tabIndex={-1}
      />
    </div>
  )
}
