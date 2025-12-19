import { useCallback } from 'react'
import type { DrawingObject, DrawingObjectType } from 'lib/types/canvas'
import { widgetRegistry } from '../components/canvas/widgets/widget-registry'
import { logger } from 'shared/logger'

/**
 * Hook for accessing and using widget capabilities
 *
 * This hook provides a composable way for widgets to use their registered capabilities.
 * Widgets can call this hook to get capability-specific handlers and state.
 *
 * Example:
 * ```tsx
 * const { hasExternalTab, handleExternalTabOpen } = useWidgetCapabilities('image', object, tabId)
 *
 * return (
 *   <div onDoubleClick={hasExternalTab ? handleExternalTabOpen : undefined}>
 *     {content}
 *   </div>
 * )
 * ```
 */
export function useWidgetCapabilities(
  widgetType: DrawingObjectType,
  object: DrawingObject,
  tabId?: string | null
) {
  const capabilities = widgetRegistry.getCapabilities(widgetType)

  // External Tab Capability Handler
  const handleExternalTabOpen = useCallback(
    async (e: React.MouseEvent) => {
      const externalTabCap = capabilities?.externalTab

      if (!externalTabCap?.enabled) {
        logger.warn(
          `Widget ${widgetType} does not have external tab capability enabled`
        )
        return
      }

      if (!tabId) {
        logger.error('❌ Cannot open external tab: no parent tabId available')
        return
      }

      e.stopPropagation()

      // Determine split view mode based on Ctrl key
      // Regular double-click = full tab (100%)
      // Ctrl+Double-click = split view (50%)
      const splitView = e.ctrlKey

      try {
        // Get widget-specific config
        const config = await externalTabCap.getTabConfig(object, tabId)

        if (!config) {
          return
        }

        // Get tab title (use capability function or fallback to object data)
        const title = externalTabCap.tabTitle
          ? externalTabCap.tabTitle(object)
          : (object.object_data as any)?.title || `${widgetType} ${object.id}`

        // Open the external tab via IPC
        await window.App.externalTab.open({
          widgetType,
          componentName: externalTabCap.componentName,
          parentTabId: tabId,
          objectId: object.id,
          title,
          splitView,
          icon: externalTabCap.tabIcon,
          config,
        })

        logger.success(`✅ Opened external tab for ${widgetType}:`, {
          objectId: object.id,
          splitView,
          componentName: externalTabCap.componentName,
        })
      } catch (error) {
        logger.error(`Failed to open external tab for ${widgetType}:`, error)
      }
    },
    [capabilities, widgetType, object, tabId]
  )

  return {
    // External Tab
    hasExternalTab: !!capabilities?.externalTab?.enabled,
    handleExternalTabOpen,

    // Future capabilities can be added here:
    // hasContextMenu: !!capabilities?.contextMenu?.enabled,
    // handleContextMenu,
    // hasPropertiesPanel: !!capabilities?.propertiesPanel?.enabled,
    // etc.
  }
}
