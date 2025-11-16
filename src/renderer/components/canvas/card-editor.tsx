import { RefObject } from 'react'
import type { Card } from 'shared/fsrs/types'

interface CardEditorProps {
  card: Card
  frontValue: string
  backValue: string
  error: string
  onFrontChange: (value: string) => void
  onBackChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  frontInputRef: RefObject<HTMLTextAreaElement | null>
}

export function CardEditor({
  frontValue,
  backValue,
  error,
  onFrontChange,
  onBackChange,
  onSave,
  onCancel,
  frontInputRef,
}: CardEditorProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-2">Question (Front) - Markdown Supported</label>
        <textarea
          ref={frontInputRef}
          className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all min-h-20 font-mono text-sm"
          placeholder="What is the question?"
          value={frontValue}
          onChange={e => onFrontChange(e.target.value)}
        />
      </div>
      
      <div>
        <label className="block text-sm text-gray-400 mb-2">Answer (Back) - Markdown Supported</label>
        <textarea
          className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all min-h-20 font-mono text-sm"
          placeholder="What is the answer?"
          value={backValue}
          onChange={e => onBackChange(e.target.value)}
        />
      </div>
      
      {error && (
        <div className="text-red-400 text-sm">{error}</div>
      )}
      
      <div className="flex gap-3 justify-end">
        <button
          className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
          onClick={onSave}
        >
          Save Changes
        </button>
      </div>
    </div>
  )
}
