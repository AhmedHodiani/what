import { useState, useRef, useEffect, useCallback } from 'react'
import type { TextObject, DrawingObject } from 'lib/types/canvas'
import { WidgetWrapper } from './widget-wrapper'
import { useAutoResize } from 'renderer/hooks/use-auto-resize'

interface TextWidgetProps {
  object: TextObject
  isSelected: boolean
  zoom: number
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
  onSelect: (id: string) => void
  onContextMenu: (event: React.MouseEvent, id: string) => void
  onStartDrag: (e: React.MouseEvent, id: string) => void
}

/**
 * TextWidget - Editable text box widget
 *
 * Features:
 * - Click to edit text
 * - Auto-focus on creation
 * - Transparent background
 * - Customizable font properties
 * - Auto-resize height based on content
 */
export function TextWidget({
  object,
  isSelected,
  zoom,
  onUpdate,
  onSelect,
  onContextMenu,
  onStartDrag,
}: TextWidgetProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(object.object_data.text || '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Check if auto-resize is enabled (default: true)
  const autoResizeEnabled = object.object_data.autoResize !== false

  // Auto-focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      // Move cursor to end
      const length = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(length, length)
    }
  }, [isEditing])

  // Auto-focus on creation (empty text)
  useEffect(() => {
    if (!object.object_data.text && isSelected) {
      setIsEditing(true)
    }
  }, [object.object_data.text, isSelected])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isEditing) {
      setIsEditing(true)
    }
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (text !== object.object_data.text) {
      onUpdate(object.id, {
        object_data: {
          ...object.object_data,
          text,
        },
      })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow Escape to blur (save and exit editing)
    if (e.key === 'Escape') {
      textareaRef.current?.blur()
    }
    // Stop propagation to prevent canvas shortcuts
    e.stopPropagation()
  }

  // Get style properties with defaults
  const fontSize = object.object_data.fontSize || 24
  const fontFamily =
    object.object_data.fontFamily || 'Inter, system-ui, sans-serif'
  const fontWeight = object.object_data.fontWeight || 'normal'
  const fontStyle = object.object_data.fontStyle || 'normal'
  const textAlign = object.object_data.textAlign || 'left'
  const color = object.object_data.color || '#FFFFFF'
  const backgroundColor = object.object_data.backgroundColor || 'transparent'
  const lineHeight = object.object_data.lineHeight || 1.5

  // Auto-resize based on text content
  const handleAutoResize = useCallback(
    (width: number, height: number) => {
      // Don't auto-resize if user has manually resized (autoResize flag disabled)
      if (!autoResizeEnabled) return

      // Only update if dimensions actually changed to avoid infinite loops
      if (width !== object.width || height !== object.height) {
        onUpdate(object.id, {
          width,
          height,
        })
      }
    },
    [autoResizeEnabled, object.id, object.width, object.height, onUpdate]
  )

  useAutoResize({
    text,
    fontSize,
    fontFamily,
    lineHeight,
    fontWeight,
    fontStyle,
    minWidth: 100,
    minHeight: 50,
    maxWidth: 2000,
    maxHeight: 2000,
    padding: 32, // 16px padding * 2
    onResize: handleAutoResize,
  })

  // Handle manual resize - disable auto-resize permanently
  const handleManualResize = useCallback(() => {
    onUpdate(object.id, {
      object_data: {
        ...object.object_data,
        autoResize: false,
      },
    })
  }, [object.id, object.object_data, onUpdate])

  return (
    <WidgetWrapper
      isSelected={isSelected}
      minHeight={50}
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
        className="w-full h-full rounded-lg overflow-hidden"
        onClick={handleClick}
        style={{
          backgroundColor,
          cursor: isEditing ? 'text' : 'pointer',
        }}
      >
        {isEditing ? (
          <textarea
            className="w-full h-full p-4 bg-transparent border-none outline-none resize-none"
            onBlur={handleBlur}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type something..."
            ref={textareaRef}
            style={{
              fontSize: `${fontSize}px`,
              fontFamily,
              fontWeight,
              fontStyle,
              textAlign,
              color,
              lineHeight,
            }}
            value={text}
          />
        ) : (
          <div
            className="w-full h-full p-4 whitespace-pre-wrap break-words"
            style={{
              fontSize: `${fontSize}px`,
              fontFamily,
              fontWeight,
              fontStyle,
              textAlign,
              color,
              lineHeight,
            }}
          >
            {text || (
              <span className="text-gray-500 italic">Click to edit text</span>
            )}
          </div>
        )}
      </div>
    </WidgetWrapper>
  )
}
