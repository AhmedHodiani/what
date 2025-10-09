// Tab management types for multi-file support

export interface FileTab {
  id: string // Unique tab identifier
  filePath: string // Path to the .what file
  fileName: string // Display name
  isModified: boolean // Has unsaved changes
  isActive: boolean // Currently active tab
  viewport: {
    x: number
    y: number
    zoom: number
  }
}

export interface TabState {
  tabs: FileTab[]
  activeTabId: string | null
}
