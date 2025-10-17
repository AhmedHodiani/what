/**
 * Panel Registration - Import and register all properties panels
 *
 * This file automatically registers all available properties panels with the registry.
 * Import this file once at app startup to ensure all panels are available.
 *
 * To add a new panel:
 * 1. Create your panel component (e.g., my-panel.tsx)
 * 2. Import it here
 * 3. Call panelRegistry.register()
 *
 * That's it! No need to touch the container anymore.
 */

import { panelRegistry } from './panel-registry'

// Import all panel components
import { StickyNotePanel } from './sticky-note-panel'
import { TextPanel } from './text-panel'
import { ShapePanel } from './shape-panel'
import { BrushPanel } from './brush-panel'
import { EmojiPanel } from './emoji-panel'

/**
 * Register all properties panels with the registry
 * This runs at module load time, ensuring panels are available immediately
 */
export function registerAllPanels(): void {
  // Sticky note panel
  panelRegistry.register('sticky-note', StickyNotePanel, {
    displayName: 'Sticky Note Properties',
  })

  // Text panel
  panelRegistry.register('text', TextPanel, {
    displayName: 'Text Properties',
  })

  // Shape panel
  panelRegistry.register('shape', ShapePanel, {
    displayName: 'Shape Properties',
  })

  // Freehand drawing panel
  panelRegistry.register('freehand', BrushPanel, {
    displayName: 'Brush Properties',
  })

  // Arrow drawing panel (uses same BrushPanel)
  panelRegistry.register('arrow', BrushPanel, {
    displayName: 'Arrow Properties',
  })

  // Emoji panel
  panelRegistry.register('emoji', EmojiPanel, {
    displayName: 'Emoji Selector',
  })

  // Note: Arrow and YouTube widgets don't have properties panels yet
  // Add them here when created:
  // panelRegistry.register('arrow', ArrowPanel)
  // panelRegistry.register('youtube', YouTubePanel)
}

// Auto-register on import (runs immediately when this module is loaded)
registerAllPanels()
