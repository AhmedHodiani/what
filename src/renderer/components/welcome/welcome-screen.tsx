import { File, FolderOpen } from 'lucide-react'

interface WelcomeScreenProps {
  onNewFile: () => void
  onOpenFile: () => void
}

export function WelcomeScreen({ onNewFile, onOpenFile }: WelcomeScreenProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-8 max-w-md">
        {/* Logo/Title */}
        <div className="text-center">
          <h1 className="text-6xl font-bold text-teal-400 mb-2">What</h1>
          <p className="text-gray-400 text-sm">
            A local-first visual thinking app
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 w-full">
          <button
            onClick={onNewFile}
            className="flex-1 flex flex-col items-center gap-3 p-6 bg-[#1e1e1e] hover:bg-[#2d2d2d] border border-[#2d2d2d] hover:border-teal-400/50 rounded-lg transition-all group"
          >
            <File className="size-12 text-teal-400 group-hover:scale-110 transition-transform" />
            <div className="text-center">
              <div className="text-sm font-medium text-gray-200">New File</div>
              <div className="text-xs text-gray-500 mt-1">
                Create a new .what file
              </div>
            </div>
          </button>

          <button
            onClick={onOpenFile}
            className="flex-1 flex flex-col items-center gap-3 p-6 bg-[#1e1e1e] hover:bg-[#2d2d2d] border border-[#2d2d2d] hover:border-fuchsia-400/50 rounded-lg transition-all group"
          >
            <FolderOpen className="size-12 text-fuchsia-400 group-hover:scale-110 transition-transform" />
            <div className="text-center">
              <div className="text-sm font-medium text-gray-200">Open File</div>
              <div className="text-xs text-gray-500 mt-1">
                Open an existing .what file
              </div>
            </div>
          </button>
        </div>

        {/* Info */}
        <div className="text-center text-xs text-gray-600 mt-4">
          <p>
            Your ideas, notes, and media organized on an infinite canvas
          </p>
          <p className="mt-1">
            Files are stored in a self-contained .what format
          </p>
        </div>
      </div>
    </div>
  )
}
