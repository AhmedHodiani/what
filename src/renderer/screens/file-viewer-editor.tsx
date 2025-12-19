import { useEffect, useState, useRef } from 'react'
import { logger } from 'shared/logger'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from 'lucide-react'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface FileViewerEditorProps {
  tabId: string // FlexLayout tab ID (passed from factory)
  objectId: string
  parentTabId: string
  title: string
  assetId: string
  fileName: string
  mimeType: string
}

/**
 * FileViewerEditor - Full-screen file viewer in a dedicated tab
 * 
 * Supports viewing:
 * - Videos (mp4, webm, etc.)
 * - PDFs
 * - Audio files
 * - Text files
 * 
 * Opened when user double-clicks a file widget on the canvas
 */
export function FileViewerEditor({
  tabId,
  objectId,
  parentTabId,
  title,
  assetId,
  fileName,
  mimeType = '', // Default to empty string to prevent crashes
}: FileViewerEditorProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isPanMode, setIsPanMode] = useState(false) // Space key held
  
  // Video player state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const zoomRef = useRef(zoom)
  const panRef = useRef(pan)

  // Keep refs in sync with state
  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  useEffect(() => {
    panRef.current = pan
  }, [pan])

  // Ctrl key for pan mode
  useEffect(() => {
    if (!mimeType.includes('pdf')) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.repeat) {
        setIsPanMode(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey) {
        setIsPanMode(false)
        setIsDragging(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [mimeType])

  // Mouse wheel zoom for PDFs
  useEffect(() => {
    const container = pdfContainerRef.current
    if (!container || !mimeType.includes('pdf')) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()

      const rect = container.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.5, Math.min(5, zoomRef.current * delta))

      // Adjust pan to zoom towards mouse position
      const zoomPoint = {
        x: (mouseX - panRef.current.x) / zoomRef.current,
        y: (mouseY - panRef.current.y) / zoomRef.current,
      }

      const newPan = {
        x: mouseX - zoomPoint.x * newZoom,
        y: mouseY - zoomPoint.y * newZoom,
      }

      setZoom(newZoom)
      setPan(newPan)
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [mimeType])

  // Mouse drag pan handlers (only when Ctrl is held)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!mimeType.includes('pdf')) return
    if (!e.ctrlKey) return // Only pan when Ctrl is held
    if (e.button !== 0) return // Only left click
    
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !e.ctrlKey) return
    e.preventDefault()
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(5, prev * 1.2))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.5, prev / 1.2))
  }

  const handleResetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // Video controls
  const togglePlayPause = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    const video = videoRef.current
    if (video) {
      setCurrentTime(video.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    const video = videoRef.current
    if (video) {
      setDuration(video.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    const time = Number.parseFloat(e.target.value)
    if (video) {
      video.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    const newVolume = Number.parseFloat(e.target.value)
    if (video) {
      video.volume = newVolume
      setVolume(newVolume)
      setIsMuted(newVolume === 0)
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (video) {
      const newMuted = !isMuted
      video.muted = newMuted
      setIsMuted(newMuted)
    }
  }

  const skip = (seconds: number) => {
    const video = videoRef.current
    if (video) {
      const newTime = Math.max(0, Math.min(duration, video.currentTime + seconds))
      video.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const toggleFullscreen = () => {
    const container = document.querySelector('.video-player-container')
    if (!container) return

    if (!document.fullscreenElement) {
      container.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleMouseMoveVideo = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
  }

  // Debug: Log all props
  useEffect(() => {
    logger.objects.debug('[FileViewer] Component mounted with props:', {
      tabId,
      objectId,
      parentTabId,
      title,
      assetId,
      fileName,
      mimeType,
    })
  }, [tabId, objectId, parentTabId, title, assetId, fileName, mimeType])

  // Load file from asset
  useEffect(() => {
    async function loadFile() {
      try {
        logger.objects.debug(`[FileViewer] Loading asset ${assetId} for tab ${tabId}`)
        
        // Get the data URL (base64 encoded)
        const dataUrl = await window.App.file.getAssetDataUrl(assetId, parentTabId)
        logger.objects.debug('[FileViewer] Got file data URL, length:', dataUrl?.length)
        
        // For PDFs, convert data URL to blob URL to avoid CSP issues
        if (mimeType.includes('pdf') && dataUrl) {
          // Extract base64 data from data URL
          const base64Data = dataUrl.split(',')[1]
          const binaryData = atob(base64Data)
          const bytes = new Uint8Array(binaryData.length)
          for (let i = 0; i < binaryData.length; i++) {
            bytes[i] = binaryData.charCodeAt(i)
          }
          const blob = new Blob([bytes], { type: 'application/pdf' })
          const blobUrl = URL.createObjectURL(blob)
          setFileUrl(blobUrl)
          
          // Cleanup blob URL on unmount
          return () => URL.revokeObjectURL(blobUrl)
        } else {
          setFileUrl(dataUrl)
        }
      } catch (err) {
        logger.error('[FileViewer] Failed to load file:', err)
        setError('Failed to load file')
      }
    }

    if (assetId) {
      const cleanup = loadFile()
      return () => {
        if (cleanup && typeof cleanup.then === 'function') {
          cleanup.then(fn => fn && fn())
        }
      }
    } else {
      logger.error('[FileViewer] No assetId provided!')
      setError('No asset ID provided')
    }
  }, [assetId, parentTabId, tabId, mimeType])

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white z-50">
        <div className="text-center">
          <p className="text-xl mb-2">⚠️</p>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white z-50">
        <p>Loading {fileName}...</p>
      </div>
    )
  }

  // Render based on MIME type
  const renderContent = () => {
    // Video files
    if (mimeType.startsWith('video/')) {
      return (
        <div 
          className="video-player-container relative w-full h-full bg-black z-50"
          onMouseMove={handleMouseMoveVideo}
          onMouseEnter={() => setShowControls(true)}
        >
          <video
            ref={videoRef}
            src={fileUrl}
            className="absolute inset-0 w-full h-full"
            style={{ 
              objectFit: 'contain',
            }}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onClick={togglePlayPause}
          >
            Your browser does not support the video tag.
          </video>

          {/* Custom Video Controls */}
          <div 
            className={`absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Progress Bar */}
            <div className="mb-3" onClick={(e) => e.stopPropagation()}>
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #4b5563 ${(currentTime / duration) * 100}%, #4b5563 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-gray-300 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              {/* Play/Pause */}
              <button
                type="button"
                onClick={togglePlayPause}
                className="p-2 hover:bg-white/10 rounded transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" fill="white" />
                ) : (
                  <Play className="w-5 h-5 text-white" fill="white" />
                )}
              </button>

              {/* Skip Back */}
              <button
                type="button"
                onClick={() => skip(-10)}
                className="p-2 hover:bg-white/10 rounded transition-colors"
                title="Skip back 10s"
              >
                <SkipBack className="w-4 h-4 text-white" />
              </button>

              {/* Skip Forward */}
              <button
                type="button"
                onClick={() => skip(10)}
                className="p-2 hover:bg-white/10 rounded transition-colors"
                title="Skip forward 10s"
              >
                <SkipForward className="w-4 h-4 text-white" />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2 ml-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-2 hover:bg-white/10 rounded transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-white" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-white" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${volume * 100}%, #4b5563 ${volume * 100}%, #4b5563 100%)`
                  }}
                />
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Fullscreen */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2 hover:bg-white/10 rounded transition-colors"
              >
                <Maximize className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )
    }

    // PDF files
    if (mimeType.includes('pdf')) {
      return (
        <div className="w-full h-full flex flex-col bg-black/80">
          {/* PDF Controls */}
          <div className="flex items-center justify-between bg-black/80 p-3 border-b border-gray-700">
            {/* Page Navigation */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
                disabled={pageNumber <= 1}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded transition-colors"
              >
                ← Previous
              </button>
              <span className="text-white">
                Page {pageNumber} of {numPages || '?'}
              </span>
              <button
                type="button"
                onClick={() => setPageNumber(prev => Math.min(numPages || prev, prev + 1))}
                disabled={pageNumber >= (numPages || 0)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded transition-colors"
              >
                Next →
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleZoomOut}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                title="Zoom Out"
              >
                −
              </button>
              <span className="text-white min-w-16 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                title="Zoom In"
              >
                +
              </button>
              <button
                type="button"
                onClick={handleResetView}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                title="Reset View"
              >
                Reset
              </button>
            </div>
          </div>

          {/* PDF Viewer */}
          <div
            ref={pdfContainerRef}
            className="flex-1 overflow-hidden flex items-center justify-center"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              cursor: isDragging ? 'grabbing' : isPanMode ? 'grab' : 'default',
            }}
          >
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                pointerEvents: 'auto',
                userSelect: 'text',
              }}
            >
              <Document
                file={fileUrl}
                onLoadSuccess={({ numPages }) => {
                  setNumPages(numPages)
                  logger.objects.debug('[FileViewer] PDF loaded:', numPages, 'pages')
                }}
                onLoadError={(error) => {
                  logger.error('[FileViewer] PDF load error:', error)
                  setError('Failed to load PDF')
                }}
                loading={
                  <div className="text-white text-center py-8">
                    <p>Loading PDF...</p>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="shadow-lg"
                />
              </Document>
            </div>
          </div>
        </div>
      )
    }

    // Audio files
    if (mimeType.startsWith('audio/')) {
      return (
        <div className="flex items-center justify-center w-full h-full bg-gray-900 z-50">
          <div className="text-center">
            <div className="text-6xl mb-4">🎵</div>
            <div className="text-white text-lg mb-4">{fileName}</div>
            <audio src={fileUrl} controls className="w-96" />
          </div>
        </div>
      )
    }

    // Text files
    if (mimeType.startsWith('text/')) {
      return (
        <div className="w-full h-full overflow-auto bg-gray-900 p-8 z-50">
          <pre className="text-gray-200 font-mono text-sm whitespace-pre-wrap">
            {/* Text content would be decoded from data URL */}
            <iframe
              src={fileUrl}
              title={fileName}
              className="w-full h-full border-0 bg-white"
            />
          </pre>
        </div>
      )
    }

    // Unsupported file type
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white z-50">
        <div className="text-center">
          <p className="text-xl mb-2">📎</p>
          <p className="mb-4">Cannot preview this file type</p>
          <p className="text-sm text-gray-400">{fileName}</p>
          <p className="text-xs text-gray-500 mt-2">{mimeType}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-gray-900 z-50">
      {renderContent()}
    </div>
  )
}
