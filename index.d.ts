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
      file: {
        new: () => Promise<any>
        open: () => Promise<any>
        save: () => Promise<any>
        saveAs: () => Promise<any>
        close: () => Promise<boolean>
        getCurrentFile: () => Promise<any>
        onFileOpened: (callback: (file: any) => void) => void
      }
    }
  }
}

export {}
