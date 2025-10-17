import { useState, useCallback } from 'react'
import type { DrawingObjectType } from 'lib/types/canvas'
import { useShortcut, ShortcutContext } from 'renderer/shortcuts'

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

  // Tool shortcuts - migrated to KRS
  useShortcut({
    key: 'v',
    context: ShortcutContext.Tool,
    action: () => setTool('select'),
    description: 'Select tool',
  }, [setTool])

  useShortcut({
    key: 'escape',
    context: ShortcutContext.Tool,
    action: () => setTool('select'),
    description: 'Select tool (cancel)',
  }, [setTool])

  useShortcut({
    key: 's',
    context: ShortcutContext.Tool,
    action: () => setTool('sticky-note'),
    description: 'Sticky note tool',
  }, [setTool])

  useShortcut({
    key: 't',
    context: ShortcutContext.Tool,
    action: () => setTool('text'),
    description: 'Text tool',
  }, [setTool])

  useShortcut({
    key: 'r',
    context: ShortcutContext.Tool,
    action: () => setTool('shape'),
    description: 'Shape tool',
  }, [setTool])

  useShortcut({
    key: 'p',
    context: ShortcutContext.Tool,
    action: () => setTool('freehand'),
    description: 'Pen/Freehand tool',
  }, [setTool])

  useShortcut({
    key: 'a',
    context: ShortcutContext.Tool,
    action: () => setTool('arrow'),
    description: 'Arrow tool',
  }, [setTool])

  useShortcut({
    key: 'i',
    context: ShortcutContext.Tool,
    action: () => setTool('image'),
    description: 'Image tool',
  }, [setTool])

  useShortcut({
    key: 'y',
    context: ShortcutContext.Tool,
    action: () => setTool('youtube'),
    description: 'YouTube tool',
  }, [setTool])

  useShortcut({
    key: 'e',
    context: ShortcutContext.Tool,
    action: () => setTool('emoji'),
    description: 'Emoji tool',
  }, [setTool])

  return {
    currentTool,
    setTool,
    isSelectMode: currentTool === 'select',
  }
}
