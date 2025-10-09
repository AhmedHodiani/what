/**
 * Demo content for the canvas.
 * Remove this when adding real canvas objects.
 */
export function CanvasDemoContent() {
  return (
    <>
      {/* Demo circles in world space */}
      <circle cx={0} cy={0} r={50} fill="#14b8a6" opacity={0.8} />
      <circle cx={200} cy={0} r={40} fill="#ec4899" opacity={0.8} />
      <circle cx={-200} cy={0} r={40} fill="#f59e0b" opacity={0.8} />
      <circle cx={0} cy={-200} r={30} fill="#3b82f6" opacity={0.8} />

      {/* Center marker (0,0) */}
      <circle cx={0} cy={0} r={5} fill="#fff" />
      <line x1={-20} y1={0} x2={20} y2={0} stroke="#fff" strokeWidth={2} />
      <line x1={0} y1={-20} x2={0} y2={20} stroke="#fff" strokeWidth={2} />
    </>
  )
}
