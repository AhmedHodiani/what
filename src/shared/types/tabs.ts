// Tab management types for multi-file support

export type TabType = 'canvas' | 'spreadsheet' | 'external-web' | 'deck'

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

export interface ExternalWebTab extends BaseTab {
  type: 'external-web'
  parentTabId: string // The canvas file this external web belongs to
  objectId: string // The external-web object ID
  url: string // The URL to display
  splitView?: boolean // Whether to open in split view (50%) or full tab (100%)
}

export interface DeckTab extends BaseTab {
  type: 'deck'
  parentTabId: string // The canvas file this deck belongs to
  objectId: string // The deck object ID
  assetId?: string // Reference to JSON file with deck data
  splitView?: boolean // Whether to open in split view (50%) or full tab (100%)
}

export type FileTab = CanvasTab | SpreadsheetTab | ExternalWebTab | DeckTab

export interface TabState {
  tabs: FileTab[]
  activeTabId: string | null
}
