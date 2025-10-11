import { useState, useEffect, useCallback, useRef } from 'react'
import { Layout, Model, Actions, TabNode, IJsonModel, DockLocation } from 'flexlayout-react'
import 'flexlayout-react/style/light.css'
import '../styles/flexlayout-theme.css'
import { InfiniteCanvas, CanvasDemoContent, CanvasErrorBoundary } from 'renderer/components/canvas'
import { MenuBar } from 'renderer/components/layout/menu-bar'
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
  const [viewportLoadCount, setViewportLoadCount] = useState(0) // Force re-render when viewports load
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
            const canvas = await window.App.file.getCanvas(DEFAULT_CANVAS_ID, tab.id)
            if (canvas) {
              viewportsRef.current.set(tab.id, {
                x: canvas.viewport_x,
                y: canvas.viewport_y,
                zoom: canvas.viewport_zoom,
              })
              setViewportLoadCount(prev => prev + 1) // Trigger re-render
            }
          }
        }
      } catch (error) {
        console.error('Failed to load tabs:', error)
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
      console.log('[MainScreen] File opened:', file.name, tabId)
      
      // Check if tab already exists
      setTabs((prevTabs) => {
        if (prevTabs.some((t) => t.id === tabId)) {
          console.log('[MainScreen] Tab already exists, skipping:', tabId)
          return prevTabs
        }
        
        console.log('[MainScreen] Adding new tab:', tabId)
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
        console.log('[MainScreen] Adding tab to FlexLayout:', tabId)
        
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
      window.App.file.getCanvas(DEFAULT_CANVAS_ID, tabId).then((canvas) => {
        console.log('[MainScreen] Loaded viewport for tab:', tabId, canvas)
        if (canvas) {
          const newViewport = {
            x: canvas.viewport_x,
            y: canvas.viewport_y,
            zoom: canvas.viewport_zoom,
          }
          viewportsRef.current.set(tabId, newViewport)
          console.log('[MainScreen] Set viewport in cache:', tabId, newViewport)
          setViewportLoadCount(prev => prev + 1) // Trigger re-render
        }
      })

      setActiveTabId(tabId)
    })
    
    return cleanup
  }, [model])

  // Handle viewport changes for a specific tab
  const handleViewportChange = useCallback((tabId: string, newViewport: Viewport) => {
    // Update local viewport cache immediately
    viewportsRef.current.set(tabId, newViewport)

    // Clear previous timeout for this tab
    const existingTimeout = saveTimeoutRefs.current.get(tabId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Debounce viewport saving to database
    const timeout = setTimeout(() => {
      console.log('[MainScreen] 🔵 Saving viewport for tab:', tabId, newViewport)
      window.App.file
        .saveViewport(DEFAULT_CANVAS_ID, newViewport.x, newViewport.y, newViewport.zoom, tabId)
        .then(() => {
          console.log('[MainScreen] ✅ Viewport save completed for tab:', tabId)
        })
        .catch((error) => {
          console.error('[MainScreen] ❌ Failed to save viewport for tab:', tabId, error)
        })
    }, 500)

    saveTimeoutRefs.current.set(tabId, timeout)
  }, [])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      for (const timeout of saveTimeoutRefs.current.values()) {
        clearTimeout(timeout)
      }
    }
  }, [])

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
      console.log('=== DEBUG: Metadata Table ===')
      console.table(metadata)
      console.log('=== Raw Metadata ===')
      console.log(JSON.stringify(metadata, null, 2))

      alert(`Metadata:\n\n${JSON.stringify(metadata, null, 2)}`)
    } catch (error) {
      console.error('Failed to get metadata:', error)
      alert('Failed to get metadata. Check console.')
    }
  }

  // FlexLayout factory function - renders content for each tab
  const factory = (node: TabNode) => {
    const config = node.getConfig() as { tabId: string }
    const tabId = config.tabId
    const viewport = viewportsRef.current.get(tabId) || { x: 0, y: 0, zoom: 1 }
    
    // Check if this tab is actually selected in its tabset
    const parent = node.getParent()
    let isSelected = false
    
    if (parent && parent.getType() === 'tabset') {
      const tabset = parent as any // TabSetNode
      isSelected = tabset.getSelectedNode()?.getId() === node.getId()
    }
    
    console.log('[MainScreen Factory] Rendering tab:', tabId, 'isSelected:', isSelected, 'viewport:', viewport)

    // Only render canvas if the tab is selected to avoid event conflicts
    // This prevents multiple canvases from fighting over mouse events
    if (!isSelected) {
      return (
        <div className="absolute inset-0 bg-[#0a0a0a]" />
      )
    }

    return (
      <CanvasErrorBoundary>
        <InfiniteCanvas
          key={`canvas-${tabId}-${viewportLoadCount}`}
          initialViewport={viewport}
          onViewportChange={(newViewport) => handleViewportChange(tabId, newViewport)}
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
    const selectedNode = newModel.getActiveTabset()?.getSelectedNode() as TabNode | undefined
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
      console.log('[MainScreen] Closing tab:', tabId)
      
      // Close the file
      window.App.file.close(tabId)
      
      // Remove from state
      setTabs((prevTabs) => prevTabs.filter((t) => t.id !== tabId))
      
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

  const currentFileName = tabs.find((t) => t.id === activeTabId)?.fileName

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e] overflow-hidden">
      {/* Top Menu Bar */}
      <MenuBar
        onMenuClick={handleMenuClick}
        currentFileName={currentFileName}
        onDebugClick={handleDebugClick}
        hasOpenFile={tabs.length > 0}
      />

      {/* Main Content Area */}
      <div className="flex-1 relative">
        {tabs.length > 0 ? (
          <div className="h-full">
            <Layout
              ref={layoutRef}
              model={model}
              factory={factory}
              onModelChange={onModelChange}
              onAction={onAction}
              popoutURL="popout.html"
            />
          </div>
        ) : (
          <WelcomeScreen onNewFile={handleNewFile} onOpenFile={handleOpenFile} />
        )}
      </div>
    </div>
  )
}
