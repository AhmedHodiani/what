/**
 * Global contexts for the application
 *
 * These contexts provide global state that persists across tabs:
 * - GlobalToolContext: Current tool selection (pen, select, etc.)
 * - ActiveTabContext: Data from the currently active tab (viewport, selection, etc.)
 */

export {
  GlobalToolProvider,
  useGlobalTool,
  type CanvasTool,
} from './global-tool-context'
export {
  ActiveTabProvider,
  useActiveTab,
  type ActiveTabData,
  type BrushSettings,
} from './active-tab-context'
