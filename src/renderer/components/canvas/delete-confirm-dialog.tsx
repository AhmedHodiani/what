interface DeleteConfirmDialogProps {
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteConfirmDialog({ onCancel, onConfirm }: DeleteConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-9999"
      onClick={onCancel}
    >
      <div
        className="bg-black/90 rounded-lg shadow-2xl border border-red-400/30 p-6 w-[400px] max-w-[90vw]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl">⚠️</div>
          <h2 className="text-xl font-semibold text-red-400">Delete Card?</h2>
        </div>
        
        <p className="text-gray-300 mb-6">
          Are you sure you want to delete this card? This action cannot be undone.
        </p>
        
        <div className="flex gap-3 justify-end">
          <button
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
            onClick={onConfirm}
          >
            Delete Card
          </button>
        </div>
      </div>
    </div>
  )
}
