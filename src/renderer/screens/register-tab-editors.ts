/**
 * Register all tab editor components
 *
 * This must be imported early in the app initialization
 * so that tab editors are available when tabs are opened
 */

import { tabEditorRegistry } from './tab-editor-registry'
import { SpreadsheetEditor } from './spreadsheet-editor'
import { ExternalWebEditor } from './external-web-editor'

export function registerAllTabEditors(): void {
  // Register spreadsheet editor
  tabEditorRegistry.register('spreadsheet', SpreadsheetEditor, {
    description: 'Full-featured spreadsheet editor powered by Univer',
  })

  // Register external web editor
  tabEditorRegistry.register('external-web', ExternalWebEditor, {
    description: 'Embedded website viewer with webview',
  })

  // Future editors can be registered here:
  // tabEditorRegistry.register('image-viewer', ImageViewerEditor)
  // tabEditorRegistry.register('pdf-viewer', PdfViewerEditor)
  // tabEditorRegistry.register('code-editor', CodeEditor)
}

// Auto-register on import
registerAllTabEditors()
