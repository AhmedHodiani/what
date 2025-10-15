import Database from 'better-sqlite3'
import AdmZip from 'adm-zip'
import { basename, join } from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import type {
  WhatFile,
  WhatFileMetadata,
  WhatFileObject,
} from 'shared/types/what-file'

const WHAT_FILE_VERSION = '1.0.0'

/**
 * Magic number to identify .what files (8 bytes: "WHAT" + version bytes)
 * 
 * Structure: [0x57, 0x48, 0x41, 0x54, 0x01, 0x00, 0x00, 0x00]
 * - Bytes 0-3: ASCII "WHAT" (0x57 0x48 0x41 0x54)
 * - Bytes 4-7: Format version (0x01 0x00 0x00 0x00 = v1.0.0.0)
 * 
 * This header prevents the OS from treating .what files as regular ZIP archives
 * and allows the Electron app to verify file integrity before opening.
 * 
 * File structure:
 * [MAGIC_NUMBER (8 bytes)][ZIP data containing: main.db, meta.json, assets/]
 * 
 * Database structure (simplified for 1 file = 1 canvas):
 * - metadata table: version, title, viewport settings, etc.
 * - objects table: drawing objects (no canvas_id needed)
 * - assets table: embedded media files
 */
const WHAT_MAGIC_NUMBER = Buffer.from([0x57, 0x48, 0x41, 0x54, 0x01, 0x00, 0x00, 0x00])

export class WhatFileService {
  private db: Database.Database | null = null
  private currentFile: WhatFile | null = null
  private workingDir: string | null = null // Temp directory for extracted files

  /**
   * Create a new .what file
   */
  createNewFile(filePath: string): WhatFile {
    try {
      // Close existing file if open
      this.closeFile()

      // Create temp working directory
      this.workingDir = join(tmpdir(), `what-${Date.now()}`)
      mkdirSync(this.workingDir, { recursive: true })
      mkdirSync(join(this.workingDir, 'assets'), { recursive: true })

      // Create SQLite database in temp directory
      const dbPath = join(this.workingDir, 'main.db')
      this.db = new Database(dbPath)
      this.db.pragma('journal_mode = DELETE') // Use DELETE mode to avoid WAL files
      this.db.pragma('auto_vacuum = INCREMENTAL') // Enable auto vacuum to reclaim space on delete

      // Initialize database schema
      this.initializeSchema()

      // Create initial metadata with default viewport
      const now = new Date().toISOString()
      const metadata: WhatFileMetadata = {
        version: WHAT_FILE_VERSION,
        created: now,
        modified: now,
        title: basename(filePath, '.what'),
        viewport_x: 0,
        viewport_y: 0,
        viewport_zoom: 1,
      }

      this.setMetadata(metadata)

      // Create meta.json
      const metaJson = {
        version: WHAT_FILE_VERSION,
        created: now,
        modified: now,
        appVersion: '0.0.0', // TODO: Get from package.json
      }
      writeFileSync(
        join(this.workingDir, 'meta.json'),
        JSON.stringify(metaJson, null, 2)
      )

      // Package everything into .what file (ZIP)
      this.packageWhatFile(filePath)

      const file: WhatFile = {
        path: filePath,
        name: basename(filePath),
        lastModified: new Date(),
        isModified: false,
      }

      this.currentFile = file
      return file
    } catch (error) {
      console.error('Failed to create new file:', error)
      this.cleanup()
      throw new Error(
        `Failed to create file: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Open an existing .what file
   */
  openFile(filePath: string): WhatFile {
    try {
      if (!existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`)
      }

      // Close existing file if open
      this.closeFile()

      // Read file and verify magic number
      const fileBuffer = readFileSync(filePath)
      if (fileBuffer.length < WHAT_MAGIC_NUMBER.length) {
        throw new Error('Invalid .what file: file too small')
      }

      // Check magic number
      const magic = fileBuffer.subarray(0, WHAT_MAGIC_NUMBER.length)
      if (!magic.equals(WHAT_MAGIC_NUMBER)) {
        throw new Error('Invalid .what file: incorrect magic number')
      }

      // Extract ZIP data (everything after magic number)
      const zipData = fileBuffer.subarray(WHAT_MAGIC_NUMBER.length)

      // Create temp working directory
      this.workingDir = join(tmpdir(), `what-${Date.now()}`)
      mkdirSync(this.workingDir, { recursive: true })

      // Extract .what file (ZIP) to temp directory
      const zip = new AdmZip(zipData)
      zip.extractAllTo(this.workingDir, true)

      // Verify structure
      const dbPath = join(this.workingDir, 'main.db')
      const metaPath = join(this.workingDir, 'meta.json')
      const assetsPath = join(this.workingDir, 'assets')

      if (!existsSync(dbPath)) {
        throw new Error('Invalid .what file: missing main.db')
      }
      if (!existsSync(metaPath)) {
        throw new Error('Invalid .what file: missing meta.json')
      }
      if (!existsSync(assetsPath)) {
        mkdirSync(assetsPath, { recursive: true })
      }

      // Open SQLite database
      this.db = new Database(dbPath)
      this.db.pragma('journal_mode = DELETE')
      this.db.pragma('auto_vacuum = INCREMENTAL') // Enable auto vacuum to reclaim space on delete

      // Verify schema
      this.verifySchema()

      // Update last modified
      this.updateMetadata({ modified: new Date().toISOString() })

      // Update meta.json
      const meta = JSON.parse(readFileSync(metaPath, 'utf-8'))
      meta.modified = new Date().toISOString()
      writeFileSync(metaPath, JSON.stringify(meta, null, 2))

      const file: WhatFile = {
        path: filePath,
        name: basename(filePath),
        lastModified: new Date(),
        isModified: false,
      }

      this.currentFile = file
      return file
    } catch (error) {
      console.error('Failed to open file:', error)
      this.cleanup()
      throw new Error(
        `Failed to open file: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Save current file
   */
  saveFile(): void {
    if (!this.currentFile || !this.workingDir) {
      throw new Error('No file is currently open')
    }

    try {
      // Close database to flush changes
      if (this.db) {
        this.db.close()
        this.db = null
      }

      // Update meta.json
      const metaPath = join(this.workingDir, 'meta.json')
      const meta = JSON.parse(readFileSync(metaPath, 'utf-8'))
      meta.modified = new Date().toISOString()
      writeFileSync(metaPath, JSON.stringify(meta, null, 2))

      // Package everything into .what file
      this.packageWhatFile(this.currentFile.path)

      // Reopen database
      const dbPath = join(this.workingDir, 'main.db')
      this.db = new Database(dbPath)
      this.db.pragma('journal_mode = DELETE')
      this.db.pragma('auto_vacuum = INCREMENTAL')

      this.currentFile.isModified = false
      this.currentFile.lastModified = new Date()
    } catch (error) {
      console.error('Failed to save file:', error)
      throw new Error(
        `Failed to save file: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Package working directory into .what file (ZIP)
   */
  private packageWhatFile(filePath: string): void {
    if (!this.workingDir) {
      throw new Error('No working directory')
    }

    // Close database to ensure all data is written
    if (this.db) {
      this.db.close()
      this.db = null
    }

    // Create ZIP file
    const zip = new AdmZip()

    // Add main.db
    const dbPath = join(this.workingDir, 'main.db')
    if (existsSync(dbPath)) {
      zip.addLocalFile(dbPath)
    }

    // Add meta.json
    const metaPath = join(this.workingDir, 'meta.json')
    if (existsSync(metaPath)) {
      zip.addLocalFile(metaPath)
    }

    // Add assets folder
    const assetsPath = join(this.workingDir, 'assets')
    if (existsSync(assetsPath)) {
      zip.addLocalFolder(assetsPath, 'assets')
    }

    // Get ZIP buffer
    const zipBuffer = zip.toBuffer()

    // Prepend magic number to ZIP data
    const whatBuffer = Buffer.concat([WHAT_MAGIC_NUMBER, zipBuffer])

    // Write to file
    writeFileSync(filePath, whatBuffer)

    // Reopen database
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = DELETE')
    this.db.pragma('auto_vacuum = INCREMENTAL') // Enable auto vacuum to reclaim space on delete
  }

  /**
   * Close current file and cleanup
   */
  closeFile(): void {
    try {
      if (this.currentFile && this.currentFile.isModified) {
        this.saveFile()
      }

      if (this.db) {
        this.db.close()
        this.db = null
      }

      this.cleanup()
      this.currentFile = null
    } catch (error) {
      console.error('Failed to close file:', error)
    }
  }

  /**
   * Cleanup temp working directory
   */
  private cleanup(): void {
    if (this.workingDir && existsSync(this.workingDir)) {
      try {
        rmSync(this.workingDir, { recursive: true, force: true })
      } catch (error) {
        console.error('Failed to cleanup working directory:', error)
      }
      this.workingDir = null
    }
  }

  /**
   * Get current file info
   */
  getCurrentFile(): WhatFile | null {
    return this.currentFile
  }

  /**
   * Get current file size in bytes (calculated from working directory for real-time updates)
   */
  getFileSize(): number | null {
    // If no file is open, return null
    if (!this.workingDir || !existsSync(this.workingDir)) {
      return null
    }

    try {
      // Calculate size of all files in working directory (including database, assets, meta.json)
      return this.calculateDirectorySize(this.workingDir)
    } catch (error) {
      console.error('[WhatFile] Failed to calculate file size:', error)
      return null
    }
  }

  /**
   * Recursively calculate the total size of a directory
   */
  private calculateDirectorySize(dirPath: string): number {
    let totalSize = 0

    const files = readdirSync(dirPath)
    for (const file of files) {
      const filePath = join(dirPath, file)
      const stats = statSync(filePath)

      if (stats.isDirectory()) {
        // Recursively calculate subdirectory size
        totalSize += this.calculateDirectorySize(filePath)
      } else {
        // Add file size
        totalSize += stats.size
      }
    }

    return totalSize
  }

  /**
   * Verify if a file is a valid .what file by checking its magic number
   */
  static isWhatFile(filePath: string): boolean {
    try {
      const buffer = readFileSync(filePath)
      if (buffer.length < WHAT_MAGIC_NUMBER.length) {
        return false
      }
      const magic = buffer.subarray(0, WHAT_MAGIC_NUMBER.length)
      return magic.equals(WHAT_MAGIC_NUMBER)
    } catch {
      return false
    }
  }

  /**
   * Initialize database schema (simplified for 1 file = 1 canvas)
   */
  private initializeSchema(): void {
    if (!this.db) throw new Error('No database connection')

    // Metadata table (includes viewport settings)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `)

    // Objects table (no canvas_id needed - 1 file = 1 canvas)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS objects (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        x REAL NOT NULL,
        y REAL NOT NULL,
        width REAL DEFAULT 0,
        height REAL DEFAULT 0,
        z_index INTEGER DEFAULT 0,
        object_data TEXT NOT NULL,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )
    `)

    // Assets table (references to files in assets/ directory)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        created TEXT NOT NULL
      )
    `)

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_objects_zindex ON objects(z_index);
    `)
  }

  /**
   * Verify schema exists
   */
  private verifySchema(): void {
    if (!this.db) throw new Error('No database connection')

    const tables = this.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('metadata', 'objects', 'assets')"
      )
      .all()

    if (tables.length < 3) {
      throw new Error('Invalid .what file: missing required tables')
    }
  }

  /**
   * Set metadata
   */
  private setMetadata(metadata: WhatFileMetadata): void {
    if (!this.db) throw new Error('No database connection')

    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)'
    )

    for (const [key, value] of Object.entries(metadata)) {
      stmt.run(key, JSON.stringify(value))
    }
  }

  /**
   * Update metadata
   */
  private updateMetadata(updates: Partial<WhatFileMetadata>): void {
    if (!this.db) throw new Error('No database connection')

    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)'
    )

    console.log('[WhatFileService] 🔵 Updating metadata with:', updates)
    
    for (const [key, value] of Object.entries(updates)) {
      console.log(`[WhatFileService]   Writing: ${key} = ${JSON.stringify(value)}`)
      stmt.run(key, JSON.stringify(value))
    }
    
    console.log('[WhatFileService] ✅ Metadata update complete')

    if (this.currentFile) {
      this.currentFile.isModified = true
    }
  }

  /**
   * Get metadata
   */
  getMetadata(): WhatFileMetadata {
    if (!this.db) throw new Error('No database connection')

    const rows = this.db
      .prepare('SELECT key, value FROM metadata')
      .all() as Array<{ key: string; value: string }>

    const metadata: any = {}
    for (const row of rows) {
      metadata[row.key] = JSON.parse(row.value)
    }

    return metadata as WhatFileMetadata
  }

  /**
   * Get viewport settings from metadata
   */
  getViewport(): { x: number; y: number; zoom: number } {
    console.log('[WhatFileService] 🔵 getViewport called')
    
    if (!this.db) {
      console.error('[WhatFileService] ❌ No database connection!')
      throw new Error('No database connection')
    }

    const metadata = this.getMetadata()
    console.log('[WhatFileService] 📖 Raw metadata:', metadata)
    
    const viewport = {
      x: metadata.viewport_x || 0,
      y: metadata.viewport_y || 0,
      zoom: metadata.viewport_zoom || 1,
    }
    
    console.log('[WhatFileService] ✅ Returning viewport:', viewport)
    return viewport
  }

  /**
   * Save viewport settings to metadata
   */
  saveViewport(x: number, y: number, zoom: number): void {
    console.log('[WhatFileService] 🔵 saveViewport called with:', { x, y, zoom })
    
    if (!this.db) {
      console.error('[WhatFileService] ❌ No database connection!')
      throw new Error('No database connection')
    }

    console.log('[WhatFileService] ✅ Database exists, updating metadata...')

    this.updateMetadata({
      viewport_x: x,
      viewport_y: y,
      viewport_zoom: zoom,
    })

    // Verify the update
    const updated = this.getViewport()
    console.log('[WhatFileService] ✅ Viewport after save:', updated)
  }

  /**
   * Get all objects
   */
  getObjects(): WhatFileObject[] {
    if (!this.db) throw new Error('No database connection')

    const objects = this.db
      .prepare('SELECT * FROM objects ORDER BY z_index ASC')
      .all() as WhatFileObject[]

    // Parse object_data JSON
    return objects.map(obj => ({
      ...obj,
      object_data: JSON.parse(obj.object_data as any),
    }))
  }

  /**
   * Save object
   */
  saveObject(object: Partial<WhatFileObject> & { id: string }): void {
    if (!this.db) throw new Error('No database connection')

    const now = new Date().toISOString()
    const objectData = JSON.stringify(object.object_data || {})

    console.log('🔍 [DEBUG] saveObject called with:', {
      id: object.id,
      type: object.type,
      x: object.x,
      y: object.y,
      width: object.width,
      height: object.height,
      object_data_keys: Object.keys(object.object_data || {})
    })

    const existing = this.db
      .prepare('SELECT id FROM objects WHERE id = ?')
      .get(object.id)

    if (existing) {
      // Update
      console.log('🔍 [DEBUG] Updating existing object:', object.id)
      this.db
        .prepare(
          `
        UPDATE objects 
        SET type = COALESCE(?, type),
            x = COALESCE(?, x),
            y = COALESCE(?, y),
            width = COALESCE(?, width),
            height = COALESCE(?, height),
            z_index = COALESCE(?, z_index),
            object_data = COALESCE(?, object_data),
            updated = ?
        WHERE id = ?
      `
        )
        .run(
          object.type,
          object.x,
          object.y,
          object.width,
          object.height,
          object.z_index,
          objectData,
          now,
          object.id
        )
    } else {
      // Insert
      console.log('🔍 [DEBUG] Inserting new object:', object.id)
      this.db
        .prepare(
          `
        INSERT INTO objects (id, type, x, y, width, height, z_index, object_data, created, updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          object.id,
          object.type,
          object.x,
          object.y,
          object.width || 0,
          object.height || 0,
          object.z_index || 0,
          objectData,
          now,
          now
        )
    }

    this.markAsModified()
  }

  /**
   * Delete object and its associated assets (if any)
   */
  deleteObject(id: string): void {
    if (!this.db) throw new Error('No database connection')

    // First, check if this object has any associated assets (e.g., image objects)
    const object = this.db
      .prepare('SELECT object_data FROM objects WHERE id = ?')
      .get(id) as { object_data: string } | undefined

    if (object) {
      try {
        const objectData = JSON.parse(object.object_data)
        
        // If the object has an assetId (like image objects), delete the asset too
        if (objectData.assetId) {
          console.log(`[WhatFile] Deleting associated asset ${objectData.assetId} for object ${id}`)
          this.deleteAsset(objectData.assetId)
        }
      } catch (error) {
        console.error(`[WhatFile] Failed to parse object_data for cleanup:`, error)
      }
    }

    // Delete the object from database
    this.db.prepare('DELETE FROM objects WHERE id = ?').run(id)
    
    // Run full VACUUM to reclaim all space immediately
    // This completely rebuilds the database file and shrinks it to minimum size
    try {
      this.db.prepare('VACUUM').run()
      console.log(`[WhatFile] Vacuumed database after deleting object ${id}`)
    } catch (error) {
      console.error('[WhatFile] Failed to vacuum after delete:', error)
    }
    
    this.markAsModified()
  }

  /**
   * Mark file as modified
   */
  private markAsModified(): void {
    if (this.currentFile) {
      this.currentFile.isModified = true
    }
  }

  /**
   * Save asset file to assets directory and create database record
   * Returns the asset ID
   */
  saveAsset(filename: string, data: Buffer, mimeType: string): string {
    if (!this.db || !this.workingDir) {
      throw new Error('No database connection or working directory')
    }

    // Generate unique ID
    const assetId = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const assetsDir = join(this.workingDir, 'assets')
    
    // Ensure assets directory exists
    if (!existsSync(assetsDir)) {
      mkdirSync(assetsDir, { recursive: true })
    }

    // Save file to assets directory
    const assetPath = join(assetsDir, filename)
    writeFileSync(assetPath, data)

    // Create database record (no BLOB, just reference)
    const now = new Date().toISOString()
    this.db
      .prepare(
        'INSERT INTO assets (id, filename, mime_type, size, created) VALUES (?, ?, ?, ?, ?)'
      )
      .run(assetId, filename, mimeType, data.length, now)

    this.markAsModified()
    return assetId
  }

  /**
   * Get asset file path
   */
  getAssetPath(assetId: string): string | null {
    if (!this.db || !this.workingDir) return null

    const asset = this.db
      .prepare('SELECT filename FROM assets WHERE id = ?')
      .get(assetId) as { filename: string } | undefined

    if (!asset) return null

    const assetPath = join(this.workingDir, 'assets', asset.filename)
    return existsSync(assetPath) ? assetPath : null
  }

  /**
   * Get asset as data URL (for renderer display)
   */
  getAssetDataUrl(assetId: string): string | null {
    if (!this.db || !this.workingDir) return null

    const asset = this.db
      .prepare('SELECT filename, mime_type FROM assets WHERE id = ?')
      .get(assetId) as { filename: string; mime_type: string } | undefined

    if (!asset) return null

    const assetPath = join(this.workingDir, 'assets', asset.filename)
    if (!existsSync(assetPath)) return null

    // Read file and convert to base64 data URL
    const fileData = readFileSync(assetPath)
    const base64 = fileData.toString('base64')
    return `data:${asset.mime_type};base64,${base64}`
  }

  /**
   * Delete asset file and database record
   */
  deleteAsset(assetId: string): void {
    if (!this.db || !this.workingDir) {
      throw new Error('No database connection or working directory')
    }

    // Get asset filename
    const asset = this.db
      .prepare('SELECT filename FROM assets WHERE id = ?')
      .get(assetId) as { filename: string } | undefined

    if (asset) {
      // Delete file
      const assetPath = join(this.workingDir, 'assets', asset.filename)
      if (existsSync(assetPath)) {
        rmSync(assetPath)
      }

      // Delete database record
      this.db.prepare('DELETE FROM assets WHERE id = ?').run(assetId)
      this.markAsModified()
    }
  }

  /**
   * Cleanup resources
   */
}

// Singleton instance
export const whatFileService = new WhatFileService()
