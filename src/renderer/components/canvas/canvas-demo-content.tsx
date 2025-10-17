/**
 * Demo content for the canvas.
 * Remove this when adding real canvas objects.
 */
export function CanvasDemoContent() {
  return (
    <>
      {/* Center marker (0,0) */}
      <circle cx={0} cy={0} fill="#fff" r={5} />
      <line stroke="#fff" strokeWidth={2} x1={-20} x2={20} y1={0} y2={0} />
      <line stroke="#fff" strokeWidth={2} x1={0} x2={0} y1={-20} y2={20} />
    </>
  )
}
