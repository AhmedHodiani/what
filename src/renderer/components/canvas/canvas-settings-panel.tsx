import { useState, useCallback } from 'react'
import { useActiveTab } from 'renderer/contexts'
import { logger } from 'shared/logger'

export function CanvasSettingsPanel() {
  const { canvasSettings, updateActiveTab, tabId } = useActiveTab()
  const [isOpen, setIsOpen] = useState(false)

  const handleGridTypeChange = useCallback(async (type: 'none' | 'grid' | 'dots') => {
    if (!tabId) return

    const newSettings = {
      ...canvasSettings,
      gridType: type,
    }

    // Optimistic update
    updateActiveTab({ canvasSettings: newSettings })

    // Save to DB
    try {
      await window.App.file.saveCanvasSettings(newSettings, tabId)
    } catch (error) {
      logger.error('Failed to save canvas settings:', error)
    }
  }, [canvasSettings, tabId, updateActiveTab])

  const handleGridSizeChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!tabId) return
    const size = parseInt(e.target.value, 10)

    const newSettings = {
      ...canvasSettings,
      gridSize: size,
    }

    // Optimistic update
    updateActiveTab({ canvasSettings: newSettings })

    // Save to DB (debounced ideally, but direct for now)
    try {
      await window.App.file.saveCanvasSettings(newSettings, tabId)
    } catch (error) {
      logger.error('Failed to save canvas settings:', error)
    }
  }, [canvasSettings, tabId, updateActiveTab])

  const handleRenderTypeChange = useCallback(async (type: 'normal' | 'fast') => {
    if (!tabId) return

    const newSettings = {
      ...canvasSettings,
      renderType: type,
    }

    // Optimistic update
    updateActiveTab({ canvasSettings: newSettings })

    // Save to DB
    try {
      await window.App.file.saveCanvasSettings(newSettings, tabId)
    } catch (error) {
      logger.error('Failed to save canvas settings:', error)
    }
  }, [canvasSettings, tabId, updateActiveTab])

  if (!tabId) return null

  return (
    <div className="absolute top-3 right-3 flex flex-col items-end gap-2 pointer-events-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-black/80 text-teal-400 px-3 py-2 rounded-md text-xs font-mono border border-teal-400/30 hover:bg-black/90 transition-colors"
      >
        ⚙️ Settings
      </button>

      {isOpen && (
        <div className="bg-black/90 text-gray-200 p-3 rounded-md border border-white/10 w-48 flex flex-col gap-3 shadow-xl backdrop-blur-sm">
          {/* Grid Type */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Grid Type</label>
            <div className="grid grid-cols-3 gap-1">
              {(['dots', 'grid', 'none'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleGridTypeChange(type)}
                  className={`
                    px-2 py-1 text-xs rounded border transition-colors
                    ${canvasSettings.gridType === type 
                      ? 'bg-teal-500/20 border-teal-500 text-teal-300' 
                      : 'bg-white/5 border-transparent hover:bg-white/10 text-gray-400'}
                  `}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Size Slider */}
          {canvasSettings.gridType !== 'none' && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Grid Size</label>
                <span className="text-[10px] text-teal-400 font-mono">{canvasSettings.gridSize || 50}px</span>
              </div>
              <input
                type="range"
                min="20"
                max="200"
                step="10"
                value={canvasSettings.gridSize || 50}
                onChange={handleGridSizeChange}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>
          )}

          {/* Render Type */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Render Mode</label>
            <div className="grid grid-cols-2 gap-1">
              {(['normal', 'fast'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleRenderTypeChange(type)}
                  className={`
                    px-2 py-1 text-xs rounded border transition-colors
                    ${canvasSettings.renderType === type 
                      ? 'bg-teal-500/20 border-teal-500 text-teal-300' 
                      : 'bg-white/5 border-transparent hover:bg-white/10 text-gray-400'}
                  `}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-gray-500 mt-1 leading-tight">
              {canvasSettings.renderType === 'fast' 
                ? 'Fast: No buffer, updates only on stop. Best for huge files.' 
                : 'Normal: Preloads buffer, smooth updates.'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
