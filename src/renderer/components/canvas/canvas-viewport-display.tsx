import { useState, useEffect } from 'react'
import { useActiveTab } from 'renderer/contexts'
import { logger } from 'shared/logger'

// No props needed - uses active tab context now!
interface CanvasViewportDisplayProps {}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`
}

/**
 * Displays current viewport information (zoom level and position).
 * Now GLOBAL - reads from ActiveTabContext, shows active tab's data!
 * Useful for debugging and user feedback.
 */
export function CanvasViewportDisplay(_props: CanvasViewportDisplayProps) {
  const { viewport, objects, tabId, totalObjectCount, renderedObjectCount } = useActiveTab()
  const loadedCount = objects.length
  const loadedPercentage = totalObjectCount > 0 ? ((loadedCount / totalObjectCount) * 100).toFixed(1) : '0.0'
  const [fileSize, setFileSize] = useState<string | null>(null)

  // Get file size from IPC if available
  useEffect(() => {
    if (!tabId) {
      setFileSize(null)
      return
    }

    const fetchFileSize = async () => {
      try {
        const sizeBytes = await window.App.file.getFileSize(tabId)
        if (sizeBytes !== null) {
          setFileSize(formatBytes(sizeBytes))
        } else {
          setFileSize(null)
        }
      } catch (error) {
        logger.error('Failed to get file size:', error)
        setFileSize(null)
      }
    }

    // Fetch immediately
    fetchFileSize()

    // Refresh file size every 500ms for real-time updates
    const interval = setInterval(fetchFileSize, 500)
    return () => clearInterval(interval)
  }, [tabId, loadedCount]) // Re-fetch when loadedCount changes

  // Show placeholder if no active tab
  if (!viewport || !tabId) {
    return (
      <div className="absolute top-3 left-3 bg-black/80 text-gray-500 px-3 py-2 rounded-md text-xs font-mono pointer-events-none flex flex-col gap-1 border border-gray-600/30">
        <div>No active canvas</div>
      </div>
    )
  }

  return (
    <div className="absolute top-3 left-3 bg-black/80 text-teal-400 px-3 py-2 rounded-md text-xs font-mono pointer-events-none flex flex-col gap-1 border border-teal-400/30">
      <div>Zoom: {(viewport.zoom * 100).toFixed(0)}%</div>
      <div>
        Position: ({viewport.x.toFixed(0)}, {viewport.y.toFixed(0)})
      </div>

      {/* File stats */}
      <div className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-0.5">
        <div className="flex items-center gap-1">
          <span className="text-gray-400">📦 Loaded:</span>
          <span className="text-teal-300 font-semibold">
            {loadedCount} ({loadedPercentage}%)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-400">👁️ Rendered:</span>
          <span className="text-teal-300 font-semibold">
            {renderedObjectCount}
          </span>
        </div>
        {fileSize && (
          <div className="flex items-center gap-1">
            <span className="text-gray-400">💾 Size:</span>
            <span className="text-teal-300 font-semibold">{fileSize}</span>
          </div>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-0.5 text-[11px] text-gray-500">
        <span>🖱️ Drag to pan</span>
        <span>🖲️ Scroll to zoom</span>
      </div>
    </div>
  )
}
