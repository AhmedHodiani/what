# Text Tool Implementation

## Overview
The text tool allows creating rich text boxes with full typography control, perfect for labels, titles, annotations, and any text content on the canvas.

## Features

### 1. **Text Editing**
- **Click to edit** - Click any text box to start editing
- **Auto-focus on creation** - New text boxes automatically enter edit mode
- **Live editing** - See changes in real-time as you type
- **Placeholder text** - "Click to edit text" shown when empty
- **Multi-line support** - Full textarea with line breaks

### 2. **Typography Controls**
- **Font Family** - 7 fonts available:
  - Inter (default, modern sans-serif)
  - Georgia (elegant serif)
  - Monospace (code-friendly)
  - Kalam (handwritten)
  - Arial (classic sans-serif)
  - Times New Roman (traditional serif)
  - Courier New (typewriter monospace)

- **Font Size** - 12px to 72px (slider control)
- **Font Weight** - Normal or Bold (toggle button)
- **Font Style** - Normal or Italic (toggle button)
- **Text Alignment** - Left, Center, Right (3 buttons)

### 3. **Color Customization**
- **Text Color** - 12 preset colors:
  - White (default), Black, Red, Orange, Yellow
  - Green, Blue, Purple, Pink, Teal
  - Gray, Light Gray

- **Background Color** - Same 12 colors + Transparent (default)
- **Visual checkerboard** for transparent background indicator

### 4. **Interaction**
- **Escape key** - Save and exit editing
- **Resizable** - Drag corners/edges to resize box
- **Moveable** - Drag anywhere (except when editing)
- **Selectable** - Click to select, shows blue border

## Usage

### Creating a Text Box
1. Press **T** or click the text icon in toolbar
2. Click anywhere on canvas
3. Text box appears (300x100px default)
4. Automatically enters edit mode
5. Start typing immediately

### Editing Text
1. **Single-click** any text box
2. Cursor appears, ready to type
3. **Escape** or **click outside** to save and exit

### Styling Text
1. Select a text box (blue border appears)
2. Properties panel appears on right side
3. Adjust any property:
   - Change font family dropdown
   - Slide font size (12-72px)
   - Click text color swatch
   - Toggle **B** (bold) or **I** (italic)
   - Click alignment (⬅ ↔ ➡)
   - Set background color (or transparent)

## Implementation Details

### Files Created
```
src/renderer/components/canvas/widgets/text-widget.tsx [NEW]
  ↳ Main text widget component
  ↳ Click-to-edit functionality
  ↳ Auto-focus on empty text
  
src/renderer/components/canvas/text-properties-panel.tsx [NEW]
  ↳ Typography controls
  ↳ Color pickers
  ↳ Font weight/style toggles
```

### Files Modified
```
src/renderer/components/canvas/canvas-object.tsx
  ↳ Added text case to dispatcher
  
src/renderer/components/canvas/canvas-properties-panel.tsx
  ↳ Added TextPropertiesPanel case
  
src/renderer/components/canvas/infinite-canvas.tsx
  ↳ Added text case to handleCanvasBackgroundClick
  ↳ Imported TextObject type
  
.github/TOOLS.md
  ↳ Updated description from "coming soon" to full feature
```

### Type Definition
```typescript
interface TextObject {
  id: string
  type: 'text'
  x: number
  y: number
  width: number
  height: number
  z_index: number
  object_data: {
    text: string                 // Text content
    fontSize?: number            // 12-72px
    fontFamily?: string          // Font name
    fontWeight?: string          // 'normal' | 'bold'
    fontStyle?: string           // 'normal' | 'italic'
    textAlign?: 'left' | 'center' | 'right'
    color?: string               // Text color hex
    backgroundColor?: string     // Background hex or 'transparent'
    lineHeight?: number          // Line spacing (1.5 default)
  }
  created: string
  updated: string
}
```

### Default Values
```typescript
{
  width: 300,
  height: 100,
  text: '',
  fontSize: 24,
  fontFamily: 'Inter, system-ui, sans-serif',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'left',
  color: '#FFFFFF',
  backgroundColor: 'transparent',
  lineHeight: 1.5,
}
```

## Design Philosophy

### Why Click-to-Edit?
- **Direct manipulation** - Text boxes are content, not just containers
- **Visual clarity** - See formatted text when not editing
- **Focus mode** - Edit mode removes distractions
- **Natural workflow** - Matches user expectations from other apps

### Why Transparent Background Default?
- **Canvas integration** - Text floats naturally on canvas
- **Flexibility** - Users can add background when needed
- **Clean aesthetic** - Minimal by default, customizable when desired

### Why Auto-Focus on Creation?
- **Immediate productivity** - No extra click to start typing
- **Reduced friction** - Natural "T → click → type" workflow
- **User expectation** - Empty text box implies "ready to type"

## Comparison with Sticky Note

| Feature | Text Tool | Sticky Note |
|---------|-----------|-------------|
| **Purpose** | Flexible text with full typography | Quick notes with paper aesthetic |
| **Default BG** | Transparent | Yellow paper |
| **Font** | 7 choices | Kalam (handwritten) |
| **Editing** | Click to edit | Always editable |
| **Use Cases** | Titles, labels, annotations | Brainstorming, reminders |
| **Size** | Larger default (300x100) | Square (200x200) |

## Use Cases

### 1. **Titles & Headers**
```
Font: Inter, 48px, Bold, Center-aligned
Color: White
Background: Transparent
```

### 2. **Code Snippets**
```
Font: Monospace, 16px
Color: Green (#22C55E)
Background: Black (#000000)
```

### 3. **Annotations**
```
Font: Inter, 18px, Italic
Color: Yellow (#EAB308)
Background: Transparent
```

### 4. **Highlighted Labels**
```
Font: Inter, 24px, Bold
Color: Black (#000000)
Background: Yellow (#EAB308)
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **T** | Activate text tool |
| **Click** | Create new text box |
| **Click text** | Enter edit mode |
| **Escape** | Exit edit mode (save changes) |
| **Any key** | Prevented from triggering canvas shortcuts while editing |

## Future Enhancements

### Potential Features
- [ ] **Rich text formatting** - Bold/italic within text (not whole box)
- [ ] **Bullet/numbered lists** - Automatic list formatting
- [ ] **Text shadows** - Drop shadow effects
- [ ] **Stroke outline** - Text border/outline
- [ ] **Letter spacing** - Kerning control
- [ ] **Text transform** - Uppercase, lowercase, capitalize
- [ ] **Vertical alignment** - Top, middle, bottom
- [ ] **Auto-resize height** - Grow with content
- [ ] **Markdown support** - Parse markdown syntax
- [ ] **Link detection** - Clickable URLs

### Properties Panel Ideas
```
┌─────────────────────────┐
│ 📝 Text Properties      │
├─────────────────────────┤
│ Font: [Inter      ▼]    │
│ Size: [24px ————●—]     │
│                         │
│ [B] [I] [U] [S]         │
│ [⬅] [↔] [➡]            │
│                         │
│ Text: [⚫⚫⚫⚫⚫⚫]       │
│ Fill: [⚪⚫⚪⚪⚪⚪]       │
│                         │
│ ☐ Drop shadow           │
│ ☐ Text outline          │
│ ☐ Auto-resize           │
└─────────────────────────┘
```

## Testing

### Test Cases
1. ✅ Create text box with T key
2. ✅ Auto-focus on creation (cursor ready)
3. ✅ Type text and see it appear
4. ✅ Escape to save and exit edit mode
5. ✅ Click existing text to edit again
6. ✅ Change font family (updates immediately)
7. ✅ Adjust font size with slider
8. ✅ Toggle bold and italic
9. ✅ Change text alignment
10. ✅ Set text color
11. ✅ Set background color
12. ✅ Set transparent background
13. ✅ Resize text box
14. ✅ Move text box
15. ✅ Placeholder shows when empty

## Performance Notes

- **Lightweight rendering** - Simple div with styled text
- **No overhead** - No complex editor libraries
- **Fast updates** - Direct React state management
- **Efficient reflows** - Minimal DOM manipulation

## Lessons Learned

### What Worked Well
- **WidgetWrapper pattern** - Made implementation quick (~160 lines)
- **Separate properties panel** - Clean separation of concerns
- **Type safety** - TextObject interface caught errors early
- **Auto-focus UX** - Delightful "ready to type" experience

### Challenges Overcome
- **Click vs drag conflict** - Widget-wrapper handles this elegantly
- **Edit mode isolation** - stopPropagation prevents canvas shortcuts
- **Textarea sizing** - Full width/height with padding

## Related Documentation
- See [TOOLS.md](.github/TOOLS.md) for general tool system guide
- See [STICKY-NOTE-GUIDE.md](.github/STICKY-NOTE-GUIDE.md) for similar widget pattern
- See [ARCHITECTURE.md](ARCHITECTURE.md) for overall codebase structure
