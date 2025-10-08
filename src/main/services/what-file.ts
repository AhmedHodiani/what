import Database from 'better-sqlite3'
import AdmZip from 'adm-zip'
import { basename, join } from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import type {
  WhatFile,
  WhatFileMetadata,
  WhatFileCanvas,
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

      // Initialize database schema
      this.initializeSchema()

      // Create initial metadata
      const now = new Date().toISOString()
      const metadata: WhatFileMetadata = {
        version: WHAT_FILE_VERSION,
        created: now,
        modified: now,
        title: basename(filePath, '.what'),
      }

      this.setMetadata(metadata)

      // Create default canvas
      this.createDefaultCanvas()

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
   * Initialize database schema
   */
  private initializeSchema(): void {
    if (!this.db) throw new Error('No database connection')

    // Metadata table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `)

    // Canvases table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS canvases (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        viewport_x REAL DEFAULT 0,
        viewport_y REAL DEFAULT 0,
        viewport_zoom REAL DEFAULT 1,
        object_count INTEGER DEFAULT 0,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )
    `)

    // Objects table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS objects (
        id TEXT PRIMARY KEY,
        canvas_id TEXT NOT NULL,
        type TEXT NOT NULL,
        x REAL NOT NULL,
        y REAL NOT NULL,
        width REAL DEFAULT 0,
        height REAL DEFAULT 0,
        z_index INTEGER DEFAULT 0,
        object_data TEXT NOT NULL,
        created TEXT NOT NULL,
        updated TEXT NOT NULL,
        FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE
      )
    `)

    // Assets table (for images, videos, etc.)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        data BLOB NOT NULL,
        created TEXT NOT NULL
      )
    `)

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_objects_canvas ON objects(canvas_id);
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
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('metadata', 'canvases', 'objects', 'assets')"
      )
      .all()

    if (tables.length < 4) {
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

    for (const [key, value] of Object.entries(updates)) {
      stmt.run(key, JSON.stringify(value))
    }

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
   * Create default canvas
   */
  private createDefaultCanvas(): void {
    if (!this.db) throw new Error('No database connection')

    const now = new Date().toISOString()
    const id = `canvas_${Date.now()}`

    this.db
      .prepare(
        `
      INSERT INTO canvases (id, title, viewport_x, viewport_y, viewport_zoom, object_count, created, updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(id, 'Canvas 1', 0, 0, 1, 0, now, now)
  }

  /**
   * Get all canvases
   */
  getCanvases(): WhatFileCanvas[] {
    if (!this.db) throw new Error('No database connection')

    return this.db
      .prepare('SELECT * FROM canvases ORDER BY created ASC')
      .all() as WhatFileCanvas[]
  }

  /**
   * Get canvas by ID
   */
  getCanvas(id: string): WhatFileCanvas | null {
    if (!this.db) throw new Error('No database connection')

    return (
      (this.db
        .prepare('SELECT * FROM canvases WHERE id = ?')
        .get(id) as WhatFileCanvas) || null
    )
  }

  /**
   * Save canvas
   */
  saveCanvas(canvas: Partial<WhatFileCanvas> & { id: string }): void {
    if (!this.db) throw new Error('No database connection')

    const now = new Date().toISOString()

    this.db
      .prepare(
        `
      UPDATE canvases 
      SET title = COALESCE(?, title),
          viewport_x = COALESCE(?, viewport_x),
          viewport_y = COALESCE(?, viewport_y),
          viewport_zoom = COALESCE(?, viewport_zoom),
          object_count = COALESCE(?, object_count),
          updated = ?
      WHERE id = ?
    `
      )
      .run(
        canvas.title,
        canvas.viewport_x,
        canvas.viewport_y,
        canvas.viewport_zoom,
        canvas.object_count,
        now,
        canvas.id
      )

    this.markAsModified()
  }

  /**
   * Get objects for a canvas
   */
  getObjects(canvasId: string): WhatFileObject[] {
    if (!this.db) throw new Error('No database connection')

    const objects = this.db
      .prepare('SELECT * FROM objects WHERE canvas_id = ? ORDER BY z_index ASC')
      .all(canvasId) as WhatFileObject[]

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

    const existing = this.db
      .prepare('SELECT id FROM objects WHERE id = ?')
      .get(object.id)

    if (existing) {
      // Update
      this.db
        .prepare(
          `
        UPDATE objects 
        SET canvas_id = COALESCE(?, canvas_id),
            type = COALESCE(?, type),
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
          object.canvas_id,
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
      this.db
        .prepare(
          `
        INSERT INTO objects (id, canvas_id, type, x, y, width, height, z_index, object_data, created, updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          object.id,
          object.canvas_id,
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
   * Delete object
   */
  deleteObject(id: string): void {
    if (!this.db) throw new Error('No database connection')

    this.db.prepare('DELETE FROM objects WHERE id = ?').run(id)
    this.markAsModified()
  }

  /**
   * Mark file as modified
   */
  private markAsModified(): void {
    if (this.currentFile) {
      this.currentFile.isModified = true
      this.updateMetadata({ modified: new Date().toISOString() })
    }
  }
}

// Singleton instance
export const whatFileService = new WhatFileService()
