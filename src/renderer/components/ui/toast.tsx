import { useEffect, useState } from 'react'
import { cn } from 'renderer/lib/utils'

interface ToastProps {
  message: string
  type?: 'info' | 'error' | 'success'
  duration?: number
  onClose: () => void
}

/**
 * Simple toast notification component
 */
export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-[9999] rounded-lg px-4 py-3 shadow-lg',
        'animate-in slide-in-from-bottom-5 fade-in',
        'border flex items-center gap-2',
        {
          'bg-blue-500/90 text-white border-blue-600': type === 'info',
          'bg-red-500/90 text-white border-red-600': type === 'error',
          'bg-green-500/90 text-white border-green-600': type === 'success',
        }
      )}
    >
      <span className="text-sm font-medium">{message}</span>
      <button
        className="ml-2 text-white/80 hover:text-white"
        onClick={onClose}
        type="button"
      >
        ✕
      </button>
    </div>
  )
}

/**
 * Toast manager hook
 */
export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'info' | 'error' | 'success' }>>([])

  const show = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const id = `toast-${Date.now()}`
    setToasts(prev => [...prev, { id, message, type }])
  }

  const remove = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return {
    toasts,
    show,
    remove,
  }
}
