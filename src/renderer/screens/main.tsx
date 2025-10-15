import { useState, useEffect, useCallback, useRef } from 'react'
import { InfiniteCanvas } from 'renderer/components/canvas/infinite-canvas'
import { logger } from '../../shared/logger'
import { MenuBar } from 'renderer/components/layout/menu-bar'
import { WelcomeScreen } from 'renderer/components/welcome/welcome-screen'
import type { Viewport } from 'lib/types/canvas'

// Default canvas ID (for now we only support one canvas per file)
const DEFAULT_CANVAS_ID = 'canvas_default'

export function MainScreen() {
  const [currentFile, setCurrentFile] = useState<any>(null)
  const [currentTabId, setCurrentTabId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingViewport, setIsLoadingViewport] = useState(false)
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load canvas viewport when file is opened
  useEffect(() => {
    if (!currentFile) {
      // Reset to default viewport when no file
      logger.debug('No file, resetting viewport')
      setViewport({ x: 0, y: 0, zoom: 1 })
      setIsLoadingViewport(false)
      return
    }

    const loadViewport = async () => {
      setIsLoadingViewport(true)
      try {
        logger.debug(
          'Loading viewport for file:',
          currentFile.name,
          'tabId:',
          currentTabId
        )
        const canvas = await window.App.file.getCanvas(
          DEFAULT_CANVAS_ID,
          currentTabId || undefined
        )
        logger.debug('Canvas data received:', canvas)
        if (canvas) {
          logger.debug(
            'Setting viewport to:',
            canvas.viewport_x,
            canvas.viewport_y,
            canvas.viewport_zoom
          )
          setViewport({
            x: canvas.viewport_x,
            y: canvas.viewport_y,
            zoom: canvas.viewport_zoom,
          })
        } else {
          logger.debug('No canvas found, using default viewport')
        }
      } catch (error) {
        logger.error('Failed to load viewport:', error)
      } finally {
        setIsLoadingViewport(false)
      }
    }

    loadViewport()
  }, [currentFile])

  // Save viewport when it changes (debounced)
  const handleViewportChange = useCallback((newViewport: Viewport) => {
    // Update local state immediately for React
    setViewport(newViewport)

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Debounce viewport saving to database
    saveTimeoutRef.current = setTimeout(() => {
      logger.debug(
        '🔵 Attempting to save viewport:',
        newViewport.x,
        newViewport.y,
        newViewport.zoom
      )
      logger.debug(
        '🔵 window.App.file.saveViewport exists?',
        typeof window.App.file.saveViewport
      )
      logger.debug('🔵 Calling saveViewport...')
      window.App.file
        .saveViewport(
          DEFAULT_CANVAS_ID,
          newViewport.x,
          newViewport.y,
          newViewport.zoom,
          currentTabId || undefined
        )
        .then(() => {
          logger.debug('✅ Viewport save completed')
        })
        .catch(error => {
          logger.error('❌ Failed to save viewport:', error)
        })
    }, 500)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    // Check if there's an active file on mount
    const loadInitialFile = async () => {
      const file = await window.App.file.getCurrentFile()
      const activeTabId = await window.App.tabs.getActiveId()
      logger.debug('Initial load - file:', file, 'tabId:', activeTabId)
      setCurrentFile(file)
      setCurrentTabId(activeTabId)
      setIsLoading(false)
    }

    loadInitialFile()

    // Listen for file opened events
    window.App.file.onFileOpened((data: { file: any; tabId: string }) => {
      logger.debug('File opened event:', data)
      setCurrentFile(data.file)
      setCurrentTabId(data.tabId)
    })
  }, [])

  const handleNewFile = async () => {
    const result = await window.App.file.new()
    if (result) {
      logger.debug('New file created:', result)
      setCurrentFile(result.file)
      setCurrentTabId(result.tabId)
    }
  }

  const handleOpenFile = async () => {
    const result = await window.App.file.open()
    if (result) {
      logger.debug('File opened:', result)
      setCurrentFile(result.file)
      setCurrentTabId(result.tabId)
    }
  }

  const handleMenuClick = (menu: string) => {
    if (menu === 'file') {
      // TODO: Show file menu dropdown
    }
  }

  const handleDebugClick = async () => {
    try {
      const metadata = await window.App.file.getMetadata()
      logger.debug('=== DEBUG: Metadata Table ===')
      console.table(metadata)
      logger.debug('=== Raw Metadata ===')
      logger.debug(JSON.stringify(metadata, null, 2))

      // Also show in alert for easy viewing
      alert(`Metadata:\n\n${JSON.stringify(metadata, null, 2)}`)
    } catch (error) {
      logger.error('Failed to get metadata:', error)
      alert('Failed to get metadata. Check console.')
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-teal-400 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e] overflow-hidden">
      {/* Top Menu Bar */}
      <MenuBar
        currentFileName={currentFile?.name}
        hasOpenFile={!!currentFile}
        onDebugClick={handleDebugClick}
        onMenuClick={handleMenuClick}
      />

      {/* Main Canvas Area or Welcome Screen */}
      <div className="flex-1 relative">
        {currentFile ? (
          isLoadingViewport ? (
            // Show loading overlay instead of canvas while viewport loads
            <div className="absolute inset-0 bg-[#0a0a0a] flex items-center justify-center">
              <div className="text-teal-400 text-sm">Loading canvas...</div>
            </div>
          ) : (
            // Only render canvas after viewport is loaded
            <InfiniteCanvas
              initialViewport={viewport} // Force remount when file changes to apply viewport
              key={currentFile.path}
              onViewportChange={handleViewportChange}
              tabId={currentTabId}
            >
              {/* Demo content - some circles in world space */}
              <circle cx={0} cy={0} fill="#14b8a6" opacity={0.8} r={50} />
              <circle cx={200} cy={0} fill="#ec4899" opacity={0.8} r={40} />
              <circle cx={-200} cy={0} fill="#f59e0b" opacity={0.8} r={40} />
              <circle cx={0} cy={-200} fill="#3b82f6" opacity={0.8} r={30} />

              {/* Center marker */}
              <circle cx={0} cy={0} fill="#fff" r={5} />
              <line
                stroke="#fff"
                strokeWidth={2}
                x1={-20}
                x2={20}
                y1={0}
                y2={0}
              />
              <line
                stroke="#fff"
                strokeWidth={2}
                x1={0}
                x2={0}
                y1={-20}
                y2={20}
              />
            </InfiniteCanvas>
          )
        ) : (
          <WelcomeScreen
            onNewFile={handleNewFile}
            onOpenFile={handleOpenFile}
          />
        )}
      </div>
    </div>
  )
}
