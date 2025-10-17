import { useCallback } from 'react'
import { useShortcut, ShortcutContext } from 'renderer/shortcuts'
import { useGlobalTool, type CanvasTool } from 'renderer/contexts'

interface UseCanvasToolOptions {
  onToolChange?: (tool: CanvasTool) => void
}

/**
 * Hook for managing canvas tool selection and keyboard shortcuts.
 * Now uses global tool context - tool selection persists across tabs!
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

  // Tool shortcuts - migrated to KRS
  useShortcut(
    {
      key: 'v',
      context: ShortcutContext.Tool,
      action: () => setTool('select'),
      description: 'Select tool',
    },
    [setTool]
  )

  useShortcut(
    {
      key: 'escape',
      context: ShortcutContext.Tool,
      action: () => setTool('select'),
      description: 'Select tool (cancel)',
    },
    [setTool]
  )

  useShortcut(
    {
      key: 's',
      context: ShortcutContext.Tool,
      action: () => setTool('sticky-note'),
      description: 'Sticky note tool',
    },
    [setTool]
  )

  useShortcut(
    {
      key: 't',
      context: ShortcutContext.Tool,
      action: () => setTool('text'),
      description: 'Text tool',
    },
    [setTool]
  )

  useShortcut(
    {
      key: 'r',
      context: ShortcutContext.Tool,
      action: () => setTool('shape'),
      description: 'Shape tool',
    },
    [setTool]
  )

  useShortcut(
    {
      key: 'p',
      context: ShortcutContext.Tool,
      action: () => setTool('freehand'),
      description: 'Pen/Freehand tool',
    },
    [setTool]
  )

  useShortcut(
    {
      key: 'a',
      context: ShortcutContext.Tool,
      action: () => setTool('arrow'),
      description: 'Arrow tool',
    },
    [setTool]
  )

  useShortcut(
    {
      key: 'i',
      context: ShortcutContext.Tool,
      action: () => setTool('image'),
      description: 'Image tool',
    },
    [setTool]
  )

  useShortcut(
    {
      key: 'y',
      context: ShortcutContext.Tool,
      action: () => setTool('youtube'),
      description: 'YouTube tool',
    },
    [setTool]
  )

  useShortcut(
    {
      key: 'e',
      context: ShortcutContext.Tool,
      action: () => setTool('emoji'),
      description: 'Emoji tool',
    },
    [setTool]
  )

  return {
    currentTool,
    setTool,
    isSelectMode,
  }
}

// Re-export CanvasTool type for convenience
export type { CanvasTool }
