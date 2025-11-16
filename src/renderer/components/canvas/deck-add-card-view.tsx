import { RefObject, useEffect, useRef } from 'react'
import { Eye, Paperclip, Link, Command } from 'lucide-react'

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
  const backInputRef = useRef<HTMLTextAreaElement>(null)
  
  // Auto-resize textareas
  const autoResize = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.max(120, textarea.scrollHeight)}px`
  }
  
  useEffect(() => {
    autoResize(frontInputRef.current)
  }, [frontValue])
  
  useEffect(() => {
    autoResize(backInputRef.current)
  }, [backValue])
  
  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, isBack: boolean) => {
    // Ctrl+Enter to add card
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault()
      onAddCard()
    }
    // Tab to switch between front and back
    else if (e.key === 'Tab' && !e.shiftKey && !isBack) {
      e.preventDefault()
      backInputRef.current?.focus()
    }
  }
  
  return (
    <div className="flex-1 flex gap-6 p-8 overflow-hidden">
      {/* Editor Side */}
      <div className="flex-1 flex flex-col max-w-3xl">
        <div className="bg-black/40 border border-purple-400/20 rounded-lg p-6 flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-purple-400 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Card
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Command size={12} />
              <span>Ctrl+Enter to save</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Question (Front) - Markdown Supported
              </label>
              <textarea
                className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all resize-none font-mono text-sm leading-relaxed"
                onChange={(e) => {
                  onFrontChange(e.target.value)
                  autoResize(e.target)
                }}
                onFocus={onFrontFocus}
                onKeyDown={(e) => handleKeyDown(e, false)}
                placeholder="Type your question here...&#10;&#10;**Tip:** Use markdown for formatting:&#10;- **bold** with **text**&#10;- *italic* with *text*&#10;- ==highlight== with ==text==&#10;- `code` with `text`"
                ref={frontInputRef}
                value={frontValue}
                style={{ minHeight: '120px' }}
              />
            </div>
            
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Answer (Back) - Markdown Supported
              </label>
              <textarea
                className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all resize-none font-mono text-sm leading-relaxed"
                onChange={(e) => {
                  onBackChange(e.target.value)
                  autoResize(e.target)
                }}
                onFocus={onBackFocus}
                onKeyDown={(e) => handleKeyDown(e, true)}
                placeholder="Type your answer here...&#10;&#10;You can also add:&#10;- Images, audio, video via attachments&#10;- External media via URLs&#10;- Code blocks with ```language"
                ref={backInputRef}
                value={backValue}
                style={{ minHeight: '120px' }}
              />
            </div>
            
            {error && (
              <div className="text-red-400 text-sm flex items-center gap-2 bg-red-400/10 border border-red-400/30 rounded-lg px-4 py-3">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}
          </div>
          
          {/* Hidden file input for assets */}
          <input
            ref={assetInputRef}
            type="file"
            accept="image/*,audio/*,video/*"
            className="hidden"
            onChange={(e) => onAssetUpload(e.target.files)}
          />
          
          <div className="border-t border-gray-700 pt-4 mt-4">
            <div className="flex gap-3">
              <button
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors flex items-center gap-2"
                onClick={onAttachAsset}
                title="Attach image, audio, or video file"
              >
                <Paperclip size={16} />
                Attach
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors flex items-center gap-2"
                onClick={onExternalUrl}
                title="Insert external media URL"
              >
                <Link size={16} />
                URL
              </button>
              <div className="flex-1" />
              <button
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors flex items-center gap-2"
                onClick={onAddCard}
              >
                Add Card
                <span className="text-xs opacity-70">Ctrl+⏎</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Preview Side */}
      <div className="flex-1 flex flex-col max-w-3xl">
        <div className="bg-black/40 border border-purple-400/20 rounded-lg p-6 flex flex-col flex-1 overflow-hidden">
          <h2 className="text-xl font-bold text-purple-400 mb-6 flex items-center gap-2">
            <Eye size={20} />
            Live Preview
          </h2>
          
          <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
            <div className="flex flex-col">
              <div className="text-sm font-medium text-gray-400 mb-3">Question</div>
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 min-h-[120px]">
                {frontValue ? (
                  <div className="markdown-content text-white">
                    {renderMarkdown(frontValue)}
                  </div>
                ) : (
                  <div className="text-gray-500 italic">Preview will appear here...</div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col">
              <div className="text-sm font-medium text-gray-400 mb-3">Answer</div>
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 min-h-[120px]">
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
