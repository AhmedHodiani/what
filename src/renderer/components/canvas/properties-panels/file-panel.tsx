import type { DrawingObject, FileObject } from 'lib/types/canvas'
import { useCallback } from 'react'

interface FilePanelProps {
  object: FileObject
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
}

/**
 * FilePanel - File properties and download
 *
 * Features:
 * - Display file information (name, size, type)
 * - Download button
 * - File icon based on MIME type
 */
export function FilePanel({ object }: FilePanelProps) {
  const { fileName, fileSize, mimeType, assetId } = object.object_data

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  // Get file icon based on MIME type
  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType.startsWith('video/')) return '🎬'
    if (mimeType.startsWith('audio/')) return '🎵'
    if (mimeType.startsWith('text/')) return '📝'
    if (mimeType.includes('pdf')) return '📕'
    if (mimeType.includes('zip') || mimeType.includes('compressed'))
      return '📦'
    if (
      mimeType.includes('word') ||
      mimeType.includes('document') ||
      mimeType.includes('msword')
    )
      return '📄'
    if (
      mimeType.includes('sheet') ||
      mimeType.includes('excel') ||
      mimeType.includes('spreadsheet')
    )
      return '📊'
    if (
      mimeType.includes('presentation') ||
      mimeType.includes('powerpoint')
    )
      return '📽️'
    if (mimeType.includes('json') || mimeType.includes('javascript'))
      return '📜'
    return '📎'
  }

  // Handle file download
  const handleDownload = useCallback(async () => {
    try {
      // Get file data URL from asset
      const dataUrl = await window.App.file.getAssetDataUrl(assetId)
      if (!dataUrl) {
        console.error('Failed to retrieve asset')
        return
      }

      // Extract base64 data from data URL
      const base64Data = dataUrl.split(',')[1]
      
      // Convert base64 to binary
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Create blob and download
      const blob = new Blob([bytes], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download file:', error)
    }
  }, [assetId, fileName, mimeType])

  const fileIcon = getFileIcon(mimeType)
  const fileSizeFormatted = formatFileSize(fileSize)

  return (
    <div className="absolute top-20 right-3 w-64 bg-black/90 backdrop-blur-sm border border-teal-400/30 rounded-lg shadow-xl overflow-hidden pointer-events-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-semibold text-teal-400 flex items-center gap-2">
          📎 File Properties
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* File Icon */}
        <div className="flex justify-center">
          <div className="text-6xl">{fileIcon}</div>
        </div>

        {/* File Name */}
        <div>
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide block mb-1">
            File Name
          </label>
          <div className="text-sm text-gray-200 break-all bg-white/5 rounded px-3 py-2">
            {fileName}
          </div>
        </div>

        {/* File Size */}
        <div>
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide block mb-1">
            File Size
          </label>
          <div className="text-sm text-gray-200 bg-white/5 rounded px-3 py-2">
            {fileSizeFormatted}
          </div>
        </div>

        {/* MIME Type */}
        <div>
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide block mb-1">
            File Type
          </label>
          <div className="text-sm text-gray-200 bg-white/5 rounded px-3 py-2 font-mono text-xs">
            {mimeType}
          </div>
        </div>

        {/* Download Button */}
        <button
          className="w-full px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded transition-colors flex items-center justify-center gap-2"
          onClick={handleDownload}
          type="button"
        >
          <span>⬇️</span>
          <span>Download File</span>
        </button>
      </div>
    </div>
  )
}
