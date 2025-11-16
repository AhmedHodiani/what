import { useAssetMedia } from 'renderer/hooks/use-asset-media'

interface AssetMediaProps {
  assetId: string
  alt?: string
  parentTabId: string
}

export function AssetMedia({ assetId, alt, parentTabId }: AssetMediaProps) {
  const { dataUrl, mimeType } = useAssetMedia(assetId, parentTabId)

  if (!dataUrl) return <span className="text-gray-500">Loading asset...</span>
  
  if (mimeType?.startsWith('video/')) {
    return (
      <video controls className="max-w-full h-auto rounded">
        <source src={dataUrl} type={mimeType} />
        Your browser does not support the video tag.
      </video>
    )
  }
  
  if (mimeType?.startsWith('audio/')) {
    return (
      <audio controls className="w-full">
        <source src={dataUrl} type={mimeType} />
        Your browser does not support the audio tag.
      </audio>
    )
  }
  
  return <img src={dataUrl} alt={alt || 'Asset'} className="max-w-full h-auto rounded" />
}
