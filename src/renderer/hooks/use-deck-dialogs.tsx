import { useState } from 'react'

export function useDeckDialogs() {
  const [showSettings, setShowSettings] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [showExternalUrlDialog, setShowExternalUrlDialog] = useState(false)
  const [externalUrl, setExternalUrl] = useState('')
  const [externalMediaType, setExternalMediaType] = useState<'image' | 'audio' | 'video'>('image')
  const [showBulkAddDialog, setShowBulkAddDialog] = useState(false)

  const detectMediaType = (url: string): 'image' | 'audio' | 'video' => {
    const lowerUrl = url.toLowerCase()
    
    if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif)($|\?)/.test(lowerUrl)) {
      return 'image'
    }
    
    if (/\.(mp3|wav|ogg|m4a|aac|flac|wma)($|\?)/.test(lowerUrl)) {
      return 'audio'
    }
    
    if (/\.(mp4|webm|ogv|mov|avi|mkv|flv|wmv|m4v)($|\?)/.test(lowerUrl)) {
      return 'video'
    }
    
    return 'image'
  }

  return {
    showSettings,
    setShowSettings,
    deleteConfirmId,
    setDeleteConfirmId,
    showExternalUrlDialog,
    setShowExternalUrlDialog,
    externalUrl,
    setExternalUrl,
    externalMediaType,
    setExternalMediaType,
    detectMediaType,
    showBulkAddDialog,
    setShowBulkAddDialog,
  }
}
