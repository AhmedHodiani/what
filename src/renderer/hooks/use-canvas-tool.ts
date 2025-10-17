import { useCallback } from 'react'
import { useGlobalTool, type CanvasTool } from 'renderer/contexts'

interface UseCanvasToolOptions {
  onToolChange?: (tool: CanvasTool) => void
}

/**
 * Hook for managing canvas tool selection.
 * Now uses global tool context - tool selection persists across tabs!
 *
 * NOTE: Tool shortcuts are registered centrally in tool-shortcuts.ts
 * and activated in GlobalPanelsLayout. Do NOT register shortcuts here.
 *
 * @example
 * ```tsx
 * const { currentTool, setTool } = useCanvasTool()
 *
 * <CanvasToolbar selectedTool={currentTool} onToolSelect={setTool} />
 * ```
 */
export function useCanvasTool(options: UseCanvasToolOptions = {}) {
  const { onToolChange } = options
  const { currentTool, setTool: setGlobalTool, isSelectMode } = useGlobalTool()

  const setTool = useCallback(
    (tool: CanvasTool) => {
      setGlobalTool(tool)
      onToolChange?.(tool)
    },
    [setGlobalTool, onToolChange]
  )

  return {
    currentTool,
    setTool,
    isSelectMode,
  }
}

// Re-export CanvasTool type for convenience
export type { CanvasTool }
