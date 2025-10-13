interface ConfirmationDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'default' | 'danger'
}

/**
 * ConfirmationDialog - Modal dialog for confirming destructive actions
 * 
 * Features:
 * - Danger variant (red) for destructive actions
 * - Keyboard support (Enter/Escape)
 * - Backdrop click to cancel
 */
export function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmationDialogProps) {
  if (!isOpen) return null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onConfirm()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000]"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-black/90 rounded-lg shadow-2xl border border-teal-400/30 p-6 w-[400px] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4">
          <h2
            className={`text-xl font-semibold ${
              variant === 'danger' ? 'text-red-400' : 'text-teal-400'
            }`}
          >
            {title}
          </h2>
        </div>

        {/* Message */}
        <div className="mb-6">
          <p className="text-gray-300 text-sm leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors border border-gray-600"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-teal-600 hover:bg-teal-500 text-white'
            }`}
          >
            {confirmText}
          </button>
        </div>

        {/* Keyboard hints */}
        <div className="flex gap-4 mt-4 pt-4 border-t border-teal-400/20 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-black/50 border border-teal-400/30 rounded text-teal-400">
              Enter
            </kbd>
            <span>Confirm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-black/50 border border-teal-400/30 rounded text-teal-400">
              Esc
            </kbd>
            <span>Cancel</span>
          </div>
        </div>
      </div>
    </div>
  )
}
