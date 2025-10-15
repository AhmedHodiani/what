import { useState, useCallback, useEffect } from 'react'
import type { DrawingObjectType } from 'lib/types/canvas'

export type CanvasTool = DrawingObjectType | 'select'

interface UseCanvasToolOptions {
  initialTool?: CanvasTool
  onToolChange?: (tool: CanvasTool) => void
}

/**
 * Hook for managing canvas tool selection and keyboard shortcuts.
 *
 * @example
 * ```tsx
 * const { currentTool, setTool } = useCanvasTool()
 *
 * <CanvasToolbar selectedTool={currentTool} onToolSelect={setTool} />
 * ```
 */
export function useCanvasTool(options: UseCanvasToolOptions = {}) {
  const { initialTool = 'select', onToolChange } = options
  const [currentTool, setCurrentTool] = useState<CanvasTool>(initialTool)

  const setTool = useCallback(
    (tool: CanvasTool) => {
      setCurrentTool(tool)
      onToolChange?.(tool)
    },
    [onToolChange]
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      const key = e.key.toLowerCase()

      switch (key) {
        case 'v':
        case 'escape':
          setTool('select')
          break
        case 's':
          setTool('sticky-note')
          break
        case 't':
          setTool('text')
          break
        case 'r':
          setTool('shape')
          break
        case 'p':
          setTool('freehand')
          break
        case 'a':
          setTool('arrow')
          break
        case 'i':
          setTool('image')
          break
        case 'y':
          setTool('youtube')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setTool])

  return {
    currentTool,
    setTool,
    isSelectMode: currentTool === 'select',
  }
}
