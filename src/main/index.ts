import { app } from 'electron'

import { makeAppWithSingleInstanceLock } from 'lib/electron-app/factories/app/instance'
import { makeAppSetup } from 'lib/electron-app/factories/app/setup'
import { MainWindow } from './windows/main'
import { multiFileManager } from './services/multi-file-manager'

// Store file paths to open after the window is ready (support multiple files)
let filesToOpen: string[] = []
let mainWindow: Electron.BrowserWindow | null = null

// Handle file open on macOS (when file is double-clicked or opened via "Open with")
app.on('open-file', (event, filePath) => {
  event.preventDefault()
  console.log('[Main] 📂 open-file event:', filePath)
  
  if (mainWindow && mainWindow.webContents) {
    // Window is ready, open the file immediately
    try {
      const { file, tabId } = multiFileManager.openFile(filePath)
      mainWindow.webContents.send('file-opened', { file, tabId })
    } catch (error) {
      console.error('[Main] Failed to open file:', error)
    }
  } else {
    // Window not ready yet, store for later
    if (!filesToOpen.includes(filePath)) {
      filesToOpen.push(filePath)
    }
  }
})

makeAppWithSingleInstanceLock(async () => {
  // Handle command-line arguments (Windows/Linux) - support multiple files
  const args = process.argv.slice(1)
  const fileArgs = args.filter(arg => arg.endsWith('.what') && !arg.startsWith('--'))
  
  if (fileArgs.length > 0) {
    console.log('[Main] 📂 Command-line file arguments:', fileArgs)
    filesToOpen.push(...fileArgs)
  }
  
  // Handle second instance (when app is already running)
  app.on('second-instance', (_event, commandLine) => {
    console.log('[Main] 📂 Second instance launched with:', commandLine)
    
    // Focus the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      
      // Check if any .what files were passed - support multiple files
      const fileArgs = commandLine.filter(arg => arg.endsWith('.what') && !arg.startsWith('--'))
      if (fileArgs.length > 0 && mainWindow.webContents) {
        console.log('[Main] 📂 Opening files from second instance:', fileArgs)
        for (const filePath of fileArgs) {
          try {
            const { file, tabId } = multiFileManager.openFile(filePath)
            mainWindow.webContents.send('file-opened', { file, tabId })
          } catch (error) {
            console.error('[Main] Failed to open file from second instance:', filePath, error)
          }
        }
      }
    }
  })
  
  await app.whenReady()
  mainWindow = await makeAppSetup(MainWindow)
  
  // If files were specified, open them after window is ready
  if (filesToOpen.length > 0 && mainWindow && mainWindow.webContents) {
    console.log('[Main] 📂 Opening files after window ready:', filesToOpen)
    
    // Wait a bit for the renderer to be fully loaded
    setTimeout(() => {
      if (mainWindow && mainWindow.webContents && filesToOpen.length > 0) {
        for (const filePath of filesToOpen) {
          try {
            const { file, tabId } = multiFileManager.openFile(filePath)
            mainWindow.webContents.send('file-opened', { file, tabId })
          } catch (error) {
            console.error('[Main] Failed to open file:', filePath, error)
          }
        }
        filesToOpen = [] // Clear after opening
      }
    }, 1000)
  }
})
