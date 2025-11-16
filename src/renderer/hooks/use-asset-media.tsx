import { useEffect, useState } from 'react'
import { logger } from 'shared/logger'

export function useAssetMedia(assetId: string, parentTabId: string) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState<string | null>(null)

  useEffect(() => {
    const loadAsset = async () => {
      try {
        logger.debug('[AssetMedia] Loading asset:', { assetId, parentTabId })
        const url = await window.App.file.getAssetDataUrl(assetId, parentTabId)
        logger.debug('[AssetMedia] Got URL:', url ? 'success' : 'null')
        if (!url) {
          logger.error('Failed to load asset: URL is null or undefined', { assetId, parentTabId })
          return
        }
        
        setDataUrl(url)
        
        // Extract MIME type from data URL (format: data:image/png;base64,...)
        const match = url.match(/^data:([^;]+);/)
        if (match) {
          setMimeType(match[1])
          logger.debug('[AssetMedia] MIME type:', match[1])
        }
      } catch (error) {
        logger.error('Failed to load asset:', error, { assetId, parentTabId })
      }
    }
    loadAsset()
  }, [assetId, parentTabId])

  return { dataUrl, mimeType }
}
