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
}

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
  canvas_id: string
  type: string
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
  data: Buffer
  created: string
}
