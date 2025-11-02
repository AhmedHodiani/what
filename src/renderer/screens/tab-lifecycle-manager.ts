import { useCallback } from 'react'
import { type Model, Actions } from 'flexlayout-react'
import { logger } from 'shared/logger'

/**
 * Tab types that can have parent-child relationships
 */
interface ExternalTab {
  id: string
  parentTabId?: string
  objectId?: string
  widgetType?: string
}

/**
 * Tab Lifecycle Manager
 *
 * Manages the lifecycle of external tabs (spreadsheet, external-web, etc.)
 * Handles:
 * - Closing child tabs when parent closes
 * - Closing tabs when widget is deleted
 * - Cleanup and state management
 *
 * Replaces unsafe global window functions with proper React patterns
 */
export function useTabLifecycle(
  model: Model,
  tabs: ExternalTab[],
  setTabs: React.Dispatch<React.SetStateAction<any[]>>
) {
  /**
   * Close all child tabs when a parent canvas tab closes
   */
  const handleParentClose = useCallback(
    (parentTabId: string) => {
      const childTabs = tabs.filter(t => t.parentTabId === parentTabId)

      if (childTabs.length === 0) return []

      logger.debug('🗑️ Closing child tabs for parent:', {
        parentTabId,
        childCount: childTabs.length,
        childIds: childTabs.map(t => t.id),
      })

      // Close each child tab in FlexLayout
      childTabs.forEach(childTab => {
        const node = model.getNodeById(childTab.id)
        if (node) {
          model.doAction(Actions.deleteTab(childTab.id))
        }
      })

      // Remove from state
      setTabs(prevTabs =>
        prevTabs.filter(t => !childTabs.some(child => child.id === t.id))
      )

      return childTabs.map(t => t.id)
    },
    [tabs, model, setTabs]
  )

  /**
   * Close tab when its widget is deleted from canvas
   * Returns true if a tab was closed
   */
  const handleWidgetDelete = useCallback(
    (objectId: string, parentTabId: string) => {
      const tabToClose = tabs.find(
        t => t.objectId === objectId && t.parentTabId === parentTabId
      )

      if (!tabToClose) return false

      logger.debug('🗑️ Closing tab (widget deleted):', {
        objectId,
        tabId: tabToClose.id,
        widgetType: tabToClose.widgetType,
      })

      // Close in FlexLayout
      const node = model.getNodeById(tabToClose.id)
      if (node) {
        model.doAction(Actions.deleteTab(tabToClose.id))
      }

      // Remove from state
      setTabs(prevTabs => prevTabs.filter(t => t.id !== tabToClose.id))

      return true
    },
    [tabs, model, setTabs]
  )

  /**
   * Focus an existing tab if it's already open
   * Returns true if tab was found and focused
   */
  const focusExistingTab = useCallback(
    (tabId: string) => {
      const existingNode = model.getNodeById(tabId)
      if (existingNode) {
        model.doAction(Actions.selectTab(tabId))
        logger.debug('👁️ Focused existing tab:', tabId)
        return true
      }
      return false
    },
    [model]
  )

  return {
    handleParentClose,
    handleWidgetDelete,
    focusExistingTab,
  }
}
