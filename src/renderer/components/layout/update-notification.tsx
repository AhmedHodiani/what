import { useEffect, useState } from 'react'
import { Download, X, RotateCw } from 'lucide-react'

interface UpdateInfo {
  version: string
  releaseDate?: string
  releaseName?: string
  releaseNotes?: string
}

interface DownloadProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

export function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null)
  const [updateReady, setUpdateReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Listen for update events
    const unsubscribeAvailable = window.App.updater.onUpdateAvailable(info => {
      console.log('[UpdateNotification] Update available:', info)
      setUpdateInfo(info)
      setUpdateAvailable(true)
      setDismissed(false)
    })

    const unsubscribeNotAvailable = window.App.updater.onUpdateNotAvailable(
      info => {
        console.log('[UpdateNotification] No updates available:', info)
        setUpdateAvailable(false)
      }
    )

    const unsubscribeProgress = window.App.updater.onDownloadProgress(
      progress => {
        console.log('[UpdateNotification] Download progress:', progress)
        setDownloadProgress(progress)
      }
    )

    const unsubscribeDownloaded = window.App.updater.onUpdateDownloaded(
      info => {
        console.log('[UpdateNotification] Update downloaded:', info)
        setDownloading(false)
        setUpdateReady(true)
      }
    )

    const unsubscribeError = window.App.updater.onUpdateError(err => {
      console.error('[UpdateNotification] Update error:', err)
      setError(err.message)
      setDownloading(false)
    })

    return () => {
      unsubscribeAvailable()
      unsubscribeNotAvailable()
      unsubscribeProgress()
      unsubscribeDownloaded()
      unsubscribeError()
    }
  }, [])

  const handleDownload = async () => {
    try {
      setDownloading(true)
      setError(null)
      await window.App.updater.downloadUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download update')
      setDownloading(false)
    }
  }

  const handleInstall = () => {
    window.App.updater.installUpdate()
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  // Don't show if dismissed or no update
  if (dismissed || (!updateAvailable && !updateReady)) {
    return null
  }

  // Format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`
  }

  // Format speed
  const formatSpeed = (bytesPerSecond: number) => {
    return `${formatBytes(bytesPerSecond)}/s`
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 rounded-lg border border-neutral-700 bg-neutral-900 p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {updateReady ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <RotateCw className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-white">Update Ready</h3>
              </div>
              <p className="text-sm text-neutral-400 mb-3">
                Version {updateInfo?.version} has been downloaded and is ready
                to install.
              </p>
              <div className="flex gap-2">
                <button
                  className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                  onClick={handleInstall}
                  type="button"
                >
                  Install & Restart
                </button>
                <button
                  className="px-3 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                  onClick={handleDismiss}
                  type="button"
                >
                  Later
                </button>
              </div>
            </>
          ) : downloading ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Download className="w-5 h-5 text-blue-500 animate-pulse" />
                <h3 className="font-semibold text-white">Downloading Update</h3>
              </div>
              <p className="text-sm text-neutral-400 mb-2">
                Version {updateInfo?.version}
              </p>
              {downloadProgress && (
                <>
                  <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${downloadProgress.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>{Math.round(downloadProgress.percent)}%</span>
                    <span>
                      {formatBytes(downloadProgress.transferred)} /{' '}
                      {formatBytes(downloadProgress.total)}
                      {' • '}
                      {formatSpeed(downloadProgress.bytesPerSecond)}
                    </span>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Download className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-white">Update Available</h3>
              </div>
              <p className="text-sm text-neutral-400 mb-1">
                Version {updateInfo?.version} is available
              </p>
              {updateInfo?.releaseName && (
                <p className="text-sm text-neutral-500 mb-3">
                  {updateInfo.releaseName}
                </p>
              )}
              {error && (
                <p className="text-sm text-red-500 mb-3">Error: {error}</p>
              )}
              <div className="flex gap-2">
                <button
                  className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                  onClick={handleDownload}
                  type="button"
                >
                  Download Now
                </button>
                <button
                  className="px-3 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                  onClick={handleDismiss}
                  type="button"
                >
                  Later
                </button>
              </div>
            </>
          )}
        </div>
        <button
          className="text-neutral-500 hover:text-white transition-colors"
          onClick={handleDismiss}
          type="button"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
