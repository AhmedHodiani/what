# Spreadsheet Tabs Implementation

## What Was Done

Implemented spreadsheet widgets that open in dedicated tabs using Univer. Instead of cramming a spreadsheet into a widget, we now have:
- **Icon widget on canvas** (180x120px) - Click to open
- **Full spreadsheet editor in new tab** - Opens when widget is clicked

### Key Components:
1. **Tab type system** - Added `SpreadsheetTab` type to support different tab types
2. **IPC communication** - `window.App.spreadsheet.open()` creates new tabs
3. **SpreadsheetEditor component** - Full Univer editor with resize handling
4. **Widget click handler** - Opens tab with `parentTabId` and `objectId`

### Bug Fixed:
- **Resize white screen issue** - Removed `containerSize` from dependencies to prevent Univer disposal/recreation cycle

---

## What's Left To Do

### High Priority:
1. **Data persistence** - Save workbook edits back to the canvas object
   - Listen to Univer changes: `univer.onCommandExecuted()`
   - Save snapshot: `univerAPI.getActiveWorkbook()?.save()`
   - Update object: `window.App.file.saveObject({ id, object_data: { workbookData } })`

2. **Auto-save** - Debounce saves (every 2-5 seconds after edit)

3. **Load existing data** - When reopening widget, load `workbookData` from object

### Medium Priority:
- Close tab when widget is deleted from canvas
- Loading state while Univer initializes
- Show visual indicator on widget when it has data

### Low Priority:
- Export to Excel (requires Univer Pro)
- Multiple sheets support
- Keyboard shortcuts (Ctrl+S to save)

---

## Files Modified:
- `src/shared/types/tabs.ts` - Tab types
- `src/main/windows/main.ts` - IPC handlers
- `src/preload/index.ts` + `index.d.ts` - API bridge
- `src/renderer/screens/main-with-tabs.tsx` - Tab factory
- `src/renderer/screens/spreadsheet-editor.tsx` - **NEW** editor component
- `src/renderer/components/canvas/widgets/spreadsheet-widget.tsx` - Icon widget
- Canvas components - Pass `tabId` prop through chain
