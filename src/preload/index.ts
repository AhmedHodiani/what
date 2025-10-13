import { contextBridge, ipcRenderer } from 'electron'

declare global {
  interface Window {
    App: typeof API
  }
}

const API = {
  sayHelloFromBridge: () => console.log('\nHello from bridgeAPI! 👋\n\n'),
  username: process.env.USER,
  
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
      ipcRenderer.on('window-maximize-change', (_event, isMaximized) => {
        callback(isMaximized)
      })
    },
  },
  
  // File operations
  file: {
    new: () => ipcRenderer.invoke('file-new'),
    open: () => ipcRenderer.invoke('file-open'),
    save: (tabId?: string) => ipcRenderer.invoke('file-save', tabId),
    saveAs: () => ipcRenderer.invoke('file-save-as'),
    close: (tabId?: string) => ipcRenderer.invoke('file-close', tabId),
    getCurrentFile: () => ipcRenderer.invoke('file-get-current'),
    onFileOpened: (callback: (data: { file: any; tabId: string }) => void) => {
      const listener = (_event: any, data: { file: any; tabId: string }) => {
        callback(data)
      }
      ipcRenderer.on('file-opened', listener)
      return () => {
        ipcRenderer.removeListener('file-opened', listener)
      }
    },
    onFileClosed: (callback: (data: { tabId: string }) => void) => {
      const listener = (_event: any, data: { tabId: string }) => {
        callback(data)
      }
      ipcRenderer.on('file-closed', listener)
      return () => {
        ipcRenderer.removeListener('file-closed', listener)
      }
    },
    // Canvas operations
    getCanvas: (canvasId: string, tabId?: string) => ipcRenderer.invoke('file-get-canvas', canvasId, tabId),
    saveViewport: (canvasId: string, x: number, y: number, zoom: number, tabId?: string) => {
      console.log('[Preload] 🔵 saveViewport called, invoking IPC:', { canvasId, x, y, zoom, tabId })
      const result = ipcRenderer.invoke('file-save-viewport', canvasId, x, y, zoom, tabId)
      console.log('[Preload] 🔵 IPC invoke returned:', result)
      return result
    },
    // Asset operations
    saveAsset: (filename: string, dataBuffer: ArrayBuffer, mimeType: string, tabId?: string) => 
      ipcRenderer.invoke('file-save-asset', filename, dataBuffer, mimeType, tabId),
    getAssetPath: (assetId: string, tabId?: string) => 
      ipcRenderer.invoke('file-get-asset-path', assetId, tabId),
    getAssetDataUrl: (assetId: string, tabId?: string) => 
      ipcRenderer.invoke('file-get-asset-data-url', assetId, tabId),
    deleteAsset: (assetId: string, tabId?: string) => 
      ipcRenderer.invoke('file-delete-asset', assetId, tabId),
    // Object operations
    getObjects: (tabId?: string) => ipcRenderer.invoke('file-get-objects', tabId),
    saveObject: (object: any, tabId?: string) => ipcRenderer.invoke('file-save-object', object, tabId),
    deleteObject: (objectId: string, tabId?: string) => ipcRenderer.invoke('file-delete-object', objectId, tabId),
    // Debug operations
    getMetadata: (tabId?: string) => ipcRenderer.invoke('file-get-metadata', tabId),
    getFileSize: (tabId?: string) => ipcRenderer.invoke('file-get-size', tabId),
  },
  
  // Tab management
  tabs: {
    getAll: () => ipcRenderer.invoke('tabs-get-all'),
    setActive: (tabId: string) => ipcRenderer.invoke('tabs-set-active', tabId),
    getActiveId: () => ipcRenderer.invoke('tabs-get-active-id'),
  },
  
  // Keyboard shortcuts
  shortcuts: {
    onShortcut: (callback: (action: string) => void) => {
      const listener = (_event: any, action: string) => {
        callback(action)
      }
      ipcRenderer.on('keyboard-shortcut', listener)
      return () => {
        ipcRenderer.removeListener('keyboard-shortcut', listener)
      }
    },
  },
  
  // Auto-updater
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater-check'),
    downloadUpdate: () => ipcRenderer.invoke('updater-download'),
    installUpdate: () => ipcRenderer.invoke('updater-install'),
    onUpdateAvailable: (callback: (info: { version: string; releaseDate: string; releaseName?: string; releaseNotes?: string }) => void) => {
      const listener = (_event: any, info: any) => callback(info)
      ipcRenderer.on('update-available', listener)
      return () => ipcRenderer.removeListener('update-available', listener)
    },
    onUpdateNotAvailable: (callback: (info: { version: string }) => void) => {
      const listener = (_event: any, info: any) => callback(info)
      ipcRenderer.on('update-not-available', listener)
      return () => ipcRenderer.removeListener('update-not-available', listener)
    },
    onDownloadProgress: (callback: (progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => {
      const listener = (_event: any, progress: any) => callback(progress)
      ipcRenderer.on('update-download-progress', listener)
      return () => ipcRenderer.removeListener('update-download-progress', listener)
    },
    onUpdateDownloaded: (callback: (info: { version: string }) => void) => {
      const listener = (_event: any, info: any) => callback(info)
      ipcRenderer.on('update-downloaded', listener)
      return () => ipcRenderer.removeListener('update-downloaded', listener)
    },
    onUpdateError: (callback: (error: { message: string }) => void) => {
      const listener = (_event: any, error: any) => callback(error)
      ipcRenderer.on('update-error', listener)
      return () => ipcRenderer.removeListener('update-error', listener)
    },
  },
}

contextBridge.exposeInMainWorld('App', API)
