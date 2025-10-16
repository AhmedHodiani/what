# Widget System

## 📦 Widget Registry Pattern

This project uses a **widget registry pattern** to make adding new widgets easy and maintainable.

### ✨ Benefits

- ✅ Add new widgets without editing `canvas-object.tsx`
- ✅ Type-safe widget lookup
- ✅ Self-documenting (registry shows all available widgets)
- ✅ Foundation for plugin system (Week 4)
- ✅ Easy to test and maintain

---

## 🚀 How to Add a New Widget

### 1. Create Your Widget Component

Create a new file in `src/renderer/components/canvas/widgets/`:

```tsx
// my-awesome-widget.tsx
import { WidgetWrapper } from './widget-wrapper'
import type { BaseWidgetProps } from './widget-interface'
import type { MyAwesomeObject } from 'lib/types/canvas'

export function MyAwesomeWidget({
  object,
  ...wrapperProps
}: BaseWidgetProps<MyAwesomeObject>) {
  return (
    <WidgetWrapper
      object={object}
      {...wrapperProps}
      isResizable={true}
      minWidth={100}
      minHeight={100}
    >
      {/* Your widget content here */}
      <div className="w-full h-full">
        <h1>{object.object_data.title}</h1>
      </div>
    </WidgetWrapper>
  )
}
```

### 2. Register Your Widget

Open `widgets/register-all.ts` and add:

```tsx
import { MyAwesomeWidget } from './my-awesome-widget'

// In registerAllWidgets():
widgetRegistry.register('my-awesome', MyAwesomeWidget, {
  displayName: 'My Awesome Widget',
  description: 'Does awesome things on the canvas'
})
```

### 3. That's It! 🎉

Your widget is now automatically available in the canvas. No need to touch:
- ❌ `canvas-object.tsx` (no more giant switch statements!)
- ❌ Import lists (handled by registry)
- ❌ Type unions (handled by registry)

---

## 📚 Widget Interface

All widgets should accept `BaseWidgetProps`:

```typescript
interface BaseWidgetProps<T extends DrawingObject> {
  object: T & { _imageUrl?: string }
  isSelected: boolean
  zoom: number
  onUpdate: (id: string, updates: Partial<T>) => void
  onSelect: (id: string) => void
  onContextMenu: (event: React.MouseEvent, id: string) => void
  onStartDrag: (e: React.MouseEvent, id: string) => void
}
```

### Special Props (Advanced)

If your widget needs special props (like `ImageWidget.getImageUrl`), you have two options:

1. **Handle it in `canvas-object.tsx`** (see image widget example)
2. **Wrap it in an adapter component** that transforms props

---

## 🔍 Registry API

```typescript
import { widgetRegistry } from './widget-registry'

// Register a widget
widgetRegistry.register('my-type', MyWidget, {
  displayName: 'My Widget',
  description: 'Widget description'
})

// Get a widget component
const Widget = widgetRegistry.get('my-type')

// Check if registered
if (widgetRegistry.has('my-type')) { /* ... */ }

// Get all types
const types = widgetRegistry.getTypes() // ['image', 'sticky-note', ...]

// Get all registrations (for debugging)
const all = widgetRegistry.getAll()

// Unregister (for testing)
widgetRegistry.unregister('my-type')
```

---

## 🧪 Testing Widgets

```typescript
import { widgetRegistry, WidgetRegistry } from './widget-registry'

describe('MyWidget', () => {
  let registry: WidgetRegistry
  
  beforeEach(() => {
    registry = new WidgetRegistry()
    registry.register('my-type', MyWidget)
  })
  
  it('should be registered', () => {
    expect(registry.has('my-type')).toBe(true)
  })
})
```

---

## 📊 Current Widgets

| Type | Component | Description |
|------|-----------|-------------|
| `image` | ImageWidget | Images with resize/crop/transform |
| `sticky-note` | StickyNoteWidget | Colorful sticky notes |
| `text` | TextWidget | Rich text editor |
| `shape` | ShapeWidget | Geometric shapes |
| `freehand` | FreehandWidget | Free-form drawing |
| `arrow` | ArrowWidget | Directional arrows |
| `youtube` | YouTubeWidget | Embedded videos |
| `emoji` | EmojiWidget | Large emoji symbols |

---

## 🔮 Future: Plugin System (Week 4)

This registry is the foundation for a plugin system:

```typescript
// Future plugin API
class MyPlugin {
  register(registry: WidgetRegistry) {
    registry.register('my-plugin-widget', MyPluginWidget)
  }
}

// Load plugins
pluginManager.load(new MyPlugin())
```

Stay tuned! 🚀
