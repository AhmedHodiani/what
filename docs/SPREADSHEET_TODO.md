# Spreadsheet Tabs - TODO

## High Priority 🔴

- [ ] **Data Persistence** - Save workbook edits back to canvas object
  - Add `onCommandExecuted` listener in SpreadsheetEditor
  - Get snapshot: `univerAPI.getActiveWorkbook()?.save()`
  - Save to DB: `window.App.file.saveObject({ id, object_data: { workbookData } })`

- [ ] **Auto-save** - Debounce saves (2-5 seconds after last edit)

- [ ] **Load existing data** - When reopening widget, restore previous workbook state

## Medium Priority 🟡

- [ ] **Close tab when widget deleted** - Sync canvas object deletion with tab closure

- [ ] **Loading indicator** - Show spinner while Univer initializes

- [ ] **Visual feedback on widget** - Show indicator when spreadsheet has data

## Low Priority 🟢

- [ ] **Export to Excel** - Requires Univer Pro license

- [ ] **Multiple sheets support** - Add/remove sheets in workbook

- [ ] **Keyboard shortcuts** - Ctrl+S to save, Esc to close tab
