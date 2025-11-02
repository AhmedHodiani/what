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
        onFileOpened: (
          callback: (data: { file: any; tabId: string }) => void
        ) => () => void
        onFileClosed: (
          callback: (data: { tabId: string }) => void
        ) => () => void
        getCanvas: (canvasId: string, tabId?: string) => Promise<any>
        saveViewport: (
          canvasId: string,
          x: number,
          y: number,
          zoom: number,
          tabId?: string
        ) => Promise<void>
        getMetadata: (tabId?: string) => Promise<any>
        getFileSize: (tabId?: string) => Promise<number | null>
        saveAsset: (
          filename: string,
          dataBuffer: ArrayBuffer,
          mimeType: string,
          tabId?: string
        ) => Promise<string>
        updateAsset: (
          assetId: string,
          dataBuffer: ArrayBuffer,
          mimeType?: string,
          tabId?: string
        ) => Promise<boolean>
        getAssetPath: (
          assetId: string,
          tabId?: string
        ) => Promise<string | null>
        getAssetDataUrl: (
          assetId: string,
          tabId?: string
        ) => Promise<string | null>
        getAssetContent: (
          assetId: string,
          tabId?: string
        ) => Promise<string | null>
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
      externalTab: {
        open: (params: {
          widgetType: string
          componentName: string
          parentTabId: string
          objectId: string
          title: string
          splitView?: boolean
          icon?: string
          config?: Record<string, any>
        }) => Promise<string>
        onTabOpened: (callback: (tab: any) => void) => () => void
      }
      shortcuts: {
        onShortcut: (callback: (action: string) => void) => () => void
      }
      updater: {
        checkForUpdates: () => Promise<void>
        downloadUpdate: () => Promise<void>
        installUpdate: () => void
        onUpdateAvailable: (
          callback: (info: {
            version: string
            releaseDate: string
            releaseName?: string
            releaseNotes?: string
          }) => void
        ) => () => void
        onUpdateNotAvailable: (
          callback: (info: { version: string }) => void
        ) => () => void
        onDownloadProgress: (
          callback: (progress: {
            percent: number
            bytesPerSecond: number
            transferred: number
            total: number
          }) => void
        ) => () => void
        onUpdateDownloaded: (
          callback: (info: { version: string }) => void
        ) => () => void
        onUpdateError: (
          callback: (error: { message: string }) => void
        ) => () => void
      }
    }
    // Internal function to update tab names dynamically
    __updateTabName?: (tabId: string, newName: string) => void
  }
}

export {}
