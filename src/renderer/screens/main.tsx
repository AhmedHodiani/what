import { InfiniteCanvas } from 'renderer/components/canvas/infinite-canvas'
import { MenuBar } from 'renderer/components/layout/menu-bar'

export function MainScreen() {
  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e] overflow-hidden">
      {/* Top Menu Bar */}
      <MenuBar />

      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        <InfiniteCanvas>
          {/* Demo content - some circles in world space */}
          <circle cx={0} cy={0} r={50} fill="#14b8a6" opacity={0.8} />
          <circle cx={200} cy={0} r={40} fill="#ec4899" opacity={0.8} />
          <circle cx={-200} cy={0} r={40} fill="#f59e0b" opacity={0.8} />
          <circle cx={0} cy={200} r={30} fill="#8b5cf6" opacity={0.8} />
          <circle cx={0} cy={-200} r={30} fill="#3b82f6" opacity={0.8} />
          
          {/* Center marker */}
          <circle cx={0} cy={0} r={5} fill="#fff" />
          <line x1={-20} y1={0} x2={20} y2={0} stroke="#fff" strokeWidth={2} />
          <line x1={0} y1={-20} x2={0} y2={20} stroke="#fff" strokeWidth={2} />
        </InfiniteCanvas>
      </div>
    </div>
  )
}
