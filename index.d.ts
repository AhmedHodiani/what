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
        getFileSize: (tabId?: string) => Promise<number | null>
        saveAsset: (filename: string, dataBuffer: ArrayBuffer, mimeType: string, tabId?: string) => Promise<string>
        getAssetPath: (assetId: string, tabId?: string) => Promise<string | null>
        getAssetDataUrl: (assetId: string, tabId?: string) => Promise<string | null>
        deleteAsset: (assetId: string, tabId?: string) => Promise<boolean>
        getObjects: (tabId?: string) => Promise<any[]>
        saveObject: (object: any, tabId?: string) => Promise<boolean>
        deleteObject: (objectId: string, tabId?: string) => Promise<boolean>
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
