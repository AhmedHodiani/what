import { useState, useRef, useEffect } from 'react'
import type { YouTubeVideoObject, DrawingObject } from 'lib/types/canvas'
import { WidgetWrapper } from './widget-wrapper'

interface YouTubeWidgetProps {
  object: YouTubeVideoObject
  isSelected: boolean
  zoom: number
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
  onSelect: (id: string) => void
  onContextMenu: (event: React.MouseEvent, id: string) => void
  onStartDrag: (e: React.MouseEvent, id: string) => void
}

// Extract YouTube video ID from URL
function extractYouTubeId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
  }
  return ''
}

/**
 * YouTubeWidget - Embedded YouTube video player
 *
 * Features:
 * - Embedded iframe player
 * - Resizable (maintains 16:9 aspect ratio)
 * - Double-click to edit URL
 * - URL validation
 * - Placeholder when no video set
 */
export function YouTubeWidget({
  object,
  isSelected,
  zoom,
  onUpdate,
  onSelect,
  onContextMenu,
  onStartDrag,
}: YouTubeWidgetProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editUrl, setEditUrl] = useState(object.object_data.videoUrl || '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setEditUrl(object.object_data.videoUrl || '')
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditUrl(e.target.value)
  }

  const handleUrlBlur = () => {
    setIsEditing(false)
    if (editUrl !== object.object_data.videoUrl) {
      const videoId = extractYouTubeId(editUrl)
      onUpdate(object.id, {
        object_data: {
          ...object.object_data,
          videoUrl: editUrl,
          videoId: videoId,
          title: videoId ? `Video ${videoId}` : 'Invalid URL',
        },
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUrlBlur()
    }
    if (e.key === 'Escape') {
      setIsEditing(false)
      setEditUrl(object.object_data.videoUrl || '')
    }
  }

  const videoId = object.object_data.videoId

  return (
    <WidgetWrapper
      isSelected={isSelected}
      lockAspectRatio={true}
      minHeight={158}
      minWidth={280}
      object={object}
      onContextMenu={onContextMenu}
      onSelect={onSelect}
      onStartDrag={onStartDrag}
      onUpdate={onUpdate}
      zoom={zoom}
    >
      <div
        className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden"
        onDoubleClick={handleDoubleClick}
      >
        {/* Drag handle header */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-red-600/90 backdrop-blur-sm cursor-move flex items-center px-2 z-10">
          <div className="flex gap-0.5">
            <div className="w-1 h-3 bg-white/60 rounded-full"></div>
            <div className="w-1 h-3 bg-white/60 rounded-full"></div>
            <div className="w-1 h-3 bg-white/60 rounded-full"></div>
          </div>
          {videoId && (
            <span className="ml-2 text-xs text-white/80 font-medium truncate">
              {object.object_data.title || 'YouTube Video'}
            </span>
          )}
        </div>

        {/* Content area */}
        <div className="w-full h-full pt-6">
          {isEditing ? (
            <div className="w-full h-full flex items-center justify-center p-4 bg-gray-800">
              <input
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-teal-400 focus:outline-none text-sm"
                onBlur={handleUrlBlur}
                onChange={handleUrlChange}
                onKeyDown={handleKeyDown}
                placeholder="Paste YouTube URL (e.g., https://youtube.com/watch?v=...)"
                ref={inputRef}
                type="text"
                value={editUrl}
              />
            </div>
          ) : videoId ? (
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
              frameBorder="0"
              height="100%"
              src={`https://www.youtube.com/embed/${videoId}`}
              title={object.object_data.title || 'YouTube video player'}
              width="100%"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-800">
              <div className="text-6xl mb-4">📺</div>
              <p className="text-sm mb-1">No video loaded</p>
              <p className="text-xs text-gray-500">
                Double-click to add YouTube URL
              </p>
            </div>
          )}
        </div>
      </div>
    </WidgetWrapper>
  )
}
