import { useEffect, useState } from 'react'
import { logger } from 'shared/logger'

interface DeckEditorProps {
  tabId: string // FlexLayout tab ID (passed from factory)
  objectId: string
  parentTabId: string
  title: string
  assetId?: string
}

/**
 * DeckEditor - Full-screen deck editor in a dedicated tab
 * 
 * Opened when user clicks a deck widget on the canvas
 * Blank editor for now - will be populated with flashcard functionality later
 */
export function DeckEditor({
  tabId,
  objectId,
  parentTabId,
  title,
  assetId,
}: DeckEditorProps) {
  const [isDirty] = useState(false)

  // Update tab name with dirty indicator
  useEffect(() => {
    const dirtyIndicator = isDirty ? '● ' : ''
    const newName = `${dirtyIndicator}${title}`
    
    // Notify main-with-tabs to update the tab name
    if (window.__updateTabName) {
      window.__updateTabName(tabId, newName)
    }
  }, [isDirty, title, tabId])

  // Allow system shortcuts (Ctrl+Tab, etc.) to work even when editor is focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if this is a re-dispatched event from us (avoid infinite loop)
      if ((e as any).__fromDeck) {
        return
      }
      
      // System shortcuts that should always work
      const isSystemShortcut = 
        (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) ||     // Ctrl+Tab (next tab)
        (e.ctrlKey && e.shiftKey && e.key === 'Tab') ||      // Ctrl+Shift+Tab (prev tab)
        (e.ctrlKey && e.key === 's') ||                       // Ctrl+S (save)
        (e.ctrlKey && e.key === 'n') ||                       // Ctrl+N (new)
        (e.ctrlKey && e.key === 'o') ||                       // Ctrl+O (open)
        (e.ctrlKey && e.key === 'w')                          // Ctrl+W (close)
      
      if (isSystemShortcut) {
        logger.debug('System shortcut detected in deck editor, re-dispatching:', {
          key: e.key,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
        })
        
        // Stop from seeing this event
        e.stopImmediatePropagation()
        e.preventDefault()
        
        // Re-dispatch the event to document with a marker
        const newEvent = new KeyboardEvent('keydown', {
          key: e.key,
          code: e.code,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          metaKey: e.metaKey,
          bubbles: true,
          cancelable: true,
        })
        
        // Mark this as a re-dispatched event
        ;(newEvent as any).__fromDeck = true
        
        document.dispatchEvent(newEvent)
      }
    }

    // Use capture phase to intercept before other handlers
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [])

  return (
    <div className="w-full h-full bg-linear-to-br from-purple-50 to-indigo-50 flex items-center justify-center" style={{ position: 'relative', zIndex: 50 }}>
      <div className="text-center space-y-4">
        <div className="text-6xl mb-4">🃏</div>
        <h2 className="text-3xl font-bold text-purple-900">{title}</h2>
        <p className="text-gray-600">Deck editor - Coming soon!</p>
        <div className="text-sm text-gray-500 mt-8">
          <p>Object ID: {objectId}</p>
          <p>Parent Tab: {parentTabId}</p>
          {assetId && <p>Asset ID: {assetId}</p>}
        </div>
      </div>
    </div>
  )
}
