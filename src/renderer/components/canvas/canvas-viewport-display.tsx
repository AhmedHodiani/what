import type { Viewport } from 'lib/types/canvas'

interface CanvasViewportDisplayProps {
  viewport: Viewport
}

/**
 * Displays current viewport information (zoom level and position).
 * Useful for debugging and user feedback.
 */
export function CanvasViewportDisplay({ viewport }: CanvasViewportDisplayProps) {
  return (
    <div className="absolute top-3 left-3 bg-black/80 text-teal-400 px-3 py-2 rounded-md text-xs font-mono pointer-events-none flex flex-col gap-1 border border-teal-400/30">
      <div>Zoom: {(viewport.zoom * 100).toFixed(0)}%</div>
      <div>
        Position: ({viewport.x.toFixed(0)}, {viewport.y.toFixed(0)})
      </div>
      <div className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-0.5 text-[11px] text-gray-500">
        <span>🖱️ Drag to pan</span>
        <span>🖲️ Scroll to zoom</span>
      </div>
    </div>
  )
}
