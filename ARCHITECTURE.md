# ARCHITECTURE

## Core Pattern: Widget System

**Problem:** Adding new drawing objects required 300+ lines of boilerplate  
**Solution:** `WidgetWrapper` handles all interactions, widgets only render content

```typescript
// Before: 200+ lines with resize/drag/selection logic
// After: 40 lines using WidgetWrapper

export function ImageWidget({ object, ...props }: WidgetProps) {
  return (
    <WidgetWrapper object={object} {...props}>
      <img src={getImageUrl(object.object_data.assetId)} />
    </WidgetWrapper>
  )
}
```

## File Structure

```
src/
├── lib/
│   ├── types/
│   │   ├── canvas.ts                      [DrawingObject union types]
│   │   └── canvas-validators.ts           [Type guards & validation]
│   ├── utils/
│   │   ├── id-generator.ts                [UUID generation]
│   │   └── canvas.ts                      [Canvas utilities]
│   └── commands/                          [NOT YET - Week 3]
│
├── main/
│   ├── services/
│   │   ├── what-file.ts                   [SQLite + ZIP file I/O]
│   │   └── multi-file-manager.ts          [Multi-tab management]
│   └── windows/main.ts                    [IPC handlers with removeHandler()]
│
├── renderer/
│   ├── hooks/
│   │   ├── use-canvas-objects.ts          [CRUD with objectsRef pattern]
│   │   ├── use-widget-resize.ts           [8-handle resize logic]
│   │   ├── use-viewport.ts                [Pan/zoom state]
│   │   ├── use-canvas-pan.ts              [Pan interaction]
│   │   ├── use-canvas-zoom.ts             [Zoom interaction]
│   │   ├── use-clipboard-paste.ts         [Paste images]
│   │   └── use-container-size.ts          [Responsive canvas]
│   │
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── infinite-canvas.tsx        [Main orchestrator]
│   │   │   ├── canvas-object.tsx          [Type dispatcher]
│   │   │   ├── canvas-grid.tsx            [Grid background]
│   │   │   ├── canvas-viewport-display.tsx [Debug overlay]
│   │   │   ├── canvas-error-boundary.tsx  [Canvas-specific errors]
│   │   │   ├── image-widget.tsx           [Image widget]
│   │   │   └── widgets/
│   │   │       ├── widget-wrapper.tsx     [Reusable interactions]
│   │   │       └── widget-interface.ts    [TypeScript interfaces]
│   │   │
│   │   ├── error-boundary.tsx             [Generic error boundary]
│   │   ├── layout/menu-bar.tsx            [Top menu]
│   │   └── welcome/welcome-screen.tsx     [No file state]
│   │
│   └── screens/
│       ├── main.tsx                       [Single file mode]
│       └── main-with-tabs.tsx             [Multi-tab mode]
│
└── plugins/                                [NOT YET - Week 4]
```

## Data Flow

### Object Operations
```
User drags object
  → handleStartDrag (infinite-canvas.tsx)
  → moveObject (use-canvas-objects.ts) - updates objectsRef.current
  → setObjects (React state update)
  → handleDragEnd
  → saveObjectPosition (use-canvas-objects.ts) - persists to DB
  → window.App.file.saveObject (IPC)
  → multiFileManager.saveObject (main process)
  → whatFileService.saveObject (SQLite update)
```

### Viewport Persistence
```
User pans/zooms
  → useCanvasPan/useCanvasZoom hook
  → setViewport (use-viewport.ts)
  → onViewportChange callback (infinite-canvas.tsx)
  → 500ms debounce (main.tsx)
  → window.App.file.saveViewport (IPC)
  → multiFileManager.saveViewport
  → whatFileService.saveViewport (SQLite metadata table)
```

## Critical Patterns

### 1. ObjectsRef Pattern (Prevents Stale Closures)
```typescript
const [objects, setObjects] = useState([])
const objectsRef = useRef([])

useEffect(() => {
  objectsRef.current = objects  // Always in sync
}, [objects])

// ✅ Use ref in callbacks to avoid stale closure
const savePosition = useCallback(async (id, x, y) => {
  const obj = objectsRef.current.find(o => o.id === id)
  // ... save logic
}, [tabId])  // Only tabId dependency, not objects!
```

### 2. IPC Handler Cleanup (Fixes Hot Reload)
```typescript
// main/windows/main.ts
ipcMain.removeHandler('file-save-viewport')  // Always remove first
ipcMain.handle('file-save-viewport', async (...) => {
  // handler logic
})
```

### 3. Error Boundaries (Prevent Cascading Failures)
```typescript
// In infinite-canvas.tsx - wraps each object
<ErrorBoundary
  fallback={(error) => (
    <text x={obj.x} y={obj.y} fill="#ff0000">
      ❌ Error: {error.message}
    </text>
  )}
>
  <CanvasObject object={obj} />
</ErrorBoundary>
```

### 4. Type Guards (Validate Data)
```typescript
export function isImageObject(obj: DrawingObject): obj is ImageObject {
  return obj.type === 'image' && 
    'assetId' in obj.object_data &&
    'width' in obj && 'height' in obj
}
```

## Database Schema

```sql
-- metadata table (key-value store)
CREATE TABLE metadata (
  key TEXT PRIMARY KEY,    -- 'viewport_x', 'viewport_y', 'viewport_zoom', etc.
  value TEXT NOT NULL      -- JSON-encoded values
)

-- objects table (1 file = 1 canvas, no canvas_id)
CREATE TABLE objects (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,      -- 'image' | 'sticky-note' | 'text' | etc.
  x REAL, y REAL,
  width REAL, height REAL,
  z_index INTEGER,
  object_data TEXT NOT NULL,  -- JSON: type-specific fields
  created TEXT, updated TEXT
)

-- assets table (references to assets/ folder)
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  created TEXT
)
```

## File Format (.what)

```
[8-byte magic: 0x57484154 01000000]  ← Prevents OS from treating as ZIP
[ZIP data containing:]
  ├── main.db (SQLite)
  ├── meta.json
  └── assets/
      └── [image files]
```

## Adding a New Widget Type

1. **Define type** in `lib/types/canvas.ts`
2. **Create widget** using `WidgetWrapper`
3. **Add to switch** in `canvas-object.tsx`
4. **Test** create/edit/resize/drag/save

Example:
```typescript
// sticky-note-widget.tsx
export function StickyNoteWidget({ object, ...props }) {
  return (
    <WidgetWrapper object={object} {...props}>
      <textarea 
        value={object.object_data.text}
        onChange={(e) => props.onUpdate(object.id, {
          object_data: { ...object.object_data, text: e.target.value }
        })}
      />
    </WidgetWrapper>
  )
}
```

## Common Pitfalls

1. **Stale Closures** - Use `objectsRef.current`, not `objects` in callbacks
2. **Hot Reload Issues** - Always `removeHandler()` before `handle()`
3. **Missing tabId** - All IPC calls need optional `tabId` parameter
4. **Forgetting _imageUrl** - Exclude temp fields before saving to DB
5. **Z-index Conflicts** - Always set unique z_index when creating objects

## Performance Notes

- Viewport saves debounced 500ms (not on every frame)
- Objects only save on drag end (not during drag)
- Files only persist on window close (or manual save)
- Use `key={currentFile.path}` to remount canvas when file changes
