import { RefObject } from 'react'
import { Eye, Paperclip, Link } from 'lucide-react'

interface AddCardViewProps {
  frontValue: string
  backValue: string
  error: string
  onFrontChange: (value: string) => void
  onBackChange: (value: string) => void
  onFrontFocus: () => void
  onBackFocus: () => void
  onAttachAsset: () => void
  onExternalUrl: () => void
  onAddCard: () => void
  onCancel: () => void
  frontInputRef: RefObject<HTMLTextAreaElement | null>
  assetInputRef: RefObject<HTMLInputElement | null>
  onAssetUpload: (files: FileList | null) => void
  renderMarkdown: (text: string) => React.ReactNode
}

export function AddCardView({
  frontValue,
  backValue,
  error,
  onFrontChange,
  onBackChange,
  onFrontFocus,
  onBackFocus,
  onAttachAsset,
  onExternalUrl,
  onAddCard,
  onCancel,
  frontInputRef,
  assetInputRef,
  onAssetUpload,
  renderMarkdown,
}: AddCardViewProps) {
  return (
    <div className="flex-1 flex gap-6 p-8 overflow-hidden">
      {/* Editor Side */}
      <div className="flex-1 flex flex-col">
        <div className="bg-black/40 border border-purple-400/20 rounded-lg p-6 flex flex-col flex-1">
          <h2 className="text-2xl font-bold text-purple-400 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Card
          </h2>
          
          <div className="space-y-6 flex-1 flex flex-col">
            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Question (Front) - Markdown Supported
              </label>
              <textarea
                className="flex-1 w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all resize-none font-mono text-sm"
                onChange={(e) => {
                  onFrontChange(e.target.value)
                }}
                onFocus={onFrontFocus}
                placeholder="**What** is the capital of France?\n\n- Use *markdown* formatting\n- ==Highlight== text\n- Create `code` blocks"
                ref={frontInputRef}
                value={frontValue}
              />
            </div>
            
            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Answer (Back) - Markdown Supported
              </label>
              <textarea
                className="flex-1 w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all resize-none font-mono text-sm"
                onChange={(e) => {
                  onBackChange(e.target.value)
                }}
                onFocus={onBackFocus}
                placeholder="**Paris** - the capital and largest city of France.\n\n> Located on the Seine River"
                value={backValue}
              />
            </div>
            
            {error && (
              <div className="text-red-400 text-sm flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}
          
            {/* Hidden file input for assets */}
            <input
              ref={assetInputRef}
              type="file"
              accept="image/*,audio/*,video/*"
              className="hidden"
              onChange={(e) => onAssetUpload(e.target.files)}
            />
          
            <div className="flex gap-3">
              <button
                className="px-4 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors flex items-center gap-2"
                onClick={onAttachAsset}
              >
                <Paperclip size={16} />
                Attach Asset
              </button>
              <button
                className="px-4 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors flex items-center gap-2"
                onClick={onExternalUrl}
              >
                <Link size={16} />
                External URL
              </button>
              <button
                className="flex-1 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
                onClick={onAddCard}
              >
                Add Card
              </button>
              <button
                className="px-4 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                onClick={onCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Preview Side */}
      <div className="flex-1 flex flex-col">
        <div className="bg-black/40 border border-purple-400/20 rounded-lg p-6 flex flex-col flex-1">
          <h2 className="text-xl font-bold text-purple-400 mb-6 flex items-center gap-2">
            <Eye size={20} />
            Live Preview
          </h2>
          
          <div className="space-y-6 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
            <div className="flex-1 flex flex-col">
              <div className="text-sm font-medium text-gray-400 mb-3">Question</div>
              <div className="flex-1 bg-gray-900/50 rounded-lg p-4 border border-gray-700 overflow-y-auto custom-scrollbar">
                {frontValue ? (
                  <div className="markdown-content text-white">
                    {renderMarkdown(frontValue)}
                  </div>
                ) : (
                  <div className="text-gray-500 italic">Preview will appear here...</div>
                )}
              </div>
            </div>
            
            <div className="flex-1 flex flex-col">
              <div className="text-sm font-medium text-gray-400 mb-3">Answer</div>
              <div className="flex-1 bg-gray-900/50 rounded-lg p-4 border border-gray-700 overflow-y-auto custom-scrollbar">
                {backValue ? (
                  <div className="markdown-content text-white">
                    {renderMarkdown(backValue)}
                  </div>
                ) : (
                  <div className="text-gray-500 italic">Preview will appear here...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
