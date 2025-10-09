import { WhatFileService } from './what-file'
import type { WhatFile } from 'shared/types/what-file'
import type { FileTab } from 'shared/types/tabs'
import { randomBytes } from 'node:crypto'

/**
 * Generate a simple UUID
 */
function generateId(): string {
  return randomBytes(16).toString('hex')
}

/**
 * Manages multiple open .what files with tab-based interface
 * Each file has its own WhatFileService instance and tab ID
 */
export class MultiFileManager {
  private fileServices: Map<string, WhatFileService> = new Map() // tabId -> service
  private tabs: Map<string, FileTab> = new Map() // tabId -> tab info
  private activeTabId: string | null = null

  /**
   * Create a new file and open it in a new tab
   */
  createNewFile(filePath: string): { file: WhatFile; tabId: string } {
    const service = new WhatFileService()
    const file = service.createNewFile(filePath)
    
    const tabId = generateId()
    const tab: FileTab = {
      id: tabId,
      filePath: file.path,
      fileName: file.name,
      isModified: false,
      isActive: true,
      viewport: { x: 0, y: 0, zoom: 1 },
    }

    // Store the service and tab
    this.fileServices.set(tabId, service)
    this.tabs.set(tabId, tab)

    // Update active states
    this.setActiveTab(tabId)

    return { file, tabId }
  }

  /**
   * Open an existing file in a new tab
   */
  openFile(filePath: string): { file: WhatFile; tabId: string } {
    // Check if file is already open
    const existingTab = Array.from(this.tabs.values()).find(
      (tab) => tab.filePath === filePath
    )
    if (existingTab) {
      this.setActiveTab(existingTab.id)
      const service = this.fileServices.get(existingTab.id)!
      return { file: service.getCurrentFile()!, tabId: existingTab.id }
    }

    // Open new file
    const service = new WhatFileService()
    const file = service.openFile(filePath)
    
    const tabId = generateId()
    
    // Get viewport from the file
    const viewport = service.getViewport()
    
    const tab: FileTab = {
      id: tabId,
      filePath: file.path,
      fileName: file.name,
      isModified: false,
      isActive: true,
      viewport,
    }

    // Store the service and tab
    this.fileServices.set(tabId, service)
    this.tabs.set(tabId, tab)

    // Update active states
    this.setActiveTab(tabId)

    return { file, tabId }
  }

  /**
   * Close a file tab
   */
  closeTab(tabId: string): void {
    const service = this.fileServices.get(tabId)
    if (service) {
      // Save before closing
      try {
        service.saveFile()
      } catch (error) {
        console.error(`Failed to save file before closing tab ${tabId}:`, error)
      }
      service.closeFile()
    }

    this.fileServices.delete(tabId)
    this.tabs.delete(tabId)

    // If closing active tab, switch to another tab
    if (this.activeTabId === tabId) {
      const remainingTabs = Array.from(this.tabs.keys())
      if (remainingTabs.length > 0) {
        this.setActiveTab(remainingTabs[0])
      } else {
        this.activeTabId = null
      }
    }
  }

  /**
   * Save the active file
   */
  saveActiveFile(): WhatFile | null {
    if (!this.activeTabId) return null

    const service = this.fileServices.get(this.activeTabId)
    if (!service) return null

    try {
      service.saveFile()
      const tab = this.tabs.get(this.activeTabId)!
      tab.isModified = false
      return service.getCurrentFile()
    } catch (error) {
      console.error('Failed to save active file:', error)
      throw error
    }
  }

  /**
   * Save a specific tab's file
   */
  saveTab(tabId: string): WhatFile | null {
    const service = this.fileServices.get(tabId)
    if (!service) return null

    try {
      service.saveFile()
      const tab = this.tabs.get(tabId)!
      tab.isModified = false
      return service.getCurrentFile()
    } catch (error) {
      console.error(`Failed to save tab ${tabId}:`, error)
      throw error
    }
  }

  /**
   * Save all open files
   */
  saveAll(): void {
    for (const [tabId, service] of this.fileServices.entries()) {
      try {
        service.saveFile()
        const tab = this.tabs.get(tabId)!
        tab.isModified = false
      } catch (error) {
        console.error(`Failed to save tab ${tabId}:`, error)
      }
    }
  }

  /**
   * Set the active tab
   */
  setActiveTab(tabId: string): void {
    // Deactivate all tabs
    for (const tab of this.tabs.values()) {
      tab.isActive = false
    }

    // Activate the specified tab
    const tab = this.tabs.get(tabId)
    if (tab) {
      tab.isActive = true
      this.activeTabId = tabId
    }
  }

  /**
   * Get the active file
   */
  getActiveFile(): WhatFile | null {
    if (!this.activeTabId) return null
    const service = this.fileServices.get(this.activeTabId)
    return service?.getCurrentFile() ?? null
  }

  /**
   * Get the active tab ID
   */
  getActiveTabId(): string | null {
    return this.activeTabId
  }

  /**
   * Get all tabs
   */
  getTabs(): FileTab[] {
    return Array.from(this.tabs.values())
  }

  /**
   * Get a specific tab
   */
  getTab(tabId: string): FileTab | null {
    return this.tabs.get(tabId) ?? null
  }

  /**
   * Get the service for a specific tab
   */
  getService(tabId: string): WhatFileService | null {
    return this.fileServices.get(tabId) ?? null
  }

  /**
   * Get the active service
   */
  getActiveService(): WhatFileService | null {
    if (!this.activeTabId) return null
    return this.fileServices.get(this.activeTabId) ?? null
  }

  /**
   * Save viewport for a specific tab
   */
  saveViewport(tabId: string, x: number, y: number, zoom: number): void {
    const service = this.fileServices.get(tabId)
    if (!service) {
      throw new Error(`No file service found for tab ${tabId}`)
    }

    service.saveViewport(x, y, zoom)
    
    // Update tab viewport cache
    const tab = this.tabs.get(tabId)
    if (tab) {
      tab.viewport = { x, y, zoom }
    }
  }

  /**
   * Get viewport for a specific tab
   */
  getViewport(tabId: string): { x: number; y: number; zoom: number } {
    const service = this.fileServices.get(tabId)
    if (!service) {
      throw new Error(`No file service found for tab ${tabId}`)
    }

    return service.getViewport()
  }

  /**
   * Get metadata for a specific tab
   */
  getMetadata(tabId: string): Record<string, any> {
    const service = this.fileServices.get(tabId)
    if (!service) {
      throw new Error(`No file service found for tab ${tabId}`)
    }

    return service.getMetadata()
  }

  /**
   * Mark a tab as modified
   */
  markTabModified(tabId: string): void {
    const tab = this.tabs.get(tabId)
    if (tab) {
      tab.isModified = true
    }
  }

  /**
   * Close all tabs
   */
  closeAll(): void {
    // Save all files first
    this.saveAll()

    // Close all services
    for (const service of this.fileServices.values()) {
      service.closeFile()
    }

    this.fileServices.clear()
    this.tabs.clear()
    this.activeTabId = null
  }
}

// Singleton instance
export const multiFileManager = new MultiFileManager()
