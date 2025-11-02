import { useEffect, useState, useRef } from 'react'
import { logger } from 'shared/logger'

interface ImageViewerEditorProps {
  tabId: string // FlexLayout tab ID (passed from factory)
  objectId: string
  parentTabId: string
  title: string
  assetId: string
}

/**
 * ImageViewerEditor - Full-screen image viewer in a dedicated tab
 * 
 * Opened when user double-clicks an image widget on the canvas
 * Displays the full-resolution image with zoom/pan controls
 */
export function ImageViewerEditor({
  tabId,
  objectId,
  parentTabId,
  title,
  assetId,
}: ImageViewerEditorProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [startPan, setStartPan] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(1)
  const panRef = useRef({ x: 0, y: 0 })

  // Keep refs in sync with state
  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  useEffect(() => {
    panRef.current = pan
  }, [pan])

  // Debug: Log all props
  useEffect(() => {
    logger.objects.debug('[ImageViewer] Component mounted with props:', {
      tabId,
      objectId,
      parentTabId,
      title,
      assetId,
    })
  }, [tabId, objectId, parentTabId, title, assetId])

  // Load image from asset
  useEffect(() => {
    async function loadImage() {
      try {
        logger.objects.debug(`[ImageViewer] Loading asset ${assetId} for tab ${tabId}`)
        // Get the data URL (base64 encoded) - works in Electron renderer
        const dataUrl = await window.App.file.getAssetDataUrl(assetId, parentTabId)
        logger.objects.debug('[ImageViewer] Got image data URL, length:', dataUrl?.length)
        setImageUrl(dataUrl)
      } catch (err) {
        logger.error('[ImageViewer] Failed to load image:', err)
        setError('Failed to load image')
      }
    }

    if (assetId) {
      loadImage()
    } else {
      logger.error('[ImageViewer] No assetId provided!')
      setError('No asset ID provided')
    }
  }, [assetId, parentTabId, tabId])

  // Handle zoom controls
  const handleZoomIn = () => setZoom(prev => prev + 0.25)
  const handleZoomOut = () => setZoom(prev => Math.max(0.1, prev - 0.25)) // Min 10% zoom
  const handleResetZoom = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // Handle mouse wheel zoom with mouse position tracking (like canvas)
  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      logger.objects.debug('[ImageViewer] No container ref')
      return
    }

    logger.objects.debug('[ImageViewer] Setting up wheel event listener')

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      
      logger.objects.debug('[ImageViewer] Wheel event:', e.deltaY)
      
      // Get mouse position relative to container
      const rect = container.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      // Calculate mouse position relative to center
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      const offsetX = mouseX - centerX
      const offsetY = mouseY - centerY
      
      // Zoom delta
      const delta = -e.deltaY * 0.001
      const currentZoom = zoomRef.current
      const newZoom = Math.max(0.1, currentZoom + delta) // Min 10% zoom
      const zoomRatio = newZoom / currentZoom
      
      logger.objects.debug('[ImageViewer] Zoom change:', { currentZoom, newZoom, delta })
      
      // Adjust pan to zoom towards mouse position
      const currentPan = panRef.current
      setPan({
        x: currentPan.x - offsetX * (zoomRatio - 1),
        y: currentPan.y - offsetY * (zoomRatio - 1),
      })
      
      setZoom(newZoom)
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, []) // Empty deps - use refs instead

  // Handle panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 0) { // Middle or left mouse button
      setIsPanning(true)
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      e.preventDefault()
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  const handleMouseLeave = () => {
    setIsPanning(false)
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-xl mb-2">⚠️</p>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!imageUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <p>Loading image...</p>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: isPanning ? 'grabbing' : 'grab', zIndex: 50 }}
    >
      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2 bg-black/50 rounded-lg p-2">
        <button
          type="button"
          onClick={handleZoomOut}
          className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
          title="Zoom Out (Scroll)"
        >
          −
        </button>
        <button
          type="button"
          onClick={handleResetZoom}
          className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
          title="Reset Zoom & Pan"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={handleZoomIn}
          className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
          title="Zoom In (Scroll)"
        >
          +
        </button>
      </div>

      {/* Image display */}
      <div className="flex items-center justify-center w-full h-full">
        <img
          src={imageUrl}
          alt={title}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center',
            transition: isPanning ? 'none' : 'transform 0.1s ease-out',
            pointerEvents: 'none',
          }}
          className="max-w-none select-none"
          onLoad={() => logger.objects.debug('[ImageViewer] Image loaded successfully')}
          onError={(e) => {
            logger.error('[ImageViewer] Image failed to load:', e)
            setError('Image failed to load')
          }}
          draggable={false}
        />
      </div>
    </div>
  )
}
