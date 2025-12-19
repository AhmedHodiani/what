/**
 * Register all tab editor components
 *
 * This must be imported early in the app initialization
 * so that tab editors are available when tabs are opened
 */

import { tabEditorRegistry } from './tab-editor-registry'
import { SpreadsheetEditor } from './spreadsheet-editor'
import { ExternalWebEditor } from './external-web-editor'
import { ImageViewerEditor } from './image-viewer-editor'
import { FileViewerEditor } from './file-viewer-editor'
import { DeckEditor } from './deck-editor'
import { StickyNoteEditor } from './sticky-note-editor'

export function registerAllTabEditors(): void {
  // Register spreadsheet editor
  tabEditorRegistry.register('spreadsheet', SpreadsheetEditor, {
    description: 'Full-featured spreadsheet editor powered by Univer',
  })

  // Register external web editor
  tabEditorRegistry.register('external-web', ExternalWebEditor, {
    description: 'Embedded website viewer with webview',
  })

  // Register image viewer editor
  tabEditorRegistry.register('image', ImageViewerEditor, {
    description: 'Full-screen image viewer with zoom controls',
  })

  // Register file viewer editor
  tabEditorRegistry.register('file', FileViewerEditor, {
    description: 'File viewer for videos, PDFs, and other documents',
  })

  // Register deck editor
  tabEditorRegistry.register('deck', DeckEditor, {
    description: 'Flashcard deck editor for spaced repetition learning',
  })

  // Register sticky note editor
  tabEditorRegistry.register('sticky-note', StickyNoteEditor, {
    description: 'Full-screen sticky note editor',
  })

  // Future editors can be registered here:
  // tabEditorRegistry.register('image-viewer', ImageViewerEditor)
  // tabEditorRegistry.register('pdf-viewer', PdfViewerEditor)
  // tabEditorRegistry.register('code-editor', CodeEditor)
}

// Auto-register on import
registerAllTabEditors()
