import { useCallback } from 'react'

interface UseTextEditorProps {
  text: string
  onChange: (newText: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement>
}

export function useTextEditor({ text, onChange, textareaRef }: UseTextEditorProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const textarea = textareaRef.current
      if (!textarea) return

      const { selectionStart, selectionEnd, value } = textarea
      
      // Helper to set cursor and value
      const update = (newValue: string, newCursorStart: number, newCursorEnd: number) => {
        onChange(newValue)
        // We need to set selection after render, so we use setTimeout
        // or we can rely on the fact that React updates are batched? 
        // Actually, for controlled inputs, we need to set selection in useLayoutEffect or similar.
        // But for simple shortcuts, setting it immediately after state update (which triggers re-render) 
        // might be tricky. 
        // A common pattern is to use a ref to store the desired cursor position and apply it in useEffect.
        requestAnimationFrame(() => {
            if (textarea) {
                textarea.setSelectionRange(newCursorStart, newCursorEnd)
            }
        })
      }

      // Get current line info
      const getLineInfo = () => {
        const beforeSelection = value.substring(0, selectionStart)
        const afterSelection = value.substring(selectionEnd)
        const lineStart = beforeSelection.lastIndexOf('\n') + 1
        
        // Fix for selecting up to the start of the next line including the next line in the operation
        // If selection ends exactly at the start of a line (preceded by \n), we shouldn't include that line
        let searchFrom = selectionEnd
        if (selectionEnd > selectionStart && selectionEnd > 0 && value[selectionEnd - 1] === '\n') {
            searchFrom = selectionEnd - 1
        }

        const lineEnd = value.indexOf('\n', searchFrom)
        const actualLineEnd = lineEnd === -1 ? value.length : lineEnd
        
        const currentLine = value.substring(lineStart, actualLineEnd)
        return { lineStart, lineEnd: actualLineEnd, currentLine, beforeSelection, afterSelection }
      }

      // Alt + ArrowUp: Move line up
      if (e.altKey && !e.shiftKey && e.key === 'ArrowUp') {
        e.preventDefault()
        const { lineStart, lineEnd, currentLine } = getLineInfo()
        
        if (lineStart === 0) return // Already at top

        const prevLineEnd = lineStart - 1
        const prevLineStart = value.lastIndexOf('\n', prevLineEnd - 1) + 1
        const prevLine = value.substring(prevLineStart, prevLineEnd)

        const newValue = 
          value.substring(0, prevLineStart) + 
          currentLine + '\n' + 
          prevLine + 
          value.substring(lineEnd)

        const newStart = prevLineStart + (selectionStart - lineStart)
        const newEnd = prevLineStart + (selectionEnd - lineStart)
        
        update(newValue, newStart, newEnd)
      }

      // Alt + ArrowDown: Move line down
      if (e.altKey && !e.shiftKey && e.key === 'ArrowDown') {
        e.preventDefault()
        const { lineStart, lineEnd, currentLine } = getLineInfo()
        
        if (lineEnd === value.length) return // Already at bottom

        const nextLineStart = lineEnd + 1
        const nextLineEnd = value.indexOf('\n', nextLineStart)
        const actualNextLineEnd = nextLineEnd === -1 ? value.length : nextLineEnd
        const nextLine = value.substring(nextLineStart, actualNextLineEnd)

        const newValue = 
          value.substring(0, lineStart) + 
          nextLine + '\n' + 
          currentLine + 
          value.substring(actualNextLineEnd)

        const newStart = lineStart + nextLine.length + 1 + (selectionStart - lineStart)
        const newEnd = lineStart + nextLine.length + 1 + (selectionEnd - lineStart)

        update(newValue, newStart, newEnd)
      }

      // Shift + Alt + ArrowUp: Copy line up
      if (e.altKey && e.shiftKey && e.key === 'ArrowUp') {
        e.preventDefault()
        const { lineStart, lineEnd, currentLine } = getLineInfo()
        
        const newValue = 
          value.substring(0, lineStart) + 
          currentLine + '\n' + 
          value.substring(lineStart)

        const newStart = selectionStart
        const newEnd = selectionEnd
        
        update(newValue, newStart, newEnd)
      }

      // Shift + Alt + ArrowDown: Copy line down
      if (e.altKey && e.shiftKey && e.key === 'ArrowDown') {
        e.preventDefault()
        const { lineStart, lineEnd, currentLine } = getLineInfo()
        
        const newValue = 
          value.substring(0, lineEnd) + 
          '\n' + currentLine + 
          value.substring(lineEnd)

        const newStart = selectionStart + currentLine.length + 1
        const newEnd = selectionEnd + currentLine.length + 1
        
        update(newValue, newStart, newEnd)
      }

      // Ctrl + Shift + K: Delete line
      if (e.ctrlKey && e.shiftKey && e.key === 'k') { // 'k' or 'K' depending on shift? usually key is 'k' or 'K'
        e.preventDefault()
        const { lineStart, lineEnd } = getLineInfo()
        
        // Include the newline character if possible
        let deleteStart = lineStart
        let deleteEnd = lineEnd
        
        if (lineEnd < value.length) {
            deleteEnd++ // Remove the newline after
        } else if (lineStart > 0) {
            deleteStart-- // Remove the newline before if it's the last line
        }

        const newValue = value.substring(0, deleteStart) + value.substring(deleteEnd)
        update(newValue, deleteStart, deleteStart)
      }

      // Ctrl + Enter: Insert line below
      if (e.ctrlKey && !e.shiftKey && e.key === 'Enter') {
        e.preventDefault()
        const { lineEnd } = getLineInfo()
        
        const newValue = value.substring(0, lineEnd) + '\n' + value.substring(lineEnd)
        update(newValue, lineEnd + 1, lineEnd + 1)
      }

      // Ctrl + Shift + Enter: Insert line above
      if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
        e.preventDefault()
        const { lineStart } = getLineInfo()
        
        const newValue = value.substring(0, lineStart) + '\n' + value.substring(lineStart)
        update(newValue, lineStart, lineStart)
      }
      
      // Tab: Indent (2 spaces)
      if (e.key === 'Tab') {
        e.preventDefault()
        
        if (selectionStart !== selectionEnd) {
            // Multi-line indent (TODO)
            // For now just replace selection with spaces or insert at start
            const newValue = value.substring(0, selectionStart) + '  ' + value.substring(selectionEnd)
            update(newValue, selectionStart + 2, selectionStart + 2)
        } else {
            const newValue = value.substring(0, selectionStart) + '  ' + value.substring(selectionEnd)
            update(newValue, selectionStart + 2, selectionStart + 2)
        }
      }
    },
    [text, onChange, textareaRef]
  )

  return { handleKeyDown }
}
