import { useEffect, useRef, useCallback } from 'react'
import * as monaco from 'monaco-editor'
import Typo from 'typo-js'
import { logger } from 'shared/logger'

interface UseSpellcheckerOptions {
  enabled?: boolean
  affData: string
  wordsData: string
  language?: string
}

export function useSpellchecker(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  monacoInstance: typeof monaco | null,
  options: UseSpellcheckerOptions
) {
  const { enabled = true, affData, wordsData, language = 'en_US' } = options
  const dictionaryRef = useRef<Typo | null>(null)
  const disposablesRef = useRef<monaco.IDisposable[]>([])
  const isProcessingRef = useRef(false)

  // Initialize dictionary
  useEffect(() => {
    if (!affData || !wordsData) return

    try {
      dictionaryRef.current = new Typo(language, affData, wordsData)
      logger.debug('[Spellchecker] Dictionary initialized')
    } catch (error) {
      logger.error('[Spellchecker] Failed to initialize dictionary:', error)
    }
  }, [affData, wordsData, language])

  // Process spellcheck
  const processSpellcheck = useCallback(async () => {
    if (!editor || !monacoInstance || !dictionaryRef.current || isProcessingRef.current) return
    
    const model = editor.getModel()
    if (!model) return

    isProcessingRef.current = true
    
    try {
      const value = model.getValue()
      const markers: monaco.editor.IMarkerData[] = []
      
      // Simple tokenizer (can be improved)
      const wordRegex = /\b[a-zA-Z']+\b/g
      let match
      
      while ((match = wordRegex.exec(value)) !== null) {
        const word = match[0]
        const start = match.index
        const end = start + word.length
        
        // Skip short words or all-caps (acronyms)
        if (word.length < 2) continue
        
        // Check spelling
        const isCorrect = dictionaryRef.current.check(word)
        
        if (!isCorrect) {
          const pos = model.getPositionAt(start)
          const endPos = model.getPositionAt(end)
          
          markers.push({
            startLineNumber: pos.lineNumber,
            startColumn: pos.column,
            endLineNumber: endPos.lineNumber,
            endColumn: endPos.column,
            message: `Misspelled word: ${word}`,
            severity: monacoInstance.MarkerSeverity.Warning,
            source: 'spellchecker',
          })
        }
      }
      
      // Limit markers to avoid performance issues
      const limitedMarkers = markers.slice(0, 500)
      monacoInstance.editor.setModelMarkers(model, 'spellchecker', limitedMarkers)
      
    } catch (error) {
      logger.error('[Spellchecker] Error processing text:', error)
    } finally {
      isProcessingRef.current = false
    }
  }, [editor, monacoInstance])

  // Setup spellchecker
  useEffect(() => {
    if (!enabled || !editor || !monacoInstance || !dictionaryRef.current) return

    const disposables: monaco.IDisposable[] = []

    // 1. Register Code Action Provider (Quick Fix)
    // We register it globally but filter by model to avoid duplication
    const provider = monacoInstance.languages.registerCodeActionProvider('markdown', {
      provideCodeActions: (model, range, context, token) => {
        // CRITICAL FIX: Only provide actions if this model belongs to OUR editor
        if (model !== editor.getModel()) return { actions: [], dispose: () => {} }
        
        const markers = monacoInstance.editor.getModelMarkers({ 
          owner: 'spellchecker', 
          resource: model.uri 
        }).filter(m => {
            // Check if marker intersects with range
            return range.intersectRanges({
                startLineNumber: m.startLineNumber,
                startColumn: m.startColumn,
                endLineNumber: m.endLineNumber,
                endColumn: m.endColumn
            })
        })

        if (markers.length === 0) return { actions: [], dispose: () => {} }

        const actions: monaco.languages.CodeAction[] = []

        for (const marker of markers) {
            const word = model.getValueInRange(marker)
            const suggestions = dictionaryRef.current?.suggest(word) || []
            
            // Add "Correct" actions
            suggestions.forEach(suggestion => {
                actions.push({
                    title: suggestion, // Just show the word to save space
                    kind: 'quickfix',
                    diagnostics: [marker],
                    edit: {
                        edits: [{
                            resource: model.uri,
                            textEdit: {
                                range: marker,
                                text: suggestion
                            },
                            versionId: model.getVersionId()
                        }]
                    },
                    isPreferred: true
                })
            })
            
            // Add "Ignore" action (optional - just clears marker for now)
            // Implementing persistent ignore would require more state
        }

        return { actions, dispose: () => {} }
      }
    })
    disposables.push(provider)

    // 2. Listen for content changes
    let debounceTimer: NodeJS.Timeout
    const changeListener = editor.onDidChangeModelContent(() => {
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
            processSpellcheck()
        }, 500)
    })
    disposables.push(changeListener)

    // Initial check
    processSpellcheck()

    disposablesRef.current = disposables

    return () => {
      disposables.forEach(d => d.dispose())
      if (editor.getModel()) {
        monacoInstance.editor.setModelMarkers(editor.getModel()!, 'spellchecker', [])
      }
    }
  }, [enabled, editor, monacoInstance, processSpellcheck])
}
