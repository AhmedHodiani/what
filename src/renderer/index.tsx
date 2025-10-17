import ReactDom from 'react-dom/client'
import { useEffect } from 'react'

import { AppRoutes } from './routes'
import { ShortcutsProvider } from './shortcuts'
import { registerAllShortcuts } from './shortcuts/register-all'
import { ShortcutsHelpPanel, useShortcutsHelp } from './shortcuts/ShortcutsHelpPanel'

import './globals.css'

// Register system-wide shortcuts (Ctrl+S, Ctrl+Z, etc.)
registerAllShortcuts()

/**
 * App wrapper with shortcuts help panel
 */
function AppWithShortcuts() {
  const { isOpen, toggle, close } = useShortcutsHelp()

  // Listen for custom event from shortcuts
  useEffect(() => {
    const handleToggleHelp = () => toggle()
    window.addEventListener('shortcuts:toggle-help', handleToggleHelp)
    return () => window.removeEventListener('shortcuts:toggle-help', handleToggleHelp)
  }, [toggle])

  // Close help panel with Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        close()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, close])

  return (
    <ShortcutsProvider>
      <AppRoutes />
      <ShortcutsHelpPanel isOpen={isOpen} onClose={close} />
    </ShortcutsProvider>
  )
}

ReactDom.createRoot(document.querySelector('app') as HTMLElement).render(
  <AppWithShortcuts />
)
