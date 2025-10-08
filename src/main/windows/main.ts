import { BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'

import { createWindow } from 'lib/electron-app/factories/windows/create'
import { ENVIRONMENT } from 'shared/constants'
import { displayName } from '~/package.json'

export async function MainWindow() {
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
    for (const window of BrowserWindow.getAllWindows()) {
      window.destroy()
    }
  })

  return window
}
