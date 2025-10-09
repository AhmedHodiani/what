# 🏛️ Architecture Overview

## Component Hierarchy

```
App
└── MainScreenWithTabs
    ├── MenuBar (layout controls)
    ├── WelcomeScreen (when no files)
    └── FlexLayout (tab system)
        └── TabNode (per file)
            └── InfiniteCanvas
                ├── CanvasGrid
                ├── CanvasDemoContent (or your content)
                └── CanvasViewportDisplay
```

## Data Flow

```
User Action (mouse/wheel)
    ↓
Hook (use-canvas-pan / use-canvas-zoom)
    ↓
useViewport (state management)
    ↓
InfiniteCanvas (render)
    ↓
onViewportChange callback
    ↓
MainScreenWithTabs (debounce 500ms)
    ↓
IPC: file-save-viewport
    ↓
Main Process (WhatFileService)
    ↓
SQLite Database
```

## Separation of Concerns

### **Hooks** (Logic)
- Container sizing
- Viewport state
- Pan interaction
- Zoom interaction

### **Components** (UI)
- InfiniteCanvas (orchestrator)
- CanvasGrid (visual)
- CanvasViewportDisplay (overlay)
- CanvasDemoContent (placeholder)

### **Services** (Business Logic)
- WhatFileService (file I/O)
- MultiFileManager (tab state)

---

## Adding New Features

### Example: Add Selection Tool

1. **Create hook:**
   ```typescript
   // src/renderer/hooks/use-canvas-selection.ts
   export function useCanvasSelection(containerRef, onSelect) {
     // click/drag logic
   }
   ```

2. **Use in canvas:**
   ```typescript
   // src/renderer/components/canvas/infinite-canvas.tsx
   import { useCanvasSelection } from 'renderer/hooks'
   
   useCanvasSelection(containerRef, handleSelect)
   ```

3. **Add UI:**
   ```typescript
   // src/renderer/components/canvas/canvas-selection-box.tsx
   export function CanvasSelectionBox({ rect }) {
     return <rect ... />
   }
   ```

**Zero changes to existing code!** 🎉

---

## File Structure

```
src/
├── main/
│   ├── services/
│   │   ├── what-file.ts          [File I/O]
│   │   └── multi-file-manager.ts [Multi-file state]
│   └── windows/
│       └── main.ts                [IPC handlers]
│
├── renderer/
│   ├── hooks/
│   │   ├── use-container-size.ts  [Container dimension tracking]
│   │   ├── use-viewport.ts        [Viewport state]
│   │   ├── use-canvas-pan.ts      [Pan interaction]
│   │   └── use-canvas-zoom.ts     [Zoom interaction]
│   │
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── infinite-canvas.tsx      [Main canvas orchestrator]
│   │   │   ├── canvas-grid.tsx          [Grid pattern]
│   │   │   ├── canvas-viewport-display.tsx [Viewport overlay]
│   │   │   └── canvas-demo-content.tsx  [Demo shapes]
│   │   │
│   │   ├── layout/
│   │   │   └── menu-bar.tsx       [Menu + window controls]
│   │   │
│   │   └── welcome/
│   │       └── welcome-screen.tsx [No files state]
│   │
│   └── screens/
│       └── main-with-tabs.tsx     [Main app screen]
│
└── shared/
    └── types/
        ├── what-file.ts           [File types]
        └── tabs.ts                [Tab types]
```

---

## Key Principles

1. **Single Responsibility** - Each file does ONE thing
2. **Separation of Concerns** - Logic ≠ UI
3. **Composability** - Small pieces combine into bigger features
4. **Testability** - Hooks and components can be tested independently
5. **Reusability** - Hooks can be used in multiple components
6. **No Side Effects** - Pure functions where possible
7. **Type Safety** - TypeScript everywhere

**Result:** Building new features is like playing with Legos! 🧱
