import { useEffect, useRef } from 'react'

interface ContextMenuProps {
  x: number
  y: number
  onDelete: () => void
  onDuplicate?: () => void
  onClose: () => void
}

/**
 * ContextMenu - Right-click menu for canvas objects
 *
 * Features:
 * - Delete object
 * - Duplicate object (optional)
 * - Auto-closes on outside click
 * - Keyboard support (Escape)
 */
export function ContextMenu({
  x,
  y,
  onDelete,
  onDuplicate,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div
      className="fixed bg-black/90 backdrop-blur-sm border border-teal-400/30 rounded-lg shadow-2xl py-2 min-w-[160px] z-[9999]"
      ref={menuRef}
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      {onDuplicate && (
        <button
          className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-teal-400/10 hover:text-teal-400 transition-colors flex items-center gap-2"
          onClick={() => {
            onDuplicate()
            onClose()
          }}
          type="button"
        >
          <span>📋</span>
          <span>Duplicate</span>
          <span className="ml-auto text-xs text-gray-500">Ctrl+D</span>
        </button>
      )}

      <button
        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-colors flex items-center gap-2"
        onClick={() => {
          onDelete()
          onClose()
        }}
        type="button"
      >
        <span>🗑️</span>
        <span>Delete</span>
        <span className="ml-auto text-xs text-gray-500">Del</span>
      </button>
    </div>
  )
}
