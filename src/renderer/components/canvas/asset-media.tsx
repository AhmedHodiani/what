import { useAssetMedia } from 'renderer/hooks/use-asset-media'
import { AudioPlayer } from './audio-player'

interface AssetMediaProps {
  assetId: string
  alt?: string
  parentTabId: string
  autoPlayAudio?: boolean
}

export function AssetMedia({ assetId, alt, parentTabId, autoPlayAudio = false }: AssetMediaProps) {
  const { dataUrl, mimeType } = useAssetMedia(assetId, parentTabId)

  if (!dataUrl) return <span className="text-gray-500">Loading asset...</span>
  
  if (mimeType?.startsWith('video/')) {
    return (
      <div className="flex justify-center">
        <video controls className="max-w-full h-auto rounded">
          <source src={dataUrl} type={mimeType} />
          Your browser does not support the video tag.
        </video>
      </div>
    )
  }
  
  if (mimeType?.startsWith('audio/')) {
    return <AudioPlayer src={dataUrl} autoPlay={autoPlayAudio} />
  }
  
  return <img src={dataUrl} alt={alt || 'Asset'} className="max-w-full h-auto rounded" />
}
