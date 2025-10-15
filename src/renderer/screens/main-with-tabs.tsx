import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Layout,
  Model,
  Actions,
  type TabNode,
  type IJsonModel,
  DockLocation,
} from 'flexlayout-react'
import { logger } from '../../shared/logger'
import 'flexlayout-react/style/light.css'
import '../styles/flexlayout-theme.css'
import {
  InfiniteCanvas,
  CanvasDemoContent,
  CanvasErrorBoundary,
} from 'renderer/components/canvas'
import { MenuBar } from 'renderer/components/layout/menu-bar'
import { UpdateNotification } from 'renderer/components/layout/update-notification'
import { WelcomeScreen } from 'renderer/components/welcome/welcome-screen'
import type { Viewport } from 'lib/types/canvas'
import type { FileTab } from 'shared/types/tabs'

// Default canvas ID (for now we only support one canvas per file)
const DEFAULT_CANVAS_ID = 'canvas_default'

// FlexLayout model configuration
const initialLayoutConfig: IJsonModel = {
  global: {
    tabEnableClose: true,
    tabEnableRename: false,
    tabEnablePopout: true, // Enable popout/detach windows
    tabEnablePopoutIcon: true, // Show popout icon in tab header
    tabSetEnableTabStrip: true,
    tabSetEnableDrop: true,
    tabSetEnableDrag: true,
    tabSetEnableDivide: true,
    tabSetEnableMaximize: true,
    tabSetMinWidth: 100,
    tabSetMinHeight: 100,
  },
  borders: [],
  layout: {
    type: 'row',
    weight: 100,
    children: [],
  },
}

export function MainScreenWithTabs() {
  const [model, setModel] = useState(() => Model.fromJson(initialLayoutConfig))
  const [tabs, setTabs] = useState<FileTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [viewports, setViewports] = useState<Map<string, Viewport>>(new Map())
  const layoutRef = useRef<Layout>(null)
  const saveTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const viewportsRef = useRef<Map<string, Viewport>>(new Map())
  const isInitialLoadRef = useRef(true)

  // Load tabs on mount
  useEffect(() => {
    const loadTabs = async () => {
      try {
        const allTabs = await window.App.tabs.getAll()
        const activeId = await window.App.tabs.getActiveId()

        setTabs(allTabs)
        setActiveTabId(activeId)

        // Add tabs to FlexLayout model
        if (allTabs.length > 0) {
          const newModel = Model.fromJson({
            ...initialLayoutConfig,
            layout: {
              type: 'row',
              weight: 100,
              children: [
                {
                  type: 'tabset',
                  weight: 100,
                  selected: 0,
                  children: allTabs.map((tab: FileTab) => ({
                    type: 'tab',
                    name: tab.fileName,
                    component: 'canvas',
                    id: tab.id,
                    config: { tabId: tab.id },
                    enablePopout: true, // Enable popout for this tab
                  })),
                },
              ],
            },
          })
          setModel(newModel)

          // Load viewports for all tabs
          for (const tab of allTabs) {
            const canvas = await window.App.file.getCanvas(
              DEFAULT_CANVAS_ID,
              tab.id
            )
            if (canvas) {
              const viewport = {
                x: canvas.viewport_x,
                y: canvas.viewport_y,
                zoom: canvas.viewport_zoom,
              }
              viewportsRef.current.set(tab.id, viewport)
              setViewports(prev => new Map(prev).set(tab.id, viewport))
            }
          }
        }
      } catch (error) {
        logger.error('Failed to load tabs:', error)
      } finally {
        setIsLoading(false)
        isInitialLoadRef.current = false
      }
    }

    loadTabs()
  }, [])

  // Listen for new files being opened
  useEffect(() => {
    const cleanup = window.App.file.onFileOpened(({ file, tabId }) => {
      logger.debug('File opened:', file.name, tabId)

      // Check if tab already exists
      setTabs(prevTabs => {
        if (prevTabs.some(t => t.id === tabId)) {
          logger.debug('Tab already exists, skipping:', tabId)
          return prevTabs
        }

        logger.debug('Adding new tab:', tabId)
        const newTab: FileTab = {
          id: tabId,
          filePath: file.path,
          fileName: file.name,
          isModified: false,
          isActive: true,
          viewport: { x: 0, y: 0, zoom: 1 },
        }
        return [...prevTabs, newTab]
      })

      // Only add to FlexLayout if not already loaded (not initial load)
      if (!isInitialLoadRef.current) {
        logger.debug('Adding tab to FlexLayout:', tabId)

        // Check if tab already exists in model
        const existingNode = model.getNodeById(tabId)
        if (!existingNode) {
          model.doAction(
            Actions.addNode(
              {
                type: 'tab',
                name: file.name,
                component: 'canvas',
                id: tabId,
                config: { tabId },
                enablePopout: true, // Enable popout for this tab
              },
              model.getRoot().getId(),
              DockLocation.CENTER,
              -1
            )
          )
        }
      }

      // Load viewport for the new tab
      window.App.file.getCanvas(DEFAULT_CANVAS_ID, tabId).then(canvas => {
        logger.debug('Loaded viewport for tab:', tabId, canvas)
        if (canvas) {
          const newViewport = {
            x: canvas.viewport_x,
            y: canvas.viewport_y,
            zoom: canvas.viewport_zoom,
          }
          viewportsRef.current.set(tabId, newViewport)
          setViewports(prev => new Map(prev).set(tabId, newViewport))
          logger.debug('Set viewport in cache:', tabId, newViewport)
        }
      })

      setActiveTabId(tabId)
    })

    // Listen for files being closed
    const cleanupClosed = window.App.file.onFileClosed(({ tabId }) => {
      logger.debug('File closed via menu:', tabId)

      // Remove from tabs state
      setTabs(prevTabs => prevTabs.filter(t => t.id !== tabId))

      // Remove from FlexLayout
      const existingNode = model.getNodeById(tabId)
      if (existingNode) {
        model.doAction(Actions.deleteTab(tabId))
      }

      // Clean up viewport cache and timeout
      viewportsRef.current.delete(tabId)
      setViewports(prev => {
        const next = new Map(prev)
        next.delete(tabId)
        return next
      })
      const timeout = saveTimeoutRefs.current.get(tabId)
      if (timeout) {
        clearTimeout(timeout)
        saveTimeoutRefs.current.delete(tabId)
      }
    })

    return () => {
      cleanup()
      cleanupClosed()
    }
  }, [model])

  // Handle viewport changes for a specific tab
  const handleViewportChange = useCallback(
    (tabId: string, newViewport: Viewport) => {
      // Update local viewport cache immediately
      viewportsRef.current.set(tabId, newViewport)

      // Clear previous timeout for this tab
      const existingTimeout = saveTimeoutRefs.current.get(tabId)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
      }

      // Debounce viewport saving to database
      const timeout = setTimeout(() => {
        logger.debug('🔵 Saving viewport for tab:', tabId, newViewport)
        window.App.file
          .saveViewport(
            DEFAULT_CANVAS_ID,
            newViewport.x,
            newViewport.y,
            newViewport.zoom,
            tabId
          )
          .then(() => {
            logger.debug('✅ Viewport save completed for tab:', tabId)
          })
          .catch(error => {
            logger.error('❌ Failed to save viewport for tab:', tabId, error)
          })
      }, 500)

      saveTimeoutRefs.current.set(tabId, timeout)
    },
    []
  )

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      for (const timeout of saveTimeoutRefs.current.values()) {
        clearTimeout(timeout)
      }
    }
  }, [])

  // Listen for keyboard shortcuts
  useEffect(() => {
    const cleanup = window.App.shortcuts.onShortcut(async action => {
      logger.debug('Keyboard shortcut:', action)

      switch (action) {
        case 'new':
          await window.App.file.new()
          break
        case 'open':
          await window.App.file.open()
          break
        case 'save':
          if (activeTabId) {
            await window.App.file.save(activeTabId)
          }
          break
        case 'saveAs':
          await window.App.file.saveAs()
          break
        case 'close':
          if (activeTabId) {
            await window.App.file.close(activeTabId)
          }
          break
      }
    })

    return cleanup
  }, [activeTabId])

  const handleNewFile = async () => {
    await window.App.file.new()
    // The file-opened event handler will handle adding the tab
  }

  const handleOpenFile = async () => {
    await window.App.file.open()
    // The file-opened event handler will handle adding the tab
  }

  const handleMenuClick = (_menu: string) => {
    // TODO: Handle menu actions
  }

  const handleDebugClick = async () => {
    try {
      if (!activeTabId) {
        alert('No active tab')
        return
      }

      const metadata = await window.App.file.getMetadata(activeTabId)
      logger.debug('=== DEBUG: Metadata Table ===')
      console.table(metadata)
      logger.debug('=== Raw Metadata ===')
      logger.debug(JSON.stringify(metadata, null, 2))

      alert(`Metadata:\n\n${JSON.stringify(metadata, null, 2)}`)
    } catch (error) {
      logger.error('Failed to get metadata:', error)
      alert('Failed to get metadata. Check console.')
    }
  }

  // FlexLayout factory function - renders content for each tab
  const factory = (node: TabNode) => {
    const config = node.getConfig() as { tabId: string }
    const tabId = config.tabId
    const viewport = viewports.get(tabId) || { x: 0, y: 0, zoom: 1 }

    // Check if this tab is actually selected in its tabset
    const parent = node.getParent()
    let isSelected = false

    if (parent && parent.getType() === 'tabset') {
      const tabset = parent as any // TabSetNode
      isSelected = tabset.getSelectedNode()?.getId() === node.getId()
    }

    logger.debug(
      'Rendering tab:',
      tabId,
      'isSelected:',
      isSelected,
      'viewport:',
      viewport
    )

    // Only render canvas if the tab is selected to avoid event conflicts
    // This prevents multiple canvases from fighting over mouse events
    if (!isSelected) {
      return <div className="absolute inset-0 bg-[#0a0a0a]" />
    }

    return (
      <CanvasErrorBoundary>
        <InfiniteCanvas
          initialViewport={viewport}
          isActive={tabId === activeTabId}
          key={`canvas-${tabId}`}
          onViewportChange={newViewport =>
            handleViewportChange(tabId, newViewport)
          }
          tabId={tabId}
        >
          <CanvasDemoContent />
        </InfiniteCanvas>
      </CanvasErrorBoundary>
    )
  }

  // Handle tab selection changes
  const onModelChange = (newModel: Model) => {
    setModel(newModel)

    // Get the selected tab
    const selectedNode = newModel.getActiveTabset()?.getSelectedNode() as
      | TabNode
      | undefined
    if (selectedNode) {
      const config = selectedNode.getConfig() as { tabId: string }
      const tabId = config.tabId
      if (tabId !== activeTabId) {
        setActiveTabId(tabId)
        window.App.tabs.setActive(tabId)
      }
    }
  }

  // Handle tab close
  const onAction = (action: any) => {
    if (action.type === 'FlexLayout_DeleteTab') {
      const tabId = action.data.node
      logger.debug('Closing tab:', tabId)

      // Close the file
      window.App.file.close(tabId)

      // Remove from state
      setTabs(prevTabs => prevTabs.filter(t => t.id !== tabId))

      // Clean up viewport cache and timeout
      viewportsRef.current.delete(tabId)
      const timeout = saveTimeoutRefs.current.get(tabId)
      if (timeout) {
        clearTimeout(timeout)
        saveTimeoutRefs.current.delete(tabId)
      }
    }

    return action
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-teal-400 text-sm">Loading...</div>
      </div>
    )
  }

  const currentFileName = tabs.find(t => t.id === activeTabId)?.fileName

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e] overflow-hidden">
      {/* Top Menu Bar */}
      <MenuBar
        currentFileName={currentFileName}
        hasOpenFile={tabs.length > 0}
        onDebugClick={handleDebugClick}
        onMenuClick={handleMenuClick}
      />

      {/* Main Content Area */}
      <div className="flex-1 relative">
        {tabs.length > 0 ? (
          <div className="h-full">
            <Layout
              factory={factory}
              model={model}
              onAction={onAction}
              onModelChange={onModelChange}
              popoutURL="popout.html"
              ref={layoutRef}
            />
          </div>
        ) : (
          <WelcomeScreen
            onNewFile={handleNewFile}
            onOpenFile={handleOpenFile}
          />
        )}
      </div>

      {/* Update Notification */}
      <UpdateNotification />
    </div>
  )
}
