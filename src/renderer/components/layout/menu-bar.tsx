import { useState, useEffect } from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'

interface MenuBarProps {
  onMenuClick?: (menu: string) => void
}

export function MenuBar({ onMenuClick }: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    // Get initial maximize state
    window.App.window.isMaximized().then(setIsMaximized)

    // Listen for maximize changes
    window.App.window.onMaximizeChange(setIsMaximized)
  }, [])

  const menus = [
    { id: 'file', label: 'File' },
    { id: 'edit', label: 'Edit' },
    { id: 'view', label: 'View' },
    { id: 'select', label: 'Select' },
    { id: 'layer', label: 'Layer' },
    { id: 'window', label: 'Window' },
    { id: 'help', label: 'Help' },
  ]

  const handleMenuClick = (menuId: string) => {
    setActiveMenu(activeMenu === menuId ? null : menuId)
    onMenuClick?.(menuId)
  }

  const handleMinimize = () => {
    window.App.window.minimize()
  }

  const handleMaximize = () => {
    window.App.window.maximize()
  }

  const handleClose = () => {
    window.App.window.close()
  }

  return (
    <div className="h-8 bg-[#1e1e1e] border-b border-[#2d2d2d] flex items-center select-none">
      {/* Draggable area for window movement */}
      <div className="flex-1 flex items-center app-drag-region">
        {/* App Title */}
        <div className="text-xs font-semibold text-gray-400 px-3 mr-2">
          What
        </div>

        {/* Menu Items */}
        <div className="flex app-no-drag">
          {menus.map(menu => (
            <button
              key={menu.id}
              onClick={() => handleMenuClick(menu.id)}
              className={`
                px-3 h-8 text-xs text-gray-300 hover:bg-[#2d2d2d] 
                transition-colors flex items-center
                ${activeMenu === menu.id ? 'bg-[#2d2d2d]' : ''}
              `}
            >
              {menu.label}
            </button>
          ))}
        </div>
      </div>

      {/* Window Controls */}
      <div className="flex h-full app-no-drag">
        <button
          onClick={handleMinimize}
          className="w-12 h-full flex items-center justify-center text-gray-400 hover:bg-[#2d2d2d] transition-colors"
          title="Minimize"
        >
          <Minus className="size-4" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-12 h-full flex items-center justify-center text-gray-400 hover:bg-[#2d2d2d] transition-colors"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <Copy className="size-3.5" />
          ) : (
            <Square className="size-3.5" />
          )}
        </button>
        <button
          onClick={handleClose}
          className="w-12 h-full flex items-center justify-center text-gray-400 hover:bg-red-600 hover:text-white transition-colors"
          title="Close"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
