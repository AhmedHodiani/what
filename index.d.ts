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
        new: () => Promise<{ file: any; tabId: string } | null>
        open: () => Promise<{ file: any; tabId: string } | null>
        save: (tabId?: string) => Promise<any>
        saveAs: () => Promise<any>
        close: (tabId?: string) => Promise<boolean>
        getCurrentFile: () => Promise<any>
        onFileOpened: (callback: (data: { file: any; tabId: string }) => void) => void
        getCanvas: (canvasId: string, tabId?: string) => Promise<any>
        saveViewport: (canvasId: string, x: number, y: number, zoom: number, tabId?: string) => Promise<void>
        getMetadata: (tabId?: string) => Promise<any>
      }
      tabs: {
        getAll: () => Promise<any[]>
        setActive: (tabId: string) => Promise<boolean>
        getActiveId: () => Promise<string | null>
      }
    }
  }
}

export {}
