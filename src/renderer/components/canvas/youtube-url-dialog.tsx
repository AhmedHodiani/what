import { useState, useRef, useEffect } from 'react'

interface YouTubeUrlDialogProps {
  onConfirm: (url: string, videoId: string) => void
  onCancel: () => void
}

/**
 * YouTubeUrlDialog - Modal dialog for entering YouTube URLs
 * 
 * Features:
 * - URL validation with multiple format support
 * - Real-time error feedback
 * - Keyboard shortcuts (Enter/Escape)
 * - Auto-focus input field
 */
export function YouTubeUrlDialog({ onConfirm, onCancel }: YouTubeUrlDialogProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Extract YouTube video ID from URL
  const extractVideoId = (url: string): string => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match?.[1]) {
        return match[1]
      }
    }
    return ''
  }

  const handleConfirm = () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL')
      return
    }

    const videoId = extractVideoId(url)
    if (!videoId) {
      setError('Invalid YouTube URL. Please use a valid YouTube video link.')
      return
    }

    onConfirm(url, videoId)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value)
    setError('') // Clear error when user types
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]"
      onClick={onCancel}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl border border-gray-700 p-6 w-[500px] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl">📺</div>
          <div>
            <h2 className="text-xl font-semibold text-white">Add YouTube Video</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Paste any YouTube video URL
            </p>
          </div>
        </div>

        {/* Input */}
        <div className="mb-4">
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20 transition-all"
          />
          {error && (
            <p className="text-red-400 text-sm mt-2 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{error}</span>
            </p>
          )}
        </div>

        {/* Supported formats */}
        <div className="mb-6 p-3 bg-gray-900/50 rounded border border-gray-700">
          <p className="text-xs text-gray-400 mb-1.5 font-medium">Supported formats:</p>
          <ul className="text-xs text-gray-500 space-y-0.5">
            <li>• youtube.com/watch?v=VIDEO_ID</li>
            <li>• youtu.be/VIDEO_ID</li>
            <li>• youtube.com/embed/VIDEO_ID</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-medium transition-colors"
          >
            Add Video
          </button>
        </div>

        {/* Keyboard hints */}
        <div className="flex gap-4 mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-gray-900 border border-gray-600 rounded text-gray-400">Enter</kbd>
            <span>Confirm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-gray-900 border border-gray-600 rounded text-gray-400">Esc</kbd>
            <span>Cancel</span>
          </div>
        </div>
      </div>
    </div>
  )
}
