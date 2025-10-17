# Keyboard Shortcuts Registry System

**Status:** 🚧 In Development  
**Started:** October 16, 2025  
**Goal:** Context-aware, registry-based keyboard shortcuts system

---

## 🎯 Vision

A centralized, context-aware keyboard shortcuts system that:
- Prevents conflicts through priority-based contexts
- Makes shortcuts discoverable and maintainable
- Enables easy testing and customization
- Matches our widget/panel registry patterns

---

## 📋 Build Checklist

### Phase 1: Core System ✅ COMPLETE
- [x] **contexts.ts** - Define context hierarchy ✅
- [x] **types.ts** - TypeScript interfaces ✅
- [x] **shortcuts-registry.ts** - Core registry logic ✅
- [x] **ShortcutsProvider.tsx** - React context provider ✅
- [x] **use-shortcuts.tsx** - React hook ✅
- [x] **index.ts** - Public API exports ✅
- [x] **Modifier support** - keydown/keyup tracking ✅
- [ ] **Testing** - Basic registry tests (optional for now)

### Phase 2: Built-in Shortcuts ✅ COMPLETE
- [x] **system-shortcuts.ts** - Global shortcuts ✅
  - [x] `Ctrl+S` - Save file (Week 4 feature)
  - [x] `Ctrl+Z` - Undo (Week 3 feature)
  - [x] `Ctrl+Y` / `Ctrl+Shift+Z` - Redo
  - [x] `Ctrl+N` - New file
  - [x] `Ctrl+O` - Open file
  - [x] `Ctrl+W` - Close tab
  - [x] `Ctrl+/` - Shortcuts help
  
- [x] **canvas-shortcuts.ts** - Canvas operations ✅
  - [x] `Delete` / `Backspace` - Delete selected
  - [x] `Ctrl+A` - Select all
  - [x] `Ctrl+D` - Duplicate (future)
  - [x] `Escape` - Clear selection
  - [x] `Arrow keys` - Move objects (existing)
  - [x] `Ctrl+C` - Copy (future)
  - [x] `Ctrl+X` - Cut (future)
  - [x] `Ctrl+V` - Paste (existing)
  
- [x] **dialog-shortcuts.ts** - Dialog operations ✅
  - [x] `Escape` - Close dialog
  - [x] `Enter` - Confirm action
  
- [x] **tool-shortcuts.ts** - Tool selection ✅
  - [x] `V` - Select tool
  - [x] `P` - Freehand pen
  - [x] `A` - Arrow
  - [x] `T` - Text
  - [x] `R` - Rectangle
  - [x] `S` - Sticky note
  - [x] `I` - Image
  - [x] `Y` - YouTube
  - [x] `E` - Emoji

### Phase 3: Integration 🔌
- [ ] Migrate existing keyboard handlers
  - [ ] Delete key (infinite-canvas.tsx)
  - [ ] Arrow keys (infinite-canvas.tsx)
  - [ ] Paste handler (use-clipboard-paste.ts)
  
- [ ] Add provider to app root
- [ ] Update infinite-canvas.tsx to use registry
- [ ] Remove old keyboard event handlers

### Phase 4: Features ✨
- [ ] **ShortcutsHelpPanel.tsx** - `Ctrl+?` help screen
- [ ] Conflict detection & warnings
- [ ] Platform-specific keys (Mac vs Windows)
- [ ] Enable/disable based on state
- [ ] Debug mode logging

### Phase 5: Documentation 📚
- [ ] Update CHECKLIST.md
- [ ] Update ARCHITECTURE.md
- [ ] Add examples for future contributors
- [ ] Create migration guide

---

## 🏗️ Architecture

```
src/renderer/shortcuts/
├── README.md                    # This file
├── types.ts                     # TypeScript types
├── contexts.ts                  # Context definitions & priorities
├── shortcuts-registry.ts        # Core registry class
├── ShortcutsProvider.tsx        # React context provider
├── use-shortcuts.tsx            # React hook
├── register-all.ts              # Auto-register built-in shortcuts
└── shortcuts/
    ├── system-shortcuts.ts      # Global app shortcuts
    ├── canvas-shortcuts.ts      # Canvas-specific shortcuts
    ├── dialog-shortcuts.ts      # Dialog shortcuts
    └── tool-shortcuts.ts        # Tool selection shortcuts
```

---

## 📝 Design Notes

### Context Priority System

Higher priority contexts override lower ones:

```typescript
enum ShortcutContext {
  Dialog = 100,      // Highest - Modal dialogs (Esc closes dialog)
  Tool = 80,         // Tool-specific (while drawing)
  Canvas = 60,       // Canvas-focused (Delete, Arrow keys)
  Tab = 40,          // Tab-specific operations
  System = 20,       // Lowest - Global (always active unless overridden)
}
```

**Example:** Pressing `Escape`
- If dialog open → Close dialog (Dialog context wins)
- If drawing → Cancel drawing (Tool context wins)
- If canvas selected → Clear selection (Canvas context wins)

### Shortcut Registration

```typescript
interface ShortcutRegistration {
  id: string                    // Auto-generated unique ID
  key: string                   // Key combo: 'ctrl+s', 'delete', 'escape'
  context: ShortcutContext      // Priority level
  action: () => void            // What to do
  description: string           // Human-readable description
  enabled?: () => boolean       // Optional conditional enable
  preventDefault?: boolean      // Prevent default browser behavior
}
```

### Key Format

Standardized key notation:
- Single keys: `'a'`, `'delete'`, `'escape'`, `'enter'`
- With modifiers: `'ctrl+s'`, `'shift+delete'`, `'ctrl+shift+z'`
- Arrow keys: `'arrowup'`, `'arrowdown'`, `'arrowleft'`, `'arrowright'`
- Platform-aware: `'mod+s'` → Mac: `Cmd+S`, Windows: `Ctrl+S`

### Usage Patterns

#### Pattern 1: Hook-based (Dynamic)
```typescript
function MyComponent() {
  const { registerShortcut } = useShortcuts()
  
  useEffect(() => {
    const id = registerShortcut({
      key: 'ctrl+d',
      context: ShortcutContext.Canvas,
      action: () => duplicateSelected(),
      description: 'Duplicate selected objects',
      enabled: () => hasSelection,
    })
    
    return () => unregisterShortcut(id)
  }, [hasSelection])
}
```

#### Pattern 2: Modifier Tracking (Ctrl for Straight Lines)
```typescript
function DrawingCanvas() {
  const { registerModifier } = useShortcuts()
  const [isCtrlPressed, setIsCtrlPressed] = useState(false)
  
  useEffect(() => {
    const id = registerModifier({
      key: 'control',
      context: ShortcutContext.Tool,
      onPress: () => setIsCtrlPressed(true),
      onRelease: () => setIsCtrlPressed(false),
      description: 'Enable straight line mode',
      enabled: () => isDrawing,
    })
    
    return () => unregisterShortcut(id)
  }, [isDrawing])
  
  // Use isCtrlPressed in drawing logic
  if (isCtrlPressed) {
    // Draw straight line
  }
}
```

#### Pattern 3: useModifier Hook (Simpler)
```typescript
function DrawingCanvas() {
  const isCtrlPressed = useModifier({
    key: 'control',
    context: ShortcutContext.Tool,
    description: 'Enable straight line mode',
    enabled: () => isDrawing,
  }, [isDrawing])
  
  // isCtrlPressed automatically tracks state!
}
```

#### Pattern 4: Registry-based (Static)
```typescript
// shortcuts/canvas-shortcuts.ts
export function registerCanvasShortcuts(registry: ShortcutsRegistry) {
  registry.register({
    key: 'delete',
    context: ShortcutContext.Canvas,
    action: () => deleteSelected(),
    description: 'Delete selected objects',
  })
}
```

---

## 🔍 Current Keyboard Handling (To Migrate)

### 1. Delete Key
**Location:** `infinite-canvas.tsx` ~line 800+  
**Current:** Direct `keydown` event listener  
**Migrate to:** `canvas-shortcuts.ts`

### 2. Arrow Keys
**Location:** `infinite-canvas.tsx` ~line 850+  
**Current:** Direct `keydown` event listener with arrow key detection  
**Migrate to:** `canvas-shortcuts.ts`

### 3. Paste Handler
**Location:** `use-clipboard-paste.ts`  
**Current:** Custom `paste` event listener  
**Migrate to:** `canvas-shortcuts.ts` with `ctrl+v`

---

## 🎨 Future Features

### User Customization (Week 4+)
```typescript
// Allow users to rebind shortcuts
shortcutsRegistry.rebind('delete', 'ctrl+delete')

// Save to user preferences
window.App.saveSettings({
  shortcuts: shortcutsRegistry.export()
})
```

### Shortcuts Help Panel
```
┌─────────────────────────────────────────────┐
│  Keyboard Shortcuts              [Ctrl+?]   │
├─────────────────────────────────────────────┤
│  System                                     │
│    Ctrl+S         Save current file         │
│    Ctrl+Z         Undo last action          │
│    Ctrl+Y         Redo last action          │
│                                             │
│  Canvas                                     │
│    Delete         Delete selected objects   │
│    ←→↑↓          Move selected objects     │
│    Ctrl+A         Select all objects        │
│    Escape         Clear selection           │
│                                             │
│  Tools                                      │
│    V              Select tool               │
│    P              Freehand pen              │
│    T              Text tool                 │
└─────────────────────────────────────────────┘
```

### Conflict Detection
```typescript
// Dev mode warnings
if (process.env.NODE_ENV === 'development') {
  const conflicts = shortcutsRegistry.detectConflicts()
  if (conflicts.length > 0) {
    console.warn('⚠️ Shortcut conflicts detected:', conflicts)
  }
}
```

---

## 🧪 Testing Strategy

### Unit Tests
- Registry add/remove/lookup
- Context priority resolution
- Key normalization
- Conflict detection

### Integration Tests
- Provider/hook interaction
- Event listener setup/teardown
- Multiple shortcuts in same context
- Disabled shortcuts don't fire

### E2E Tests (Future)
- Actual keyboard events trigger actions
- Dialog shortcuts override canvas shortcuts
- Help panel displays all shortcuts

---

## 🚀 Migration Plan

### Step 1: Build Core (Don't break anything)
- Create registry system
- Add provider to app
- Keep existing handlers working

### Step 2: Migrate One Feature
- Start with Delete key
- Prove the system works
- Remove old handler

### Step 3: Migrate Remaining
- Arrow keys
- Paste handler
- Any other keyboard events

### Step 4: Add New Shortcuts
- Tool selection (V, P, T, etc.)
- System shortcuts (Ctrl+Z, Ctrl+S)
- Help panel (Ctrl+?)

---

## 💡 Design Decisions

### Why Context-Based?
**Problem:** Global shortcuts conflict with dialog shortcuts  
**Solution:** Priority-based contexts allow overrides

### Why Registry Pattern?
**Problem:** Shortcuts scattered across components  
**Solution:** Central registry = single source of truth

### Why React Context?
**Problem:** Need app-wide keyboard handling  
**Solution:** Provider at root, hooks in components

### Why Not Existing Library?
**Considered:** react-hotkeys-hook, mousetrap  
**Decision:** Build custom for:
- Full control over context system
- Match existing registry patterns
- No external dependencies
- Learning opportunity

---

## 🎓 Learning Resources

### Key Event Handling
- `event.key` - Modern way (returns 'a', 'Enter', 'ArrowUp')
- `event.code` - Physical key (returns 'KeyA', 'Enter', 'ArrowUp')
- Modifiers: `event.ctrlKey`, `event.shiftKey`, `event.altKey`, `event.metaKey`

### Platform Detection
```typescript
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
const modKey = isMac ? 'cmd' : 'ctrl'
```

---

## 📊 Progress Tracker

**Current Phase:** � Phase 3 - Integration  
**Completed:** Phase 1 ✅ Phase 2 ✅  
**Next Up:** Add ShortcutsProvider to app root

### Time Estimates
- Phase 1 (Core): ~2-3 hours ⏰
- Phase 2 (Shortcuts): ~1-2 hours ⏰
- Phase 3 (Integration): ~1-2 hours ⏰
- Phase 4 (Features): ~1-2 hours ⏰
- Phase 5 (Docs): ~30 minutes ⏰

**Total: ~6-9 hours of work**

---

## 🐛 Known Issues / TODOs

- [ ] Handle international keyboards (é, ñ, etc.)
- [ ] Consider accessibility (screen readers)
- [ ] Test on Linux/Mac/Windows
- [ ] Handle key repeat events
- [ ] Prevent shortcuts when typing in inputs

---

## 🎉 Success Metrics

**We'll know this is successful when:**
- ✅ All keyboard shortcuts work consistently
- ✅ No conflicts between contexts
- ✅ Easy to add new shortcuts (< 10 lines of code)
- ✅ Help panel shows all available shortcuts
- ✅ Code is 50%+ less than scattered handlers
- ✅ Other devs can understand and extend it

---

**Let's build this!** 🚀

Next step: Create `contexts.ts` to define our context hierarchy.
