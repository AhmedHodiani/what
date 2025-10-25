# Spreadsheet Implementation - Bugs & Issues Report

## 🔴 Critical Bugs

### 1. **Missing `workbookData` → `assetId` Migration in Dialog**
**File:** `src/renderer/hooks/use-canvas-dialogs.ts:198`

**Issue:**
```typescript
object_data: {
  title: name,
  workbookData: undefined, // ❌ WRONG! Should be assetId
}
```

**Fix:**
```typescript
object_data: {
  title: name,
  assetId: undefined, // ✅ Correct
}
```

**Impact:** When creating a new spreadsheet, the object has `workbookData` instead of `assetId`, causing type mismatch.

---

### 2. **Spreadsheet Duplication Not Implemented**
**File:** `src/renderer/hooks/use-object-duplication.ts:268-285`

**Issue:** Spreadsheet objects are not handled in duplication logic. Only images and files duplicate their assets.

**Current Code:**
```typescript
if (originalObject.type === 'image' || originalObject.type === 'file') {
  // Duplicate asset
}
// ❌ Spreadsheet not handled!
```

**Fix Needed:**
```typescript
if (originalObject.type === 'image' || originalObject.type === 'file' || originalObject.type === 'spreadsheet') {
  const assetId = originalObject.object_data.assetId as string
  if (assetId) {
    const newAssetId = await duplicateAsset(
      assetId,
      `spreadsheet-${Date.now()}.json`,
      'application/json'
    )
    if (newAssetId) {
      newObjectData = { ...newObjectData, assetId: newAssetId }
    }
  }
}
```

**Impact:** Duplicating (Ctrl+D) a spreadsheet will share the same asset file, causing both copies to save to the same file!

---

### 3. **No Cleanup When Deleting Spreadsheet Widget**
**File:** `src/main/services/what-file.ts:660-680`

**Current Behavior:**
- ✅ Deletes asset when object is deleted (good!)
- ❌ But spreadsheet tab remains open (bad!)

**Issue:** When user deletes spreadsheet widget from canvas:
1. Asset file is deleted ✅
2. Object is removed from DB ✅
3. **Spreadsheet tab stays open** ❌
4. Auto-save tries to save to deleted object → error!

**Fix Needed:**
Send IPC event when spreadsheet object is deleted to close its tab:
```typescript
// In what-file.ts deleteObject():
if (objectData.type === 'spreadsheet') {
  // Notify renderer to close spreadsheet tab
  window.webContents.send('spreadsheet-object-deleted', {
    objectId: id,
    parentTabId: // need to track this!
  })
}
```

---

## 🟡 Medium Priority Bugs

### 4. **Auto-Save Fires Too Often**
**File:** `src/renderer/screens/spreadsheet-editor.tsx:259-284`

**Issue:** Auto-save is triggered by ANY mouse/keyboard event in the container, including:
- Scrolling
- Clicking toolbar buttons
- Just moving the mouse

**Current Code:**
```typescript
const markDirty = () => { hasUnsavedChanges = true }
containerRef.current?.addEventListener('keydown', markDirty)
containerRef.current?.addEventListener('mouseup', markDirty)  // ❌ Too broad!
containerRef.current?.addEventListener('paste', markDirty)
```

**Impact:** Unnecessary saves every 5 seconds even if user is just navigating.

**Better Approach:**
Use Univer's command system to detect actual changes:
```typescript
univer.onCommandExecuted((command) => {
  if (command.type === 'sheet.mutation.set-range-values') {
    hasUnsavedChanges = true
  }
})
```

---

### 5. **Event Listeners Not Cleaned Up Properly**
**File:** `src/renderer/screens/spreadsheet-editor.tsx:273-275`

**Issue:**
```typescript
containerRef.current?.addEventListener('keydown', markDirty)
containerRef.current?.addEventListener('mouseup', markDirty)
containerRef.current?.addEventListener('paste', markDirty)
// ❌ No cleanup! Memory leak on component unmount
```

**Fix:**
```typescript
const container = containerRef.current
if (container) {
  container.addEventListener('keydown', markDirty)
  container.addEventListener('mouseup', markDirty)
  container.addEventListener('paste', markDirty)
  
  // Cleanup
  return () => {
    container.removeEventListener('keydown', markDirty)
    container.removeEventListener('mouseup', markDirty)
    container.removeEventListener('paste', markDirty)
  }
}
```

---

### 6. **Race Condition: Save Before Delete**
**Scenario:**
1. User edits spreadsheet
2. Auto-save timer is running (3s delay)
3. User deletes widget before timer fires
4. Auto-save tries to update deleted object → error

**Current Code:** No protection against this.

**Fix:** Check if object still exists before saving:
```typescript
const saveWorkbook = async () => {
  // Check if object still exists
  const objects = await window.App.file.getObjects(parentTabId)
  const objectExists = objects.some(obj => obj.id === objectId)
  
  if (!objectExists) {
    logger.warn('Object deleted, skipping save')
    return
  }
  
  // ... rest of save logic
}
```

---

### 7. **Multiple Spreadsheet Tabs for Same Object**
**File:** `src/main/windows/main.ts:232`

**Issue:** Tab ID is generated based on `parentTabId` and `objectId`:
```typescript
const spreadsheetTabId = `spreadsheet-${parentTabId}-${objectId}`
```

**Problem:** If user clicks the same spreadsheet widget twice, it should:
- **Option A:** Focus existing tab (preferred)
- **Option B:** Open a second tab (current behavior - confusing!)

**Current Behavior:** Opens duplicate tabs, both editing the same file!

**Fix:** Check if tab already exists before creating:
```typescript
const existingTabId = `spreadsheet-${parentTabId}-${objectId}`
const existingTab = tabs.find(t => t.id === existingTabId)

if (existingTab) {
  // Focus existing tab
  Actions.selectTab(existingTabId)
  return existingTabId
}
```

---

## 🟢 Low Priority Issues

### 8. **Hardcoded Auto-Save Intervals**
**File:** `src/renderer/screens/spreadsheet-editor.tsx:257-263`

**Issue:**
```typescript
const autoSaveInterval = setInterval(() => {
  if (hasUnsavedChanges && Date.now() - lastSaveTime > 3000) {  // Hardcoded
    saveWorkbook()
  }
}, 5000)  // Hardcoded
```

**Better:** Make configurable:
```typescript
const AUTO_SAVE_CHECK_INTERVAL = 5000  // Check every 5s
const AUTO_SAVE_DELAY = 3000           // Save 3s after last change
```

---

### 9. **No Visual Feedback for Auto-Save**
**Issue:** User doesn't know when spreadsheet is saving or if it succeeded.

**Enhancement:**
- Show "Saving..." indicator in tab title
- Show "✓ Saved" toast notification
- Show save timestamp in status bar

---

### 10. **Large Workbook Performance**
**Issue:** No size limits or warnings for large spreadsheets.

**Scenario:**
- User creates 1000-row, 100-column spreadsheet
- File size = 500KB+ JSON
- Auto-save becomes slow
- No feedback to user

**Enhancement:**
```typescript
if (workbookJson.length > 500_000) {  // 500KB
  logger.warn('Large spreadsheet detected:', workbookJson.length)
  // Show warning toast
  // Increase auto-save interval
}
```

---

### 11. **Missing Error Handling in Asset Loading**
**File:** `src/renderer/screens/spreadsheet-editor.tsx:224-237`

**Current:**
```typescript
if (assetContent) {
  initialWorkbook = JSON.parse(assetContent)
} else {
  logger.error('❌ Asset not found:', assetId)
  initialWorkbook = createDefaultWorkbook(title)
}
```

**Issue:** If `assetContent` is corrupted (invalid JSON), it will crash. No try/catch around `JSON.parse()`.

**Fix:**
```typescript
try {
  initialWorkbook = JSON.parse(assetContent)
} catch (parseError) {
  logger.error('Failed to parse workbook JSON:', parseError)
  initialWorkbook = createDefaultWorkbook(title)
}
```

---

## 🔧 Recommended Fixes Priority

1. **CRITICAL - Fix `workbookData` → `assetId` in dialog** (5 min)
2. **CRITICAL - Implement spreadsheet duplication** (30 min)
3. **CRITICAL - Close tab when widget deleted** (1 hour)
4. **MEDIUM - Fix auto-save detection** (1 hour)
5. **MEDIUM - Fix event listener cleanup** (15 min)
6. **MEDIUM - Prevent duplicate tabs** (30 min)
7. **LOW - Add JSON.parse error handling** (5 min)

---

## Testing Checklist

After fixes, test these scenarios:

- [ ] Create spreadsheet → Edit → Close → Reopen (data persists)
- [ ] Delete spreadsheet widget → Tab closes automatically
- [ ] Duplicate spreadsheet (Ctrl+D) → Both have independent data
- [ ] Click same widget twice → Focuses existing tab (no duplicate)
- [ ] Edit → Wait 3s → Check auto-save triggered
- [ ] Edit → Delete widget immediately → No errors in console
- [ ] Create huge spreadsheet (1000+ cells) → Performance acceptable
- [ ] Corrupt asset JSON file → Graceful fallback to empty sheet
- [ ] Open spreadsheet → Close app → Reopen → Data persists
- [ ] Multi-file: Open 2 .what files with spreadsheets → No crosstalk

---

## Architecture Improvements (Future)

1. **Command Pattern for Undo/Redo**
   - Track spreadsheet changes
   - Allow Ctrl+Z across app restarts

2. **Throttled Auto-Save**
   - Use debounce + requestIdleCallback
   - Save during idle time, not during active typing

3. **Background Save Queue**
   - Queue saves in IndexedDB
   - Flush to disk periodically
   - Prevent UI blocking

4. **Asset Compression**
   - Gzip JSON files >50KB
   - Transparent to Univer
   - Reduce file size 70%+

5. **Tab State Sync**
   - When widget deleted, broadcast to all windows
   - Close tabs across split views
