import { BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'node:path'

import { createWindow } from 'lib/electron-app/factories/windows/create'
import { ENVIRONMENT } from 'shared/constants'
import { displayName } from '~/package.json'
import { whatFileService } from '../services/what-file'

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

  // File operation IPC handlers
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
      const file = whatFileService.createNewFile(filePath)
      window.webContents.send('file-opened', file)
      return file
    } catch (error) {
      console.error('Failed to create file:', error)
      dialog.showErrorBox(
        'Error',
        `Failed to create file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return null
    }
  })

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
      const file = whatFileService.openFile(filePaths[0])
      window.webContents.send('file-opened', file)
      return file
    } catch (error) {
      console.error('Failed to open file:', error)
      dialog.showErrorBox(
        'Error',
        `Failed to open file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return null
    }
  })

  ipcMain.handle('file-save', async () => {
    const currentFile = whatFileService.getCurrentFile()
    if (!currentFile) {
      return null
    }

    try {
      whatFileService.saveFile()
      return currentFile
    } catch (error) {
      console.error('Failed to save file:', error)
      dialog.showErrorBox(
        'Error',
        `Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return null
    }
  })

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

  ipcMain.handle('file-close', async () => {
    whatFileService.closeFile()
    return true
  })

  ipcMain.handle('file-get-current', async () => {
    return whatFileService.getCurrentFile()
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
