import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import type { Viewport, DrawingObject } from 'lib/types/canvas'

/**
 * Brush settings for drawing tools (per-tab)
 */
export interface BrushSettings {
  strokeColor: string
  strokeWidth: number
  opacity: number
}

/**
 * Data from the currently active tab
 */
export interface ActiveTabData {
  tabId: string | null
  viewport: Viewport | null
  selectedObjectIds: string[]
  objects: DrawingObject[]
  brushSettings: BrushSettings
}

/**
 * Active tab context value
 * Provides data from the currently active tab (viewport, selection, objects)
 * Panels read from this context to display active tab's data
 */
interface ActiveTabContextValue extends ActiveTabData {
  updateActiveTab: (data: Partial<ActiveTabData>) => void
}

/**
 * Active tab context - undefined when not wrapped in provider
 */
const ActiveTabContext = createContext<ActiveTabContextValue | undefined>(
  undefined
)

/**
 * Props for ActiveTabProvider
 */
interface ActiveTabProviderProps {
  children: ReactNode
}

/**
 * Active tab provider component
 * Tracks the currently active tab's data (viewport, selection, objects)
 * Global panels read from this context to show active tab's state
 *
 * @example
 * ```tsx
 * <ActiveTabProvider>
 *   <App />
 * </ActiveTabProvider>
 * ```
 */
export function ActiveTabProvider({ children }: ActiveTabProviderProps) {
  const [activeTabData, setActiveTabData] = useState<ActiveTabData>({
    tabId: null,
    viewport: null,
    selectedObjectIds: [],
    objects: [],
    brushSettings: {
      strokeColor: '#FFFFFF',
      strokeWidth: 15,
      opacity: 1,
    },
  })

  const updateActiveTab = useCallback((data: Partial<ActiveTabData>) => {
    setActiveTabData(prev => ({
      ...prev,
      ...data,
    }))
  }, [])

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      ...activeTabData,
      updateActiveTab,
    }),
    [activeTabData, updateActiveTab]
  )

  return (
    <ActiveTabContext.Provider value={value}>
      {children}
    </ActiveTabContext.Provider>
  )
}

/**
 * Hook to access active tab data
 * Must be used within an ActiveTabProvider
 *
 * @throws Error if used outside of ActiveTabProvider
 *
 * @example
 * ```tsx
 * const { tabId, viewport, selectedObjectIds, objects, updateActiveTab } = useActiveTab()
 *
 * // Update viewport when user pans/zooms
 * updateActiveTab({ viewport: { x: 100, y: 200, zoom: 1.5 } })
 *
 * // Update selection when user selects objects
 * updateActiveTab({ selectedObjectIds: ['obj1', 'obj2'] })
 * ```
 */
export function useActiveTab(): ActiveTabContextValue {
  const context = useContext(ActiveTabContext)
  if (context === undefined) {
    throw new Error('useActiveTab must be used within an ActiveTabProvider')
  }
  return context
}
