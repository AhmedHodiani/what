// .what file format types

export interface WhatFile {
  path: string
  name: string
  lastModified: Date
  isModified: boolean
}

export interface WhatFileMetadata {
  version: string
  created: string
  modified: string
  title: string
  description?: string
  thumbnail?: string // Base64 encoded thumbnail
  // Viewport settings (1 file = 1 canvas)
  viewport_x?: number
  viewport_y?: number
  viewport_zoom?: number
}

// Deprecated: We no longer use canvas table (1 file = 1 canvas)
export interface WhatFileCanvas {
  id: string
  title: string
  viewport_x: number
  viewport_y: number
  viewport_zoom: number
  object_count: number
  created: string
  updated: string
}

export interface WhatFileObject {
  id: string
  type: string // Removed canvas_id since 1 file = 1 canvas
  x: number
  y: number
  width: number
  height: number
  z_index: number
  object_data: any
  created: string
  updated: string
}

export interface WhatFileAsset {
  id: string
  filename: string
  mime_type: string
  size: number
  created: string
}
