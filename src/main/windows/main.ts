import { BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'node:path'

import { createWindow } from 'lib/electron-app/factories/windows/create'
import { ENVIRONMENT } from 'shared/constants'
import { displayName } from '~/package.json'
import { multiFileManager } from '../services/multi-file-manager'

export async function MainWindow() {
  console.log('[Main] 🚀 MainWindow() function called - setting up window and IPC handlers')
  
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

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
    },
  })

  // Configure all new child windows (popouts) to be frameless
  window.webContents.setWindowOpenHandler((details) => {
    console.log('[Main] 🪟 New window requested:', details.url)
    
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
      console.error('Failed to create file:', error)
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
      console.error('Failed to open file:', error)
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
      const file = tabId ? multiFileManager.saveTab(tabId) : multiFileManager.saveActiveFile()
      return file
    } catch (error) {
      console.error('Failed to save file:', error)
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
  ipcMain.handle('file-close', async (_event, tabId?: string) => {
    if (tabId) {
      multiFileManager.closeTab(tabId)
    } else {
      const activeTabId = multiFileManager.getActiveTabId()
      if (activeTabId) {
        multiFileManager.closeTab(activeTabId)
      }
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

  ipcMain.removeHandler('file-get-canvas')
  ipcMain.handle('file-get-canvas', async (_event, canvasId: string, tabId?: string) => {
    try {
      const targetTabId = tabId || multiFileManager.getActiveTabId()
      if (!targetTabId) return null
      
      const viewport = multiFileManager.getViewport(targetTabId)
      console.log('[Main] Getting viewport:', viewport)
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
      console.error('Failed to get viewport:', error)
      return null
    }
  })

  console.log('[Main] 📝 Registering file-save-viewport IPC handler...')
  
  // Remove old handler if it exists (for hot reload)
  ipcMain.removeHandler('file-save-viewport')
  
  ipcMain.handle('file-save-viewport', async (_event, canvasId: string, x: number, y: number, zoom: number, tabId?: string) => {
    console.log('[Main IPC] 🔵 file-save-viewport handler called with:', { canvasId, x, y, zoom, tabId })
    
    const targetTabId = tabId || multiFileManager.getActiveTabId()
    if (!targetTabId) {
      console.error('[Main IPC] ❌ No tab is currently active!')
      throw new Error('No tab is currently active')
    }
    
    const tab = multiFileManager.getTab(targetTabId)
    console.log('[Main IPC] ✅ Current tab:', tab?.fileName)
    
    try {
      console.log('[Main IPC] 🔵 Calling multiFileManager.saveViewport...')
      multiFileManager.saveViewport(targetTabId, x, y, zoom)
      console.log('[Main IPC] ✅ Viewport saved successfully')
    } catch (error) {
      console.error('[Main IPC] ❌ Failed to save viewport:', error)
      throw error
    }
  })

  ipcMain.removeHandler('file-get-metadata')
  ipcMain.handle('file-get-metadata', async (_event, tabId?: string) => {
    try {
      const targetTabId = tabId || multiFileManager.getActiveTabId()
      if (!targetTabId) return null
      
      const metadata = multiFileManager.getMetadata(targetTabId)
      console.log('[Main] Metadata:', metadata)
      return metadata
    } catch (error) {
      console.error('Failed to get metadata:', error)
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
      console.error('Failed to get file size:', error)
      return null
    }
  })

  // Asset handling IPC handlers
  ipcMain.removeHandler('file-save-asset')
  ipcMain.handle('file-save-asset', async (_event, filename: string, dataBuffer: ArrayBuffer, mimeType: string, tabId?: string) => {
    try {
      const targetTabId = tabId || multiFileManager.getActiveTabId()
      if (!targetTabId) throw new Error('No active tab')

      const buffer = Buffer.from(dataBuffer)
      const assetId = multiFileManager.saveAsset(targetTabId, filename, buffer, mimeType)
      return assetId
    } catch (error) {
      console.error('Failed to save asset:', error)
      throw error
    }
  })

  ipcMain.removeHandler('file-get-asset-path')
  ipcMain.handle('file-get-asset-path', async (_event, assetId: string, tabId?: string) => {
    try {
      const targetTabId = tabId || multiFileManager.getActiveTabId()
      if (!targetTabId) return null

      const assetPath = multiFileManager.getAssetPath(targetTabId, assetId)
      return assetPath
    } catch (error) {
      console.error('Failed to get asset path:', error)
      return null
    }
  })

  ipcMain.removeHandler('file-get-asset-data-url')
  ipcMain.handle('file-get-asset-data-url', async (_event, assetId: string, tabId?: string) => {
    try {
      const targetTabId = tabId || multiFileManager.getActiveTabId()
      if (!targetTabId) return null

      const dataUrl = multiFileManager.getAssetDataUrl(targetTabId, assetId)
      return dataUrl
    } catch (error) {
      console.error('Failed to get asset data URL:', error)
      return null
    }
  })

  ipcMain.removeHandler('file-delete-asset')
  ipcMain.handle('file-delete-asset', async (_event, assetId: string, tabId?: string) => {
    try {
      const targetTabId = tabId || multiFileManager.getActiveTabId()
      if (!targetTabId) throw new Error('No active tab')

      multiFileManager.deleteAsset(targetTabId, assetId)
      return true
    } catch (error) {
      console.error('Failed to delete asset:', error)
      throw error
    }
  })

  // Object operations
  ipcMain.removeHandler('file-get-objects')
  ipcMain.handle('file-get-objects', async (_event, tabId?: string) => {
    try {
      const targetTabId = tabId || multiFileManager.getActiveTabId()
      if (!targetTabId) return []

      const objects = multiFileManager.getObjects(targetTabId)
      return objects
    } catch (error) {
      console.error('Failed to get objects:', error)
      return []
    }
  })

  ipcMain.removeHandler('file-save-object')
  ipcMain.handle('file-save-object', async (_event, object: any, tabId?: string) => {
    try {
      const targetTabId = tabId || multiFileManager.getActiveTabId()
      if (!targetTabId) {
        console.warn('[Main] No tab ID for save object, skipping')
        return false
      }

      // Check if the tab actually exists
      const tab = multiFileManager.getTab(targetTabId)
      if (!tab) {
        console.warn(`[Main] Tab ${targetTabId} not found, skipping save object`)
        return false
      }

      multiFileManager.saveObject(targetTabId, object)
      return true
    } catch (error) {
      console.error('Failed to save object:', error)
      // Don't throw - just return false to avoid breaking the UI
      return false
    }
  })

  ipcMain.removeHandler('file-delete-object')
  ipcMain.handle('file-delete-object', async (_event, objectId: string, tabId?: string) => {
    try {
      const targetTabId = tabId || multiFileManager.getActiveTabId()
      if (!targetTabId) {
        console.warn('[Main] No tab ID for delete object, skipping')
        return false
      }

      // Check if the tab actually exists
      const tab = multiFileManager.getTab(targetTabId)
      if (!tab) {
        console.warn(`[Main] Tab ${targetTabId} not found, skipping delete object`)
        return false
      }

      multiFileManager.deleteObject(targetTabId, objectId)
      return true
    } catch (error) {
      console.error('Failed to delete object:', error)
      // Don't throw - just return false to avoid breaking the UI
      return false
    }
  })

  // Notify renderer when maximize state changes
  window.on('maximize', () => {
    window.webContents.send('window-maximize-change', true)
  })

  window.on('unmaximize', () => {
    window.webContents.send('window-maximize-change', false)
  })

  window.webContents.on('did-finish-load', () => {
    if (ENVIRONMENT.IS_DEV) {
      window.webContents.openDevTools({ mode: 'detach' })
    }

    window.show()
  })

  window.on('close', () => {
    console.log('[Main] 💾 Window closing, saving all files...')
    // Save all files before closing to persist viewport and other changes
    try {
      multiFileManager.saveAll()
      console.log('[Main] ✅ All files saved successfully')
      multiFileManager.closeAll()
    } catch (error) {
      console.error('[Main] ❌ Failed to save files on close:', error)
    }
    
    for (const window of BrowserWindow.getAllWindows()) {
      window.destroy()
    }
  })

  return window
}
