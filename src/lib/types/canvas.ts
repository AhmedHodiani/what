// Canvas system types and interfaces

export interface Point {
  x: number
  y: number
}

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export interface CanvasSize {
  width: number
  height: number
}

// Drawing Objects - Simple & Clean (no overcomplicated base classes)

export type DrawingObjectType =
  | 'freehand'
  | 'sticky-note'
  | 'image'
  | 'text'
  | 'shape'
  | 'arrow'
  | 'youtube'
  | 'emoji'
  | 'file'
  | 'spreadsheet'

// Freehand drawing (pen/pencil stroke)
export interface FreehandObject {
  id: string
  type: 'freehand'
  x: number
  y: number
  z_index: number
  object_data: {
    points: Point[] // Array of path points
    stroke?: string // Stroke color
    strokeWidth?: number // Line width
    opacity?: number // 0-1 transparency
    smoothed?: boolean // If path is smoothed
  }
  created: string
  updated: string
}

// Sticky note
export interface StickyNoteObject {
  id: string
  type: 'sticky-note'
  x: number
  y: number
  width: number
  height: number
  z_index: number
  object_data: {
    text: string // Note content
    paperColor?: string // Background color
    fontColor?: string // Text color
    fontSize?: number // Text size
    fontFamily?: string // Font family
    autoResize?: boolean // Auto-resize to fit content (default: true)
  }
  created: string
  updated: string
}

// Image object
export interface ImageObject {
  id: string
  type: 'image'
  x: number
  y: number
  width: number
  height: number
  z_index: number
  object_data: {
    assetId: string // Links to assets table -> assets/filename
    originalWidth: number // Original image dimensions
    originalHeight: number
    cropX?: number // Crop rectangle (optional)
    cropY?: number
    cropWidth?: number
    cropHeight?: number
    rotation?: number // Rotation in degrees
    flipH?: boolean // Horizontal flip
    flipV?: boolean // Vertical flip
    opacity?: number
  }
  created: string
  updated: string
}

// Shapes (rectangle, circle, etc)
export interface ShapeObject {
  id: string
  type: 'shape'
  x: number
  y: number
  width: number
  height: number
  z_index: number
  object_data: {
    shapeType:
      | 'rectangle'
      | 'circle'
      | 'ellipse'
      | 'triangle'
      | 'star'
      | 'polygon'
    fill?: string // Fill color
    stroke?: string // Border color
    strokeWidth?: number // Border width
    cornerRadius?: number // For rounded rectangles
    points?: number // For stars/polygons
    rotation?: number // Rotation in degrees
    opacity?: number
  }
  created: string
  updated: string
}

// Arrow/Line connector
export interface ArrowObject {
  id: string
  type: 'arrow'
  x: number
  y: number
  width: number
  height: number
  z_index: number
  object_data: {
    startX: number // Start point (relative to object x,y)
    startY: number
    endX: number // End point
    endY: number
    stroke?: string // Line color
    strokeWidth?: number // Line width
    arrowStart?: boolean // Arrow head at start
    arrowEnd?: boolean // Arrow head at end
    curveType?: 'straight' | 'curved' | 'stepped'
    controlPoints?: Point[] // For curved lines
    opacity?: number
  }
  created: string
  updated: string
}

// YouTube Video
export interface YouTubeVideoObject {
  id: string
  type: 'youtube'
  x: number
  y: number
  width: number
  height: number
  z_index: number
  object_data: {
    videoUrl: string // Full YouTube URL
    videoId: string // Extracted video ID
    title?: string // Video title
  }
  created: string
  updated: string
}

// Emoji object
export interface EmojiObject {
  id: string
  type: 'emoji'
  x: number
  y: number
  width: number
  height: number
  z_index: number
  object_data: {
    emoji: string // The emoji character
  }
  created: string
  updated: string
}

// File object (generic file attachment)
export interface FileObject {
  id: string
  type: 'file'
  x: number
  y: number
  width: number
  height: number
  z_index: number
  object_data: {
    assetId: string // Links to assets table -> assets/filename
    fileName: string // Original filename
    fileSize: number // File size in bytes
    mimeType: string // MIME type
  }
  created: string
  updated: string
}

// Spreadsheet object (Univer workbook)
export interface SpreadsheetObject {
  id: string
  type: 'spreadsheet'
  x: number
  y: number
  width: number
  height: number
  z_index: number
  object_data: {
    workbookData?: any // Univer workbook snapshot (JSON)
    title?: string // Spreadsheet title
  }
  created: string
  updated: string
}

// Union type for all drawing objects
export type DrawingObject =
  | FreehandObject
  | StickyNoteObject
  | ImageObject
  | ShapeObject
  | ArrowObject
  | YouTubeVideoObject
  | EmojiObject
  | FileObject
  | SpreadsheetObject
