import { useState, useRef, useEffect, useCallback } from 'react'
import type { StickyNoteObject, DrawingObject } from 'lib/types/canvas'
import { WidgetWrapper } from './widget-wrapper'
import { useAutoResize } from 'renderer/hooks/use-auto-resize'
import { useMarkdown } from 'renderer/hooks/use-markdown'
import { useWidgetCapabilities } from 'renderer/hooks/use-widget-capabilities'

interface StickyNoteWidgetProps {
  object: StickyNoteObject
  isSelected: boolean
  zoom: number
  currentTool?: string
  tabId?: string | null
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
  onSelect: (id: string) => void
  onContextMenu: (event: React.MouseEvent, id: string) => void
  onStartDrag: (e: React.MouseEvent, id: string) => void
}

/**
 * StickyNoteWidget - Classic sticky note with folded corner
 *
 * Features:
 * - Double-click to edit
 * - Ctrl+Double-click to open in side window
 * - Handwritten font (Kalam)
 * - Folded corner effect
 * - Paper texture
 * - Customizable colors
 */
export function StickyNoteWidget({
  object,
  isSelected,
  zoom,
  currentTool,
  tabId,
  onUpdate,
  onSelect,
  onContextMenu,
  onStartDrag,
}: StickyNoteWidgetProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(object.object_data.text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Use capability system for external tab behavior
  const { handleExternalTabOpen } = useWidgetCapabilities(
    'sticky-note',
    object,
    tabId || undefined
  )

  const paperColor = object.object_data.paperColor || '#ffd700'
  const fontColor = object.object_data.fontColor || '#333333'
  const fontSize = object.object_data.fontSize || 16

  // Check if transparent (alpha channel is 00)
  const isTransparent = paperColor.toLowerCase().endsWith('00')

  // Markdown rendering hook
  const { renderMarkdown } = useMarkdown()

  // Check if auto-resize is enabled (default: true)
  const autoResizeEnabled = object.object_data.autoResize !== false

  // Sync editText with object when not editing (object updated from elsewhere)
  useEffect(() => {
    if (!isEditing) {
      setEditText(object.object_data.text)
    }
  }, [object.object_data.text, isEditing])

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setIsEditing(true)
      setEditText(object.object_data.text)
    },
    [object.object_data.text]
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // If Ctrl key is pressed, open in external tab (side window)
      if (e.ctrlKey) {
        e.stopPropagation()
        handleExternalTabOpen(e)
      }
    },
    [handleExternalTabOpen]
  )

  // Prevent drag when interacting with textarea
  const handleTextareaMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setEditText(e.target.value)
    },
    []
  )

  const saveText = useCallback(() => {
    if (editText !== object.object_data.text) {
      onUpdate(object.id, {
        object_data: { ...object.object_data, text: editText },
      })
    }
  }, [editText, object.id, object.object_data, onUpdate])

  const handleTextBlur = useCallback(() => {
    setIsEditing(false)
    saveText()
  }, [saveText])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        setIsEditing(false)
        saveText()
      } else if (e.key === 'Escape') {
        setIsEditing(false)
        setEditText(object.object_data.text)
      }
    },
    [object.object_data.text, saveText]
  )

  // Use current text (either editing or saved)
  const currentText = isEditing ? editText : object.object_data.text

  // Auto-resize callback
  const handleAutoResize = useCallback(
    (width: number, height: number) => {
      // Skip auto-resize if manually resized
      if (!autoResizeEnabled) return

      // Only update if size actually changed (prevent unnecessary saves on mount)
      const currentWidth = 'width' in object ? object.width : 150
      const currentHeight = 'height' in object ? object.height : 150

      if (currentWidth === width && currentHeight === height) {
        return // Size hasn't changed, skip update
      }

      onUpdate?.(object.id, { width, height })
    },
    [autoResizeEnabled, object, onUpdate]
  )

  useAutoResize({
    text: currentText,
    fontSize,
    fontFamily: '"Kalam", "Comic Sans MS", cursive',
    lineHeight: 1.4,
    fontWeight: '400',
    fontStyle: 'normal',
    minWidth: 150,
    minHeight: 150,
    maxWidth: 1000,
    maxHeight: 1000,
    padding: 48, // More padding for sticky note (includes folded corner space)
    onResize: handleAutoResize,
  })

  // Handle manual resize - disable auto-resize and save any pending text
  const handleManualResize = useCallback(() => {
    // Always use the latest text from object (not editText which might be stale)
    // The useEffect above should have synced editText already

    // Disable auto-resize permanently for this object
    onUpdate?.(object.id, {
      object_data: {
        ...object.object_data,
        autoResize: false,
      },
    })

    // If currently editing, exit edit mode
    if (isEditing) {
      setIsEditing(false)
    }
  }, [object.id, object.object_data, onUpdate, isEditing])

  return (
    <WidgetWrapper
      currentTool={currentTool}
      isResizable={true}
      isSelected={isSelected}
      minHeight={100}
      minWidth={100}
      object={object}
      onContextMenu={onContextMenu}
      onManualResize={handleManualResize}
      onSelect={onSelect}
      onStartDrag={onStartDrag}
      onUpdate={onUpdate}
      zoom={zoom}
    >
      <div
        className="relative w-full h-full overflow-hidden"
        onDoubleClick={handleDoubleClick}
        onClick={handleClick}
        style={{
          backgroundColor: paperColor,
          clipPath:
            'polygon(0% 0%, calc(100% - 35px) 0%, 100% 35px, 100% 100%, 0% 100%)',
          boxShadow: isSelected
            ? '0 0 10px rgba(0, 122, 204, 0.5)'
            : '2px 2px 8px rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* Paper gradient overlay (hidden when transparent) */}
        {!isTransparent && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
            }}
          />
        )}

        {/* Folded corner (hidden when transparent) */}
        {!isTransparent && (
          <div
            className="absolute top-0 right-0 w-0 h-0 border-solid border-transparent border-r-[#e0e0e0]"
            style={{
              borderWidth: '0 35px 35px 0',
              filter: 'drop-shadow(-2px 2px 3px rgba(0, 0, 0, 0.15))',
            }}
          />
        )}

        {/* Text content with paper texture */}
        <div className="relative w-full h-full p-4 box-border">
          {/* Paper texture (hidden when transparent) */}
          {!isTransparent && (
            <div
              className="absolute inset-0 pointer-events-none opacity-50"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.02) 1px, transparent 0)',
                backgroundSize: '20px 20px',
              }}
            />
          )}

          {/* Editable text */}
          {isEditing ? (
            <textarea
              className="relative w-full h-full bg-transparent border-none outline-none resize-none"
              onBlur={handleTextBlur}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onMouseDown={handleTextareaMouseDown}
              placeholder="Type your note..."
              ref={textareaRef}
              style={{
                color: fontColor,
                fontSize: `${fontSize}px`,
                fontFamily: '"Kalam", "Comic Sans MS", cursive',
                lineHeight: '1.4',
                fontWeight: 400,
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                paddingRight: '25px',
              }}
              value={editText}
            />
          ) : (
            <div
              className="relative w-full h-full markdown-content"
              style={{
                color: fontColor,
                fontSize: `${fontSize}px`,
                fontFamily: '"Kalam", "Comic Sans MS", cursive',
                lineHeight: '1.4',
                fontWeight: 400,
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                paddingRight: '25px',
              }}
            >
              {object.object_data.text ? (
                renderMarkdown(object.object_data.text)
              ) : (
                <span
                  style={{ color: 'rgba(0, 0, 0, 0.4)', fontStyle: 'italic' }}
                >
                  Double-click to edit
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Import Kalam font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&display=swap');
      `}</style>
    </WidgetWrapper>
  )
}
