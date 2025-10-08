import { Terminal } from 'lucide-react'
import { useEffect } from 'react'

import {
  Alert,
  AlertTitle,
  AlertDescription,
} from 'renderer/components/ui/alert'
import { InfiniteCanvas } from 'renderer/components/canvas/infinite-canvas'

// The "App" comes from the context bridge in preload/index.ts
const { App } = window

export function MainScreen() {
  useEffect(() => {
    // check the console on dev tools
    App.sayHelloFromBridge()
  }, [])

  const userName = App.username || 'there'

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-black p-8 gap-8">
      <Alert className="bg-transparent border-transparent text-accent w-fit">
        <AlertTitle className="text-4xl text-teal-400">
          Hi, {userName}!
        </AlertTitle>

        <AlertDescription className="flex items-center gap-2 text-lg">
          <Terminal className="size-6 text-fuchsia-300" />

          <span className="text-gray-400">
            Infinite canvas with pan & zoom
          </span>
        </AlertDescription>
      </Alert>

      <div className="w-full max-w-6xl">
        <InfiniteCanvas width={1200} height={700}>
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
    </main>
  )
}
