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
import { getTabEditor } from 'renderer/screens/tab-editor-registry'
import { useTabLifecycle } from 'renderer/screens/tab-lifecycle-manager'
import {
  GlobalToolProvider,
  ActiveTabProvider,
  useActiveTab,
} from 'renderer/contexts'
import { GlobalPanelsLayout } from 'renderer/components/layout/global-panels-layout'
import { useShortcut, ShortcutContext } from 'renderer/shortcuts'
import type { Viewport } from 'lib/types/canvas'
import type { FileTab, SpreadsheetTab, ExternalWebTab } from 'shared/types/tabs'

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

/**
 * Inner component that has access to ActiveTabContext
 * This allows us to update the context when tabs switch
 */
function TabSwitchHandler({
  activeTabId,
  viewports,
}: {
  activeTabId: string | null
  viewports: Map<string, Viewport>
}) {
  const { updateActiveTab } = useActiveTab()

  // Update ActiveTabContext whenever activeTabId changes
  useEffect(() => {
    if (!activeTabId) return

    const loadTabData = async () => {
      const viewport = viewports.get(activeTabId)
      if (!viewport) return

      // Load objects from database for this tab
      const objects = await window.App.file.getObjects(activeTabId)

      // Immediately update the context with the new tab's data
      updateActiveTab({
        tabId: activeTabId,
        viewport,
        objects: objects || [],
        selectedObjectIds: [], // Clear selection when switching tabs
      })
    }

    loadTabData()
  }, [activeTabId, viewports, updateActiveTab])

  return null // This is just a handler, no UI
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
  const tabsRef = useRef<FileTab[]>([]) // Keep current tabs in ref to avoid stale closures
  const isInitialLoadRef = useRef(true)

  // Keep tabsRef in sync with tabs state
  useEffect(() => {
    tabsRef.current = tabs
  }, [tabs])

  // Tab lifecycle management (handles parent-child tab relationships)
  const { handleWidgetDelete, handleParentClose } = useTabLifecycle(
    model,
    tabs,
    setTabs
  )

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
          type: 'canvas',
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
        if (canvas) {
          const newViewport = {
            x: canvas.viewport_x,
            y: canvas.viewport_y,
            zoom: canvas.viewport_zoom,
          }
          viewportsRef.current.set(tabId, newViewport)
          setViewports(prev => new Map(prev).set(tabId, newViewport))
        }
      })

      setActiveTabId(tabId)
    })

    // Listen for files being closed
    const cleanupClosed = window.App.file.onFileClosed(({ tabId }) => {
      // Use tabsRef to get current tabs (avoid stale closure)
      const closingTab = tabsRef.current.find(t => t.id === tabId)

      // If closing a canvas tab (.what file), also close all its spreadsheet tabs
      if (closingTab?.type === 'canvas') {
        const spreadsheetTabsToClose = tabsRef.current.filter(
          t => t.type === 'spreadsheet' && t.parentTabId === tabId
        )

        if (spreadsheetTabsToClose.length > 0) {
          // Close each spreadsheet tab in FlexLayout
          for (const spreadsheetTab of spreadsheetTabsToClose) {
            const node = model.getNodeById(spreadsheetTab.id)
            if (node) {
              logger.debug(
                'Deleting spreadsheet tab from FlexLayout:',
                spreadsheetTab.id
              )
              model.doAction(Actions.deleteTab(spreadsheetTab.id))
            }
          }

          // Remove spreadsheet tabs from state
          setTabs(prevTabs =>
            prevTabs.filter(
              t => !(t.type === 'spreadsheet' && t.parentTabId === tabId)
            )
          )
        }
      }

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

  // Listen for external tabs being opened (unified for all widget types)
  useEffect(() => {
    const cleanup = window.App.externalTab.onTabOpened((tab: any) => {
      // Check if tab already exists - if so, focus it instead of creating duplicate
      const existingTab = tabsRef.current.find(t => t.id === tab.id)
      if (existingTab) {
        // Focus existing tab in FlexLayout
        const existingNode = model.getNodeById(tab.id)
        if (existingNode) {
          model.doAction(Actions.selectTab(tab.id))
        }

        // Update active tab state
        setActiveTabId(tab.id)
        window.App.tabs.setActive(tab.id)
        return
      }

      // Add to tabs state
      setTabs(prevTabs => [...prevTabs, tab])

      // Add to FlexLayout
      const existingNode = model.getNodeById(tab.id)
      if (!existingNode) {
        // Get icon emoji based on type
        const iconMap: Record<string, string> = {
          spreadsheet: '📊',
          'external-web': '🌐',
          image: '�️',
        }
        const icon = iconMap[tab.type] || '📄'

        if (tab.splitView) {
          // Split view: Find parent canvas tab and split it 50/50
          const parentNode = model.getNodeById(tab.parentTabId)

          if (parentNode) {
            // Try to split the parent's tabset, not the tab itself
            const parentTabSet = parentNode.getParent()
            const targetId =
              parentTabSet?.getType() === 'tabset'
                ? parentTabSet.getId()
                : tab.parentTabId

            model.doAction(
              Actions.addNode(
                {
                  type: 'tab',
                  name: `${icon} ${tab.fileName}`,
                  component: tab.type,
                  id: tab.id,
                  config: {
                    ...tab,
                    tabId: tab.id,
                  },
                  enablePopout: true,
                },
                targetId,
                DockLocation.RIGHT,
                -1
              )
            )
          } else {
            logger.error('Parent tab not found for split view:', tab.parentTabId)
            // Fallback to CENTER if parent not found
            model.doAction(
              Actions.addNode(
                {
                  type: 'tab',
                  name: `${icon} ${tab.fileName}`,
                  component: tab.type,
                  id: tab.id,
                  config: {
                    ...tab,
                    tabId: tab.id,
                  },
                  enablePopout: true,
                },
                model.getRoot().getId(),
                DockLocation.CENTER,
                -1
              )
            )
          }
        } else {
          // Full tab: Add to the main tabset (100% standalone tab in tab bar)
          logger.debug(`${icon} Creating full standalone tab with DockLocation.CENTER`)

          // Find the main tabset (first child of root that's a tabset)
          const root = model.getRoot()
          let mainTabsetId = root.getId()

          // Try to find the first tabset in the layout
          root.getChildren().forEach((child: any) => {
            if (child.getType() === 'tabset') {
              mainTabsetId = child.getId()
            } else if (child.getType() === 'row') {
              // Check children of row for tabset
              child.getChildren().forEach((grandchild: any) => {
                if (grandchild.getType() === 'tabset') {
                  mainTabsetId = grandchild.getId()
                }
              })
            }
          })

          model.doAction(
            Actions.addNode(
              {
                type: 'tab',
                name: `${icon} ${tab.fileName}`,
                component: tab.type,
                id: tab.id,
                config: {
                  ...tab,
                  tabId: tab.id,
                },
                enablePopout: true,
              },
              mainTabsetId,
              DockLocation.CENTER,
              -1
            )
          )
          logger.debug('✅ Full tab created with DockLocation.CENTER')
        }
      }

      setActiveTabId(tab.id)
    })

    return () => {
      cleanup()
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
        // logger.debug('🔵 Saving viewport for tab:', tabId, newViewport)
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

  // Switch to next tab (Ctrl+Tab)
  const handleSwitchToNextTab = useCallback(() => {
    if (tabs.length <= 1) return // No switching if only 0 or 1 tab

    const currentIndex = tabs.findIndex(t => t.id === activeTabId)
    if (currentIndex === -1) return

    // Cycle to next tab (wrap around to 0 if at end)
    const nextIndex = (currentIndex + 1) % tabs.length
    const nextTab = tabs[nextIndex]

    // Use layoutRef to access the Layout component and switch tabs
    if (layoutRef.current) {
      const tabNode = model.getNodeById(nextTab.id) as TabNode | undefined
      if (tabNode) {
        // Manually update activeTabId and notify IPC
        setActiveTabId(nextTab.id)
        window.App.tabs.setActive(nextTab.id)

        // Then trigger the FlexLayout action
        model.doAction(Actions.selectTab(nextTab.id))
      }
    }
  }, [tabs, activeTabId, model])

  // Switch to previous tab (Ctrl+Shift+Tab)
  const handleSwitchToPreviousTab = useCallback(() => {
    if (tabs.length <= 1) return // No switching if only 0 or 1 tab

    const currentIndex = tabs.findIndex(t => t.id === activeTabId)
    if (currentIndex === -1) return

    // Cycle to previous tab (wrap around to end if at start)
    const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1
    const prevTab = tabs[prevIndex]

    // Use layoutRef to access the Layout component and switch tabs
    if (layoutRef.current) {
      const tabNode = model.getNodeById(prevTab.id) as TabNode | undefined
      if (tabNode) {
        // Manually update activeTabId and notify IPC
        setActiveTabId(prevTab.id)
        window.App.tabs.setActive(prevTab.id)

        // Then trigger the FlexLayout action
        model.doAction(Actions.selectTab(prevTab.id))
      }
    }
  }, [tabs, activeTabId, model])

  // Register Ctrl+Tab shortcut (next tab)
  useShortcut(
    {
      key: 'ctrl+tab',
      context: ShortcutContext.System,
      action: handleSwitchToNextTab,
      description: 'Switch to next tab',
    },
    [handleSwitchToNextTab]
  )

  // Register Ctrl+Shift+Tab shortcut (previous tab)
  useShortcut(
    {
      key: 'ctrl+shift+tab',
      context: ShortcutContext.System,
      action: handleSwitchToPreviousTab,
      description: 'Switch to previous tab',
    },
    [handleSwitchToPreviousTab]
  )

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
    const config = node.getConfig() as {
      type?: 'canvas' | 'spreadsheet' | 'external-web'
      tabId: string
      objectId?: string
      parentTabId?: string
      title?: string
      assetId?: string
      url?: string
    }

    const tabId = config.tabId
    const tabType = config.type || 'canvas' // Default to canvas for backward compatibility

    // Check if this tab is actually selected in its tabset
    const parent = node.getParent()
    let isSelected = false

    if (parent && parent.getType() === 'tabset') {
      const tabset = parent as any // TabSetNode
      isSelected = tabset.getSelectedNode()?.getId() === node.getId()
    }

    // Only render if the tab is selected to avoid event conflicts
    if (!isSelected) {
      return <div className="absolute inset-0 bg-[#0a0a0a]" />
    }

    // Try to get editor from registry (for external tab widgets)
    const EditorComponent = getTabEditor(tabType)
    if (EditorComponent) {
      return (
        <CanvasErrorBoundary>
          <EditorComponent {...config} />
        </CanvasErrorBoundary>
      )
    }

    // Render canvas (default fallback)
    const viewport = viewports.get(tabId) || { x: 0, y: 0, zoom: 1 }

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

  // Update tab name dynamically (for dirty indicator and file size)
  const updateTabName = useCallback(
    (tabId: string, newName: string) => {
      const node = model.getNodeById(tabId)
      if (node) {
        model.doAction(Actions.renameTab(tabId, newName))
      }
    },
    [model]
  )

  // Expose updateTabName globally for SpreadsheetEditor to call
  useEffect(() => {
    if (!window.__updateTabName) {
      window.__updateTabName = updateTabName
    }
    return () => {
      delete window.__updateTabName
    }
  }, [updateTabName])

  // Handle tab close
  const onAction = (action: any) => {
    if (action.type === 'FlexLayout_DeleteTab') {
      const tabId = action.data.node
      logger.debug('Closing tab:', tabId)

      const closingTab = tabs.find(t => t.id === tabId)
      logger.debug('Closing tab details:', {
        closingTab,
        allTabs: tabs.map(t => ({
          id: t.id,
          type: t.type,
          parentTabId:
            t.type === 'spreadsheet' || t.type === 'external-web'
              ? t.parentTabId
              : undefined,
        })),
      })

      // If closing a canvas tab (.what file), close all its child tabs (spreadsheet, external-web, etc.)
      if (closingTab?.type === 'canvas') {
        logger.debug('🗑️ Closing parent canvas tab, checking for child tabs...', {
          parentTabId: tabId,
          allTabs: tabs.map(t => ({ id: t.id, type: t.type, parentTabId: (t as any).parentTabId })),
        })
        handleParentClose(tabId)
      }

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

  // Calculate current file name for menu bar
  const activeTab = tabs.find(t => t.id === activeTabId)
  let currentFileName: string | undefined

  if (activeTab) {
    if (activeTab.type === 'spreadsheet') {
      // For spreadsheet tabs, show: "parentFile.what - SheetName sheet"
      const parentTab = tabs.find(t => t.id === activeTab.parentTabId)
      if (parentTab) {
        currentFileName = `${parentTab.fileName} - ${activeTab.fileName} sheet`
      } else {
        currentFileName = `${activeTab.fileName} sheet`
      }
    } else if (activeTab.type === 'external-web') {
      // For external web tabs, show: "parentFile.what - website-title"
      const parentTab = tabs.find(t => t.id === activeTab.parentTabId)
      if (parentTab) {
        currentFileName = `${parentTab.fileName} - ${activeTab.fileName}`
      } else {
        currentFileName = activeTab.fileName
      }
    } else {
      // For canvas tabs, show just the file name
      currentFileName = activeTab.fileName
    }
  }

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
          <GlobalToolProvider>
            <ActiveTabProvider>
              {/* Handler to update ActiveTabContext when tabs switch */}
              <TabSwitchHandler
                activeTabId={activeTabId}
                viewports={viewports}
              />
              <GlobalPanelsLayout>
                <Layout
                  factory={factory}
                  model={model}
                  onAction={onAction}
                  onModelChange={onModelChange}
                  popoutURL="popout.html"
                  ref={layoutRef}
                />
              </GlobalPanelsLayout>
            </ActiveTabProvider>
          </GlobalToolProvider>
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
