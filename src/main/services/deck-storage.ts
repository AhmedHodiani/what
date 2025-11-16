/**
 * Deck Storage Service
 * 
 * Handles all FSRS deck operations with SQLite database in .what files
 * This is the bridge between FSRS logic and our file format
 */

import type Database from 'better-sqlite3'
import type { Deck, DeckConfig, Card, ReviewLog } from 'shared/fsrs/types'
import { CardType, CardQueue } from 'shared/fsrs/types'
import { createDefaultDeckConfig } from 'shared/fsrs/config'
import { logger } from 'shared/logger'

export class DeckStorageService {
  constructor(private db: Database.Database) {}

  /**
   * Create a new deck
   */
  createDeck(deckObjectId: string, name: string): Deck {
    const now = Math.floor(Date.now() / 1000)
    const config = createDefaultDeckConfig()

    // Insert deck config
    const stmt = this.db.prepare(`
      INSERT INTO deck_config (deck_id, name, description, config, mtime, usn)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      deckObjectId,
      name,
      '',
      JSON.stringify(config),
      now,
      0
    )

    logger.objects.debug('Created deck:', { deckObjectId, name })

    return {
      id: Date.now(),
      name,
      config,
      cards: [],
      mtime: now,
      usn: 0,
      description: '',
    }
  }

  /**
   * Load a deck with all its cards
   */
  loadDeck(deckObjectId: string): Deck | null {
    // Get deck config
    const deckRow = this.db
      .prepare('SELECT * FROM deck_config WHERE deck_id = ?')
      .get(deckObjectId) as any

    if (!deckRow) {
      logger.objects.debug('Deck not found:', deckObjectId)
      return null
    }

    // Get all cards
    const cardRows = this.db
      .prepare('SELECT * FROM cards WHERE deck_id = ? ORDER BY id')
      .all(deckObjectId) as any[]

    const cards: Card[] = cardRows.map(row => this.rowToCard(row))

    const config: DeckConfig = JSON.parse(deckRow.config)

    return {
      id: parseInt(deckRow.deck_id, 10) || Date.now(),
      name: deckRow.name,
      config,
      cards,
      mtime: deckRow.mtime,
      usn: deckRow.usn,
      description: deckRow.description || '',
    }
  }

  /**
   * Save deck configuration
   */
  saveDeckConfig(deckObjectId: string, config: DeckConfig): void {
    const now = Math.floor(Date.now() / 1000)

    const stmt = this.db.prepare(`
      UPDATE deck_config 
      SET config = ?, mtime = ?, usn = usn + 1
      WHERE deck_id = ?
    `)

    stmt.run(JSON.stringify(config), now, deckObjectId)
    logger.objects.debug('Saved deck config:', deckObjectId)
  }

  /**
   * Add a new card
   */
  addCard(card: Card, deckObjectId: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO cards (
        id, note_id, deck_id, front, back,
        ctype, queue, due, interval, ease_factor,
        reps, lapses, remaining_steps,
        stability, difficulty, desired_retention,
        mtime, last_review, flags, custom_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      card.id,
      card.noteId,
      deckObjectId,
      card.front,
      card.back,
      card.ctype,
      card.queue,
      card.due,
      card.interval,
      card.easeFactor,
      card.reps,
      card.lapses,
      card.remainingSteps,
      card.memoryState?.stability ?? null,
      card.memoryState?.difficulty ?? null,
      card.desiredRetention,
      card.mtime,
      card.lastReview,
      card.flags,
      card.customData
    )

    logger.objects.debug('Added card:', { cardId: card.id, deckObjectId })
  }

  /**
   * Update an existing card
   */
  updateCard(card: Partial<Card> & { id: number }): void {
    // Build dynamic update query
    const fields: string[] = []
    const values: any[] = []

    if (card.front !== undefined) {
      fields.push('front = ?')
      values.push(card.front)
    }
    if (card.back !== undefined) {
      fields.push('back = ?')
      values.push(card.back)
    }
    if (card.ctype !== undefined) {
      fields.push('ctype = ?')
      values.push(card.ctype)
    }
    if (card.queue !== undefined) {
      fields.push('queue = ?')
      values.push(card.queue)
    }
    if (card.due !== undefined) {
      fields.push('due = ?')
      values.push(card.due)
    }
    if (card.interval !== undefined) {
      fields.push('interval = ?')
      values.push(card.interval)
    }
    if (card.easeFactor !== undefined) {
      fields.push('ease_factor = ?')
      values.push(card.easeFactor)
    }
    if (card.reps !== undefined) {
      fields.push('reps = ?')
      values.push(card.reps)
    }
    if (card.lapses !== undefined) {
      fields.push('lapses = ?')
      values.push(card.lapses)
    }
    if (card.remainingSteps !== undefined) {
      fields.push('remaining_steps = ?')
      values.push(card.remainingSteps)
    }
    if (card.memoryState !== undefined) {
      fields.push('stability = ?')
      values.push(card.memoryState?.stability ?? null)
      fields.push('difficulty = ?')
      values.push(card.memoryState?.difficulty ?? null)
    }
    if (card.desiredRetention !== undefined) {
      fields.push('desired_retention = ?')
      values.push(card.desiredRetention)
    }
    if (card.mtime !== undefined) {
      fields.push('mtime = ?')
      values.push(card.mtime)
    }
    if (card.lastReview !== undefined) {
      fields.push('last_review = ?')
      values.push(card.lastReview)
    }
    if (card.flags !== undefined) {
      fields.push('flags = ?')
      values.push(card.flags)
    }
    if (card.customData !== undefined) {
      fields.push('custom_data = ?')
      values.push(card.customData)
    }

    if (fields.length === 0) {
      return // Nothing to update
    }

    values.push(card.id)

    const query = `UPDATE cards SET ${fields.join(', ')} WHERE id = ?`
    const stmt = this.db.prepare(query)
    stmt.run(...values)

    logger.objects.debug('Updated card:', card.id)
  }

  /**
   * Delete a card
   */
  deleteCard(cardId: number): void {
    this.db.prepare('DELETE FROM cards WHERE id = ?').run(cardId)
    logger.objects.debug('Deleted card:', cardId)
  }

  /**
   * Add a review log entry
   */
  addReviewLog(log: ReviewLog): void {
    const stmt = this.db.prepare(`
      INSERT INTO revlog (
        id, card_id, usn, button_chosen,
        interval, last_interval, ease_factor, time_taken,
        review_kind, stability, difficulty
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      log.id,
      log.cardId,
      log.usn,
      log.buttonChosen,
      log.interval,
      log.lastInterval,
      log.easeFactor,
      log.timeTaken,
      log.reviewKind,
      log.memoryState?.stability ?? null,
      log.memoryState?.difficulty ?? null
    )
  }

  /**
   * Get review history for a card
   */
  getCardReviews(cardId: number): ReviewLog[] {
    const rows = this.db
      .prepare('SELECT * FROM revlog WHERE card_id = ? ORDER BY id DESC')
      .all(cardId) as any[]

    return rows.map(row => ({
      id: row.id,
      cardId: row.card_id,
      usn: row.usn,
      buttonChosen: row.button_chosen,
      interval: row.interval,
      lastInterval: row.last_interval,
      easeFactor: row.ease_factor,
      timeTaken: row.time_taken,
      reviewKind: row.review_kind,
      memoryState:
        row.stability && row.difficulty
          ? { stability: row.stability, difficulty: row.difficulty }
          : null,
    }))
  }

  /**
   * Get deck statistics
   */
  getDeckStats(deckObjectId: string): {
    totalCards: number
    newCards: number
    learningCards: number
    reviewCards: number
    dueCards: number
  } {
    const now = Math.floor(Date.now() / 1000)
    const daysElapsed = Math.floor(now / 86400)

    const totalCards = this.db
      .prepare('SELECT COUNT(*) as count FROM cards WHERE deck_id = ?')
      .get(deckObjectId) as any

    const newCards = this.db
      .prepare(
        'SELECT COUNT(*) as count FROM cards WHERE deck_id = ? AND ctype = ?'
      )
      .get(deckObjectId, CardType.New) as any

    const learningCards = this.db
      .prepare(
        'SELECT COUNT(*) as count FROM cards WHERE deck_id = ? AND (ctype = ? OR ctype = ?)'
      )
      .get(deckObjectId, CardType.Learn, CardType.Relearn) as any

    const reviewCards = this.db
      .prepare(
        'SELECT COUNT(*) as count FROM cards WHERE deck_id = ? AND ctype = ?'
      )
      .get(deckObjectId, CardType.Review) as any

    // Count due cards (more complex - depends on queue type)
    const dueCardsQuery = `
      SELECT COUNT(*) as count FROM cards 
      WHERE deck_id = ? 
      AND (
        (queue = ${CardQueue.New}) OR
        (queue = ${CardQueue.Learn} AND due <= ?) OR
        (queue = ${CardQueue.Review} AND due <= ?) OR
        (queue = ${CardQueue.DayLearn} AND due <= ?)
      )
    `
    const dueCards = this.db
      .prepare(dueCardsQuery)
      .get(deckObjectId, now, daysElapsed, now) as any

    return {
      totalCards: totalCards.count,
      newCards: newCards.count,
      learningCards: learningCards.count,
      reviewCards: reviewCards.count,
      dueCards: dueCards.count,
    }
  }

  /**
   * Convert database row to Card object
   */
  private rowToCard(row: any): Card {
    return {
      id: row.id,
      noteId: row.note_id,
      deckId: row.deck_id,
      front: row.front,
      back: row.back,
      ctype: row.ctype,
      queue: row.queue,
      due: row.due,
      interval: row.interval,
      easeFactor: row.ease_factor,
      reps: row.reps,
      lapses: row.lapses,
      remainingSteps: row.remaining_steps,
      memoryState:
        row.stability && row.difficulty
          ? { stability: row.stability, difficulty: row.difficulty }
          : null,
      desiredRetention: row.desired_retention,
      mtime: row.mtime,
      lastReview: row.last_review,
      flags: row.flags,
      customData: row.custom_data || '',
    }
  }
}
