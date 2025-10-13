import { autoUpdater } from 'electron-updater'
import type { BrowserWindow } from 'electron'
import { ENVIRONMENT } from 'shared/constants'

let updateCheckInProgress = false

// Configure auto-updater
export function setupAutoUpdater(mainWindow: BrowserWindow) {
  console.log('[AutoUpdater] 🔄 Setting up auto-updater')

  // Don't check for updates in development
  if (ENVIRONMENT.IS_DEV) {
    console.log('[AutoUpdater] ⚠️ Skipping update check in development mode')
    return
  }

  // Configure updater
  autoUpdater.autoDownload = false // Don't auto-download, let user decide
  autoUpdater.autoInstallOnAppQuit = true // Install when app quits

  // Update available
  autoUpdater.on('update-available', info => {
    console.log('[AutoUpdater] ✅ Update available:', info.version)

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseName: info.releaseName,
        releaseNotes: info.releaseNotes,
      })
    }
  })

  // Update not available
  autoUpdater.on('update-not-available', info => {
    console.log(
      '[AutoUpdater] ℹ️ No updates available. Current version:',
      info.version
    )

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-not-available', {
        version: info.version,
      })
    }
  })

  // Download progress
  autoUpdater.on('download-progress', progress => {
    const percent = Math.round(progress.percent)
    console.log(`[AutoUpdater] ⬇️ Downloading: ${percent}%`)

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-download-progress', {
        percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
      })
    }
  })

  // Update downloaded
  autoUpdater.on('update-downloaded', info => {
    console.log('[AutoUpdater] ✅ Update downloaded:', info.version)

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
      })
    }
  })

  // Error
  autoUpdater.on('error', error => {
    console.error('[AutoUpdater] ❌ Error:', error.message)

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-error', {
        message: error.message,
      })
    }
  })

  // Check for updates on startup (delayed by 5 seconds)
  setTimeout(() => {
    checkForUpdates()
  }, 5000)
}

// Check for updates
export async function checkForUpdates() {
  if (ENVIRONMENT.IS_DEV) {
    console.log('[AutoUpdater] ⚠️ Skipping update check in development mode')
    return
  }

  if (updateCheckInProgress) {
    console.log('[AutoUpdater] ⚠️ Update check already in progress')
    return
  }

  try {
    updateCheckInProgress = true
    console.log('[AutoUpdater] 🔍 Checking for updates...')
    await autoUpdater.checkForUpdates()
  } catch (error) {
    console.error('[AutoUpdater] ❌ Failed to check for updates:', error)
  } finally {
    updateCheckInProgress = false
  }
}

// Download update
export async function downloadUpdate() {
  if (ENVIRONMENT.IS_DEV) {
    console.log('[AutoUpdater] ⚠️ Cannot download updates in development mode')
    return
  }

  try {
    console.log('[AutoUpdater] ⬇️ Starting update download...')
    await autoUpdater.downloadUpdate()
  } catch (error) {
    console.error('[AutoUpdater] ❌ Failed to download update:', error)
    throw error
  }
}

// Install update and restart
export function installUpdate() {
  if (ENVIRONMENT.IS_DEV) {
    console.log('[AutoUpdater] ⚠️ Cannot install updates in development mode')
    return
  }

  console.log('[AutoUpdater] 🔄 Installing update and restarting...')
  autoUpdater.quitAndInstall(false, true)
}
