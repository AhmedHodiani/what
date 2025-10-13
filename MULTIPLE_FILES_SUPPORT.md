# Multiple File Opening Support

## Overview
The application now supports opening multiple `.what` files simultaneously through various methods.

## Features Implemented

### 1. **File Association (All Platforms)**
- Double-click any `.what` file to open it in the app
- Right-click → "Open with What" to open files
- Configured in `electron-builder.ts` with proper MIME types and icons

### 2. **Multiple Files at Once**
Users can now open multiple `.what` files simultaneously:

#### **From File Explorer**
- Select multiple `.what` files
- Right-click → "Open with What"
- All files open as separate tabs

#### **From Command Line**
```bash
# Open single file
what-app file1.what

# Open multiple files
what-app file1.what file2.what file3.what
```

#### **When App is Already Running**
- Opening files while the app is running focuses the existing window
- New files are added as tabs (no new window opens)
- Prevents multiple instances

### 3. **Platform-Specific Handling**

#### **macOS**
- Uses `app.on('open-file')` event
- Handles files opened via Finder
- Supports drag-and-drop onto app icon

#### **Windows/Linux**
- Parses `process.argv` for file paths
- Handles files from command line and file associations

## Technical Details

### Code Flow
```
User opens file(s)
  ↓
OS launches app with file path(s)
  ↓
Electron captures via:
  - open-file event (macOS)
  - process.argv (Windows/Linux)
  ↓
Files stored in filesToOpen[] array
  ↓
After window ready (1s delay)
  ↓
Loop through files and open each
  ↓
multiFileManager.openFile(path)
  ↓
Send 'file-opened' IPC to renderer
  ↓
Renderer creates tabs for each file
```

### Deduplication
- macOS `open-file` event checks `filesToOpen.includes()` to avoid duplicates
- Ensures each file is only opened once even if triggered multiple times

### Error Handling
- Try-catch blocks around each file open operation
- Failed files are logged to console but don't break the loop
- Other files continue to open successfully

## Testing

### Development Mode (`pnpm dev`)
⚠️ **File associations don't work in dev mode** - requires installed app

You can test the command-line functionality:
```bash
# Won't work - file associations require installed app
right-click → Open with What

# Can test in dev mode
electron . file1.what file2.what
```

### Production Mode
1. Build the application:
   ```bash
   pnpm build:linux   # Linux
   pnpm build:win     # Windows  
   pnpm build         # macOS
   ```

2. Install the built package

3. Test scenarios:
   - Double-click a `.what` file
   - Right-click → "Open with What"
   - Select multiple files → Right-click → "Open with What"
   - Drag files onto app icon (macOS)
   - Launch from command line with files

## User Experience

### First Launch
```
User: *double-clicks project.what*
App:  *launches and opens project.what in a tab*
```

### Multiple Files
```
User: *selects 3 .what files, right-clicks "Open with What"*
App:  *launches and opens all 3 files as separate tabs*
```

### App Already Running
```
User: *app is running with 2 tabs open*
User: *double-clicks another .what file*
App:  *focuses existing window, adds file as 3rd tab*
```

## Future Enhancements
- [ ] Progress indicator for large files
- [ ] Drag-and-drop files into app window
- [ ] Recent files list
- [ ] Restore tabs from last session
