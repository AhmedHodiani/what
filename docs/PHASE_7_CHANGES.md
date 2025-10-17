# Phase 7: InfiniteCanvas Refactor - Changes Summary

## Changes Needed

### 1. Remove Panel Rendering (Lines ~1216-1250)
- ❌ Remove `<CanvasViewportDisplay />` rendering
- ❌ Remove `<CanvasToolbar />` rendering  
- ❌ Remove `<BrushPanel />` rendering
- ❌ Remove `<CanvasPropertiesPanel />` rendering
- ✅ Keep dialog rendering (YouTube, Shape, Context Menu, Confirmation)

### 2. Remove Unused Imports (Lines 1-40)
- ❌ Remove `import { CanvasViewportDisplay }`
- ❌ Remove `import { CanvasToolbar }`
- ❌ Remove `import { CanvasPropertiesPanel }`
- ❌ Remove `import { BrushPanel }`

### 3. Remove Unused Props
- ❌ Remove `showViewportInfo` prop
- ❌ Remove `showToolbar` prop

### 4. Replace Local Brush State with Context
- ❌ Remove `const [brushProperties, setBrushProperties] = useState(...)`
- ✅ Add `const { brushSettings } = useActiveTab()`
- ✅ Replace all `brushProperties` references with `brushSettings`

### 5. Sync with ActiveTabContext
- ✅ Import `useActiveTab` from 'renderer/contexts'
- ✅ Call `updateActiveTab()` on:
  - Viewport changes
  - Object changes (add/update/delete)
  - Selection changes

### 6. Remove `setTool` Calls
- The tool is now global via `useCanvasTool()`
- Tool changes automatically persist across tabs
- ✅ Keep `currentTool` for reading

## Implementation Plan

1. **Add ActiveTabContext integration**
   - Import `useActiveTab`
   - Get `updateActiveTab` function
   - Add effect to sync viewport/objects/selection

2. **Remove brush state**
   - Delete `brushProperties` state
   - Use `brushSettings` from context

3. **Remove panel rendering**
   - Delete all 4 panel JSX blocks

4. **Clean up props**
   - Remove from interface
   - Remove from destructuring

5. **Clean up imports**
   - Remove unused panel imports

## File Locations

- Panels rendering: Lines ~1216-1255
- Props definition: Lines ~38-48
- Props destructuring: Lines ~70-80
- Brush state: Lines ~95-99
- Imports: Lines ~1-40

## Testing After Changes

- ✅ Canvas still renders objects
- ✅ Drawing tools work (freehand/arrow)
- ✅ Dialogs still appear
- ✅ Context menu works
- ✅ No panels visible in canvas (all in GlobalPanelsLayout)
