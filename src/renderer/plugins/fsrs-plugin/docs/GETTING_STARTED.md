# Getting Started with FSRS Plugin

Welcome! This guide will help you integrate the FSRS plugin into your project, **even if you've never worked with flashcard algorithms before**.

## 📋 What You'll Learn

- What spaced repetition is and why it works
- How to add the plugin to your project
- How to create your first flashcard app
- How to customize for your needs

## 🧠 Understanding Spaced Repetition (2-minute primer)

**Spaced repetition** is a learning technique where you review information at increasing intervals:

```
Day 1: Learn card
Day 2: Review (if remembered → wait 4 days)
Day 6: Review (if remembered → wait 10 days)
Day 16: Review (if remembered → wait 30 days)
... and so on
```

The **FSRS algorithm** calculates these intervals automatically based on:
- How well you remembered (Again, Hard, Good, Easy)
- Your past performance with the card
- The inherent difficulty of the card

## 🚀 Installation

### Step 1: Copy the Plugin

```bash
# From your project root
cp -r /path/to/fsrs-plugin ./src/fsrs-plugin
```

### Step 2: Install Dependencies

The plugin only needs React (if using the hook):

```bash
npm install react
# or
yarn add react
```

That's it! No other dependencies needed.

## 📱 Your First Flashcard App (5 minutes)

### Option A: Using the React Hook (Easiest)

```tsx
import React from 'react';
import { useFsrsData, Rating } from './fsrs-plugin';

function FlashcardApp() {
  const fsrs = useFsrsData();
  const [showAnswer, setShowAnswer] = React.useState(false);

  // Create initial deck and cards
  React.useEffect(() => {
    if (fsrs.getAllDecks().length === 0) {
      const deck = fsrs.createDeck('Spanish Vocabulary');
      
      fsrs.createCard(deck.id, 'Hello', 'Hola');
      fsrs.createCard(deck.id, 'Goodbye', 'Adiós');
      fsrs.createCard(deck.id, 'Thank you', 'Gracias');
      
      fsrs.startStudySession(deck.id);
    }
  }, []);

  const card = fsrs.currentSession?.currentCard;
  const deck = fsrs.getAllDecks()[0];

  const handleAnswer = (rating: Rating) => {
    if (card) {
      fsrs.answerCard(card.id, rating);
      setShowAnswer(false);
    }
  };

  if (!deck) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>{deck.name}</h1>
      
      {/* Card counts */}
      <div style={{ marginBottom: '20px' }}>
        <span>New: {fsrs.getCounts(deck.id).new}</span>
        {' | '}
        <span>Learning: {fsrs.getCounts(deck.id).learning}</span>
        {' | '}
        <span>Review: {fsrs.getCounts(deck.id).review}</span>
      </div>

      {/* Current card */}
      {card ? (
        <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '20px' }}>
          <h2>Question:</h2>
          <p style={{ fontSize: '24px' }}>{card.front}</p>

          {showAnswer ? (
            <>
              <h2>Answer:</h2>
              <p style={{ fontSize: '24px', color: 'green' }}>{card.back}</p>

              <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button onClick={() => handleAnswer(Rating.Again)}>
                  Again (&lt;1min)
                </button>
                <button onClick={() => handleAnswer(Rating.Hard)}>
                  Hard (&lt;10min)
                </button>
                <button onClick={() => handleAnswer(Rating.Good)}>
                  Good (~1 day)
                </button>
                <button onClick={() => handleAnswer(Rating.Easy)}>
                  Easy (~4 days)
                </button>
              </div>
            </>
          ) : (
            <button onClick={() => setShowAnswer(true)}>Show Answer</button>
          )}
        </div>
      ) : (
        <div>
          <h2>All done for now! 🎉</h2>
          <p>Come back later for more reviews.</p>
        </div>
      )}
    </div>
  );
}

export default FlashcardApp;
```

**That's it!** You now have a working flashcard app with intelligent scheduling.

### Option B: Without React (Plain JavaScript)

```typescript
import {
  CardStateMachine,
  StudySessionManager,
  DeckManager,
  Rating,
  Card,
  Deck,
  DeckConfig,
} from './fsrs-plugin';

// Initialize
const scheduler = new CardStateMachine();
const sessionManager = new StudySessionManager();

// Create deck and config
const config: DeckConfig = DeckManager.createDefaultConfig();
const deck: Deck = DeckManager.createDeck('My Deck');

// Create cards
const cards: Card[] = [
  {
    id: 'card-1',
    noteId: 'note-1',
    deckId: deck.id,
    templateIdx: 0,
    mtime: Date.now(),
    ctype: 0, // CardType.New
    queue: 0, // CardQueue.New
    due: 0,
    interval: 0,
    easeFactor: 2.5,
    reps: 0,
    lapses: 0,
    remainingSteps: 0,
    memoryState: null,
    desiredRetention: 0.9,
    customData: '',
    front: 'What is 2+2?',
    back: '4',
  },
  // Add more cards...
];

// Start session
sessionManager.startSession(deck, cards, config);

// Get next card
const nextCard = sessionManager.getNextCard(cards, config);
console.log('Question:', nextCard?.front);

// User answers
const result = sessionManager.answerCard(nextCard!, Rating.Good, config);
console.log('Next review in:', result.card.interval, 'days');
```

## 🎨 Customization Guide

### Adding Images to Cards

Extend the Card type:

```typescript
// In your project
interface RichCard extends Card {
  frontImage?: string;
  backImage?: string;
}

// Usage
const card: RichCard = {
  ...fsrs.createCard(deckId, 'Front text', 'Back text'),
  frontImage: '/images/eiffel-tower.jpg',
  backImage: '/images/france-map.jpg',
};
```

### Custom Storage (Database/API)

Replace localStorage in `use-fsrs-data.tsx`:

```typescript
// Replace the useEffect load/save with:

// Load from API
const loadData = async () => {
  const response = await fetch('/api/flashcards');
  const data = await response.json();
  setState(prev => ({ ...prev, ...data, loading: false }));
};

// Save to API
const saveData = async () => {
  await fetch('/api/flashcards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      decks: state.decks,
      configs: state.configs,
      cards: state.cards,
      reviewLogs: state.reviewLogs,
    }),
  });
};
```

### Multiple Decks

```tsx
function DeckSelector() {
  const fsrs = useFsrsData();
  const [selectedDeckId, setSelectedDeckId] = React.useState<string>('');

  return (
    <div>
      <select onChange={(e) => setSelectedDeckId(e.target.value)}>
        {fsrs.getAllDecks().map(deck => (
          <option key={deck.id} value={deck.id}>
            {deck.name} ({fsrs.getCounts(deck.id).new} new)
          </option>
        ))}
      </select>

      <button onClick={() => {
        const newDeck = fsrs.createDeck('New Deck');
        setSelectedDeckId(newDeck.id);
      }}>
        Create New Deck
      </button>

      {selectedDeckId && (
        <StudyView deckId={selectedDeckId} />
      )}
    </div>
  );
}
```

## ⚙️ Configuration

### Adjusting Learning Steps

```typescript
const config = fsrs.createConfig('Custom Config', {
  learnSteps: [1, 10],          // 1 minute, then 10 minutes
  graduatingIntervalGood: 1,     // Graduate to 1 day
  graduatingIntervalEasy: 4,     // Or skip to 4 days for "Easy"
});
```

### Adjusting Daily Limits

```typescript
const config = fsrs.createConfig('High Volume', {
  newPerDay: 50,        // 50 new cards per day
  reviewsPerDay: 200,   // 200 reviews per day
});
```

## 🔧 Common Tasks

### Check if Cards are Due

```typescript
const isDue = (card: Card): boolean => {
  const now = Date.now();
  
  if (card.queue === CardQueue.New) return true;
  if (card.queue === CardQueue.Learn) return card.due <= now;
  if (card.queue === CardQueue.Review) {
    const daysElapsed = Math.floor((now - card.mtime) / 86400000);
    return daysElapsed >= card.interval;
  }
  
  return false;
};
```

### Import Existing Cards

```typescript
// From CSV or other format
const importCards = (csvData: string, deckId: string) => {
  const lines = csvData.split('\n');
  
  lines.forEach(line => {
    const [front, back] = line.split(',');
    fsrs.createCard(deckId, front.trim(), back.trim());
  });
};
```

### Export Progress

```typescript
const exportProgress = () => {
  const data = {
    decks: fsrs.getAllDecks(),
    cards: Object.values(fsrs.cards),
    reviewLogs: fsrs.reviewLogs,
  };
  
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flashcards-backup.json';
  a.click();
};
```

## 📊 Understanding the Data

### Card Object

```typescript
{
  id: 'card-123',           // Unique ID
  front: 'Question',        // What user sees first
  back: 'Answer',          // Correct answer
  interval: 7,             // Days until next review
  easeFactor: 2.5,         // How "easy" (1.3-4.0)
  reps: 10,                // Times reviewed
  lapses: 2,               // Times failed
  memoryState: {           // FSRS memory tracking
    stability: 14.5,       // Memory strength in days
    difficulty: 6.2        // Inherent difficulty (1-10)
  }
}
```

### Rating System

- **Again (1)**: Forgot completely → Reset interval
- **Hard (2)**: Struggled → Shorter interval
- **Good (3)**: Normal recall → Standard interval
- **Easy (4)**: Instant recall → Longer interval

## 🐛 Troubleshooting

### Cards Not Showing Up

1. Check if session is started: `fsrs.startStudySession(deckId)`
2. Check card counts: `fsrs.getCounts(deckId)`
3. Verify cards exist: `fsrs.getCardsInDeck(deckId).length`

### Intervals Too Long/Short

Adjust the config:

```typescript
const config = fsrs.createConfig('Adjusted', {
  desiredRetention: 0.85,     // Lower = longer intervals (default: 0.9)
  intervalMultiplier: 1.2,    // Global multiplier
  maximumReviewInterval: 180, // Cap at 6 months
});
```

### Storage Issues

Check browser console for errors. Common issues:
- localStorage quota exceeded (use IndexedDB instead)
- JSON parse errors (validate data structure)

## 🎓 Next Steps

1. **Add Authentication**: Track users and sync across devices
2. **Add Statistics**: Show learning progress and graphs
3. **Add Gamification**: Streaks, achievements, leaderboards
4. **Add Media**: Images, audio, video support
5. **Add Import/Export**: Support Anki .apkg files

## 💡 Tips for Success

1. **Start Small**: Begin with 10-20 cards
2. **Review Daily**: Consistency is key
3. **Use Images**: Visual aids improve recall
4. **Keep Cards Simple**: One concept per card
5. **Tag Cards**: Makes organization easier

## 🤝 Getting Help

- Check `README.md` for full API reference
- Review example code in `examples/` directory
- Study the TypeScript types in `types.ts`

---

**Ready to build your app?** Start with the React Hook example above and customize from there!
