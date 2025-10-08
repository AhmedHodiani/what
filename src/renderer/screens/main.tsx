import { useState, useEffect } from 'react'
import { InfiniteCanvas } from 'renderer/components/canvas/infinite-canvas'
import { MenuBar } from 'renderer/components/layout/menu-bar'
import { WelcomeScreen } from 'renderer/components/welcome/welcome-screen'

export function MainScreen() {
  const [currentFile, setCurrentFile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if there's an active file on mount
    window.App.file.getCurrentFile().then(file => {
      setCurrentFile(file)
      setIsLoading(false)
    })

    // Listen for file opened events
    window.App.file.onFileOpened(file => {
      setCurrentFile(file)
    })
  }, [])

  const handleNewFile = async () => {
    const file = await window.App.file.new()
    if (file) {
      setCurrentFile(file)
    }
  }

  const handleOpenFile = async () => {
    const file = await window.App.file.open()
    if (file) {
      setCurrentFile(file)
    }
  }

  const handleMenuClick = (menu: string) => {
    if (menu === 'file') {
      // TODO: Show file menu dropdown
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-teal-400 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e] overflow-hidden">
      {/* Top Menu Bar */}
      <MenuBar
        onMenuClick={handleMenuClick}
        currentFileName={currentFile?.name}
      />

      {/* Main Canvas Area or Welcome Screen */}
      <div className="flex-1 relative">
        {currentFile ? (
          <InfiniteCanvas>
            {/* Demo content - some circles in world space */}
            <circle cx={0} cy={0} r={50} fill="#14b8a6" opacity={0.8} />
            <circle cx={200} cy={0} r={40} fill="#ec4899" opacity={0.8} />
            <circle cx={-200} cy={0} r={40} fill="#f59e0b" opacity={0.8} />
            <circle cx={0} cy={200} r={30} fill="#8b5cf6" opacity={0.8} />
            <circle cx={0} cy={-200} r={30} fill="#3b82f6" opacity={0.8} />

            {/* Center marker */}
            <circle cx={0} cy={0} r={5} fill="#fff" />
            <line
              x1={-20}
              y1={0}
              x2={20}
              y2={0}
              stroke="#fff"
              strokeWidth={2}
            />
            <line
              x1={0}
              y1={-20}
              x2={0}
              y2={20}
              stroke="#fff"
              strokeWidth={2}
            />
          </InfiniteCanvas>
        ) : (
          <WelcomeScreen onNewFile={handleNewFile} onOpenFile={handleOpenFile} />
        )}
      </div>
    </div>
  )
}
