interface ExternalUrlDialogProps {
  url: string
  mediaType: 'image' | 'audio' | 'video'
  onUrlChange: (url: string) => void
  onMediaTypeChange: (type: 'image' | 'audio' | 'video') => void
  onCancel: () => void
  onInsert: () => void
}

export function ExternalUrlDialog({
  url,
  mediaType,
  onUrlChange,
  onMediaTypeChange,
  onCancel,
  onInsert,
}: ExternalUrlDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg border border-purple-400/30 p-6 w-full max-w-md">
        <h3 className="text-xl font-bold text-purple-400 mb-4">Insert External Media URL</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Media Type</label>
            <div className="flex gap-2">
              <button
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  mediaType === 'image'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
                onClick={() => onMediaTypeChange('image')}
              >
                Image
              </button>
              <button
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  mediaType === 'audio'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
                onClick={() => onMediaTypeChange('audio')}
              >
                Audio
              </button>
              <button
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  mediaType === 'video'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
                onClick={() => onMediaTypeChange('video')}
              >
                Video
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">URL</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
              placeholder="https://example.com/media.jpg"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onInsert()
                } else if (e.key === 'Escape') {
                  onCancel()
                }
              }}
              autoFocus
            />
          </div>
          
          <div className="flex gap-3 justify-end">
            <button
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
              onClick={onInsert}
            >
              Insert
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
