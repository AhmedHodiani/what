import { useState, useEffect, useRef } from 'react'
import { Minus, Square, X, Copy, Bug, File, FolderOpen, Save, SaveAll, XCircle, LogOut } from 'lucide-react'

interface MenuBarProps {
  onMenuClick?: (menu: string) => void
  currentFileName?: string | null
  onDebugClick?: () => void
  hasOpenFile?: boolean
}

export function MenuBar({ onMenuClick, currentFileName, onDebugClick, hasOpenFile = false }: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [isMaximized, setIsMaximized] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Get initial maximize state
    window.App.window.isMaximized().then(setIsMaximized)

    // Listen for maximize changes
    window.App.window.onMaximizeChange(setIsMaximized)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null)
      }
    }

    if (activeMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [activeMenu])

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

  const handleFileAction = async (action: string) => {
    setActiveMenu(null)
    
    switch (action) {
      case 'new':
        await window.App.file.new()
        break
      case 'open':
        await window.App.file.open()
        break
      case 'save':
        await window.App.file.save()
        break
      case 'saveAs':
        await window.App.file.saveAs()
        break
      case 'close':
        await window.App.file.close()
        break
      case 'exit':
        window.App.window.close()
        break
    }
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
    <div className="h-8 bg-[#1e1e1e] border-b border-[#2d2d2d] flex items-center select-none" ref={menuRef}>
      {/* Draggable area for window movement */}
      <div className="flex-1 flex items-center app-drag-region">
        {/* App Title */}
        <div className="text-xs font-semibold text-gray-400 px-3 mr-2">
          What
        </div>

        {/* Menu Items */}
        <div className="flex app-no-drag relative">
          {menus.map(menu => (
            <div key={menu.id} className="relative">
              <button
                onClick={() => handleMenuClick(menu.id)}
                className={`
                  px-3 h-8 text-xs text-gray-300 hover:bg-[#2d2d2d] 
                  transition-colors flex items-center
                  ${activeMenu === menu.id ? 'bg-[#2d2d2d]' : ''}
                `}
              >
                {menu.label}
              </button>
              
              {/* File Menu Dropdown */}
              {menu.id === 'file' && activeMenu === 'file' && (
                <div className="absolute top-full left-0 mt-0 w-56 bg-[#252526] border border-[#454545] shadow-lg z-50">
                  <div className="py-1">
                    <button
                      onClick={() => handleFileAction('new')}
                      className="w-full px-4 py-1.5 text-xs text-left text-gray-300 hover:bg-[#2a2d2e] flex items-center gap-3"
                    >
                      <File className="size-3.5" />
                      <span>New File</span>
                      <span className="ml-auto text-gray-500">Ctrl+N</span>
                    </button>
                    <button
                      onClick={() => handleFileAction('open')}
                      className="w-full px-4 py-1.5 text-xs text-left text-gray-300 hover:bg-[#2a2d2e] flex items-center gap-3"
                    >
                      <FolderOpen className="size-3.5" />
                      <span>Open File...</span>
                      <span className="ml-auto text-gray-500">Ctrl+O</span>
                    </button>
                    
                    <div className="h-px bg-[#454545] my-1" />
                    
                    <button
                      onClick={() => handleFileAction('save')}
                      disabled={!hasOpenFile}
                      className={`w-full px-4 py-1.5 text-xs text-left flex items-center gap-3 ${
                        hasOpenFile 
                          ? 'text-gray-300 hover:bg-[#2a2d2e]' 
                          : 'text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      <Save className="size-3.5" />
                      <span>Save</span>
                      <span className="ml-auto text-gray-500">Ctrl+S</span>
                    </button>
                    <button
                      onClick={() => handleFileAction('saveAs')}
                      disabled={!hasOpenFile}
                      className={`w-full px-4 py-1.5 text-xs text-left flex items-center gap-3 ${
                        hasOpenFile 
                          ? 'text-gray-300 hover:bg-[#2a2d2e]' 
                          : 'text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      <SaveAll className="size-3.5" />
                      <span>Save As...</span>
                      <span className="ml-auto text-gray-500">Ctrl+Shift+S</span>
                    </button>
                    
                    <div className="h-px bg-[#454545] my-1" />
                    
                    <button
                      onClick={() => handleFileAction('close')}
                      disabled={!hasOpenFile}
                      className={`w-full px-4 py-1.5 text-xs text-left flex items-center gap-3 ${
                        hasOpenFile 
                          ? 'text-gray-300 hover:bg-[#2a2d2e]' 
                          : 'text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      <XCircle className="size-3.5" />
                      <span>Close File</span>
                      <span className="ml-auto text-gray-500">Ctrl+W</span>
                    </button>
                    
                    <div className="h-px bg-[#454545] my-1" />
                    
                    <button
                      onClick={() => handleFileAction('exit')}
                      className="w-full px-4 py-1.5 text-xs text-left text-gray-300 hover:bg-[#2a2d2e] flex items-center gap-3"
                    >
                      <LogOut className="size-3.5" />
                      <span>Exit</span>
                      <span className="ml-auto text-gray-500">Alt+F4</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Current File Name */}
        {currentFileName && (
          <>
            <div className="ml-4 text-xs text-gray-500">
              {currentFileName}
            </div>
            
            {/* Debug Button */}
            <div className="app-no-drag ml-4">
              <button
                onClick={onDebugClick}
                className="px-2 h-6 text-xs text-teal-400 bg-teal-900/30 hover:bg-teal-900/50 rounded border border-teal-700/50 transition-colors flex items-center gap-1"
                title="Debug: Print Metadata"
              >
                <Bug className="size-3" />
                Debug DB
              </button>
            </div>
          </>
        )}
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
