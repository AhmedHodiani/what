import { useRef, useEffect } from 'react'
import { logger } from 'shared/logger'

interface ExternalWebEditorProps {
  objectId: string
  parentTabId: string
  title: string
  url: string
}

/**
 * ExternalWebEditor - Full-screen external website viewer using webview
 * 
 * Opened when user clicks an external-web widget on the canvas
 * Displays the external URL in an embedded webview
 */
export function ExternalWebEditor({
  objectId,
  parentTabId: _parentTabId,
  title,
  url,
}: ExternalWebEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const webviewRef = useRef<Electron.WebviewTag | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    logger.debug('🌐 Initializing external webview:', { url, title })

    // Create webview element
    const webview = document.createElement('webview') as Electron.WebviewTag
    webview.src = url
    webview.style.width = '100%'
    webview.style.height = '100%'
    webview.style.border = 'none'
    webview.style.display = 'flex'
    
    // Security settings - partition isolates storage
    webview.partition = `persist:external-web-${objectId}`
    
    // Allow necessary features
    webview.allowpopups = true
    
    // Set user agent to avoid detection as embedded content
    webview.useragent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    
    // Event handlers
    webview.addEventListener('did-start-loading', () => {
      logger.debug('🌐 Webview started loading:', url)
    })

    webview.addEventListener('did-finish-load', () => {
      logger.debug('🌐 Webview finished loading:', url)
    })

    webview.addEventListener('did-fail-load', (event: any) => {
      logger.error('🌐 Webview failed to load:', {
        url,
        errorCode: event.errorCode,
        errorDescription: event.errorDescription,
      })
      
      // Log error details (error -3 is ERR_ABORTED, which is normal for user navigation)
      if (event.errorCode !== -3) {
        logger.error('🌐 Website loading error:', {
          url,
          code: event.errorCode,
          description: event.errorDescription,
        })
      }
    })

    webview.addEventListener('new-window', (event: any) => {
      logger.debug('🌐 New window requested:', event.url)
      // Open external links in default browser using Electron shell
      // Note: shell API might not be available in renderer, so we use electron's shell directly
      const { shell } = require('electron')
      shell.openExternal(event.url)
    })

    // Add to DOM
    containerRef.current.appendChild(webview)
    webviewRef.current = webview

    // Cleanup
    return () => {
      logger.debug('🌐 Cleaning up webview')
      if (containerRef.current && webviewRef.current) {
        containerRef.current.removeChild(webviewRef.current)
      }
      webviewRef.current = null
    }
  }, [url, objectId, title])

  // Allow system shortcuts (Ctrl+Tab, etc.) to work even when webview is focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if this is a re-dispatched event (avoid infinite loop)
      if ((e as any).__fromExternalWeb) {
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
        logger.debug('📌 System shortcut detected in webview - re-dispatching:', {
          key: e.key,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
        })
        
        // Stop webview from seeing this event
        e.stopImmediatePropagation()
        e.preventDefault()
        
        // Re-dispatch to document
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
        
        // Mark as re-dispatched
        ;(newEvent as any).__fromExternalWeb = true
        document.dispatchEvent(newEvent)
      }
    }

    // Use capture phase to intercept before webview
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [])

  return (
    <div className="w-full h-full bg-gray-100 overflow-hidden" style={{ position: 'relative', zIndex: 50 }}>
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
