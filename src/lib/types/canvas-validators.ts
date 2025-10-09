/**
 * Type guards and validators for canvas types.
 * Use these to validate data from external sources.
 */

import type { Point, Viewport, CanvasSize } from './canvas'

/**
 * Type guard to check if a value is a valid Point
 */
export function isPoint(value: unknown): value is Point {
  return (
    typeof value === 'object' &&
    value !== null &&
    'x' in value &&
    'y' in value &&
    typeof (value as Point).x === 'number' &&
    typeof (value as Point).y === 'number' &&
    !Number.isNaN((value as Point).x) &&
    !Number.isNaN((value as Point).y)
  )
}

/**
 * Type guard to check if a value is a valid Viewport
 */
export function isViewport(value: unknown): value is Viewport {
  return (
    typeof value === 'object' &&
    value !== null &&
    'x' in value &&
    'y' in value &&
    'zoom' in value &&
    typeof (value as Viewport).x === 'number' &&
    typeof (value as Viewport).y === 'number' &&
    typeof (value as Viewport).zoom === 'number' &&
    !Number.isNaN((value as Viewport).x) &&
    !Number.isNaN((value as Viewport).y) &&
    !Number.isNaN((value as Viewport).zoom) &&
    (value as Viewport).zoom > 0
  )
}

/**
 * Type guard to check if a value is a valid CanvasSize
 */
export function isCanvasSize(value: unknown): value is CanvasSize {
  return (
    typeof value === 'object' &&
    value !== null &&
    'width' in value &&
    'height' in value &&
    typeof (value as CanvasSize).width === 'number' &&
    typeof (value as CanvasSize).height === 'number' &&
    !Number.isNaN((value as CanvasSize).width) &&
    !Number.isNaN((value as CanvasSize).height) &&
    (value as CanvasSize).width > 0 &&
    (value as CanvasSize).height > 0
  )
}

/**
 * Validates and clamps a viewport to ensure all values are valid
 */
export function sanitizeViewport(viewport: Viewport, minZoom = 0.1, maxZoom = 5): Viewport {
  return {
    x: Number.isFinite(viewport.x) ? viewport.x : 0,
    y: Number.isFinite(viewport.y) ? viewport.y : 0,
    zoom: Math.max(minZoom, Math.min(maxZoom, Number.isFinite(viewport.zoom) ? viewport.zoom : 1)),
  }
}

/**
 * Creates a safe default viewport
 */
export function createDefaultViewport(): Viewport {
  return { x: 0, y: 0, zoom: 1 }
}
