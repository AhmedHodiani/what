# CSP Fix for Asset Loading

## Problem
When loading spreadsheet workbook data, we were using `getAssetDataUrl()` which returns a `data:` URL with base64-encoded content. However, Electron's Content Security Policy (CSP) blocks `fetch()` requests to `data:` URLs:

```
Refused to connect to 'data:application/json;base64,...' because it violates 
the following Content Security Policy directive: "default-src 'self' *"
```

## Root Cause
- CSP blocks network requests to `data:` URLs
- `fetch(dataUrl)` was being used to load JSON workbook data
- This is a browser security feature to prevent XSS attacks

## Solution
Instead of using data URLs, we now directly read the file content as a string through IPC.

### New Method: `getAssetContent()`

**Backend (what-file.ts):**
```typescript
getAssetContent(assetId: string): string | null {
  const assetPath = join(this.workingDir, 'assets', asset.filename)
  return readFileSync(assetPath, 'utf-8')  // Read as UTF-8 string
}
```

**Frontend Usage:**
```typescript
// ❌ OLD: Violated CSP
const dataUrl = await window.App.file.getAssetDataUrl(assetId)
const response = await fetch(dataUrl)  // CSP violation!
const json = await response.json()

// ✅ NEW: Direct file read
const content = await window.App.file.getAssetContent(assetId)
const json = JSON.parse(content)  // Works!
```

## Files Changed
- ✅ `src/main/services/what-file.ts` - Added `getAssetContent()` method
- ✅ `src/main/services/multi-file-manager.ts` - Added wrapper
- ✅ `src/main/windows/main.ts` - Added IPC handler `file-get-asset-content`
- ✅ `src/preload/index.ts` - Added bridge method
- ✅ `index.d.ts` - Added TypeScript declaration
- ✅ `src/renderer/screens/spreadsheet-editor.tsx` - Use `getAssetContent()` instead of `getAssetDataUrl()`

## When to Use Each Method

### `getAssetDataUrl()` - For Binary Assets (Images, Videos)
```typescript
// Images displayed in <img> tags
const imageUrl = await window.App.file.getAssetDataUrl(assetId)
<img src={imageUrl} />  // Works! Images are allowed in CSP
```

### `getAssetContent()` - For Text Assets (JSON, CSV, etc.)
```typescript
// JSON files that need parsing
const jsonContent = await window.App.file.getAssetContent(assetId)
const data = JSON.parse(jsonContent)  // No CSP issues
```

### `getAssetPath()` - For File Downloads
```typescript
// Getting file path for user to save/export
const filePath = await window.App.file.getAssetPath(assetId)
// Used with file dialogs, exports, etc.
```

## Benefits
1. ✅ No CSP violations
2. ✅ More efficient (no base64 encoding/decoding for text files)
3. ✅ Cleaner code (direct JSON.parse vs fetch → response.json())
4. ✅ Consistent with how we handle other file operations

## Testing
```bash
# Create spreadsheet → Edit cells → Close → Reopen
# Should see in console:
📂 Loading workbook from asset: asset_XXX_YYY
✅ Workbook loaded from asset
# (No CSP errors!)
```
