import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import type { DrawingObjectType } from 'lib/types/canvas'

/**
 * Canvas tool type - all drawing tools plus the select tool
 */
export type CanvasTool = DrawingObjectType | 'select'

/**
 * Global tool context value
 * Provides the current tool selection that persists across all tabs
 */
interface GlobalToolContextValue {
  currentTool: CanvasTool
  setTool: (tool: CanvasTool) => void
  isSelectMode: boolean
}

/**
 * Global tool context - undefined when not wrapped in provider
 */
const GlobalToolContext = createContext<GlobalToolContextValue | undefined>(
  undefined
)

/**
 * Props for GlobalToolProvider
 */
interface GlobalToolProviderProps {
  children: ReactNode
  initialTool?: CanvasTool
}

/**
 * Global tool provider component
 * Wraps the app to provide global tool state that persists across tabs
 *
 * @example
 * ```tsx
 * <GlobalToolProvider initialTool="select">
 *   <App />
 * </GlobalToolProvider>
 * ```
 */
export function GlobalToolProvider({
  children,
  initialTool = 'select',
}: GlobalToolProviderProps) {
  const [currentTool, setCurrentTool] = useState<CanvasTool>(initialTool)

  const setTool = useCallback((tool: CanvasTool) => {
    setCurrentTool(tool)
  }, [])

  const isSelectMode = currentTool === 'select'

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      currentTool,
      setTool,
      isSelectMode,
    }),
    [currentTool, setTool, isSelectMode]
  )

  return (
    <GlobalToolContext.Provider value={value}>
      {children}
    </GlobalToolContext.Provider>
  )
}

/**
 * Hook to access global tool state
 * Must be used within a GlobalToolProvider
 *
 * @throws Error if used outside of GlobalToolProvider
 *
 * @example
 * ```tsx
 * const { currentTool, setTool, isSelectMode } = useGlobalTool()
 *
 * <button onClick={() => setTool('freehand')}>
 *   {currentTool === 'freehand' ? '✓ ' : ''}Pen Tool
 * </button>
 * ```
 */
export function useGlobalTool(): GlobalToolContextValue {
  const context = useContext(GlobalToolContext)
  if (context === undefined) {
    throw new Error('useGlobalTool must be used within a GlobalToolProvider')
  }
  return context
}
