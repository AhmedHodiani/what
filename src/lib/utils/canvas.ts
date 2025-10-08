import type { Point, Viewport, CanvasSize } from 'lib/types/canvas'

export class CanvasUtils {
  // Convert screen coordinates to world coordinates
  static screenToWorld(
    screenPoint: Point,
    viewport: Viewport,
    canvasSize: CanvasSize
  ): Point {
    return {
      x: viewport.x + (screenPoint.x - canvasSize.width / 2) / viewport.zoom,
      y: viewport.y + (screenPoint.y - canvasSize.height / 2) / viewport.zoom,
    }
  }

  // Convert world coordinates to screen coordinates
  static worldToScreen(
    worldPoint: Point,
    viewport: Viewport,
    canvasSize: CanvasSize
  ): Point {
    return {
      x: (worldPoint.x - viewport.x) * viewport.zoom + canvasSize.width / 2,
      y: (worldPoint.y - viewport.y) * viewport.zoom + canvasSize.height / 2,
    }
  }

  // Clamp zoom level within reasonable bounds
  static clampZoom(zoom: number, min = 0.1, max = 5): number {
    return Math.max(min, Math.min(max, zoom))
  }
}
