# Widget System Architecture - Visual Guide

## 📊 Component Hierarchy

```
InfiniteCanvas (infinite-canvas.tsx)
│
├─ CanvasViewportDisplay (top-left) - Shows zoom/position
├─ CanvasToolbar (top-center) - Tool selection
│  └─ useCanvasTool hook - Manages tool state + shortcuts
│
├─ SVG Canvas
│  ├─ CanvasGrid - Grid pattern background
│  │
│  └─ For each object in objects[]
│     └─ foreignObject (SVG wrapper)
│        └─ ErrorBoundary
│           └─ CanvasObject (type dispatcher)
│              │
│              ├─ ImageWidget (image)
│              ├─ StickyNoteWidget (sticky-note) ✅ NEW
│              ├─ TextWidget (text) - TODO
│              ├─ ShapeWidget (shape) - TODO
│              ├─ FreehandWidget (freehand) - TODO
│              └─ ArrowWidget (arrow) - TODO
│
└─ Each Widget uses:
   └─ WidgetWrapper
      ├─ Selection border
      ├─ Drag handling
      ├─ Resize handles (3-8 handles)
      │  └─ useWidgetResize hook
      └─ Children (widget content)
```

## 🔄 Sticky Note Lifecycle

### Creation
```
User Action: Press 'S' key
     ↓
useCanvasTool → setTool('sticky-note')
     ↓
Toolbar updates visual state (teal highlight)
     ↓
User Action: Click canvas
     ↓
handleCanvasBackgroundClick
     ↓
Check: currentTool === 'sticky-note'
     ↓
Create StickyNoteObject:
  - id: generateId()
  - type: 'sticky-note'
  - x, y: click position (centered)
  - width: 200, height: 200
  - object_data: { text: '', paperColor: '#ffd700', ... }
     ↓
addObject(stickyNote)
     ↓
useCanvasObjects → objectsRef.current.push(stickyNote)
     ↓
IPC: window.App.file.saveObject(stickyNote)
     ↓
Main Process: multiFileManager.saveObject()
     ↓
SQLite: INSERT INTO objects (...)
     ↓
React re-render with new object
     ↓
Auto-select new note
     ↓
Switch back to 'select' tool
```

### Editing
```
User Action: Double-click sticky note
     ↓
StickyNoteWidget → setIsEditing(true)
     ↓
Show textarea, auto-focus & select text
     ↓
User types...
     ↓
User Action: Ctrl+Enter OR click outside
     ↓
Check if text changed
     ↓
YES: onUpdate(id, { object_data: { text: newText } })
     ↓
useCanvasObjects → updateObject()
     ↓
Find object in objectsRef.current
     ↓
Merge updates: { ...oldObject, ...updates }
     ↓
Update objectsRef.current (immediate)
     ↓
setObjects() → trigger React re-render
     ↓
IPC: window.App.file.saveObject(updated)
     ↓
SQLite: UPDATE objects SET object_data = ... WHERE id = ...
```

### Resizing
```
User Action: Drag resize handle
     ↓
ResizeHandleComponent → onMouseDown
     ↓
useWidgetResize → handleResizeStart(e, 'se')
     ↓
setIsResizing(true)
     ↓
Attach document mousemove/mouseup listeners
     ↓
On mouse move:
  - Calculate delta in screen coords
  - Adjust for zoom: deltaX / zoom
  - Calculate new width/height (respect min size)
  - onUpdate(id, { width: newW, height: newH })
     ↓
React re-renders with new size (live preview)
     ↓
On mouse up:
  - Remove event listeners
  - setIsResizing(false)
  - Final save to DB via IPC
```

## 🎨 CSS Architecture

### Tailwind Classes (in components)
```tsx
// WidgetWrapper - reusable styling
className="relative select-none rounded overflow-visible"
className="border-2 border-dashed border-[#007acc]"  // Selected
className="shadow-[0_0_15px_rgba(0,122,204,0.6)]"   // Resizing

// Resize handles
className="bg-[#007acc] border-2 border-white rounded-sm"
className="hover:bg-[#005999] hover:scale-110"
```

### Inline Styles (dynamic values)
```tsx
// Position, size, z-index from object data
style={{
  width: `${width}px`,
  height: `${height}px`,
  zIndex: object.z_index,
}}

// Sticky note colors
style={{
  backgroundColor: paperColor,
  color: fontColor,
  fontSize: `${fontSize}px`,
}}
```

### Special Effects
```tsx
// Folded corner (clip-path)
clipPath: 'polygon(0% 0%, calc(100% - 35px) 0%, 100% 35px, 100% 100%, 0% 100%)'

// Paper texture (radial gradient)
backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.02) 1px, transparent 0)'
backgroundSize: '20px 20px'

// Gradient overlay
background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)'
```

## 📦 Data Structure

### StickyNoteObject in SQLite
```sql
-- In objects table
{
  id: "1728756432123_abc123xyz",
  type: "sticky-note",
  x: 125.5,
  y: 230.0,
  width: 200,
  height: 200,
  z_index: 5,
  object_data: '{"text":"Buy milk","paperColor":"#ffd700","fontColor":"#333333","fontSize":16,"fontFamily":"Kalam"}',
  created: "2025-10-12T14:30:00.000Z",
  updated: "2025-10-12T14:35:00.000Z"
}
```

### In Memory (TypeScript)
```typescript
const stickyNote: StickyNoteObject = {
  id: "1728756432123_abc123xyz",
  type: "sticky-note",
  x: 125.5,
  y: 230.0,
  width: 200,
  height: 200,
  z_index: 5,
  object_data: {
    text: "Buy milk",
    paperColor: "#ffd700",
    fontColor: "#333333",
    fontSize: 16,
    fontFamily: "Kalam"
  },
  created: "2025-10-12T14:30:00.000Z",
  updated: "2025-10-12T14:35:00.000Z"
}
```

## 🎯 Key Patterns Used

### 1. ObjectsRef Pattern (Prevents Stale Closures)
```typescript
// In use-canvas-objects.ts
const [objects, setObjects] = useState([])
const objectsRef = useRef([])

useEffect(() => {
  objectsRef.current = objects  // Always synced
}, [objects])

// In callbacks - ALWAYS use ref!
const updateObject = useCallback((id, updates) => {
  const obj = objectsRef.current.find(o => o.id === id)  ✅
  // NOT: objects.find(...) ❌ - would be stale!
}, [tabId])  // Only tabId dependency
```

### 2. WidgetWrapper Pattern (DRY)
```typescript
// Before: 300+ lines per widget with duplicate code
// After: ~130 lines, wrapper handles all interactions

<WidgetWrapper {...props}>
  {/* Only render widget-specific content */}
</WidgetWrapper>
```

### 3. Type Dispatcher Pattern
```typescript
// canvas-object.tsx - routes to correct widget
switch (object.type) {
  case 'sticky-note': return <StickyNoteWidget />
  case 'text': return <TextWidget />
  // ...
}
```

### 4. Hook Composition
```typescript
// Each hook does ONE thing
const { currentTool, setTool } = useCanvasTool()
const { objects, addObject, updateObject } = useCanvasObjects()
const { isResizing, handleResizeStart } = useWidgetResize()
const { viewport, setViewport } = useViewport()
```

## 🚀 Performance Optimizations

1. **Memoization**
   ```typescript
   const viewBox = useMemo(() => calculateViewBox(), [viewport, dimensions])
   ```

2. **useCallback** for event handlers
   ```typescript
   const handleClick = useCallback((e) => { ... }, [deps])
   ```

3. **React.memo** (future)
   ```typescript
   export const StickyNoteWidget = React.memo(({ ... }) => { ... })
   ```

4. **Debounced saves** (viewport only)
   ```typescript
   // Viewport saves are debounced 500ms
   // Object saves happen on drag end (not during drag)
   ```

## 🔧 Debugging Tips

### 1. Check IPC Logs
```bash
# Main process logs (terminal where you ran `pnpm dev`)
[IPC] file-save-object: { id: '...', type: 'sticky-note', ... }

# Renderer logs (F12 DevTools console)
console.log('Creating sticky note at', worldPos)
```

### 2. Inspect ObjectsRef
```typescript
// Add temporary debug in infinite-canvas.tsx
useEffect(() => {
  console.log('Objects changed:', objects.length, objectsRef.current)
}, [objects])
```

### 3. Check Database
```bash
# Extract .what file (it's a ZIP)
unzip myfile.what -d temp/
sqlite3 temp/main.db "SELECT * FROM objects WHERE type='sticky-note';"
```

### 4. React DevTools
- Install React DevTools extension
- Inspect component props/state
- Check useCanvasObjects hook values

---

**This architecture enables:**
- ✅ Adding new widget types in ~100 lines
- ✅ No code duplication
- ✅ Type-safe with TypeScript
- ✅ Easy to test & debug
- ✅ Performant (memoization + callbacks)
- ✅ Maintainable (clear separation of concerns)
