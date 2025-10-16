# Tool System Guide

This document explains the tool system in the "What" application and how to add new tools to the codebase.

## 📋 Current Tools

The application currently has **8 tools** available in the canvas toolbar:

| Tool | Key | Icon | Description |
|------|-----|------|-------------|
| **Select** | `V` | Mouse pointer | Default tool for selecting, moving, and resizing objects |
| **Sticky Note** | `S` | Sticky note | Create yellow sticky notes with editable text |
| **Text** | `T` | T icon | Create text boxes with customizable typography |
| **Shape** | `R` | Rectangle | Shape drawing tool (coming soon) |
| **Freehand** | `P` | Pen | Draw smooth freehand strokes with customizable brush |
| **Arrow** | `A` | Arrow | Draw arrows with customizable stroke and arrowhead |
| **Image** | `I` | Image | Insert images via file picker or Ctrl+V |
| **YouTube** | `Y` | 📺 | Embed YouTube videos with live playback |

---

## 🏗️ Architecture Overview

The tool system follows a clean separation of concerns:

```
┌─────────────────┐
│  Canvas Toolbar │  ← Tool selection UI
└────────┬────────┘
         │
┌────────▼────────┐
│ useCanvasTool() │  ← Tool state management hook
└────────┬────────┘
         │
┌────────▼────────────┐
│ InfiniteCanvas.tsx  │  ← Tool logic & interaction
└────────┬────────────┘
         │
    ┌────▼─────┬──────────┬──────────┐
    │          │          │          │
┌───▼───┐ ┌───▼───┐ ┌───▼──────┐ ┌─▼─────────┐
│Widget │ │ Hook  │ │ Object   │ │Properties │
│       │ │       │ │ Type     │ │Panel      │
└───────┘ └───────┘ └──────────┘ └───────────┘
```

---

## 🎯 Tool Categories

### 1. **Creation Tools** (Single Click)
Tools that create objects with a single click:
- **Sticky Note**: Click → creates 200x200 note
- **Image**: Click → opens file picker → places image
- **Text**: Click → creates text box (planned)

### 2. **Drawing Tools** (Click & Drag)
Tools that require mouse drag interaction:
- **Freehand**: Draw smooth pen strokes
- **Arrow**: Draw arrows with arrowheads
- **Shape**: Draw rectangles, circles, etc. (planned)

### 3. **Selection Tool** (Default)
- **Select**: Click to select, drag to move, handles to resize

---

## 🛠️ Adding a New Tool

Follow these steps to add a new tool to the codebase:

### Step 1: Define Tool Type

Add your tool to the `CanvasTool` type in `src/renderer/hooks/use-canvas-tool.ts`:

```typescript
export type CanvasTool = 
  | 'select' 
  | 'sticky-note' 
  | 'text' 
  | 'shape' 
  | 'freehand' 
  | 'arrow' 
  | 'image'
  | 'your-new-tool' // Add here
```

### Step 2: Add Toolbar Button

Update `src/renderer/components/canvas/canvas-toolbar.tsx`:

```typescript
const tools: ToolConfig[] = [
  // ... existing tools
  {
    id: 'your-new-tool',
    name: 'Your Tool',
    icon: YourIcon, // Import from lucide-react
    shortcut: 'Y', // Choose unused key
  },
]
```

### Step 3: Choose Your Implementation Path

#### **Option A: Creation Tool (Single Click)**

Add a case to `handleCanvasBackgroundClick` in `infinite-canvas.tsx`:

```typescript
case 'your-new-tool': {
  const yourObject: YourObjectType = {
    id: generateId(),
    type: 'your-new-tool',
    x: worldPos.x - 50, // Center it
    y: worldPos.y - 50,
    width: 100,
    height: 100,
    z_index: objects.length,
    object_data: {
      // Your custom data
    },
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  }
  await addObject(yourObject)
  selectObject(yourObject.id)
  setTool('select') // Switch back after creating
  break
}
```

#### **Option B: Drawing Tool (Click & Drag)**

1. **Create a drawing hook** (`use-your-tool-drawing.ts`):

```typescript
import { useState, useCallback, useRef, useEffect } from 'react'
import type { Point, YourObjectType } from 'lib/types/canvas'
import { generateId } from 'lib/utils/id-generator'

interface UseYourToolDrawingOptions {
  isEnabled: boolean
  // Your tool-specific options
  onComplete: (object: YourObjectType) => Promise<void>
  screenToWorld: (screenX: number, screenY: number) => Point
}

export function useYourToolDrawing({
  isEnabled,
  onComplete,
  screenToWorld,
}: UseYourToolDrawingOptions) {
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentData, setCurrentData] = useState<YourData>({})

  const handleDrawStart = useCallback((e: React.MouseEvent, containerRef: React.RefObject<HTMLDivElement>) => {
    if (!isEnabled) return false
    
    const worldPoint = screenToWorld(e.clientX, e.clientY)
    setIsDrawing(true)
    setCurrentData({ startPoint: worldPoint })
    
    return true
  }, [isEnabled, screenToWorld])

  const handleDrawMove = useCallback((e: MouseEvent) => {
    if (!isDrawing || !isEnabled) return
    
    const worldPoint = screenToWorld(e.clientX, e.clientY)
    // Update your drawing data
  }, [isDrawing, isEnabled, screenToWorld])

  const handleDrawEnd = useCallback(async () => {
    if (!isDrawing) return
    
    // Create your object
    const yourObject: YourObjectType = {
      id: generateId(),
      type: 'your-new-tool',
      x: 0,
      y: 0,
      z_index: 0,
      object_data: currentData,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }
    
    setIsDrawing(false)
    setCurrentData({})
    
    await onComplete(yourObject)
  }, [isDrawing, currentData, onComplete])

  return {
    isDrawing,
    currentData,
    handleDrawStart,
    handleDrawMove,
    handleDrawEnd,
  }
}
```

2. **Export from hooks/index.ts**:

```typescript
export { useYourToolDrawing } from './use-your-tool-drawing'
```

3. **Integrate in infinite-canvas.tsx**:

```typescript
// Import
import { useYourToolDrawing } from 'renderer/hooks/use-your-tool-drawing'

// Add hook
const {
  isDrawing: isYourToolDrawing,
  currentData,
  handleDrawStart: handleYourToolStart,
  handleDrawMove: handleYourToolMove,
  handleDrawEnd: handleYourToolEnd,
} = useYourToolDrawing({
  isEnabled: currentTool === 'your-new-tool',
  screenToWorld,
  onComplete: useCallback(
    async (yourObject: YourObjectType) => {
      await addObject(yourObject)
    },
    [addObject]
  ),
})

// Update cursor
style={{
  cursor: currentTool === 'your-new-tool' 
    ? 'crosshair' 
    : /* other cursors */
}}

// Add mouse handlers in SVG
onMouseDown={(e) => {
  if (currentTool === 'your-new-tool') {
    e.stopPropagation()
    handleYourToolStart(e, containerRef as React.RefObject<HTMLDivElement>)
  }
  // ... other tools
}}

onMouseMove={(e) => {
  if (isYourToolDrawing) {
    handleYourToolMove(e.nativeEvent)
  }
  // ... other tools
}}

onMouseUp={() => {
  if (isYourToolDrawing) {
    handleYourToolEnd()
  }
  // ... other tools
}}

// Add preview rendering (optional)
{isYourToolDrawing && (
  <YourPreviewSVG data={currentData} />
)}
```

### Step 4: Define Object Type

Add your object type to `src/lib/types/canvas.ts`:

```typescript
export interface YourObjectType {
  id: string
  type: 'your-new-tool'
  x: number
  y: number
  width?: number  // Optional if not resizable
  height?: number
  z_index: number
  object_data: {
    // Your custom data structure
    customField: string
    anotherField: number
  }
  created: string
  updated: string
}

// Add to DrawingObject union
export type DrawingObject = 
  | ImageObject 
  | StickyNoteObject
  | YourObjectType  // Add here
  | /* ... */
```

### Step 5: Create Widget Component

Create `src/renderer/components/canvas/widgets/your-tool-widget.tsx`:

```typescript
import type { YourObjectType } from 'lib/types/canvas'

interface YourToolWidgetProps {
  object: YourObjectType
  isSelected: boolean
  zoom: number
  onUpdate: (id: string, updates: Partial<YourObjectType>) => void
  onSelect: (id: string) => void
  onContextMenu: (event: React.MouseEvent, id: string) => void
  onStartDrag: (e: React.MouseEvent, id: string) => void
}

export function YourToolWidget({
  object,
  isSelected,
  zoom,
  onUpdate,
  onSelect,
  onContextMenu,
  onStartDrag,
}: YourToolWidgetProps) {
  // For HTML-based widgets, use WidgetWrapper
  return (
    <WidgetWrapper
      object={object}
      isSelected={isSelected}
      zoom={zoom}
      onUpdate={onUpdate}
      onSelect={onSelect}
      onContextMenu={onContextMenu}
      onStartDrag={onStartDrag}
    >
      {/* Your widget content */}
    </WidgetWrapper>
  )
  
  // For SVG-based widgets (like freehand/arrow), render directly
  return (
    <g>
      {/* Your SVG content */}
    </g>
  )
}
```

### Step 6: Register Widget in Dispatcher

Update `src/renderer/components/canvas/canvas-object.tsx`:

```typescript
import { YourToolWidget } from './widgets/your-tool-widget'

// In switch statement
case 'your-new-tool':
  return (
    <YourToolWidget
      object={object}
      isSelected={isSelected}
      zoom={zoom}
      onUpdate={onUpdate}
      onSelect={onSelect}
      onContextMenu={onContextMenu}
      onStartDrag={onStartDrag}
    />
  )
```

### Step 7: Handle Rendering (if needed)

In `infinite-canvas.tsx`, if your widget needs special rendering (like SVG vs HTML):

```typescript
{objects.map(obj => {
  // Direct SVG rendering (no foreignObject)
  if (obj.type === 'your-new-tool' && needsDirectSVG) {
    return (
      <ErrorBoundary key={obj.id} fallback={/* ... */}>
        <CanvasObject /* ... */ />
      </ErrorBoundary>
    )
  }
  
  // Standard HTML rendering (with foreignObject)
  return (
    <ErrorBoundary key={obj.id} fallback={/* ... */}>
      <foreignObject x={obj.x} y={obj.y} width={width} height={height}>
        <CanvasObject /* ... */ />
      </foreignObject>
    </ErrorBoundary>
  )
})}
```

### Step 8: Add Properties Panel (Optional)

If your tool needs custom properties, add to `canvas-properties-panel.tsx`:

```typescript
case 'your-new-tool':
  return (
    <YourToolPropertiesPanel
      object={selectedObject}
      onUpdate={onUpdate}
    />
  )
```

---

## 📝 Examples

### Example 1: Circle Tool (Creation)

**Simple click-to-create circle:**

```typescript
// 1. Add to toolbar
{ id: 'circle', name: 'Circle', icon: Circle, shortcut: 'C' }

// 2. Add to handleCanvasBackgroundClick
case 'circle': {
  const circle: ShapeObject = {
    id: generateId(),
    type: 'shape',
    x: worldPos.x - 50,
    y: worldPos.y - 50,
    width: 100,
    height: 100,
    z_index: objects.length,
    object_data: {
      shapeType: 'circle',
      fill: '#ff6b6b',
      stroke: '#ffffff',
    },
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  }
  await addObject(circle)
  selectObject(circle.id)
  setTool('select')
  break
}
```

### Example 2: Line Tool (Drawing)

**Click and drag to draw a line:**

See the `freehand-widget.tsx` and `use-freehand-drawing.ts` as reference implementations.

---

## 🎨 Best Practices

### 1. **Cursor Feedback**
Always update the cursor when your tool is active:
```typescript
cursor: currentTool === 'your-tool' ? 'crosshair' : 'grab'
```

### 2. **Preview Rendering**
Show live preview while drawing for better UX:
```typescript
{isDrawing && <YourPreviewComponent />}
```

### 3. **Tool Switching**
For creation tools, switch back to select mode after creating:
```typescript
await addObject(newObject)
setTool('select')
```

For drawing tools, stay in drawing mode:
```typescript
await addObject(newObject)
// Don't call setTool('select') - stay in drawing mode
```

### 4. **Keyboard Shortcuts**
- Use single letter keys (A-Z)
- Check existing shortcuts first
- Update `SHORTCUT_MAP` in `use-canvas-tool.ts`

### 5. **Object Data Structure**
Keep `object_data` flexible:
```typescript
object_data: {
  // Required fields
  mainProperty: value,
  // Optional customization
  color?: string,
  size?: number,
}
```

### 6. **Error Handling**
Always wrap in ErrorBoundary (already done in canvas rendering).

### 7. **Performance**
- Use `useMemo` for expensive calculations
- Use `useCallback` for event handlers
- Avoid re-renders with proper dependencies

---

## 🔍 Tool System Files Reference

| File | Purpose |
|------|---------|
| `hooks/use-canvas-tool.ts` | Tool state management & keyboard shortcuts |
| `components/canvas/canvas-toolbar.tsx` | Tool selection UI |
| `components/canvas/infinite-canvas.tsx` | Tool logic & mouse event handling |
| `components/canvas/canvas-object.tsx` | Object type dispatcher |
| `components/canvas/widgets/*` | Individual widget implementations |
| `hooks/use-*-drawing.ts` | Drawing interaction hooks |
| `lib/types/canvas.ts` | Type definitions |

---

## 🚀 Quick Checklist

When adding a new tool, check off these steps:

- [ ] Add tool type to `CanvasTool` union
- [ ] Add button to canvas toolbar
- [ ] Define object type in `canvas.ts`
- [ ] Create widget component
- [ ] Register in canvas-object dispatcher
- [ ] Add tool logic (creation or drawing)
- [ ] Update cursor styling
- [ ] Add preview rendering (if drawing tool)
- [ ] Export drawing hook (if applicable)
- [ ] Test keyboard shortcut
- [ ] Test object persistence (save/load)
- [ ] Add to this documentation

---

## 🎓 Learning Resources

To understand the tool system better, study these implementations:

1. **Sticky Note** - Simple creation tool
2. **Freehand** - Drawing tool with preview
3. **Arrow** - Drawing tool with complex rendering
4. **Image** - Tool with file picker integration

Each demonstrates different patterns and techniques you can reuse.

---

## 💡 Tips

- Start with a simple creation tool before attempting drawing tools
- Copy an existing similar tool and modify it
- Test with both mouse and keyboard interactions
- Check object persistence by saving and reloading the file
- Use the browser DevTools to debug rendering issues

---

**Happy tool building!** 🛠️✨
