# Properties Panels System

## 📦 Panel Registry Pattern

This project uses a **panel registry pattern** to make adding new properties panels easy and maintainable.

### ✨ Benefits

- ✅ **88% code reduction** in canvas-properties-panel.tsx (313→36 lines)
- ✅ Add new panels without editing container
- ✅ Consistent UI via shared BasePanel components
- ✅ Type-safe panel lookup
- ✅ Matches widget registry pattern

---

## 🏗️ Architecture

```
properties-panels/
├── panel-registry.ts          # Central registry (like widget-registry)
├── register-all.ts            # Auto-register all panels
├── base-panel.tsx             # Shared panel wrapper & UI components
├── sticky-note-panel.tsx      # Sticky note properties (< 150 lines!)
├── text-panel.tsx             # Text properties
├── shape-panel.tsx            # Shape properties
├── freehand-panel.tsx         # Brush/freehand properties
├── emoji-panel.tsx            # Emoji selector
└── README.md                  # This file
```

---

## 🚀 How to Add a New Panel

### 1. Create Your Panel Component

Create a new file in `properties-panels/`:

```tsx
// my-widget-panel.tsx
import { useCallback } from 'react'
import type { MyWidgetObject, DrawingObject } from 'lib/types/canvas'
import { BasePanel, PanelSection, ColorGrid, Slider } from './base-panel'

interface MyWidgetPanelProps {
  object: MyWidgetObject
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
}

export function MyWidgetPanel({ object, onUpdate }: MyWidgetPanelProps) {
  const updateProperty = useCallback(
    (updates: Partial<MyWidgetObject['object_data']>) => {
      onUpdate(object.id, {
        object_data: { ...object.object_data, ...updates },
      })
    },
    [object.id, object.object_data, onUpdate]
  )

  return (
    <BasePanel title="My Widget Properties" icon="🎨">
      <PanelSection label="Color">
        {/* Your controls here */}
      </PanelSection>
    </BasePanel>
  )
}
```

### 2. Register Your Panel

Open `register-all.ts` and add:

```tsx
import { MyWidgetPanel } from './my-widget-panel'

// In registerAllPanels():
panelRegistry.register('my-widget', MyWidgetPanel, {
  displayName: 'My Widget Properties'
})
```

### 3. That's It! 🎉

Your panel is now automatically available. No need to touch:
- ❌ `canvas-properties-panel.tsx` (no more switch statements!)
- ❌ Import lists (handled by registry)

---

## 🎨 Shared UI Components

### BasePanel

Provides consistent wrapper with header and scrollable content:

```tsx
<BasePanel title="My Panel" icon="🎨">
  {/* Your content */}
</BasePanel>
```

### PanelSection

Labeled section with consistent spacing:

```tsx
<PanelSection label="Color">
  {/* Controls */}
</PanelSection>
```

### ColorGrid

Preset color palette with custom picker:

```tsx
<ColorGrid
  colors={PRESET_COLORS}
  selectedColor={currentColor}
  onColorChange={(color) => updateProperty({ color })}
/>
```

### ButtonGroup

Toggle buttons for options:

```tsx
<ButtonGroup
  options={[
    { label: 'Normal', value: 'normal' },
    { label: 'Bold', value: 'bold' },
  ]}
  selected={fontWeight}
  onChange={(value) => updateProperty({ fontWeight: value })}
/>
```

### Slider

Labeled slider with value display:

```tsx
<Slider
  label="Opacity"
  value={opacity}
  min={0}
  max={1}
  step={0.1}
  onChange={(value) => updateProperty({ opacity: value })}
/>
```

---

## 📊 Before vs After

### Before (Old Way)
```tsx
// canvas-properties-panel.tsx - 313 lines!
switch (selectedObject.type) {
  case 'sticky-note': 
    return <div>... 100 lines of inline JSX ...</div>
  case 'text':
    return <TextPropertiesPanel ... />
  case 'shape':
    return <ShapePropertiesPanel ... />
  // ... more cases
}
```

**Problems:**
- 313 lines in one file
- Inconsistent patterns (inline vs separate files)
- Hard to maintain
- Duplicated UI code

### After (New Way)
```tsx
// canvas-properties-panel.tsx - 36 lines!
const Panel = panelRegistry.get(selectedObject.type)
return <Panel object={selectedObject} onUpdate={onUpdate} />
```

**Benefits:**
- 88% code reduction (313→36 lines)
- Consistent patterns across all panels
- Shared UI components (no duplication)
- Easy to add new panels

---

## 🔍 Panel Registry API

```typescript
import { panelRegistry } from './panel-registry'

// Register a panel
panelRegistry.register('my-type', MyPanel, {
  displayName: 'My Panel'
})

// Get a panel component
const Panel = panelRegistry.get('my-type')

// Check if registered
if (panelRegistry.has('my-type')) { /* ... */ }

// Get all types
const types = panelRegistry.getTypes() // ['sticky-note', 'text', ...]

// Get all registrations (debugging)
const all = panelRegistry.getAll()
```

---

## 📋 Current Panels

| Type | Component | Lines | Description |
|------|-----------|-------|-------------|
| `sticky-note` | StickyNotePanel | ~140 | Paper/font color, font size |
| `text` | TextPanel | ~180 | Font family, size, color, alignment |
| `shape` | ShapePanel | ~160 | Fill, stroke, rotation, opacity |
| `freehand` | FreehandPanel | ~90 | Brush color, size, opacity |
| `emoji` | EmojiPanel | ~716 | Emoji selector with 6 categories |

**Note:** Arrow and YouTube widgets don't have panels yet - add them when needed!

---

## 🧪 Testing Panels

```typescript
import { panelRegistry, PropertiesPanelRegistry } from './panel-registry'

describe('MyPanel', () => {
  let registry: PropertiesPanelRegistry
  
  beforeEach(() => {
    registry = new PropertiesPanelRegistry()
    registry.register('my-type', MyPanel)
  })
  
  it('should be registered', () => {
    expect(registry.has('my-type')).toBe(true)
  })
})
```

---

## 🎯 Design Patterns Used

1. **Registry Pattern** - Central registration system
2. **Composition** - BasePanel + shared components
3. **Single Responsibility** - Each panel handles one object type
4. **DRY** - Shared UI components eliminate duplication
5. **Consistency** - Same pattern as widget registry

---

## 💡 Tips

- Use `BasePanel` for consistent styling
- Use `PanelSection` to group related controls
- Use shared components (`ColorGrid`, `ButtonGroup`, `Slider`) when possible
- Keep panels under 200 lines (extract helpers if needed)
- Follow naming: `{type}-panel.tsx` → `{Type}Panel` component

---

Ready to add your panel? Create the file and register it - it's that easy! 🚀
