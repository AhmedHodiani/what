import { useState, useRef } from 'react'
import { logger } from 'shared/logger'

export function useCardForm() {
  const [newCardFront, setNewCardFront] = useState('')
  const [newCardBack, setNewCardBack] = useState('')
  const [addCardError, setAddCardError] = useState('')
  const [uploadedAssets, setUploadedAssets] = useState<string[]>([])
  const [activeInput, setActiveInput] = useState<'front' | 'back'>('front')
  
  const frontInputRef = useRef<HTMLTextAreaElement>(null)
  const assetInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setNewCardFront('')
    setNewCardBack('')
    setAddCardError('')
    setUploadedAssets([])
  }

  const extractAssetIds = (text: string): string[] => {
    const regex = /asset:\/\/([a-zA-Z0-9_-]+)/g
    const matches = [...text.matchAll(regex)]
    return matches.map(m => m[1])
  }

  const handleAssetUpload = async (
    files: FileList | null,
    parentTabId: string
  ) => {
    if (!files || files.length === 0) return
    
    const file = files[0]
    const arrayBuffer = await file.arrayBuffer()
    
    try {
      logger.debug('[handleAssetUpload] Saving asset:', { 
        fileName: file.name, 
        fileType: file.type,
        parentTabId 
      })
      
      const assetId = await window.App.file.saveAsset(
        file.name,
        arrayBuffer,
        file.type,
        parentTabId
      )
      
      logger.debug('[handleAssetUpload] Asset saved with ID:', assetId)
      
      const assetMarkdown = `![${file.name}](asset://${assetId})`
      if (activeInput === 'front') {
        setNewCardFront(prev => prev + (prev ? '\n\n' : '') + assetMarkdown)
      } else {
        setNewCardBack(prev => prev + (prev ? '\n\n' : '') + assetMarkdown)
      }
      
      setUploadedAssets(prev => [...prev, assetId])
    } catch (error) {
      logger.error('Failed to upload asset:', error)
      setAddCardError('Failed to upload asset. Please try again.')
    }
  }

  const insertExternalMedia = (
    url: string,
    mediaType: 'image' | 'audio' | 'video'
  ) => {
    let markdown = ''
    if (mediaType === 'image') {
      markdown = `![External Image](${url})`
    } else if (mediaType === 'audio') {
      markdown = `[AUDIO:${url}]`
    } else if (mediaType === 'video') {
      markdown = `[VIDEO:${url}]`
    }
    
    if (activeInput === 'front') {
      setNewCardFront(prev => prev + (prev ? '\n\n' : '') + markdown)
    } else {
      setNewCardBack(prev => prev + (prev ? '\n\n' : '') + markdown)
    }
  }

  return {
    newCardFront,
    setNewCardFront,
    newCardBack,
    setNewCardBack,
    addCardError,
    setAddCardError,
    uploadedAssets,
    setUploadedAssets,
    activeInput,
    setActiveInput,
    frontInputRef,
    assetInputRef,
    resetForm,
    extractAssetIds,
    handleAssetUpload,
    insertExternalMedia,
  }
}
