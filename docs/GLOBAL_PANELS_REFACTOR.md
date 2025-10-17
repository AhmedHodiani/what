# Global Panels Refactor - Implementation Plan

## ✅ STATUS: PHASES 1-8 COMPLETE!

## 🎯 Goal
Refactor the app architecture to have **global singleton toolbars and panels** instead of per-tab duplication. Tool selection and panel state should persist across tabs, while panels display data from the **active tab**.

**See `REFACTOR_COMPLETE.md` for detailed completion summary!**

## 📋 Current Architecture Problems
- ❌ Each tab has its own `CanvasToolbar` instance
- ❌ Each tab has its own `CanvasViewportDisplay` instance
- ❌ Each tab has its own `CanvasPropertiesPanel` instance
- ❌ Each tab has its own `BrushPanel` instance
- ❌ Tool selection resets when switching tabs
- ❌ Panels duplicate across tabs unnecessarily

## ✨ Target Architecture
- ✅ **One** `CanvasToolbar` above all tabs
- ✅ **One** `CanvasViewportDisplay` showing active tab's viewport
- ✅ **One** `CanvasPropertiesPanel` showing active tab's selection
- ✅ **One** `BrushPanel` showing when pen/arrow tool active
- ✅ Tool selection persists globally across tabs
- ✅ Panels read data from active tab via context
- ✅ `InfiniteCanvas` only renders canvas objects

---

## 📝 Implementation Checklist

### Phase 1: Create Global Contexts ✅
- [x] **1.1** Create `src/renderer/contexts/global-tool-context.tsx`
  - [x] `GlobalToolContext` with `currentTool` and `setTool`
  - [x] `GlobalToolProvider` component
  - [x] `useGlobalTool()` hook
  - [x] Export from `src/renderer/contexts/index.ts`

- [x] **1.2** Create `src/renderer/contexts/active-tab-context.tsx`
  - [x] `ActiveTabContext` with active tab's data:
    - `tabId: string | null`
    - `viewport: { x, y, zoom } | null`
    - `selectedObjectIds: string[]`
    - `objects: CanvasObject[]`
    - `updateActiveTab()` function
  - [x] `ActiveTabProvider` component
  - [x] `useActiveTab()` hook
  - [x] Export from `src/renderer/contexts/index.ts`

- [x] **1.3** Create `src/renderer/contexts/index.ts`
  - [x] Export both contexts and hooks

### Phase 2: Refactor useCanvasTool Hook ✅
- [x] **2.1** Update `src/renderer/hooks/use-canvas-tool.ts`
  - [x] Remove local `currentTool` state
  - [x] Import and use `useGlobalTool()`
  - [x] Keep keyboard shortcuts registration (already using KRS)
  - [x] Update all tool change logic to use global context
  - [x] Verify Ctrl modifier handling still works

### Phase 3: Lift Toolbar Component ✅
- [x] **3.1** Update `src/renderer/components/canvas/canvas-toolbar.tsx`
  - [x] Remove `currentTool` and `onToolChange` props
  - [x] Import and use `useGlobalTool()`
  - [x] Keep dynamic badge logic (already queries KRS)
  - [x] Ensure UI updates when global tool changes

- [x] **3.2** Create new layout wrapper `src/renderer/components/layout/global-panels-layout.tsx`
  - [x] Render `CanvasToolbar` at top (global singleton)
  - [x] Render children (tab content) below
  - [x] Position toolbar with fixed/sticky positioning

### Phase 4: Lift Viewport Display ✅
- [x] **4.1** Update `src/renderer/components/canvas/canvas-viewport-display.tsx`
  - [x] Remove `viewport` and `objectCount` props
  - [x] Import and use `useActiveTab()`
  - [x] Read viewport/objectCount from active tab context
  - [x] Handle null active tab (show placeholder)

- [x] **4.2** Add to `global-panels-layout.tsx`
  - [x] Render `CanvasViewportDisplay` in top-left corner
  - [x] Position with absolute positioning

### Phase 5: Lift Properties Panel ✅
- [x] **5.1** Update `src/renderer/components/canvas/canvas-properties-panel.tsx`
  - [x] Already uses props pattern (no changes needed - registry-based)
  - [x] Called from GlobalPanelsLayout with active tab data
  - [x] Updates handled in layout with updateActiveTab()

- [x] **5.2** Add to `global-panels-layout.tsx`
  - [x] Render `CanvasPropertiesPanel` on right side
  - [x] Pass selectedObject from active tab context
  - [x] Handle updates via updateActiveTab()

### Phase 6: Lift Brush Panel ✅
- [x] **6.1** Update `src/renderer/components/canvas/brush-panel.tsx`
  - [x] Already supports both modes (selection + live drawing)
  - [x] Brush settings added to ActiveTabContext
  - [x] Called from GlobalPanelsLayout with active tab brush settings

- [x] **6.2** Add to `global-panels-layout.tsx`
  - [x] Render `BrushPanel` below viewport display
  - [x] Position with absolute positioning
  - [x] Conditional render based on global tool (freehand/arrow)

### Phase 7: Update InfiniteCanvas ✅
- [x] **7.1** Update `src/renderer/components/canvas/infinite-canvas.tsx`
  - [x] Remove `CanvasToolbar` rendering
  - [x] Remove `CanvasViewportDisplay` rendering
  - [x] Remove `CanvasPropertiesPanel` rendering
  - [x] Remove `BrushPanel` rendering
  - [x] Replace local brushProperties with brushSettings from ActiveTabContext
  - [x] Keep all canvas object rendering logic
  - [x] Keep viewport/pan/zoom logic
  - [x] Add useEffect to sync with ActiveTabContext (viewport, selection, objects)

- [x] **7.2** Clean up unused props
  - [x] Remove `showToolbar` and `showViewportInfo` props
  - [x] Remove unused panel imports

### Phase 8: Update Layout Structure ✅
- [x] **8.1** Update `src/renderer/screens/main-with-tabs.tsx`
  - [x] Wrap TabLayout with both providers:
    - `GlobalToolProvider`
    - `ActiveTabProvider`
  - [x] Wrap TabLayout content with `GlobalPanelsLayout`
  - [x] Each tab renders `InfiniteCanvas` (already done)

- [x] **8.2** Update tab change handler
  - [x] InfiniteCanvas syncs with ActiveTabContext via useEffect
  - [x] Viewport/selection/objects sync automatically when `isActive` changes

### Phase 9: Testing ⏳
- [ ] **9.1** Manual testing checklist:
  - [ ] Create multiple tabs
  - [ ] Switch tools - verify persists across tabs ✓
  - [ ] Draw in tab 1, switch to tab 2, verify tool stays same ✓
  - [ ] Verify viewport display shows active tab's viewport ✓
  - [ ] Select objects, switch tabs, verify properties panel updates ✓
  - [ ] Test brush panel appears only for pen/arrow tools ✓
  - [ ] Test keyboard shortcuts still work (KRS integration) ✓
  - [ ] Test Ctrl modifier for straight lines (already migrated) ✓
  - [ ] Test multi-select across tabs ✓
  - [ ] Test delete/copy/paste with global panels ✓

- [ ] **9.2** Verify no regressions:
  - [ ] All widgets still work (image, emoji, youtube, etc.) ✓
  - [ ] Context menus work ✓
  - [ ] File save/load works ✓
  - [ ] Multi-file support works ✓
  - [ ] Resize/drag optimizations still work ✓

### Phase 10: Cleanup & Documentation ⏳
- [ ] **10.1** Remove dead code
  - [ ] Search for unused imports
  - [ ] Remove any old per-tab state management
  - [ ] Clean up commented code

- [ ] **10.2** Update documentation
  - [ ] Update `ARCHITECTURE.md` with new global panels pattern
  - [ ] Update `CHECKLIST.md` with completion status
  - [ ] Add notes to `COPILOT-INSTRUCTIONS.md` about global contexts

---

## 🏗️ Technical Details

### Context Data Structures

```typescript
// GlobalToolContext
interface GlobalToolContextValue {
  currentTool: Tool
  setTool: (tool: Tool) => void
}

// ActiveTabContext
interface ActiveTabContextValue {
  tabId: string | null
  viewport: { x: number; y: number; zoom: number } | null
  selectedObjectIds: string[]
  objects: CanvasObject[]
  updateActiveTab: (data: Partial<ActiveTabData>) => void
}
```

### Component Hierarchy (After Refactor)

```
App
├── GlobalToolProvider
│   └── ActiveTabProvider
│       └── GlobalPanelsLayout
│           ├── CanvasToolbar (global, top)
│           ├── CanvasViewportDisplay (global, top-right)
│           ├── CanvasPropertiesPanel (global, right)
│           ├── BrushPanel (global, top-left, conditional)
│           └── TabLayout
│               ├── Tab 1: InfiniteCanvas (canvas only)
│               ├── Tab 2: InfiniteCanvas (canvas only)
│               └── Tab 3: InfiniteCanvas (canvas only)
```

### Data Flow

```
User selects tool in toolbar
  → Updates GlobalToolContext.currentTool
  → All components reading global tool re-render
  → InfiniteCanvas reads new tool, updates drawing mode
  → Tool persists when switching tabs

User switches tabs
  → TabLayout onChange calls updateActiveTab()
  → ActiveTabContext updates with new tab's data
  → Panels re-render with new active tab data
  → Viewport display shows new tab's viewport
  → Properties panel shows new tab's selection
```

---

## ⚠️ Critical Gotchas

1. **Stale Closures**: Use `objectsRef.current` pattern in InfiniteCanvas (already implemented)
2. **Context Updates**: Ensure `updateActiveTab()` is called on every relevant change
3. **Performance**: Memoize context values to prevent unnecessary re-renders
4. **Brush Settings**: Decision needed - should brush settings be global or per-tab?
5. **Keyboard Shortcuts**: Already migrated to KRS, should work without changes
6. **IPC Handlers**: Active tab needs to be tracked for save/close operations

---

## 🚀 Estimated Effort

- **Phase 1-2**: 1-2 hours (contexts + hook refactor)
- **Phase 3-6**: 2-3 hours (lift all panels)
- **Phase 7-8**: 1-2 hours (update canvas + layout)
- **Phase 9**: 1-2 hours (testing)
- **Phase 10**: 30 minutes (cleanup)

**Total**: ~6-10 hours of focused work

---

## 📊 Success Criteria

✅ Tool selection persists across all tabs
✅ Only one toolbar rendered (not per-tab)
✅ Viewport display shows active tab's viewport
✅ Properties panel shows active tab's selection
✅ Brush panel appears only when pen/arrow tool is active
✅ No regressions in existing functionality
✅ Keyboard shortcuts still work (KRS integration)
✅ Multi-select, copy/paste, delete all work
✅ File save/load works correctly
✅ Performance is maintained or improved

---

## 🎉 Next Steps

Start with **Phase 1.1** - Create `GlobalToolContext`!
