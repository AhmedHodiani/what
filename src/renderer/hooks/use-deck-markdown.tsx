import { useCallback } from 'react'
import { useMarkdown } from 'renderer/hooks/use-markdown'
import { AssetMedia } from 'renderer/components/canvas/asset-media'
import { AudioPlayer } from 'renderer/components/canvas/audio-player'

export function useDeckMarkdown(parentTabId: string, autoPlayAudio = false) {
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
    let firstAudio = true
    
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
        const shouldAutoPlay = autoPlayAudio && firstAudio
        parts.push(
          <div key={`asset-${assetId}-${partKey++}`} className="my-2 flex justify-center w-full">
            <AssetMedia assetId={assetId} alt={alt} parentTabId={parentTabId} autoPlayAudio={shouldAutoPlay} />
          </div>
        )
        // Mark that we've added the first audio (will only auto-play if it's audio)
        if (shouldAutoPlay) firstAudio = false
      } else if (type === 'audio') {
        const url = match[1]
        const shouldAutoPlay = autoPlayAudio && firstAudio
        parts.push(
          <div key={`audio-${partKey++}`} className="my-2 w-full">
            <AudioPlayer src={url} autoPlay={shouldAutoPlay} />
          </div>
        )
        if (shouldAutoPlay) firstAudio = false
      } else if (type === 'video') {
        const url = match[1]
        parts.push(
          <div key={`video-${partKey++}`} className="my-2 flex justify-center w-full">
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
