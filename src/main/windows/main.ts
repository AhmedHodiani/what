import { BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'node:path'

import { createWindow } from 'lib/electron-app/factories/windows/create'
import { ENVIRONMENT } from 'shared/constants'
import { displayName } from '~/package.json'
import { multiFileManager } from '../services/multi-file-manager'
import {
  setupAutoUpdater,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
} from '../services/auto-updater'
import { logger } from 'shared/logger'

export async function MainWindow() {
  logger.debug(
    '🚀 MainWindow() function called - setting up window and IPC handlers'
  )

  const window = createWindow({
    id: 'main',
    title: displayName,
    width: 1400,
    height: 900,
    show: false,
    center: true,
    movable: true,
    resizable: true,
    alwaysOnTop: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    icon: join(__dirname, '../../resources/build/icons/png/512x512.png'), // Dev mode icon

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      webviewTag: true, // Enable <webview> tag for external web content
    },
  })

  // Configure all new child windows (popouts) to be frameless
  window.webContents.setWindowOpenHandler(details => {
    logger.debug('🪟 New window requested:', details.url)

    // Check if this is a popout window (FlexLayout popouts)
    if (details.url.includes('popout.html')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          frame: false,
          titleBarStyle: 'hidden',
          autoHideMenuBar: true,
          webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: true, // Enable <webview> tag for external web content in popout windows
          },
        },
      }
    }

    return { action: 'allow' }
  })

  // Window control IPC handlers
  ipcMain.on('window-minimize', () => {
    window.minimize()
  })

  ipcMain.on('window-maximize', () => {
    if (window.isMaximized()) {
      window.unmaximize()
    } else {
      window.maximize()
    }
  })

  ipcMain.on('window-close', () => {
    window.close()
  })

  ipcMain.handle('window-is-maximized', () => {
    return window.isMaximized()
  })

  // File operation IPC handlers
  // Remove old handlers for hot reload
  ipcMain.removeHandler('file-new')
  ipcMain.handle('file-new', async () => {
    const { filePath, canceled } = await dialog.showSaveDialog(window, {
      title: 'Create New What File',
      defaultPath: 'Untitled.what',
      filters: [{ name: 'What Files', extensions: ['what'] }],
      properties: ['createDirectory', 'showOverwriteConfirmation'],
    })

    if (canceled || !filePath) {
      return null
    }

    try {
      const { file, tabId } = multiFileManager.createNewFile(filePath)
      window.webContents.send('file-opened', { file, tabId })
      return { file, tabId }
    } catch (error) {
      logger.error('Failed to create file:', error)
      dialog.showErrorBox(
        'Error',
        `Failed to create file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return null
    }
  })

  ipcMain.removeHandler('file-open')
  ipcMain.handle('file-open', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog(window, {
      title: 'Open What File',
      filters: [{ name: 'What Files', extensions: ['what'] }],
      properties: ['openFile'],
    })

    if (canceled || filePaths.length === 0) {
      return null
    }

    try {
      const { file, tabId } = multiFileManager.openFile(filePaths[0])
      window.webContents.send('file-opened', { file, tabId })
      return { file, tabId }
    } catch (error) {
      logger.error('Failed to open file:', error)
      dialog.showErrorBox(
        'Error',
        `Failed to open file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return null
    }
  })

  ipcMain.removeHandler('file-save')
  ipcMain.handle('file-save', async (_event, tabId?: string) => {
    try {
      const file = tabId
        ? multiFileManager.saveTab(tabId)
        : multiFileManager.saveActiveFile()
      return file
    } catch (error) {
      logger.error('Failed to save file:', error)
      dialog.showErrorBox(
        'Error',
        `Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return null
    }
  })

  ipcMain.removeHandler('file-save-as')
  ipcMain.handle('file-save-as', async () => {
    const { filePath, canceled } = await dialog.showSaveDialog(window, {
      title: 'Save What File As',
      defaultPath: 'Untitled.what',
      filters: [{ name: 'What Files', extensions: ['what'] }],
      properties: ['createDirectory', 'showOverwriteConfirmation'],
    })

    if (canceled || !filePath) {
      return null
    }

    // TODO: Copy current file to new location
    return null
  })

  ipcMain.removeHandler('file-close')
  ipcMain.handle('file-close', async (event, tabId?: string) => {
    let closedTabId: string | null = null

    if (tabId) {
      multiFileManager.closeTab(tabId)
      closedTabId = tabId
    } else {
      const activeTabId = multiFileManager.getActiveTabId()
      if (activeTabId) {
        multiFileManager.closeTab(activeTabId)
        closedTabId = activeTabId
      }
    }

    // Notify renderer that tab was closed
    if (closedTabId) {
      event.sender.send('file-closed', { tabId: closedTabId })
    }

    return true
  })

  ipcMain.removeHandler('file-get-current')
  ipcMain.handle('file-get-current', async () => {
    return multiFileManager.getActiveFile()
  })

  // New tab management handlers
  ipcMain.removeHandler('tabs-get-all')
  ipcMain.handle('tabs-get-all', async () => {
    return multiFileManager.getTabs()
  })

  ipcMain.removeHandler('tabs-set-active')
  ipcMain.handle('tabs-set-active', async (_event, tabId: string) => {
    multiFileManager.setActiveTab(tabId)
    return true
  })

  ipcMain.removeHandler('tabs-get-active-id')
  ipcMain.handle('tabs-get-active-id', async () => {
    return multiFileManager.getActiveTabId()
  })

  // Unified External Tab API (for capability system)
  ipcMain.removeHandler('external-tab-open')
  ipcMain.handle(
    'external-tab-open',
    async (
      _event,
      params: {
        widgetType: string
        componentName: string
        parentTabId: string
        objectId: string
        title: string
        splitView?: boolean
        icon?: string
        config?: Record<string, any>
      }
    ) => {
      const {
        widgetType,
        componentName,
        parentTabId,
        objectId,
        title,
        splitView = true,
        icon,
        config,
      } = params

      logger.debug('🎯 Opening external tab (unified API):', {
        widgetType,
        componentName,
        parentTabId,
        objectId,
        title,
        splitView,
      })

      // Generate unique tab ID
      const tabId = `${widgetType}-tab-${parentTabId}-${objectId}`

      // Send event to renderer
      window.webContents.send('external-tab-opened', {
        id: tabId,
        type: widgetType, // Use widgetType as the 'type' field for FlexLayout
        widgetType,
        componentName,
        parentTabId,
        objectId,
        fileName: title,
        title,
        icon: icon || '📄',
        isModified: false,
        isActive: true,
        splitView,
        ...config, // Spread config to include assetId, url, etc.
      })

      return tabId
    }
  )

  ipcMain.removeHandler('file-get-canvas')
  ipcMain.handle(
    'file-get-canvas',
    async (_event, canvasId: string, tabId?: string) => {
      try {
        const targetTabId = tabId || multiFileManager.getActiveTabId()
        if (!targetTabId) return null

        const viewport = multiFileManager.getViewport(targetTabId)
        logger.debug('Getting viewport:', viewport)
        // Return in canvas format for backward compatibility
        return {
          id: canvasId,
          title: 'Canvas',
          viewport_x: viewport.x,
          viewport_y: viewport.y,
          viewport_zoom: viewport.zoom,
          object_count: 0,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        }
      } catch (error) {
        logger.error('Failed to get viewport:', error)
        return null
      }
    }
  )

  logger.debug('📝 Registering file-save-viewport IPC handler...')

  // Remove old handler if it exists (for hot reload)
  ipcMain.removeHandler('file-save-viewport')

  ipcMain.handle(
    'file-save-viewport',
    async (
      _event,
      canvasId: string,
      x: number,
      y: number,
      zoom: number,
      tabId?: string
    ) => {
      logger.debug('🔵 file-save-viewport handler called with:', {
        canvasId,
        x,
        y,
        zoom,
        tabId,
      })

      const targetTabId = tabId || multiFileManager.getActiveTabId()
      if (!targetTabId) {
        logger.error('❌ No tab is currently active!')
        throw new Error('No tab is currently active')
      }

      const tab = multiFileManager.getTab(targetTabId)
      logger.debug('✅ Current tab:', tab?.fileName)

      try {
        logger.debug('🔵 Calling multiFileManager.saveViewport...')
        multiFileManager.saveViewport(targetTabId, x, y, zoom)
        logger.debug('✅ Viewport saved successfully')
      } catch (error) {
        logger.error('❌ Failed to save viewport:', error)
        throw error
      }
    }
  )

  ipcMain.removeHandler('file-get-metadata')
  ipcMain.handle('file-get-metadata', async (_event, tabId?: string) => {
    try {
      const targetTabId = tabId || multiFileManager.getActiveTabId()
      if (!targetTabId) return null

      const metadata = multiFileManager.getMetadata(targetTabId)
      logger.debug('Metadata:', metadata)
      return metadata
    } catch (error) {
      logger.error('Failed to get metadata:', error)
      return null
    }
  })

  ipcMain.removeHandler('file-get-size')
  ipcMain.handle('file-get-size', async (_event, tabId?: string) => {
    try {
      const targetTabId = tabId || multiFileManager.getActiveTabId()
      if (!targetTabId) return null

      const size = multiFileManager.getFileSize(targetTabId)
      return size
    } catch (error) {
      logger.error('Failed to get file size:', error)
      return null
    }
  })

  // Asset handling IPC handlers
  ipcMain.removeHandler('file-save-asset')
  ipcMain.handle(
    'file-save-asset',
    async (
      _event,
      filename: string,
      dataBuffer: ArrayBuffer,
      mimeType: string,
      tabId?: string
    ) => {
      try {
        const targetTabId = tabId || multiFileManager.getActiveTabId()
        if (!targetTabId) throw new Error('No active tab')

        const buffer = Buffer.from(dataBuffer)
        const assetId = multiFileManager.saveAsset(
          targetTabId,
          filename,
          buffer,
          mimeType
        )
        return assetId
      } catch (error) {
        logger.error('Failed to save asset:', error)
        throw error
      }
    }
  )

  ipcMain.removeHandler('file-update-asset')
  ipcMain.handle(
    'file-update-asset',
    async (
      _event,
      assetId: string,
      dataBuffer: ArrayBuffer,
      mimeType: string | undefined,
      tabId?: string
    ) => {
      try {
        const targetTabId = tabId || multiFileManager.getActiveTabId()
        if (!targetTabId) throw new Error('No active tab')

        const buffer = Buffer.from(dataBuffer)
        const success = multiFileManager.updateAsset(
          targetTabId,
          assetId,
          buffer,
          mimeType
        )
        return success
      } catch (error) {
        logger.error('Failed to update asset:', error)
        throw error
      }
    }
  )

  ipcMain.removeHandler('file-get-asset-path')
  ipcMain.handle(
    'file-get-asset-path',
    async (_event, assetId: string, tabId?: string) => {
      try {
        const targetTabId = tabId || multiFileManager.getActiveTabId()
        if (!targetTabId) return null

        const assetPath = multiFileManager.getAssetPath(targetTabId, assetId)
        return assetPath
      } catch (error) {
        logger.error('Failed to get asset path:', error)
        return null
      }
    }
  )

  ipcMain.removeHandler('file-get-asset-data-url')
  ipcMain.handle(
    'file-get-asset-data-url',
    async (_event, assetId: string, tabId?: string) => {
      try {
        const targetTabId = tabId || multiFileManager.getActiveTabId()
        if (!targetTabId) return null

        const dataUrl = multiFileManager.getAssetDataUrl(targetTabId, assetId)
        return dataUrl
      } catch (error) {
        logger.error('Failed to get asset data URL:', error)
        return null
      }
    }
  )

  ipcMain.removeHandler('file-get-asset-content')
  ipcMain.handle(
    'file-get-asset-content',
    async (_event, assetId: string, tabId?: string) => {
      try {
        const targetTabId = tabId || multiFileManager.getActiveTabId()
        if (!targetTabId) return null

        const content = multiFileManager.getAssetContent(targetTabId, assetId)
        return content
      } catch (error) {
        logger.error('Failed to get asset content:', error)
        return null
      }
    }
  )

  ipcMain.removeHandler('file-delete-asset')
  ipcMain.handle(
    'file-delete-asset',
    async (_event, assetId: string, tabId?: string) => {
      try {
        const targetTabId = tabId || multiFileManager.getActiveTabId()
        if (!targetTabId) throw new Error('No active tab')

        multiFileManager.deleteAsset(targetTabId, assetId)
        return true
      } catch (error) {
        logger.error('Failed to delete asset:', error)
        throw error
      }
    }
  )

  // Object operations
  ipcMain.removeHandler('file-get-objects')
  ipcMain.handle('file-get-objects', async (_event, tabId?: string, viewport?: { x: number; y: number; zoom: number; width: number; height: number }) => {
    try {
      const targetTabId = tabId || multiFileManager.getActiveTabId()
      if (!targetTabId) return []

      const objects = multiFileManager.getObjects(targetTabId, viewport)
      return objects
    } catch (error) {
      logger.error('Failed to get objects:', error)
      return []
    }
  })

  ipcMain.removeHandler('file-save-object')
  ipcMain.handle(
    'file-save-object',
    async (_event, object: any, tabId?: string) => {
      try {
        const targetTabId = tabId || multiFileManager.getActiveTabId()
        if (!targetTabId) {
          logger.warn('No tab ID for save object, skipping')
          return false
        }

        // Check if the tab actually exists
        const tab = multiFileManager.getTab(targetTabId)
        if (!tab) {
          logger.warn(`Tab ${targetTabId} not found, skipping save object`)
          return false
        }

        multiFileManager.saveObject(targetTabId, object)
        return true
      } catch (error) {
        logger.error('Failed to save object:', error)
        // Don't throw - just return false to avoid breaking the UI
        return false
      }
    }
  )

  ipcMain.removeHandler('file-delete-object')
  ipcMain.handle(
    'file-delete-object',
    async (_event, objectId: string, tabId?: string) => {
      try {
        const targetTabId = tabId || multiFileManager.getActiveTabId()
        if (!targetTabId) {
          logger.warn('No tab ID for delete object, skipping')
          return false
        }

        // Check if the tab actually exists
        const tab = multiFileManager.getTab(targetTabId)
        if (!tab) {
          logger.warn(`Tab ${targetTabId} not found, skipping delete object`)
          return false
        }

        multiFileManager.deleteObject(targetTabId, objectId)
        return true
      } catch (error) {
        logger.error('Failed to delete object:', error)
        // Don't throw - just return false to avoid breaking the UI
        return false
      }
    }
  )

  // ============================================================================
  // Deck operations (FSRS flashcards)
  // ============================================================================

  ipcMain.removeHandler('deck-create')
  ipcMain.handle(
    'deck-create',
    async (_event, deckObjectId: string, name: string, tabId?: string) => {
      try {
        const targetTabId = tabId || multiFileManager.getActiveTabId()
        if (!targetTabId) {
          throw new Error('No active tab')
        }

        return multiFileManager.createDeck(targetTabId, deckObjectId, name)
      } catch (error) {
        logger.error('Failed to create deck:', error)
        throw error
      }
    }
  )

  ipcMain.removeHandler('deck-load')
  ipcMain.handle(
    'deck-load',
    async (_event, deckObjectId: string, tabId?: string) => {
      try {
        const targetTabId = tabId || multiFileManager.getActiveTabId()
        if (!targetTabId) {
          throw new Error('No active tab')
        }

        return multiFileManager.loadDeck(targetTabId, deckObjectId)
      } catch (error) {
        logger.error('Failed to load deck:', error)
        throw error
      }
    }
  )

  ipcMain.removeHandler('deck-save-config')
  ipcMain.handle(
    'deck-save-config',
    async (_event, deckObjectId: string, config: any, tabId?: string) => {
      try {
        const targetTabId = tabId || multiFileManager.getActiveTabId()
        if (!targetTabId) {
          throw new Error('No active tab')
        }

        multiFileManager.saveDeckConfig(targetTabId, deckObjectId, config)
        return true
      } catch (error) {
        logger.error('Failed to save deck config:', error)
        throw error
      }
    }
  )

  ipcMain.removeHandler('deck-add-card')
  ipcMain.handle(
    'deck-add-card',
    async (_event, card: any, deckObjectId: string, tabId?: string) => {
      try {
        const targetTabId = tabId || multiFileManager.getActiveTabId()
        if (!targetTabId) {
          throw new Error('No active tab')
        }

        multiFileManager.addCard(targetTabId, card, deckObjectId)
        return true
      } catch (error) {
        logger.error('Failed to add card:', error)
        throw error
      }
    }
  )

  ipcMain.removeHandler('deck-update-card')
  ipcMain.handle('deck-update-card', async (_event, card: any, tabId?: string) => {
    try {
      const targetTabId = tabId || multiFileManager.getActiveTabId()
      if (!targetTabId) {
        throw new Error('No active tab')
      }

      multiFileManager.updateCard(targetTabId, card)
      return true
    } catch (error) {
      logger.error('Failed to update card:', error)
      throw error
    }
  })

  ipcMain.removeHandler('deck-delete-card')
  ipcMain.handle(
    'deck-delete-card',
    async (_event, cardId: number, tabId?: string) => {
      try {
        const targetTabId = tabId || multiFileManager.getActiveTabId()
        if (!targetTabId) {
          throw new Error('No active tab')
        }

        multiFileManager.deleteCard(targetTabId, cardId)
        return true
      } catch (error) {
        logger.error('Failed to delete card:', error)
        throw error
      }
    }
  )

  ipcMain.removeHandler('deck-add-review-log')
  ipcMain.handle(
    'deck-add-review-log',
    async (_event, log: any, tabId?: string) => {
      try {
        const targetTabId = tabId || multiFileManager.getActiveTabId()
        if (!targetTabId) {
          throw new Error('No active tab')
        }

        multiFileManager.addReviewLog(targetTabId, log)
        return true
      } catch (error) {
        logger.error('Failed to add review log:', error)
        throw error
      }
    }
  )

  ipcMain.removeHandler('deck-get-stats')
  ipcMain.handle(
    'deck-get-stats',
    async (_event, deckObjectId: string, tabId?: string) => {
      try {
        const targetTabId = tabId || multiFileManager.getActiveTabId()
        if (!targetTabId) {
          throw new Error('No active tab')
        }

        return multiFileManager.getDeckStats(targetTabId, deckObjectId)
      } catch (error) {
        logger.error('Failed to get deck stats:', error)
        throw error
      }
    }
  )

  // Notify renderer when maximize state changes
  window.on('maximize', () => {
    window.webContents.send('window-maximize-change', true)
  })

  window.on('unmaximize', () => {
    window.webContents.send('window-maximize-change', false)
  })

  // Register keyboard shortcuts
  window.webContents.on('before-input-event', (event, input) => {
    const { control, shift, alt, key } = input

    // Only handle key down events
    if (input.type !== 'keyDown') return

    // Ctrl+N - New File
    if (control && !shift && !alt && key.toLowerCase() === 'n') {
      event.preventDefault()
      window.webContents.send('keyboard-shortcut', 'new')
    }

    // Ctrl+O - Open File
    if (control && !shift && !alt && key.toLowerCase() === 'o') {
      event.preventDefault()
      window.webContents.send('keyboard-shortcut', 'open')
    }

    // Ctrl+S - Save
    if (control && !shift && !alt && key.toLowerCase() === 's') {
      event.preventDefault()
      window.webContents.send('keyboard-shortcut', 'save')
    }

    // Ctrl+Shift+S - Save As
    if (control && shift && !alt && key.toLowerCase() === 's') {
      event.preventDefault()
      window.webContents.send('keyboard-shortcut', 'saveAs')
    }

    // Ctrl+W - Close File
    if (control && !shift && !alt && key.toLowerCase() === 'w') {
      event.preventDefault()
      window.webContents.send('keyboard-shortcut', 'close')
    }
  })

  // Auto-updater IPC handlers
  ipcMain.removeHandler('updater-check')
  ipcMain.handle('updater-check', async () => {
    await checkForUpdates()
  })

  ipcMain.removeHandler('updater-download')
  ipcMain.handle('updater-download', async () => {
    await downloadUpdate()
  })

  ipcMain.removeHandler('updater-install')
  ipcMain.handle('updater-install', () => {
    installUpdate()
  })

  // Setup auto-updater (will check for updates on startup)
  setupAutoUpdater(window)

  window.webContents.on('did-finish-load', () => {
    if (ENVIRONMENT.IS_DEV) {
      window.webContents.openDevTools({ mode: 'detach' })
    }

    window.show()
  })

  window.on('close', () => {
    logger.debug('💾 Window closing, saving all files...')
    // Save all files before closing to persist viewport and other changes
    try {
      multiFileManager.saveAll()
      logger.debug('✅ All files saved successfully')
      multiFileManager.closeAll()
    } catch (error) {
      logger.error('❌ Failed to save files on close:', error)
    }

    for (const window of BrowserWindow.getAllWindows()) {
      window.destroy()
    }
  })

  ipcMain.removeHandler('file-get-object-count')
  ipcMain.handle('file-get-object-count', async (_event, tabId?: string) => {
    try {
      const targetTabId = tabId || multiFileManager.getActiveTabId()
      if (!targetTabId) return 0

      const count = multiFileManager.getObjectCount(targetTabId)
      return count
    } catch (error) {
      logger.error('Failed to get object count:', error)
      return 0
    }
  })

  return window
}
