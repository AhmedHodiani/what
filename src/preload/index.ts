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
    // Canvas operations
    getCanvas: (canvasId: string, tabId?: string) => ipcRenderer.invoke('file-get-canvas', canvasId, tabId),
    saveViewport: (canvasId: string, x: number, y: number, zoom: number, tabId?: string) => {
      console.log('[Preload] 🔵 saveViewport called, invoking IPC:', { canvasId, x, y, zoom, tabId })
      const result = ipcRenderer.invoke('file-save-viewport', canvasId, x, y, zoom, tabId)
      console.log('[Preload] 🔵 IPC invoke returned:', result)
      return result
    },
    // Debug operations
    getMetadata: (tabId?: string) => ipcRenderer.invoke('file-get-metadata', tabId),
  },
  
  // Tab management
  tabs: {
    getAll: () => ipcRenderer.invoke('tabs-get-all'),
    setActive: (tabId: string) => ipcRenderer.invoke('tabs-set-active', tabId),
    getActiveId: () => ipcRenderer.invoke('tabs-get-active-id'),
  },
}

contextBridge.exposeInMainWorld('App', API)
