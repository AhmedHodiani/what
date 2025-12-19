import { useEffect, useState, useCallback, useRef } from 'react'
import { logger } from 'shared/logger'
import type { StickyNoteObject, FileObject } from 'lib/types/canvas'
import { useMarkdown } from 'renderer/hooks/use-markdown'
import Editor, { type OnMount } from '@monaco-editor/react'
import affData from 'typo-js/dictionaries/en_US/en_US.aff?raw'
import wordsData from 'typo-js/dictionaries/en_US/en_US.dic?raw'
import { useSpellchecker } from 'renderer/hooks/use-spellchecker'

interface StickyNoteEditorProps {
  tabId: string // FlexLayout tab ID
  objectId: string
  parentTabId: string
  title: string
}

type Tab = 'edit' | 'preview' | 'help'

/**
 * StickyNoteEditor - Full-screen editor for sticky notes
 */
export function StickyNoteEditor({
  tabId,
  objectId,
  parentTabId,
  title,
}: StickyNoteEditorProps) {
  const [object, setObject] = useState<StickyNoteObject | FileObject | null>(null)
  const [text, setText] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('edit')
  const [wordWrap, setWordWrap] = useState(true)
  
  const [fontSize, setFontSize] = useState(14)
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)
  const [editorInstance, setEditorInstance] = useState<any>(null)
  const [monacoInstance, setMonacoInstance] = useState<any>(null)
  
  const { renderMarkdown } = useMarkdown()

  // Load object from database
  useEffect(() => {
    const loadObject = async () => {
      try {
        const objects = await window.App.file.getObjects(parentTabId)
        const foundObject = objects.find((o: any) => o.id === objectId)
        
        if (foundObject) {
          setObject(foundObject)
          
          if (foundObject.type === 'sticky-note') {
            setText(foundObject.object_data.text || '')
            setFontSize(foundObject.object_data.fontSize || 14)
          } else if (foundObject.type === 'file') {
            // Load file content
            const assetId = foundObject.object_data.assetId
            if (assetId) {
              try {
                const content = await window.App.file.getAssetContent(assetId, parentTabId)
                if (typeof content === 'string') {
                  setText(content)
                } else if (content) {
                  const decoder = new TextDecoder('utf-8')
                  setText(decoder.decode(content))
                }
              } catch (e) {
                logger.error('Failed to load asset content:', e)
                setText('Error loading file content')
              }
            }
            setFontSize(14)
          }
        } else {
          logger.error('Object not found:', objectId)
        }
      } catch (error) {
        logger.error('Failed to load object:', error)
      }
    }
    
    loadObject()
  }, [objectId, parentTabId])

  // Listen for external updates (e.g. from other editors or canvas)
  useEffect(() => {
    const handleExternalUpdate = (e: Event) => {
      const customEvent = e as CustomEvent
      const { objectId: updatedId, tabId: updatedTabId, object: updatedObject } = customEvent.detail

      // Only update if it's for this object and this file
      if (updatedId !== objectId || updatedTabId !== parentTabId) return

      // Don't update if we are the ones who triggered it (avoid loops/flicker)
      // We can check if the text is different
      if (updatedObject.object_data.text === text) return

      logger.debug('Received external update for sticky note:', objectId)
      
      setObject(updatedObject)
      setText(updatedObject.object_data.text || '')
      setIsDirty(false) // Reset dirty state as we are now in sync
    }

    window.addEventListener('canvas-object-updated', handleExternalUpdate)
    return () => window.removeEventListener('canvas-object-updated', handleExternalUpdate)
  }, [objectId, parentTabId, text])

  // Update tab name with dirty indicator
  useEffect(() => {
    const dirtyIndicator = isDirty ? '● ' : ''
    const newName = `${dirtyIndicator}${title}`
    
    if (window.__updateTabName) {
      window.__updateTabName(tabId, newName)
    }
  }, [isDirty, title, tabId])

  // Save changes
  const saveChanges = useCallback(async (newText: string) => {
    if (!object) return

    try {
      if (object.type === 'sticky-note') {
        const updatedObject = {
          ...object,
          object_data: {
            ...object.object_data,
            text: newText
          },
          updated: new Date().toISOString()
        }

        await window.App.file.saveObject(updatedObject, parentTabId)
        setObject(updatedObject)
        
        // Notify other components (like the canvas) about the update
        window.dispatchEvent(new CustomEvent('canvas-object-updated', {
          detail: { 
            objectId: updatedObject.id,
            tabId: parentTabId,
            object: updatedObject
          }
        }))
      } else if (object.type === 'file') {
        const assetId = object.object_data.assetId
        if (assetId) {
          const encoder = new TextEncoder()
          const buffer = encoder.encode(newText)
          await window.App.file.updateAsset(assetId, buffer, undefined, parentTabId)
          logger.debug('Saved file asset changes')
        }
      }
      
      setIsDirty(false)
      logger.debug('Saved changes')
    } catch (error) {
      logger.error('Failed to save changes:', error)
    }
  }, [object, parentTabId])
  // Debounced save
  useEffect(() => {
    if (!isDirty) return

    const timer = setTimeout(() => {
      saveChanges(text)
    }, 1000) // 1 second debounce

    return () => clearTimeout(timer)
  }, [text, isDirty, saveChanges])

  // Handle text change
  const handleEditorChange = (value: string | undefined) => {
    const newText = value || ''
    setText(newText)
    setIsDirty(newText !== object?.object_data.text)
  }

  // Initialize spellchecker
  useSpellchecker(editorInstance, monacoInstance, {
    affData,
    wordsData
  })

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    setEditorInstance(editor)
    setMonacoInstance(monaco)

    // Define a base transparent theme if not already defined
    try {
        monaco.editor.defineTheme('sticky-note-transparent', {
            base: 'vs', // Start with light theme base
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#00000000', // Transparent
                'editor.lineHighlightBackground': '#00000010',
                'editor.selectionBackground': '#00000020',
            }
        })
    } catch {
        // Ignore if already defined
    }
    
    monaco.editor.setTheme('sticky-note-transparent')
    
    // Add save shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveChanges(editor.getValue())
    })

    // Add close tab shortcut (Ctrl+W)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW, async () => {
      try {
        // Close this specific tab
        await window.App.file.close(tabId)
      } catch (error) {
        logger.error('Failed to close sticky note tab:', error)
      }
    })

    // Add zoom shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal, () => {
        setFontSize(prev => Math.min(prev + 2, 72))
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus, () => {
        setFontSize(prev => Math.max(prev - 2, 8))
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit0, () => {
        setFontSize(14)
    })
  }

  if (!object) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e] text-gray-400" style={{ position: 'relative', zIndex: 50 }}>
        Loading...
      </div>
    )
  }

  const paperColor = (object as any).object_data?.paperColor || '#ffffff'
  const fontColor = (object as any).object_data?.fontColor || '#333333'
  
  const safeId = objectId.replace(/[^a-z0-9-]/gi, '-')
  const wrapperClass = `sticky-note-wrapper-${safeId}`

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ backgroundColor: paperColor, position: 'relative', zIndex: 50 }}>
      <style>{`
        .${wrapperClass} .monaco-editor,
        .${wrapperClass} .monaco-editor-background {
            background-color: transparent !important;
        }
        .${wrapperClass} .margin-view-overlays {
            background-color: transparent !important;
        }
        
        /* Force text color for all tokens */
        .${wrapperClass} span[class*="mtk"] {
            color: ${fontColor} !important;
        }
        
        /* Cursor and Line Numbers */
        .${wrapperClass} .cursor {
            color: ${fontColor} !important;
            border-color: ${fontColor} !important;
            background-color: ${fontColor} !important;
        }
        .${wrapperClass} .line-numbers {
            color: ${fontColor} !important;
            opacity: 0.5;
        }
        .${wrapperClass} .current-line {
            border: none !important;
            background-color: rgba(0,0,0,0.05) !important;
        }

        /* Widen the Quick Fix / Code Action menu */
        .monaco-menu-container {
            min-width: 300px !important;
            max-width: 600px !important;
        }
        
        .monaco-menu-container .action-label {
            max-width: 100% !important;
            width: auto !important;
        }
      `}</style>
      {/* Toolbar */}
      <div 
        className="h-10 border-b flex items-center px-4 justify-between shrink-0"
        style={{ 
            backgroundColor: 'rgba(0,0,0,0.05)', 
            borderColor: 'rgba(0,0,0,0.1)',
            color: fontColor
        }}
      >
        <div className="text-sm font-medium truncate flex items-center gap-2">
          {activeTab === 'edit' && (
            <>
                <button 
                className={`px-2 py-0.5 text-xs rounded border hover:bg-black/5`}
                style={{ borderColor: 'rgba(0,0,0,0.2)' }}
                onClick={() => setWordWrap(!wordWrap)}
                title="Toggle Word Wrap (Alt+Z)"
                >
                Word Wrap: {wordWrap ? 'On' : 'Off'}
                </button>
                <span className="text-xs ml-2 opacity-70">
                    {Math.round(fontSize)}px
                </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 p-0.5 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
          <button
            className={`px-3 py-1 text-xs rounded ${
              activeTab === 'edit'
                ? 'shadow-sm' 
                : 'hover:bg-black/5 opacity-70 hover:opacity-100'
            }`}
            style={activeTab === 'edit' ? { backgroundColor: fontColor, color: paperColor } : {}}
            onClick={() => setActiveTab('edit')}
          >
            Edit
          </button>
          <button
            className={`px-3 py-1 text-xs rounded ${
              activeTab === 'preview'
                ? 'shadow-sm' 
                : 'hover:bg-black/5 opacity-70 hover:opacity-100'
            }`}
            style={activeTab === 'preview' ? { backgroundColor: fontColor, color: paperColor } : {}}
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </button>
          <button
            className={`px-3 py-1 text-xs rounded ${
              activeTab === 'help'
                ? 'shadow-sm' 
                : 'hover:bg-black/5 opacity-70 hover:opacity-100'
            }`}
            style={activeTab === 'help' ? { backgroundColor: fontColor, color: paperColor } : {}}
            onClick={() => setActiveTab('help')}
          >
            Help
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className={`flex-1 overflow-hidden relative flex ${wrapperClass}`}>
        {activeTab === 'edit' && (
          <Editor
            height="100%"
            defaultLanguage="markdown"
            theme="sticky-note-transparent"
            value={text}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            options={{
                fontSize: fontSize,
                wordWrap: wordWrap ? 'on' : 'off',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                fontFamily: "'Droid Sans Mono', 'monospace', monospace", // Default Monaco font
                padding: { top: 16, bottom: 16 },
                acceptSuggestionOnEnter: 'on',
                quickSuggestions: false,
            }}
          />
        )}

        {activeTab === 'preview' && (
          <div 
            className="w-full h-full p-8 overflow-auto"
            style={{ backgroundColor: paperColor }}
          >
            <div 
              className="markdown-content max-w-3xl mx-auto"
              style={{ 
                color: fontColor,
                fontFamily: '"Kalam", "Comic Sans MS", cursive',
                fontSize: `${fontSize}px`,
                lineHeight: 1.4
              }}
            >
              {renderMarkdown(text)}
            </div>
          </div>
        )}

        {activeTab === 'help' && (
          <div className="w-full h-full p-8 overflow-auto" style={{ backgroundColor: paperColor, color: fontColor }}>
            <h2 className="text-xl font-bold mb-6">Keyboard Shortcuts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
              <div>
                <h3 className="text-lg font-semibold mb-4 opacity-80">Line Operations</h3>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                      <td className="py-2 opacity-70">Alt + ↑ / ↓</td>
                      <td className="py-2 pl-4">Move line up/down</td>
                    </tr>
                    <tr className="border-b" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                      <td className="py-2 opacity-70">Shift + Alt + ↑ / ↓</td>
                      <td className="py-2 pl-4">Copy line up/down</td>
                    </tr>
                    <tr className="border-b" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                      <td className="py-2 opacity-70">Ctrl + Shift + K</td>
                      <td className="py-2 pl-4">Delete line</td>
                    </tr>
                    <tr className="border-b" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                      <td className="py-2 opacity-70">Ctrl + Enter</td>
                      <td className="py-2 pl-4">Insert line below</td>
                    </tr>
                    <tr className="border-b" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                      <td className="py-2 opacity-70">Ctrl + Shift + Enter</td>
                      <td className="py-2 pl-4">Insert line above</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4 opacity-80">General</h3>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                      <td className="py-2 opacity-70">Ctrl + S</td>
                      <td className="py-2 pl-4">Save changes</td>
                    </tr>
                    <tr className="border-b" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                      <td className="py-2 opacity-70">Tab</td>
                      <td className="py-2 pl-4">Indent (2 spaces)</td>
                    </tr>
                    <tr className="border-b" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                      <td className="py-2 opacity-70">Alt + Z</td>
                      <td className="py-2 pl-4">Toggle Word Wrap</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        
        {/* Import Kalam font for preview */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&display=swap');
        `}</style>
      </div>
    </div>
  )
}
