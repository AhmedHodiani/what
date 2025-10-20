/**
 * Widget Registration - Import and register all widgets
 *
 * This file automatically registers all available widgets with the registry.
 * Import this file once at app startup to ensure all widgets are available.
 *
 * To add a new widget:
 * 1. Create your widget component (e.g., my-widget.tsx)
 * 2. Import it here
 * 3. Call widgetRegistry.register()
 *
 * That's it! No need to touch canvas-object.tsx anymore.
 */

import { widgetRegistry } from './widget-registry'

// Import all widget components
import { ImageWidget } from './image-widget'
import { StickyNoteWidget } from './sticky-note-widget'
import { FreehandWidget } from './freehand-widget'
import { ArrowWidget } from './arrow-widget'
import { YouTubeWidget } from './youtube-widget'
import { ShapeWidget } from './shape-widget'
import { EmojiWidget } from './emoji-widget'

/**
 * Register all widgets with the registry
 * This runs at module load time, ensuring widgets are available immediately
 */
export function registerAllWidgets(): void {
  // Image widget
  widgetRegistry.register('image', ImageWidget, {
    displayName: 'Image',
    description: 'Display images with resize, crop, and transform capabilities',
  })

  // Sticky note widget
  widgetRegistry.register('sticky-note', StickyNoteWidget, {
    displayName: 'Sticky Note',
    description: 'Colorful sticky notes with editable text',
  })

  // Shape widget
  widgetRegistry.register('shape', ShapeWidget, {
    displayName: 'Shape',
    description: 'Geometric shapes (rectangle, circle, triangle, etc.)',
  })

  // Freehand drawing widget
  widgetRegistry.register('freehand', FreehandWidget, {
    displayName: 'Freehand Drawing',
    description: 'Free-form pen/brush strokes',
  })

  // Arrow widget
  widgetRegistry.register('arrow', ArrowWidget, {
    displayName: 'Arrow',
    description: 'Directional arrows with straight or curved paths',
  })

  // YouTube widget
  widgetRegistry.register('youtube', YouTubeWidget, {
    displayName: 'YouTube Video',
    description: 'Embedded YouTube video player',
  })

  // Emoji widget
  widgetRegistry.register('emoji', EmojiWidget, {
    displayName: 'Emoji',
    description: 'Large emoji symbols from 6 categories',
  })
}

// Auto-register on import (runs immediately when this module is loaded)
registerAllWidgets()
