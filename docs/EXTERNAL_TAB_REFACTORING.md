# External Tab Widget Refactoring

**Date:** November 2, 2025  
**Status:** 📋 Planning Phase  
**Impact:** High - Affects widget system, tab management, and IPC layer

---

## 📊 Problem Analysis

### Current State: Code Duplication & Tight Coupling

We currently have **2 external-tab widgets** (Spreadsheet, External Web) with ~85% duplicated code across **9+ files**:

#### Duplication Breakdown

| Component | Spreadsheet | External Web | Duplication % |
|-----------|------------|--------------|---------------|
| Widget Component | 96 lines | 109 lines | ~85% |
| IPC Handler (main.ts) | 30 lines | 30 lines | ~95% |
| Preload API | 15 lines | 15 lines | ~95% |
| Tab Listener (main-with-tabs.tsx) | 120 lines | 120 lines | ~90% |
| Close Handler | 20 lines | 20 lines | ~100% |
| Type Definition | 10 lines | 10 lines | ~80% |

**Total Duplicated Code:** ~400 lines  
**Maintenance Burden:** 6 locations to update per change  
**Bug Risk:** High (changes must be synced across all duplicates)

---

### Deeper Issues Discovered

#### 1. **Global Window Pollution**
```typescript
// index.d.ts - BAD PATTERN
window.__closeSpreadsheetTabs?: (objectId: string, parentTabId: string) => void
window.__closeExternalWebTabs?: (objectId: string, parentTabId: string) => void
window.__updateTabName?: (tabId: string, newName: string) => void
```

**Problems:**
- ❌ Type-unsafe (optional properties can be undefined)
- ❌ No TypeScript enforcement
- ❌ Hard to test (global state)
- ❌ Not discoverable (magic functions)
- ❌ Scales poorly (1 function per widget type)

#### 2. **Tab Type Hardcoding in FlexLayout**
```typescript
// main-with-tabs.tsx - Brittle string matching
component: 'spreadsheet'  // Must match exact string in factory
component: 'external-web' // Must match exact string in factory
```

**Problems:**
- ❌ Factory function has giant if/else chain
- ❌ Adding new tab type = touching multiple switch statements
- ❌ No type safety (typos = runtime errors)
- ❌ Config type unions grow with each new widget

#### 3. **IPC Handler Explosion**
```typescript
// main/windows/main.ts
ipcMain.handle('spreadsheet-open', ...)  // +30 lines
ipcMain.handle('external-web-open', ...) // +30 lines
// Future: +30 lines per widget type
```

**Problems:**
- ❌ N handlers for N widget types
- ❌ Nearly identical logic duplicated
- ❌ IPC namespace pollution

#### 4. **Widget-Specific Event Listeners**
```typescript
// main-with-tabs.tsx
window.App.spreadsheet.onTabOpen(...)  // +120 lines
window.App.externalWeb.onTabOpen(...)  // +120 lines
// Future: +120 lines per widget type
```

**Problems:**
- ❌ Listener boilerplate scales linearly with widget count
- ❌ Tab opening logic duplicated per type

#### 5. **No Extensibility Path**
Current architecture doesn't support:
- ❌ Third-party widget plugins
- ❌ Runtime widget registration
- ❌ Widget-specific tab behaviors (custom close logic, etc.)
- ❌ Widget metadata/configuration

---

## 💡 Proposed Solution: Widget Capability System

Instead of creating a generic "external-tab-widget" abstraction, we introduce a **capability-based architecture** where widgets declare their behaviors through a registry.

### Core Concept: Capabilities, Not Inheritance

```typescript
// Widgets opt-in to capabilities
widgetRegistry.register('image', ImageWidget, {
  displayName: 'Image',
  capabilities: {
    externalTab: {
      enabled: true,
      componentName: 'image-viewer',
      getTabConfig: (object) => ({ assetId: object.object_data.assetId }),
      tabTitle: (object) => object.object_data.fileName || 'Image',
      tabIcon: '🖼️',
    }
  }
})
```

**Benefits:**
- ✅ Widgets stay decoupled (no inheritance)
- ✅ Capabilities are discoverable (inspect registry)
- ✅ Easy to add new capabilities (externalTab, contextMenu, properties, etc.)
- ✅ Type-safe configuration
- ✅ Zero boilerplate for simple widgets

---

## 🏗️ Architecture Design

### Layer 1: Widget Capability Registry (New)

**File:** `src/renderer/components/canvas/widgets/widget-capabilities.ts`

```typescript
// Capability definition
interface ExternalTabCapability {
  enabled: boolean
  componentName: string // Maps to tab editor component
  getTabConfig: (object: DrawingObject) => Record<string, any>
  tabTitle?: (object: DrawingObject) => string
  tabIcon?: string
  splitViewDefault?: boolean // default: true
}

interface WidgetCapabilities {
  externalTab?: ExternalTabCapability
  // Future capabilities:
  contextMenu?: ContextMenuCapability
  propertiesPanel?: PropertiesPanelCapability
  serialization?: SerializationCapability
}

// Enhanced registry
class WidgetRegistry {
  register(
    type: DrawingObjectType,
    component: ComponentType<any>,
    metadata: {
      displayName: string
      description?: string
      capabilities?: WidgetCapabilities  // NEW
    }
  ): void
}
```

**Key Insight:** The registry becomes the **single source of truth** for all widget behaviors.

---

### Layer 2: Unified IPC Layer (Simplified)

**File:** `src/main/windows/main.ts`

**Before:**
```typescript
ipcMain.handle('spreadsheet-open', async (_event, params) => { /* 30 lines */ })
ipcMain.handle('external-web-open', async (_event, params) => { /* 30 lines */ })
// +30 lines per widget...
```

**After:**
```typescript
// Single handler for ALL external tabs
ipcMain.handle('external-tab-open', async (_event, params: ExternalTabOpenParams) => {
  const { widgetType, parentTabId, objectId, splitView, config } = params
  const tabId = `${widgetType}-tab-${parentTabId}-${objectId}`
  
  window.webContents.send('external-tab-opened', {
    id: tabId,
    widgetType,
    parentTabId,
    objectId,
    splitView,
    config, // Pass through widget-specific config
  })
  
  return tabId
})
```

**Savings:** 90% reduction (30 lines → 15 lines), scales to N widgets with zero growth.

---

### Layer 3: Tab Component Registry (New)

**File:** `src/renderer/screens/tab-editor-registry.ts`

```typescript
// Map widget types to their editor components
const tabEditorRegistry = new Map<string, ComponentType<any>>()

tabEditorRegistry.set('spreadsheet', SpreadsheetEditor)
tabEditorRegistry.set('external-web', ExternalWebEditor)
tabEditorRegistry.set('image-viewer', ImageViewerEditor)

// Dynamic lookup in factory
const EditorComponent = tabEditorRegistry.get(widgetType)
if (EditorComponent) {
  return <EditorComponent {...config} />
}
```

**Benefit:** FlexLayout factory becomes a **3-line lookup** instead of a 200-line if/else chain.

---

### Layer 4: Event-Driven Tab Manager (Unified)

**File:** `src/renderer/screens/main-with-tabs.tsx`

**Before:**
```typescript
// Listener 1 (spreadsheet)
useEffect(() => {
  const cleanup = window.App.spreadsheet.onTabOpen((tab) => {
    /* 120 lines of FlexLayout manipulation */
  })
}, [model])

// Listener 2 (external-web) - DUPLICATE CODE
useEffect(() => {
  const cleanup = window.App.externalWeb.onTabOpen((tab) => {
    /* 120 lines of FlexLayout manipulation */
  })
}, [model])
```

**After:**
```typescript
// Single listener for ALL external tabs
useEffect(() => {
  const cleanup = window.App.externalTab.onTabOpened((tab) => {
    handleExternalTabOpen(tab) // Shared 40-line function
  })
}, [model])

function handleExternalTabOpen(tab: ExternalTabData) {
  // 1. Check for duplicate tabs
  if (tabs.find(t => t.id === tab.id)) {
    focusExistingTab(tab.id)
    return
  }
  
  // 2. Get widget capability config
  const capability = widgetRegistry.getCapability(tab.widgetType, 'externalTab')
  const icon = capability?.tabIcon || '📄'
  const title = capability?.tabTitle?.(tab.object) || tab.config.title
  
  // 3. Add to FlexLayout (split or full)
  const location = tab.splitView ? DockLocation.RIGHT : DockLocation.CENTER
  addTabToLayout({ ...tab, name: `${icon} ${title}` }, location)
  
  // 4. Track in state
  setTabs(prev => [...prev, tab])
  setActiveTabId(tab.id)
}
```

**Savings:** 240 lines → 40 lines (83% reduction), works for all external-tab widgets.

---

### Layer 5: Automatic Lifecycle Management (New)

**File:** `src/renderer/screens/tab-lifecycle-manager.ts`

```typescript
// Replaces global window functions with proper React patterns
export function useTabLifecycle(model: Model, tabs: Tab[]) {
  
  // Close child tabs when parent closes
  const handleParentClose = useCallback((parentTabId: string) => {
    const childTabs = tabs.filter(t => t.parentTabId === parentTabId)
    
    childTabs.forEach(childTab => {
      const node = model.getNodeById(childTab.id)
      if (node) model.doAction(Actions.deleteTab(childTab.id))
    })
    
    return childTabs.map(t => t.id)
  }, [tabs, model])
  
  // Close tabs when widget is deleted
  const handleWidgetDelete = useCallback((objectId: string, parentTabId: string) => {
    const tabId = tabs.find(t => 
      t.objectId === objectId && t.parentTabId === parentTabId
    )?.id
    
    if (tabId) {
      const node = model.getNodeById(tabId)
      if (node) model.doAction(Actions.deleteTab(tabId))
      return true
    }
    return false
  }, [tabs, model])
  
  return { handleParentClose, handleWidgetDelete }
}
```

**Usage in `use-canvas-objects.ts`:**
```typescript
const { handleWidgetDelete } = useTabLifecycle(model, tabs)

const deleteObject = useCallback((id: string) => {
  const object = objects.find(o => o.id === id)
  
  // Check if widget has external tab capability
  const capability = widgetRegistry.getCapability(object.type, 'externalTab')
  if (capability?.enabled) {
    handleWidgetDelete(id, tabId) // Type-safe, testable
  }
  
  // Delete object
  await window.App.file.deleteObject(id, tabId)
}, [objects, tabId, handleWidgetDelete])
```

**Benefit:** Replaces unsafe global functions with proper React patterns.

---

## 🎯 The Real Win: Composable Widget Hook

**File:** `src/renderer/components/canvas/widgets/use-widget-capabilities.ts`

```typescript
export function useWidgetCapabilities(
  widgetType: DrawingObjectType,
  object: DrawingObject,
  tabId: string | null
) {
  const capabilities = widgetRegistry.getCapabilities(widgetType)
  
  // External tab capability
  const handleExternalTabOpen = useCallback(async (e: React.MouseEvent) => {
    if (!capabilities?.externalTab?.enabled) return
    
    e.stopPropagation()
    const splitView = !e.ctrlKey
    const config = capabilities.externalTab.getTabConfig(object)
    
    await window.App.externalTab.open({
      widgetType,
      parentTabId: tabId!,
      objectId: object.id,
      splitView,
      config,
    })
  }, [capabilities, object, tabId, widgetType])
  
  return {
    hasExternalTab: !!capabilities?.externalTab?.enabled,
    handleExternalTabOpen,
    // Future: hasContextMenu, handleContextMenu, etc.
  }
}
```

**Usage in widgets (5 lines):**
```typescript
export function ImageWidget({ object, tabId, ...props }) {
  const { hasExternalTab, handleExternalTabOpen } = useWidgetCapabilities('image', object, tabId)
  
  return (
    <WidgetWrapper {...props}>
      <div onDoubleClick={hasExternalTab ? handleExternalTabOpen : undefined}>
        {/* widget content */}
      </div>
    </WidgetWrapper>
  )
}
```

---

## 📋 Implementation TODO List

### Phase 1: Foundation (2-3 hours)

- [ ] **1.1** Create `widget-capabilities.ts` with interfaces
  - [ ] Define `ExternalTabCapability` interface
  - [ ] Add `capabilities` field to `WidgetRegistry`
  - [ ] Add `getCapability()` and `getCapabilities()` methods
  
- [ ] **1.2** Create `tab-editor-registry.ts`
  - [ ] Map widget types to editor components
  - [ ] Export `getTabEditor(widgetType)` function
  
- [ ] **1.3** Create `use-widget-capabilities.ts` hook
  - [ ] Implement `useWidgetCapabilities()` with external tab logic
  - [ ] Add TypeScript guards for capability checks

### Phase 2: IPC Layer (1-2 hours)

- [ ] **2.1** Update `src/preload/index.ts`
  - [ ] Add `externalTab.open()` unified API
  - [ ] Add `externalTab.onTabOpened()` listener
  - [ ] Keep backward compatibility for spreadsheet/externalWeb
  
- [ ] **2.2** Update `src/main/windows/main.ts`
  - [ ] Add `external-tab-open` IPC handler
  - [ ] Emit `external-tab-opened` event with generic payload
  - [ ] Keep backward compatibility (spreadsheet-open → external-tab-open proxy)
  
- [ ] **2.3** Update `index.d.ts` types
  - [ ] Add `Window.App.externalTab` namespace
  - [ ] Mark old APIs as deprecated (but keep them)

### Phase 3: Tab Management (3-4 hours)

- [ ] **3.1** Create `tab-lifecycle-manager.ts`
  - [ ] Implement `useTabLifecycle()` hook
  - [ ] Add `handleParentClose()` logic
  - [ ] Add `handleWidgetDelete()` logic
  
- [ ] **3.2** Update `main-with-tabs.tsx`
  - [ ] Replace listener duplication with single `externalTab.onTabOpened()`
  - [ ] Refactor `handleExternalTabOpen()` unified function
  - [ ] Remove global window function assignments
  - [ ] Update FlexLayout factory to use `tabEditorRegistry`
  
- [ ] **3.3** Update `use-canvas-objects.ts`
  - [ ] Replace `window.__closeSpreadsheetTabs` with lifecycle manager
  - [ ] Replace `window.__closeExternalWebTabs` with lifecycle manager
  - [ ] Add capability check before closing tabs

### Phase 4: Widget Migration (1-2 hours)

- [ ] **4.1** Update `spreadsheet-widget.tsx`
  - [ ] Replace custom `handleDoubleClick` with `useWidgetCapabilities()`
  - [ ] Register capability in `register-all.ts`
  - [ ] Test double-click and Ctrl+double-click
  
- [ ] **4.2** Update `external-web-widget.tsx`
  - [ ] Replace custom `handleDoubleClick` with `useWidgetCapabilities()`
  - [ ] Register capability in `register-all.ts`
  - [ ] Test double-click and Ctrl+double-click
  
- [ ] **4.3** Update `register-all.ts`
  - [ ] Add `capabilities` config to spreadsheet registration
  - [ ] Add `capabilities` config to external-web registration

### Phase 5: Testing & Cleanup (2-3 hours)

- [ ] **5.1** Test existing functionality
  - [ ] Spreadsheet: double-click (split), Ctrl+double-click (full)
  - [ ] External Web: double-click (split), Ctrl+double-click (full)
  - [ ] Tab close on parent file close
  - [ ] Tab close on widget delete
  - [ ] Tab focus when opening existing tab
  
- [ ] **5.2** Remove deprecated code
  - [ ] Delete `window.__closeSpreadsheetTabs` (after testing)
  - [ ] Delete `window.__closeExternalWebTabs` (after testing)
  - [ ] Remove old IPC handlers (after migration period)
  
- [ ] **5.3** Documentation
  - [ ] Update `ARCHITECTURE.md` with capability system
  - [ ] Create `WIDGET-CAPABILITIES-GUIDE.md`
  - [ ] Add inline examples to registry

### Phase 6: Validation (30 min - 1 hour)

- [ ] **6.1** Add Image Viewer (test case)
  - [ ] Create `ImageViewerEditor` component (~100 lines)
  - [ ] Register capability for image widget (~5 lines)
  - [ ] Test full workflow (should take 10-15 minutes)
  
- [ ] **6.2** Verify extensibility
  - [ ] Measure time to add YouTube Theater Mode
  - [ ] Confirm no IPC/tab management changes needed

---

## 🎁 Benefits Summary

### Immediate Wins

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Lines of Code** | ~400 duplicated | ~150 shared | 62% reduction |
| **Files to Touch (new widget)** | 9 files | 3 files | 67% reduction |
| **Time to Add Widget** | 2-3 hours | 10-15 min | 91% reduction |
| **IPC Handlers** | N handlers | 1 handler | O(N) → O(1) |
| **Tab Listeners** | N listeners | 1 listener | O(N) → O(1) |
| **Type Safety** | Partial (global any) | Full (capability types) | ✅ Complete |

### Long-Term Wins

✅ **Extensibility:** Plugin system foundation (widgets can be loaded dynamically)  
✅ **Testability:** No global state, pure functions  
✅ **Maintainability:** Bug fixes apply to all widgets automatically  
✅ **Discoverability:** `widgetRegistry.getAll()` shows all capabilities  
✅ **Type Safety:** Compile-time errors for missing configs  
✅ **Future-Proof:** Easy to add capabilities (contextMenu, propertiesPanel, etc.)

---

## 🤔 Why This Design is Better

### Compared to Initial Proposal

**Initial Idea:** Create generic `ExternalTabWidget` base component

**Problems with Initial Idea:**
- ❌ Forces inheritance (React doesn't favor inheritance)
- ❌ Still requires per-widget IPC handlers
- ❌ Doesn't solve global window pollution
- ❌ FlexLayout factory still needs if/else chain
- ❌ No path to other capabilities (context menu, etc.)

**Capability System Advantages:**
- ✅ Composition over inheritance (React-friendly)
- ✅ Single IPC handler for all widgets
- ✅ Removes global functions (proper React patterns)
- ✅ FlexLayout factory becomes 3-line lookup
- ✅ Extensible to any capability (not just external tabs)

### Real-World Example: Adding 3 New Widgets

**Scenario:** Add Image Viewer, PDF Viewer, Code Editor

#### With Initial Proposal
- Time: 45 minutes (15 min × 3)
- Still need: 3 IPC handlers, 3 listeners, global functions
- Code growth: Linear with widget count

#### With Capability System
- Time: 30 minutes (10 min × 3)
- Zero new IPC/listeners needed
- Code growth: Sub-linear (shared infrastructure amortized)

**Additional benefit:** Other widgets (YouTube, File) can opt-in to external tabs with zero changes to the system.

---

## 🚀 Migration Path

### Backward Compatibility (Low Risk)

We keep old APIs during migration:

```typescript
// Preload - old APIs proxy to new system
spreadsheet: {
  open: (params) => externalTab.open({ widgetType: 'spreadsheet', ...params }),
  onTabOpen: (cb) => externalTab.onTabOpened((tab) => {
    if (tab.widgetType === 'spreadsheet') cb(tab)
  })
}
```

**Benefit:** Can deploy incrementally, test thoroughly, remove old code later.

---

## ✅ Success Criteria

After refactoring, verify:

1. ✅ All existing spreadsheet/external-web functionality works
2. ✅ New image-viewer widget can be added in under 15 minutes
3. ✅ Zero global window functions remain
4. ✅ FlexLayout factory is < 50 lines (down from 200+)
5. ✅ Single IPC handler for all external tabs
6. ✅ Full TypeScript safety (no `any` types in capability system)
7. ✅ Registry inspection works (`widgetRegistry.getAll()` returns metadata)

---

## 📝 Notes & Considerations

### Performance
- Registry lookups are O(1) Map operations (negligible)
- No re-renders introduced (capabilities are static)
- Event listener count reduced (N → 1)

### TypeScript Strictness
- Capability configs are fully typed
- Widget-specific configs use generics: `getTabConfig<T>(object: T)`
- No `any` escapes in capability system

### Testing Strategy
- Unit test: `WidgetRegistry.getCapability()`
- Integration test: Mock IPC, verify tab opening flow
- E2E test: Full widget lifecycle (create → open tab → close)

### Future Enhancements
Capability system enables:
- `contextMenu` capability (right-click custom menus per widget)
- `propertiesPanel` capability (custom properties UI per widget)
- `serialization` capability (custom save/load logic)
- `keyboard` capability (widget-specific shortcuts)

---

## 🎯 Recommendation

**Proceed with Capability System** instead of simpler external-tab abstraction.

**Why:** 
- Solves deeper architectural issues (global pollution, IPC explosion)
- Only ~2 hours more work for 10x better architecture
- Future-proofs for plugin system and other capabilities
- Eliminates ALL code duplication, not just some

**Risk:** Low - backward compatibility maintained throughout

---

**Ready to implement? Let's build the capability system! 🚀**
