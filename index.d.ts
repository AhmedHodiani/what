/// <reference types="vite/client" />

declare global {
  interface Window {
    App: {
      sayHelloFromBridge: () => void
      username: string | undefined
      window: {
        minimize: () => void
        maximize: () => void
        close: () => void
        isMaximized: () => Promise<boolean>
        onMaximizeChange: (callback: (isMaximized: boolean) => void) => void
      }
    }
  }
}

export {}
