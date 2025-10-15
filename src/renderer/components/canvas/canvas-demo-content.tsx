/**
 * Demo content for the canvas.
 * Remove this when adding real canvas objects.
 */
export function CanvasDemoContent() {
  return (
    <>
      {/* Demo circles in world space */}
      <circle cx={0} cy={0} fill="#14b8a6" opacity={0.8} r={50} />
      <circle cx={200} cy={0} fill="#ec4899" opacity={0.8} r={40} />
      <circle cx={-200} cy={0} fill="#f59e0b" opacity={0.8} r={40} />
      <circle cx={0} cy={-200} fill="#3b82f6" opacity={0.8} r={30} />

      {/* Center marker (0,0) */}
      <circle cx={0} cy={0} fill="#fff" r={5} />
      <line stroke="#fff" strokeWidth={2} x1={-20} x2={20} y1={0} y2={0} />
      <line stroke="#fff" strokeWidth={2} x1={0} x2={0} y1={-20} y2={20} />
    </>
  )
}
