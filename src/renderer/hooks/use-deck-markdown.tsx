import { useCallback } from 'react'
import { useMarkdown } from 'renderer/hooks/use-markdown'
import { AssetMedia } from 'renderer/components/canvas/asset-media'

export function useDeckMarkdown(parentTabId: string) {
  const { renderMarkdown: baseRenderMarkdown } = useMarkdown()
  
  const renderMarkdown = useCallback((text: string) => {
    console.log('[renderMarkdown] Called with text:', text?.substring(0, 200))
    
    if (!text || text.trim() === '') return null
    
    // Check for all special markers: assets, audio, video
    const assetRegex = /!\[([^\]]*)\]\(asset:\/\/([a-zA-Z0-9_-]+)\)/g
    const audioRegex = /\[AUDIO:([^\]]+)\]/g
    const videoRegex = /\[VIDEO:([^\]]+)\]/g
    
    const assetMatches = [...text.matchAll(assetRegex)]
    const audioMatches = [...text.matchAll(audioRegex)]
    const videoMatches = [...text.matchAll(videoRegex)]
    
    const allMatches = [
      ...assetMatches.map(m => ({ type: 'asset', match: m })),
      ...audioMatches.map(m => ({ type: 'audio', match: m })),
      ...videoMatches.map(m => ({ type: 'video', match: m })),
    ].sort((a, b) => (a.match.index || 0) - (b.match.index || 0))
    
    console.log('[renderMarkdown] Found matches:', allMatches.length)
    
    if (allMatches.length === 0) {
      return baseRenderMarkdown(text)
    }
    
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let partKey = 0
    
    allMatches.forEach(({ type, match }) => {
      if (match.index !== undefined && match.index > lastIndex) {
        const markdownBefore = text.substring(lastIndex, match.index)
        if (markdownBefore.trim()) {
          parts.push(<span key={`md-${partKey++}`}>{baseRenderMarkdown(markdownBefore)}</span>)
        }
      }
      
      if (type === 'asset') {
        const alt = match[1]
        const assetId = match[2]
        parts.push(
          <div key={`asset-${assetId}-${partKey++}`} className="my-2">
            <AssetMedia assetId={assetId} alt={alt} parentTabId={parentTabId} />
          </div>
        )
      } else if (type === 'audio') {
        const url = match[1]
        parts.push(
          <div key={`audio-${partKey++}`} className="my-2">
            <audio controls className="w-full">
              <source src={url} />
              Your browser does not support the audio tag.
            </audio>
          </div>
        )
      } else if (type === 'video') {
        const url = match[1]
        parts.push(
          <div key={`video-${partKey++}`} className="my-2">
            <video controls className="max-w-full h-auto rounded">
              <source src={url} />
              Your browser does not support the video tag.
            </video>
          </div>
        )
      }
      
      lastIndex = (match.index !== undefined ? match.index : 0) + match[0].length
    })
    
    if (lastIndex < text.length) {
      const markdownAfter = text.substring(lastIndex)
      if (markdownAfter.trim()) {
        parts.push(<span key={`md-${partKey++}`}>{baseRenderMarkdown(markdownAfter)}</span>)
      }
    }
    
    return <>{parts}</>
  }, [parentTabId, baseRenderMarkdown])
  
  return { renderMarkdown }
}
