# Auto-Resize Feature

## Overview
Both text boxes and sticky notes now automatically resize as you type, ensuring content is always fully visible without manual resizing.

## How It Works

### **Text Boxes**
- **Width grows** with longest line of text
- **Height grows** with number of lines
- **Padding preserved**: 16px on all sides
- **Limits**:
  - Minimum: 100x50px
  - Maximum: 800x600px

### **Sticky Notes**
- **Width grows** with longest line
- **Height grows** with line count
- **Padding preserved**: Extra space for folded corner
- **Limits**:
  - Minimum: 150x150px (square aesthetic)
  - Maximum: 600x600px

## Implementation

### **useAutoResize Hook**
Custom hook that measures text dimensions using HTML5 Canvas API:

```typescript
useAutoResize({
  text: string,           // Current text content
  fontSize: number,       // Font size in pixels
  fontFamily: string,     // Font family name
  lineHeight: number,     // Line spacing multiplier
  fontWeight: string,     // 'normal' | 'bold'
  fontStyle: string,      // 'normal' | 'italic'
  minWidth: number,       // Minimum width
  minHeight: number,      // Minimum height
  maxWidth: number,       // Maximum width
  maxHeight: number,      // Maximum height
  padding: number,        // Total padding (left+right or top+bottom)
  onResize: (width, height) => void  // Callback when size changes
})
```

### **Measurement Strategy**
1. Create hidden canvas element
2. Set canvas font properties to match text
3. Use `ctx.measureText()` to get accurate width
4. Calculate height from line count × line height
5. Add padding to both dimensions
6. Clamp to min/max bounds
7. Trigger resize callback if changed

### **Performance Optimizations**
- **Memoized calculations** - Only recalculates when text/style changes
- **Change detection** - Only updates if dimensions actually changed
- **Canvas reuse** - Single canvas instance per component
- **Debounced updates** - React batches state updates automatically

## User Experience

### **Before Auto-Resize**
```
❌ Text overflows outside box
❌ Manual resize required
❌ Content gets cut off
❌ Scrollbars appear
```

### **After Auto-Resize**
```
✅ Box grows with content automatically
✅ All text always visible
✅ No manual resizing needed
✅ Clean, professional appearance
```

## Behavior Examples

### **Text Box Typing**
```
1. Type "Hello"
   → Width: ~150px (fits text)
   
2. Type "Hello World This Is A Long Line"
   → Width: ~450px (expands to fit)
   
3. Add line break
   → Height: ~120px (2 lines + padding)
   
4. Keep typing multiple lines
   → Both width and height grow
   
5. Delete text
   → Shrinks back to minimum (100x50px)
```

### **Sticky Note Typing**
```
1. Type short text
   → Stays at 150x150px minimum (square)
   
2. Type long lines
   → Width expands (preserves square ratio initially)
   
3. Add many lines
   → Height grows to fit content
   
4. Reaches 600x600px max
   → Stops growing, content scrolls
```

## Edge Cases Handled

### **Empty Text**
- Returns to minimum size
- Placeholder text doesn't affect size

### **Very Long Lines**
- Caps at maxWidth
- Text wraps naturally

### **Many Lines**
- Caps at maxHeight  
- Scrollbar appears if needed

### **Font Changes**
- Recalculates immediately
- Adjusts size to fit new font

### **Style Changes**
- Bold/italic affects width
- Recalculates on style change

## Configuration

### **Text Box Settings**
```typescript
{
  minWidth: 100,
  minHeight: 50,
  maxWidth: 800,
  maxHeight: 600,
  padding: 32, // 16px × 2
}
```

### **Sticky Note Settings**
```typescript
{
  minWidth: 150,
  minHeight: 150,  // Square minimum
  maxWidth: 600,
  maxHeight: 600,
  padding: 48,     // Extra space for corner
}
```

## Technical Details

### **Canvas Text Measurement**
```typescript
const ctx = canvas.getContext('2d')
ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`
const metrics = ctx.measureText(line)
const width = metrics.width
```

### **Line Height Calculation**
```typescript
const lineHeightPx = fontSize * lineHeight
const totalHeight = lines.length * lineHeightPx + padding
```

### **Dimension Clamping**
```typescript
const finalWidth = Math.max(minWidth, Math.min(calculatedWidth, maxWidth))
const finalHeight = Math.max(minHeight, Math.min(calculatedHeight, maxHeight))
```

## Files Modified

```
src/renderer/hooks/use-auto-resize.ts [NEW]
  ↳ Auto-resize hook with canvas measurement
  
src/renderer/hooks/index.ts
  ↳ Exported useAutoResize hook
  
src/renderer/components/canvas/widgets/text-widget.tsx
  ↳ Added auto-resize integration
  ↳ Calculates size on text/style changes
  
src/renderer/components/canvas/widgets/sticky-note-widget.tsx
  ↳ Added auto-resize integration
  ↳ Square minimum, expanded padding
```

## Future Enhancements

### **Potential Improvements**
- [ ] **Word wrapping at maxWidth** - Instead of capping, wrap text
- [ ] **Aspect ratio locking** - Optional square/portrait/landscape modes
- [ ] **Animation** - Smooth size transitions
- [ ] **Smart padding** - Adjust padding based on font size
- [ ] **Multi-column layouts** - Split long text into columns
- [ ] **RTL text support** - Right-to-left language handling

### **Advanced Features**
- [ ] **Content-aware sizing** - Different sizes for titles vs body text
- [ ] **Responsive breakpoints** - Change layout at certain sizes
- [ ] **Collision detection** - Avoid overlapping nearby objects
- [ ] **Snap to grid** - Align sizes to grid increments

## Testing

### **Test Cases**
1. ✅ Type text → Width grows
2. ✅ Add line breaks → Height grows
3. ✅ Delete text → Size shrinks
4. ✅ Empty text → Returns to minimum
5. ✅ Very long line → Caps at maxWidth
6. ✅ Many lines → Caps at maxHeight
7. ✅ Change font size → Recalculates immediately
8. ✅ Toggle bold → Width adjusts
9. ✅ Toggle italic → Width adjusts (slightly)
10. ✅ Change font family → Recalculates with new metrics

### **Performance Tests**
- ✅ No lag with rapid typing
- ✅ No infinite resize loops
- ✅ Handles 1000+ character strings
- ✅ Works with all font families

## Comparison with Manual Resize

| Feature | Auto-Resize | Manual Resize |
|---------|-------------|---------------|
| **UX** | Seamless, automatic | Requires user action |
| **Speed** | Instant | Slow (drag handles) |
| **Accuracy** | Perfect fit | Often too big/small |
| **Effort** | Zero | High |
| **Content Visibility** | Always visible | Can overflow |

## Known Limitations

1. **Canvas API required** - Won't work in environments without Canvas
2. **Font loading** - May miscalculate before custom fonts load
3. **Emoji width** - Some emoji may not measure accurately
4. **Performance** - Very long text (10k+ chars) may slow down

## Workarounds for Limitations

### **Font Loading**
```typescript
// Wait for fonts to load before measuring
document.fonts.ready.then(() => {
  // Trigger remeasurement
})
```

### **Large Text Performance**
```typescript
// Debounce resize for very large text
const debouncedResize = useMemo(
  () => debounce(handleAutoResize, 100),
  [handleAutoResize]
)
```

## Related Documentation
- See [TEXT-TOOL.md](.github/TEXT-TOOL.md) for text tool overview
- See [STICKY-NOTE-GUIDE.md](.github/STICKY-NOTE-GUIDE.md) for sticky note guide
- See [ARCHITECTURE.md](ARCHITECTURE.md) for overall codebase structure
