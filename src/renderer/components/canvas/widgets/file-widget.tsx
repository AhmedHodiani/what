import type { FileObject, DrawingObject } from 'lib/types/canvas'
import { WidgetWrapper } from './widget-wrapper'
import { useCallback } from 'react'

interface FileWidgetProps {
  object: FileObject
  isSelected: boolean
  zoom: number
  currentTool?: string
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
  onSelect: (id: string) => void
  onContextMenu: (event: React.MouseEvent, id: string) => void
  onStartDrag: (e: React.MouseEvent, id: string) => void
}

/**
 * FileWidget - Generic file attachment display
 *
 * Features:
 * - Shows file icon based on MIME type
 * - Displays filename below icon
 * - Click to download file
 * - Supports all file types
 */
export function FileWidget({
  object,
  isSelected,
  zoom,
  currentTool,
  onUpdate,
  onSelect,
  onContextMenu,
  onStartDrag,
}: FileWidgetProps) {
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
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦'
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
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
      return '📽️'
    if (mimeType.includes('json') || mimeType.includes('javascript'))
      return '📜'
    return '📎' // Default file icon
  }

  const fileIcon = getFileIcon(mimeType)
  const fileSizeFormatted = formatFileSize(fileSize)

  // Get widget dimensions for responsive sizing
  const width = object.width || 150
  const height = object.height || 150

  // Calculate responsive font sizes based on widget size
  // Icon size: 30-40% of the smaller dimension
  const iconSize = Math.max(32, Math.min(width, height) * 0.6)

  // Filename size: 8-12% of the smaller dimension
  const nameSize = Math.max(10, Math.min(width, height) * 0.09)

  // File size text: 6-9% of the smaller dimension
  const sizeTextSize = Math.max(8, Math.min(width, height) * 0.065)

  return (
    <WidgetWrapper
      currentTool={currentTool}
      isResizable={true}
      isSelected={isSelected}
      lockAspectRatio={false}
      minHeight={100}
      minWidth={120}
      object={object}
      onContextMenu={onContextMenu}
      onSelect={onSelect}
      onStartDrag={onStartDrag}
      onUpdate={onUpdate}
      zoom={zoom}
    >
      <div
        className="flex flex-col items-center justify-center w-full h-full p-2 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border-2 border-gray-700 hover:border-blue-500 transition-colors cursor-pointer group"
        title={`Click to download ${fileName}`}
      >
        {/* File Icon */}
        <div
          className="mb-2 group-hover:scale-110 transition-transform"
          style={{ fontSize: `${iconSize}px` }}
        >
          {fileIcon}
        </div>

        {/* File Name */}
        <div
          className="font-medium text-gray-200 text-center break-all line-clamp-2 mb-1 px-2"
          style={{ fontSize: `${nameSize}px` }}
        >
          {fileName}
        </div>

        {/* File Size */}
        <div
          className="text-gray-400"
          style={{ fontSize: `${sizeTextSize}px` }}
        >
          {fileSizeFormatted}
        </div>
      </div>
    </WidgetWrapper>
  )
}
