// Tab management types for multi-file support

export type TabType = 'canvas' | 'spreadsheet'

export interface BaseTab {
  id: string // Unique tab identifier
  type: TabType // Type of tab (canvas or spreadsheet)
  fileName: string // Display name
  isModified: boolean // Has unsaved changes
  isActive: boolean // Currently active tab
}

export interface CanvasTab extends BaseTab {
  type: 'canvas'
  filePath: string // Path to the .what file
  viewport: {
    x: number
    y: number
    zoom: number
  }
}

export interface SpreadsheetTab extends BaseTab {
  type: 'spreadsheet'
  parentTabId: string // The canvas file this spreadsheet belongs to
  objectId: string // The spreadsheet object ID
  assetId?: string // Reference to JSON file with workbook data
  splitView?: boolean // Whether to open in split view (50%) or full tab (100%)
}

export type FileTab = CanvasTab | SpreadsheetTab

export interface TabState {
  tabs: FileTab[]
  activeTabId: string | null
}
