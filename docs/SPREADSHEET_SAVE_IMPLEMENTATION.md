# Spreadsheet Save/Load Implementation

## ✅ What Was Implemented

### Asset-Based Storage Architecture
We chose to store spreadsheet workbook data as **JSON asset files** instead of embedding in the database, for better scalability and performance.

---

## Changes Made

### 1. Updated Data Model

**SpreadsheetObject** (`lib/types/canvas.ts`):
```typescript
{
  id: string
  type: 'spreadsheet'
  object_data: {
    title: string
    assetId?: string  // Reference to JSON asset file
  }
}
```

**SpreadsheetTab** (`shared/types/tabs.ts`):
```typescript
{
  type: 'spreadsheet'
  parentTabId: string
  objectId: string
  assetId?: string    // Asset ID for workbook data
  splitView?: boolean
}
```

### 2. Added Asset Update Functionality

**New Methods:**
- `WhatFileService.updateAsset()` - Update existing asset file without creating new ID
- `MultiFileManager.updateAsset()` - Multi-tab wrapper
- IPC handler: `file-update-asset`
- Preload bridge: `window.App.file.updateAsset()`

**Why Update Instead of Create:**
- Prevents orphaned asset files
- Maintains stable asset IDs
- More efficient (no cleanup needed)
- Follows idempotent pattern

### 3. SpreadsheetEditor Save Logic

**Save Workflow:**
1. User edits spreadsheet in Univer
2. Change detected via `univerAPI.onCommandExecuted()`
3. Debounced save (2 seconds after last edit)
4. Get workbook snapshot: `workbook.save()`
5. Convert to JSON and ArrayBuffer
6. **First save:** Create new asset with `saveAsset()`
7. **Subsequent saves:** Update existing asset with `updateAsset()`
8. Update object's `assetId` reference (only on first save)

**Key Features:**
- ✅ Auto-save every 2 seconds after edit
- ✅ Reuses same asset ID across saves
- ✅ No orphaned files
- ✅ Logs save operations with size tracking

### 4. Load Workflow

**Loading Existing Spreadsheet:**
1. User clicks SpreadsheetWidget
2. IPC call: `window.App.spreadsheet.open({ assetId, ... })`
3. SpreadsheetEditor receives `assetId` prop
4. Load asset: `window.App.file.getAssetDataUrl(assetId)`
5. Parse JSON workbook data
6. Create Univer workbook: `univerAPI.createWorkbook(workbookData)`
7. Store assetId in ref for future saves

---

## File Changes Summary

### Main Process (Electron)
- ✅ `src/main/services/what-file.ts` - Added `updateAsset()` method
- ✅ `src/main/services/multi-file-manager.ts` - Added `updateAsset()` wrapper
- ✅ `src/main/windows/main.ts` - Added `file-update-asset` IPC handler

### Preload Bridge
- ✅ `src/preload/index.ts` - Added `updateAsset()` to bridge
- ✅ `index.d.ts` - Added TypeScript declarations

### Renderer (React)
- ✅ `src/renderer/screens/spreadsheet-editor.tsx` - Implemented save/load logic
- ✅ `src/renderer/components/canvas/widgets/spreadsheet-widget.tsx` - Pass `assetId` instead of `workbookData`
- ✅ `src/renderer/screens/main-with-tabs.tsx` - Pass `assetId` to SpreadsheetEditor

### Type Definitions
- ✅ `src/lib/types/canvas.ts` - Updated `SpreadsheetObject` to use `assetId`
- ✅ `src/shared/types/tabs.ts` - Updated `SpreadsheetTab` to use `assetId`
- ✅ `src/renderer/hooks/use-canvas-dialogs.ts` - Initialize with `assetId: undefined`

---

## How It Works (Full Flow)

### Creating New Spreadsheet
```
1. User clicks spreadsheet tool → Opens name dialog
2. User enters "Sales Q4" → Creates SpreadsheetObject:
   {
     id: "1234",
     type: "spreadsheet",
     object_data: { title: "Sales Q4", assetId: undefined }
   }
3. Widget appears on canvas (no data yet)
```

### First Open & Edit
```
4. User clicks widget → Opens SpreadsheetEditor tab
5. Editor creates empty Univer workbook (no assetId yet)
6. User types "Revenue" in cell A1
7. After 2 seconds → Auto-save triggers:
   - Get snapshot: { sheets: {...}, cellData: {...} }
   - Convert to JSON: ~5KB
   - Save asset: saveAsset("spreadsheet-1234.json", ...)
   - Returns: "asset_1234567890_abc123"
   - Update object: { assetId: "asset_1234567890_abc123" }
8. User adds more data
9. After 2 seconds → Auto-save triggers:
   - Update asset: updateAsset("asset_1234567890_abc123", ...)
   - SAME asset ID, file content updated
```

### Reopening Spreadsheet
```
10. User closes tab, clicks widget again
11. Widget passes assetId: "asset_1234567890_abc123"
12. Editor loads: getAssetDataUrl("asset_1234567890_abc123")
13. Parse JSON workbook data
14. Create Univer workbook with loaded data
15. User sees their previous work!
```

---

## Benefits of Asset-Based Approach

### ✅ Pros
1. **Scalability** - Large spreadsheets (100+ sheets) don't bloat database
2. **Performance** - `objects` table stays lean, fast queries
3. **Lazy loading** - Only load workbook when tab opens
4. **Memory efficiency** - Objects list doesn't carry full workbook data
5. **Clean updates** - Update file in-place, no orphaned assets
6. **Compression potential** - Could gzip JSON files in future

### ⚠️ Tradeoffs
1. **Two-step save** - Asset + object update (but automated)
2. **Asset cleanup** - Need to delete asset when object deleted (already handled for images)

---

## Testing Checklist

- [x] Create new spreadsheet
- [x] Edit cells and see auto-save logs
- [x] Verify same `assetId` used across saves (not creating new ones)
- [x] Close and reopen spreadsheet tab
- [ ] Verify data persists after full app restart
- [ ] Delete spreadsheet widget and check asset cleanup
- [ ] Test with large spreadsheet (1000+ cells)
- [ ] Test split view vs full tab modes

---

## Future Enhancements

1. **Size-based compression** - Gzip large workbooks (>50KB)
2. **Version history** - Save snapshots as `spreadsheet-1234-v2.json`
3. **Export functionality** - Export to CSV/XLSX
4. **Visual indicators** - Show file size, last saved time on widget
5. **Conflict resolution** - Handle concurrent edits (if multi-user in future)

---

## Debug Tips

**Check auto-save is working:**
```javascript
// In browser console, watch for:
logger.debug('💾 Spreadsheet saved to asset:', { objectId, assetId, sizeKB })
```

**Verify asset reuse:**
```javascript
// assetId should stay the same across saves:
// First save:  asset_1761411799578_iyrewda00
// Second save: asset_1761411799578_iyrewda00  ← SAME ID ✅
```

**Check asset file in .what archive:**
```bash
# Extract .what file and check assets/
unzip test.what -d /tmp/test
cat /tmp/test/assets/spreadsheet-*.json | jq
```

---

## Implementation Status

✅ **COMPLETE** - Asset-based save/load with update functionality
✅ Auto-save every 2 seconds
✅ Load existing spreadsheets
✅ Asset file reuse (no orphans)

🚧 **TODO** (See SPREADSHEET_TODO.md)
- Close tab when widget deleted
- Loading indicator
- Visual feedback on widget (show data exists)
- Export to CSV/Excel
