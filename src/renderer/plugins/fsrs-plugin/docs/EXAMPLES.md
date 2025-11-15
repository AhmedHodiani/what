# FSRS Plugin - Code Examples

Complete, copy-paste examples for common use cases.

## Table of Contents

1. [Basic React App](#basic-react-app)
2. [Vanilla JavaScript](#vanilla-javascript)
3. [Next.js App](#nextjs-app)
4. [With TypeScript Strict Mode](#with-typescript-strict-mode)
5. [Custom Storage (IndexedDB)](#custom-storage-indexeddb)
6. [Multiple Decks UI](#multiple-decks-ui)
7. [Statistics Dashboard](#statistics-dashboard)
8. [Import/Export](#importexport)
9. [Mobile-Friendly Design](#mobile-friendly-design)
10. [Advanced: Custom Algorithm](#advanced-custom-algorithm)

---

## Basic React App

Complete flashcard app with all features:

```tsx
import React, { useState, useEffect } from 'react';
import { useFsrsData, Rating, Card } from './fsrs-plugin';

function App() {
  const fsrs = useFsrsData('my-flashcards');
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');

  // Initialize with sample deck
  useEffect(() => {
    if (!fsrs.loading && fsrs.getAllDecks().length === 0) {
      const deck = fsrs.createDeck('General Knowledge');
      setSelectedDeckId(deck.id);
      
      // Add sample cards
      fsrs.createCard(deck.id, 'Capital of France?', 'Paris');
      fsrs.createCard(deck.id, 'Largest planet?', 'Jupiter');
      fsrs.createCard(deck.id, '2 + 2 = ?', '4');
    }
  }, [fsrs.loading]);

  const currentCard = fsrs.currentSession?.currentCard;
  const counts = selectedDeckId ? fsrs.getCounts(selectedDeckId) : null;

  const handleStartSession = () => {
    if (selectedDeckId) {
      fsrs.startStudySession(selectedDeckId);
      setShowAnswer(false);
    }
  };

  const handleAnswer = (rating: Rating) => {
    if (currentCard) {
      const startTime = Date.now();
      fsrs.answerCard(currentCard.id, rating, Date.now() - startTime);
      setShowAnswer(false);
    }
  };

  if (fsrs.loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>Flashcard App</h1>
        <select
          value={selectedDeckId}
          onChange={(e) => setSelectedDeckId(e.target.value)}
          style={styles.select}
        >
          <option value="">Select a deck...</option>
          {fsrs.getAllDecks().map(deck => (
            <option key={deck.id} value={deck.id}>
              {deck.name}
            </option>
          ))}
        </select>
      </header>

      {counts && (
        <div style={styles.stats}>
          <div>New: {counts.new}</div>
          <div>Learning: {counts.learning}</div>
          <div>Review: {counts.review}</div>
        </div>
      )}

      {!fsrs.currentSession ? (
        <button onClick={handleStartSession} style={styles.button}>
          Start Studying
        </button>
      ) : currentCard ? (
        <div style={styles.card}>
          <div style={styles.cardContent}>
            <h2>Question</h2>
            <p style={styles.text}>{currentCard.front}</p>
          </div>

          {showAnswer && (
            <div style={styles.cardContent}>
              <h2>Answer</h2>
              <p style={styles.textAnswer}>{currentCard.back}</p>
            </div>
          )}

          {!showAnswer ? (
            <button onClick={() => setShowAnswer(true)} style={styles.button}>
              Show Answer
            </button>
          ) : (
            <div style={styles.buttonGroup}>
              <button
                onClick={() => handleAnswer(Rating.Again)}
                style={{ ...styles.ratingButton, ...styles.again }}
              >
                Again<br/>&lt;1m
              </button>
              <button
                onClick={() => handleAnswer(Rating.Hard)}
                style={{ ...styles.ratingButton, ...styles.hard }}
              >
                Hard<br/>&lt;10m
              </button>
              <button
                onClick={() => handleAnswer(Rating.Good)}
                style={{ ...styles.ratingButton, ...styles.good }}
              >
                Good<br/>1d
              </button>
              <button
                onClick={() => handleAnswer(Rating.Easy)}
                style={{ ...styles.ratingButton, ...styles.easy }}
              >
                Easy<br/>4d
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={styles.complete}>
          <h2>🎉 All done!</h2>
          <p>Come back later for more reviews</p>
          <button onClick={fsrs.endStudySession} style={styles.button}>
            End Session
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: '800px', margin: '0 auto', padding: '20px' },
  header: { textAlign: 'center' as const, marginBottom: '30px' },
  select: { width: '100%', padding: '10px', fontSize: '16px', marginTop: '10px' },
  stats: { display: 'flex', justifyContent: 'space-around', marginBottom: '20px', fontSize: '18px' },
  card: { border: '2px solid #ddd', borderRadius: '12px', padding: '30px', backgroundColor: '#fff' },
  cardContent: { marginBottom: '20px' },
  text: { fontSize: '28px', fontWeight: 'bold' as const },
  textAnswer: { fontSize: '24px', color: '#28a745' },
  button: { padding: '15px 30px', fontSize: '18px', cursor: 'pointer', width: '100%', marginTop: '10px' },
  buttonGroup: { display: 'flex', gap: '10px', marginTop: '20px' },
  ratingButton: { flex: 1, padding: '15px', cursor: 'pointer', border: '2px solid', borderRadius: '8px', fontSize: '16px' },
  again: { backgroundColor: '#dc3545', color: 'white', borderColor: '#dc3545' },
  hard: { backgroundColor: '#ffc107', color: 'black', borderColor: '#ffc107' },
  good: { backgroundColor: '#28a745', color: 'white', borderColor: '#28a745' },
  easy: { backgroundColor: '#17a2b8', color: 'white', borderColor: '#17a2b8' },
  complete: { textAlign: 'center' as const, padding: '40px' },
};

export default App;
```

---

## Vanilla JavaScript

No framework required:

```typescript
import {
  CardStateMachine,
  StudySessionManager,
  DeckManager,
  Rating,
  Card,
  DeckConfig,
  CardType,
  CardQueue,
} from './fsrs-plugin';

class FlashcardApp {
  private scheduler: CardStateMachine;
  private sessionManager: StudySessionManager;
  private config: DeckConfig;
  private cards: Card[] = [];
  private currentCard: Card | null = null;

  constructor() {
    this.scheduler = new CardStateMachine();
    this.sessionManager = new StudySessionManager();
    this.config = DeckManager.createDefaultConfig();
    
    this.loadCards();
    this.setupUI();
  }

  private loadCards() {
    // Load from localStorage or create sample
    const stored = localStorage.getItem('flashcards');
    if (stored) {
      this.cards = JSON.parse(stored);
    } else {
      this.cards = this.createSampleCards();
      this.saveCards();
    }
  }

  private createSampleCards(): Card[] {
    const createCard = (front: string, back: string): Card => ({
      id: Math.random().toString(36),
      noteId: Math.random().toString(36),
      deckId: 'deck-1',
      templateIdx: 0,
      mtime: Date.now(),
      ctype: CardType.New,
      queue: CardQueue.New,
      due: 0,
      interval: 0,
      easeFactor: 2.5,
      reps: 0,
      lapses: 0,
      remainingSteps: 0,
      memoryState: null,
      desiredRetention: 0.9,
      customData: '',
      front,
      back,
    });

    return [
      createCard('What is HTML?', 'HyperText Markup Language'),
      createCard('What is CSS?', 'Cascading Style Sheets'),
      createCard('What is JavaScript?', 'Programming language for the web'),
    ];
  }

  private saveCards() {
    localStorage.setItem('flashcards', JSON.stringify(this.cards));
  }

  private setupUI() {
    const app = document.getElementById('app')!;
    
    app.innerHTML = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1>Flashcards</h1>
        <div id="card-area"></div>
        <div id="buttons"></div>
      </div>
    `;

    this.showNextCard();
  }

  private showNextCard() {
    this.currentCard = this.sessionManager.getNextCard(this.cards, this.config);
    const cardArea = document.getElementById('card-area')!;
    const buttons = document.getElementById('buttons')!;

    if (!this.currentCard) {
      cardArea.innerHTML = '<h2>No cards due!</h2>';
      buttons.innerHTML = '';
      return;
    }

    cardArea.innerHTML = `
      <div style="border: 2px solid #333; padding: 20px; border-radius: 8px;">
        <h2>Question:</h2>
        <p style="font-size: 24px;">${this.currentCard.front}</p>
        <div id="answer" style="display: none;">
          <h2>Answer:</h2>
          <p style="font-size: 24px; color: green;">${this.currentCard.back}</p>
        </div>
      </div>
    `;

    buttons.innerHTML = '<button id="show-answer">Show Answer</button>';
    
    document.getElementById('show-answer')!.onclick = () => this.showAnswer();
  }

  private showAnswer() {
    document.getElementById('answer')!.style.display = 'block';
    
    const buttons = document.getElementById('buttons')!;
    buttons.innerHTML = `
      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <button id="again">Again</button>
        <button id="hard">Hard</button>
        <button id="good">Good</button>
        <button id="easy">Easy</button>
      </div>
    `;

    document.getElementById('again')!.onclick = () => this.answer(Rating.Again);
    document.getElementById('hard')!.onclick = () => this.answer(Rating.Hard);
    document.getElementById('good')!.onclick = () => this.answer(Rating.Good);
    document.getElementById('easy')!.onclick = () => this.answer(Rating.Easy);
  }

  private answer(rating: Rating) {
    if (!this.currentCard) return;

    const result = this.sessionManager.answerCard(
      this.currentCard,
      rating,
      this.config
    );

    // Update card in array
    const index = this.cards.findIndex(c => c.id === result.card.id);
    if (index !== -1) {
      this.cards[index] = result.card;
    }

    this.saveCards();
    this.showNextCard();
  }
}

// Initialize
const deck = DeckManager.createDeck('My Deck');
const sessionManager = new StudySessionManager();
const cards: Card[] = []; // Your cards here
const config = DeckManager.createDefaultConfig();

sessionManager.startSession(deck, cards, config);

// Start app when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new FlashcardApp();
});
```

---

## Next.js App

With server-side rendering:

```tsx
// app/flashcards/page.tsx
'use client';

import { useFsrsData, Rating } from '@/fsrs-plugin';
import { useState } from 'react';

export default function FlashcardsPage() {
  const fsrs = useFsrsData();
  const [showAnswer, setShowAnswer] = useState(false);

  if (fsrs.loading) return <div>Loading...</div>;

  const card = fsrs.currentSession?.currentCard;

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Flashcards</h1>
      
      {card ? (
        <div className="border rounded-lg p-6">
          <h2 className="text-xl mb-2">Question:</h2>
          <p className="text-2xl mb-4">{card.front}</p>

          {showAnswer && (
            <>
              <h2 className="text-xl mb-2">Answer:</h2>
              <p className="text-2xl text-green-600 mb-4">{card.back}</p>
              
              <div className="flex gap-2">
                <button
                  onClick={() => fsrs.answerCard(card.id, Rating.Again)}
                  className="bg-red-500 text-white px-4 py-2 rounded"
                >
                  Again
                </button>
                <button
                  onClick={() => fsrs.answerCard(card.id, Rating.Hard)}
                  className="bg-yellow-500 text-white px-4 py-2 rounded"
                >
                  Hard
                </button>
                <button
                  onClick={() => fsrs.answerCard(card.id, Rating.Good)}
                  className="bg-green-500 text-white px-4 py-2 rounded"
                >
                  Good
                </button>
                <button
                  onClick={() => fsrs.answerCard(card.id, Rating.Easy)}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Easy
                </button>
              </div>
            </>
          )}

          {!showAnswer && (
            <button
              onClick={() => setShowAnswer(true)}
              className="bg-blue-500 text-white px-6 py-2 rounded"
            >
              Show Answer
            </button>
          )}
        </div>
      ) : (
        <div>No cards due!</div>
      )}
    </main>
  );
}
```

---

## With TypeScript Strict Mode

Type-safe implementation:

```typescript
import {
  useFsrsData,
  Rating,
  Card,
  Deck,
  DeckConfig,
  StudySession,
} from './fsrs-plugin';

interface FlashcardAppState {
  selectedDeckId: string | null;
  showAnswer: boolean;
  startTime: number | null;
}

function useFlashcardApp() {
  const fsrs = useFsrsData();
  const [state, setState] = React.useState<FlashcardAppState>({
    selectedDeckId: null,
    showAnswer: false,
    startTime: null,
  });

  const currentDeck: Deck | undefined = state.selectedDeckId
    ? fsrs.getDeck(state.selectedDeckId)
    : undefined;

  const currentCard: Card | null = fsrs.currentSession?.currentCard ?? null;

  const startSession = (deckId: string): void => {
    fsrs.startStudySession(deckId);
    setState(prev => ({ ...prev, startTime: Date.now() }));
  };

  const showAnswer = (): void => {
    setState(prev => ({ ...prev, showAnswer: true }));
  };

  const answerCard = (rating: Rating): void => {
    if (!currentCard || !state.startTime) return;

    const timeTaken = Date.now() - state.startTime;
    fsrs.answerCard(currentCard.id, rating, timeTaken);
    
    setState(prev => ({
      ...prev,
      showAnswer: false,
      startTime: Date.now(),
    }));
  };

  return {
    ...fsrs,
    state,
    currentDeck,
    currentCard,
    startSession,
    showAnswer,
    answerCard,
  };
}

export default useFlashcardApp;
```

---

## Custom Storage (IndexedDB)

Replace localStorage with IndexedDB:

```typescript
// storage.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Deck, Card, DeckConfig, ReviewLog } from './fsrs-plugin';

interface FlashcardDB extends DBSchema {
  decks: {
    key: string;
    value: Deck;
  };
  cards: {
    key: string;
    value: Card;
    indexes: { 'by-deck': string };
  };
  configs: {
    key: string;
    value: DeckConfig;
  };
  reviewLogs: {
    key: string;
    value: ReviewLog;
    indexes: { 'by-card': string };
  };
}

class FlashcardStorage {
  private db: IDBPDatabase<FlashcardDB> | null = null;

  async init() {
    this.db = await openDB<FlashcardDB>('flashcards', 1, {
      upgrade(db) {
        // Create object stores
        db.createObjectStore('decks', { keyPath: 'id' });
        
        const cardStore = db.createObjectStore('cards', { keyPath: 'id' });
        cardStore.createIndex('by-deck', 'deckId');
        
        db.createObjectStore('configs', { keyPath: 'id' });
        
        const logStore = db.createObjectStore('reviewLogs', { keyPath: 'id' });
        logStore.createIndex('by-card', 'cardId');
      },
    });
  }

  // Deck operations
  async getAllDecks(): Promise<Deck[]> {
    return this.db!.getAll('decks');
  }

  async getDeck(id: string): Promise<Deck | undefined> {
    return this.db!.get('decks', id);
  }

  async saveDeck(deck: Deck): Promise<void> {
    await this.db!.put('decks', deck);
  }

  async deleteDeck(id: string): Promise<void> {
    await this.db!.delete('decks', id);
  }

  // Card operations
  async getCardsInDeck(deckId: string): Promise<Card[]> {
    return this.db!.getAllFromIndex('cards', 'by-deck', deckId);
  }

  async saveCard(card: Card): Promise<void> {
    await this.db!.put('cards', card);
  }

  async deleteCard(id: string): Promise<void> {
    await this.db!.delete('cards', id);
  }

  // Config operations
  async getConfig(id: string): Promise<DeckConfig | undefined> {
    return this.db!.get('configs', id);
  }

  async saveConfig(config: DeckConfig): Promise<void> {
    await this.db!.put('configs', config);
  }

  // Review log operations
  async saveReviewLog(log: ReviewLog): Promise<void> {
    await this.db!.put('reviewLogs', log);
  }

  async getReviewLogsForCard(cardId: string): Promise<ReviewLog[]> {
    return this.db!.getAllFromIndex('reviewLogs', 'by-card', cardId);
  }
}

export const storage = new FlashcardStorage();

// Usage in component
useEffect(() => {
  const loadData = async () => {
    await storage.init();
    const decks = await storage.getAllDecks();
    setState(prev => ({ ...prev, decks }));
  };
  loadData();
}, []);
```

---

## Multiple Decks UI

Organize and manage multiple decks:

```tsx
function DeckManager() {
  const fsrs = useFsrsData();
  const [newDeckName, setNewDeckName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  const handleCreateDeck = () => {
    if (newDeckName.trim()) {
      fsrs.createDeck(newDeckName);
      setNewDeckName('');
    }
  };

  const handleDeleteDeck = (deckId: string) => {
    if (confirm('Delete this deck and all its cards?')) {
      fsrs.deleteDeck(deckId);
    }
  };

  return (
    <div>
      <h2>My Decks</h2>
      
      {/* Create new deck */}
      <div style={{ marginBottom: '20px' }}>
        <input
          value={newDeckName}
          onChange={(e) => setNewDeckName(e.target.value)}
          placeholder="New deck name..."
          onKeyPress={(e) => e.key === 'Enter' && handleCreateDeck()}
        />
        <button onClick={handleCreateDeck}>Create Deck</button>
      </div>

      {/* Deck list */}
      <div style={{ display: 'grid', gap: '10px' }}>
        {fsrs.getAllDecks().map(deck => {
          const counts = fsrs.getCounts(deck.id);
          const cards = fsrs.getCardsInDeck(deck.id);
          
          return (
            <div
              key={deck.id}
              style={{
                border: '1px solid #ddd',
                padding: '15px',
                borderRadius: '8px',
              }}
            >
              {editing === deck.id ? (
                <input
                  value={deck.name}
                  onChange={(e) => {
                    fsrs.updateDeck({ ...deck, name: e.target.value });
                  }}
                  onBlur={() => setEditing(null)}
                  autoFocus
                />
              ) : (
                <h3 onClick={() => setEditing(deck.id)}>{deck.name}</h3>
              )}

              <div style={{ display: 'flex', gap: '20px', margin: '10px 0' }}>
                <span>📝 {cards.length} cards</span>
                <span>🆕 {counts.new} new</span>
                <span>📚 {counts.learning} learning</span>
                <span>✅ {counts.review} review</span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => fsrs.startStudySession(deck.id)}>
                  Study
                </button>
                <button onClick={() => {/* Navigate to card editor */}}>
                  Edit Cards
                </button>
                <button
                  onClick={() => handleDeleteDeck(deck.id)}
                  style={{ backgroundColor: '#dc3545', color: 'white' }}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Statistics Dashboard

Track learning progress:

```tsx
function StatsDashboard() {
  const fsrs = useFsrsData();

  const stats = React.useMemo(() => {
    const allCards = Object.values(fsrs.cards);
    const logs = fsrs.reviewLogs;

    const totalCards = allCards.length;
    const matureCards = allCards.filter(c => c.interval >= 21).length;
    const youngCards = allCards.filter(c => c.interval >= 1 && c.interval < 21).length;
    
    const today = new Date().toDateString();
    const reviewsToday = logs.filter(log => 
      new Date(log.timestamp).toDateString() === today
    ).length;

    const avgEaseFactor = allCards.reduce((sum, c) => sum + c.easeFactor, 0) / totalCards || 0;
    
    const retention = logs.length > 0
      ? logs.filter(log => log.rating >= Rating.Hard).length / logs.length
      : 0;

    return {
      totalCards,
      matureCards,
      youngCards,
      reviewsToday,
      avgEaseFactor: avgEaseFactor.toFixed(2),
      retention: (retention * 100).toFixed(1) + '%',
    };
  }, [fsrs.cards, fsrs.reviewLogs]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Statistics</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <StatCard label="Total Cards" value={stats.totalCards} />
        <StatCard label="Mature Cards" value={stats.matureCards} />
        <StatCard label="Young Cards" value={stats.youngCards} />
        <StatCard label="Reviews Today" value={stats.reviewsToday} />
        <StatCard label="Avg Ease Factor" value={stats.avgEaseFactor} />
        <StatCard label="Retention Rate" value={stats.retention} />
      </div>

      <h3 style={{ marginTop: '30px' }}>Recent Reviews</h3>
      <div>
        {fsrs.reviewLogs.slice(-10).reverse().map(log => {
          const card = fsrs.getCard(log.cardId);
          return (
            <div key={log.id} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
              <strong>{card?.front}</strong>
              <span style={{ marginLeft: '10px' }}>
                Rating: {['', 'Again', 'Hard', 'Good', 'Easy'][log.rating]}
              </span>
              <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666' }}>
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{
      border: '1px solid #ddd',
      padding: '20px',
      borderRadius: '8px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#007bff' }}>
        {value}
      </div>
      <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
        {label}
      </div>
    </div>
  );
}
```

---

## Import/Export

Backup and restore data:

```typescript
function ImportExport() {
  const fsrs = useFsrsData();

  const handleExport = () => {
    const data = {
      version: 1,
      exportDate: new Date().toISOString(),
      decks: fsrs.getAllDecks(),
      configs: fsrs.configs,
      cards: Object.values(fsrs.cards),
      reviewLogs: fsrs.reviewLogs,
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcards-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        // Validate data structure
        if (!data.version || !data.decks || !data.cards) {
          throw new Error('Invalid backup file');
        }

        // Import data
        data.decks.forEach((deck: Deck) => {
          fsrs.createDeck(deck.name);
        });

        data.cards.forEach((card: Card) => {
          fsrs.createCard(card.deckId, card.front, card.back);
        });

        alert('Import successful!');
      } catch (error) {
        alert('Failed to import: ' + (error as Error).message);
      }
    };

    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    const cards = Object.values(fsrs.cards);
    const csv = [
      'Front,Back,Deck,Interval,Ease Factor,Reps,Lapses',
      ...cards.map(card => {
        const deck = fsrs.getDeck(card.deckId);
        return [
          card.front,
          card.back,
          deck?.name || '',
          card.interval,
          card.easeFactor,
          card.reps,
          card.lapses,
        ].map(v => `"${v}"`).join(',');
      }),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcards-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h2>Import/Export</h2>
      
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button onClick={handleExport}>
          Export JSON
        </button>
        <button onClick={handleExportCSV}>
          Export CSV
        </button>
        <label style={{ cursor: 'pointer' }}>
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          <button as="span">Import JSON</button>
        </label>
      </div>
    </div>
  );
}
```

---

## Mobile-Friendly Design

Responsive touch interface:

```tsx
function MobileFlashcard() {
  const fsrs = useFsrsData();
  const [showAnswer, setShowAnswer] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const card = fsrs.currentSession?.currentCard;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || !card || !showAnswer) return;

    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    // Swipe left (easy)
    if (diff > 50) {
      fsrs.answerCard(card.id, Rating.Easy);
      setShowAnswer(false);
    }
    // Swipe right (again)
    else if (diff < -50) {
      fsrs.answerCard(card.id, Rating.Again);
      setShowAnswer(false);
    }

    setTouchStart(null);
  };

  if (!card) return <div>No cards!</div>;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
        touchAction: 'pan-y',
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '40px', textAlign: 'center' }}>
          {card.front}
        </div>

        {showAnswer && (
          <div style={{
            fontSize: '28px',
            color: '#28a745',
            textAlign: 'center',
            marginBottom: '40px',
          }}>
            {card.back}
          </div>
        )}
      </div>

      {!showAnswer ? (
        <button
          onClick={() => setShowAnswer(true)}
          style={{
            padding: '20px',
            fontSize: '20px',
            width: '100%',
            borderRadius: '12px',
          }}
        >
          Tap to reveal
        </button>
      ) : (
        <>
          <div style={{ textAlign: 'center', marginBottom: '10px', color: '#666' }}>
            ← Swipe left for Easy | Swipe right for Again →
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              onClick={() => { fsrs.answerCard(card.id, Rating.Again); setShowAnswer(false); }}
              style={{ padding: '20px', fontSize: '18px', backgroundColor: '#dc3545', color: 'white' }}
            >
              Again
            </button>
            <button
              onClick={() => { fsrs.answerCard(card.id, Rating.Hard); setShowAnswer(false); }}
              style={{ padding: '20px', fontSize: '18px', backgroundColor: '#ffc107' }}
            >
              Hard
            </button>
            <button
              onClick={() => { fsrs.answerCard(card.id, Rating.Good); setShowAnswer(false); }}
              style={{ padding: '20px', fontSize: '18px', backgroundColor: '#28a745', color: 'white' }}
            >
              Good
            </button>
            <button
              onClick={() => { fsrs.answerCard(card.id, Rating.Easy); setShowAnswer(false); }}
              style={{ padding: '20px', fontSize: '18px', backgroundColor: '#17a2b8', color: 'white' }}
            >
              Easy
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## Advanced: Custom Algorithm

Override FSRS with custom logic:

```typescript
class CustomScheduler extends CardStateMachine {
  // Override to implement custom interval calculation
  answerCard(card: Card, rating: Rating, config: DeckConfig, timeTaken: number = 0): Card {
    // Custom logic: Double intervals for cards answered quickly
    if (timeTaken < 3000 && rating === Rating.Easy) {
      const updated = super.answerCard(card, rating, config, timeTaken);
      updated.interval *= 2;
      return updated;
    }

    return super.answerCard(card, rating, config, timeTaken);
  }
}

// Usage
const customScheduler = new CustomScheduler();
const sessionManager = new StudySessionManager();

// Replace the scheduler in session manager
sessionManager['stateMachine'] = customScheduler;
```

---

More examples available in the plugin documentation. Check `README.md` for full API reference!
