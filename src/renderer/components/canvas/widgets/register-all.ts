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
import { FileWidget } from './file-widget'
import { SpreadsheetWidget } from './spreadsheet-widget'
import { ExternalWebWidget } from './external-web-widget'

/**
 * Register all widgets with the registry
 * This runs at module load time, ensuring widgets are available immediately
 */
export function registerAllWidgets(): void {
  // Image widget
  widgetRegistry.register('image', ImageWidget, {
    displayName: 'Image',
    description: 'Display images with resize, crop, and transform capabilities',
    capabilities: {
      externalTab: {
        enabled: true,
        componentName: 'image',
        async getTabConfig(object, tabId) {
          const imageObject = object as { id: string; object_data: { assetId: string } }
          return {
            title: 'Image Viewer',
            objectId: imageObject.id,
            parentTabId: tabId,
            assetId: imageObject.object_data.assetId,
          }
        },
        tabTitle: () => 'Image',
      },
    },
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

  // File widget
  widgetRegistry.register('file', FileWidget, {
    displayName: 'File',
    description: 'Generic file attachment with download capability',
    capabilities: {
      externalTab: {
        enabled: true,
        componentName: 'file',
        async getTabConfig(object, tabId) {
          const fileObject = object as {
            id: string
            object_data: {
              assetId: string
              fileName: string
              mimeType: string
              fileSize: number
            }
          }

          const { assetId, fileName, mimeType } = fileObject.object_data

          // Only open external tab for viewable file types
          const isViewable =
            mimeType.startsWith('video/') ||
            mimeType.startsWith('audio/') ||
            mimeType.startsWith('text/') ||
            mimeType.includes('pdf')

          if (!isViewable) {
            return null // Will prevent tab from opening
          }

          return {
            title: fileName,
            objectId: fileObject.id,
            parentTabId: tabId,
            assetId,
            fileName,
            mimeType,
          }
        },
        tabTitle: () => 'File',
      },
    },
  })

  // Spreadsheet widget
  widgetRegistry.register('spreadsheet', SpreadsheetWidget, {
    displayName: 'Spreadsheet',
    description: 'Full-featured spreadsheet with formulas (powered by Univer)',
    capabilities: {
      externalTab: {
        enabled: true,
        componentName: 'SpreadsheetEditor',
        getTabConfig: async (object, tabId) => {
          // Reload from database to get latest assetId
          const objects = await window.App.file.getObjects(tabId)
          const freshObject = objects.find((obj: any) => obj.id === object.id)
          const assetId = freshObject?.object_data?.assetId

          return {
            type: 'spreadsheet',
            objectId: object.id,
            parentTabId: tabId,
            title: (object.object_data as any).title || 'Spreadsheet',
            assetId,
          }
        },
        tabTitle: object => (object.object_data as any).title || 'Spreadsheet',
        tabIcon: 'sheet',
      },
    },
  })

  // External Web widget
  widgetRegistry.register('external-web', ExternalWebWidget, {
    displayName: 'External Website',
    description: 'Embed external websites with split view or full tab',
    capabilities: {
      externalTab: {
        enabled: true,
        componentName: 'ExternalWebEditor',
        getTabConfig: async (object, tabId) => {
          // Reload from database to get latest data
          const objects = await window.App.file.getObjects(tabId)
          const freshObject = objects.find((obj: any) => obj.id === object.id)
          const url = (freshObject?.object_data as any)?.url
          const name = (freshObject?.object_data as any)?.name

          return {
            type: 'external-web',
            objectId: object.id,
            parentTabId: tabId,
            title: name || new URL(url).hostname,
            url,
          }
        },
        tabTitle: object => {
          try {
            return (
              (object.object_data as any).name ||
              new URL((object.object_data as any).url).hostname
            )
          } catch {
            return 'External Website'
          }
        },
        tabIcon: 'globe',
      },
    },
  })
}

// Auto-register on import (runs immediately when this module is loaded)
registerAllWidgets()
