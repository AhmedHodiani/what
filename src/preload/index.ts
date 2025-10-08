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
    save: () => ipcRenderer.invoke('file-save'),
    saveAs: () => ipcRenderer.invoke('file-save-as'),
    close: () => ipcRenderer.invoke('file-close'),
    getCurrentFile: () => ipcRenderer.invoke('file-get-current'),
    onFileOpened: (callback: (file: any) => void) => {
      ipcRenderer.on('file-opened', (_event, file) => {
        callback(file)
      })
    },
  },
}

contextBridge.exposeInMainWorld('App', API)
