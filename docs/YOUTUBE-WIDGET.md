# YouTube Widget Implementation

## Overview
The YouTube widget allows embedding YouTube videos directly on the canvas with a sleek interface and full playback controls.

## Features

### 1. **Video Embedding**
- Embed any YouTube video using its URL
- Supports multiple URL formats:
  - `https://youtube.com/watch?v=VIDEO_ID`
  - `https://youtu.be/VIDEO_ID`
  - `https://youtube.com/embed/VIDEO_ID`
- Full YouTube iframe player with all controls

### 2. **Interactive UI**
- **Red header bar** (6px tall) for dragging
  - Visual grip indicator (3 dots)
  - Video title display
- **Double-click to edit** - Click the header to change the video URL
- **Placeholder state** - 📺 icon when no video is loaded
- **Live editing** - Input field with validation when editing URL

### 3. **Resizing**
- Maintains **16:9 aspect ratio** automatically
- Minimum size: 280x158px (preserves video quality)
- Default size: 560x315px (standard YouTube embed size)
- Resize handles preserve aspect ratio

### 4. **Keyboard Shortcuts**
- **Y** - Select YouTube tool
- **Enter** - Confirm URL when editing
- **Escape** - Cancel URL editing

## Usage

### Creating a YouTube Video
1. Press **Y** or click the 📺 icon in the toolbar
2. Click anywhere on the canvas
3. A modal dialog appears
4. Enter a YouTube URL (supports multiple formats)
5. Click **Add Video** or press **Enter**
6. Video appears instantly at the clicked location

### Editing Video URL
1. **Double-click** the red header bar
2. Edit the URL in the input field
3. Press **Enter** to confirm or **Escape** to cancel

### Moving & Resizing
- **Drag** the red header bar to move
- **Resize** using corner/edge handles (maintains 16:9 ratio)

## Implementation Details

### Files Modified
```
src/lib/types/canvas.ts
  ↳ Added YouTubeVideoObject interface
  ↳ Updated DrawingObjectType union
  
src/renderer/components/canvas/widgets/youtube-widget.tsx [NEW]
  ↳ Main widget component with iframe embedding
  ↳ Double-click editing, URL validation

src/renderer/components/canvas/youtube-url-dialog.tsx [NEW]
  ↳ Modal dialog for entering YouTube URLs
  ↳ Real-time validation, keyboard shortcuts
  
src/renderer/components/canvas/canvas-object.tsx
  ↳ Added youtube case to dispatcher
  
src/renderer/components/canvas/infinite-canvas.tsx
  ↳ Added youtube case to handleCanvasBackgroundClick
  ↳ Dialog state management and handlers
  
src/renderer/components/canvas/canvas-toolbar.tsx
  ↳ Added YouTube tool button (📺, shortcut Y)
  
src/renderer/hooks/use-canvas-tool.ts
  ↳ Added 'Y' keyboard shortcut
```

### Type Definition
```typescript
interface YouTubeVideoObject {
  id: string
  type: 'youtube'
  x: number
  y: number
  width: number
  height: number
  z_index: number
  object_data: {
    videoUrl: string    // Full YouTube URL
    videoId: string     // Extracted video ID
    title?: string      // Display title
  }
  created: string
  updated: string
}
```

### URL Validation
The widget uses regex patterns to extract video IDs from various YouTube URL formats:
```typescript
const patterns = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
  /youtube\.com\/watch\?.*v=([^&\n?#]+)/
]
```

## Design Philosophy

### Why Red Header Bar?
- **Visual distinction** - Clearly marks it as a video widget
- **Drag affordance** - Obvious grip area (vs dragging video content)
- **Matches YouTube brand** - Red is YouTube's primary color

### Why Double-Click to Edit?
- **Prevents accidental changes** - Single click would conflict with dragging
- **Intuitive** - Common pattern (like file renaming in OS)
- **Clear feedback** - Input field with validation appears

### Why Lock Aspect Ratio?
- **Preserves video quality** - YouTube videos are 16:9
- **Prevents distortion** - Locked ratio ensures proper playback
- **User expectation** - Videos shouldn't stretch

## Future Enhancements

### Potential Features
- [ ] **Timestamp linking** - Start at specific time (`?t=120s`)
- [ ] **Playlist support** - Embed full playlists
- [ ] **Thumbnail preview** - Show thumbnail when paused
- [ ] **Custom controls** - Play/pause buttons on widget
- [ ] **Video metadata** - Auto-fetch title from YouTube API
- [ ] **Loop option** - Repeat video automatically

### Properties Panel Ideas
```
┌─────────────────────────┐
│ YouTube Video           │
├─────────────────────────┤
│ Video URL               │
│ [input field]           │
│                         │
│ ☐ Auto-play             │
│ ☐ Show controls         │
│ ☐ Loop video            │
│                         │
│ Start time: [00:00]     │
└─────────────────────────┘
```

## Testing

### Test Cases
1. ✅ Create video with valid URL
2. ✅ Create video with invalid URL (shows error)
3. ✅ Edit video URL (double-click header)
4. ✅ Resize while maintaining aspect ratio
5. ✅ Drag video to new position
6. ✅ Cancel editing with Escape
7. ✅ Confirm editing with Enter
8. ✅ Placeholder state when no URL

### URL Format Tests
```
✅ https://youtube.com/watch?v=dQw4w9WgXcQ
✅ https://youtu.be/dQw4w9WgXcQ
✅ https://youtube.com/embed/dQw4w9WgXcQ
✅ https://youtube.com/watch?v=dQw4w9WgXcQ&t=120s
❌ https://youtube.com (no video ID)
❌ https://vimeo.com/123456 (wrong platform)
```

## Lessons Learned

### What Worked Well
- **WidgetWrapper pattern** - Made implementation simple (~160 lines)
- **Type safety** - Caught errors early with YouTubeVideoObject interface
- **Prompt for URL** - Simple and effective (can enhance with modal later)
- **Locked aspect ratio** - Prevents user frustration with distorted videos

### Challenges Overcome
- **Type compatibility** - Fixed by using `Partial<DrawingObject>` in props
- **Prop naming** - Used `lockAspectRatio` (not `maintainAspectRatio`)
- **Min dimensions** - Calculated 16:9 minimum (280x158) to avoid tiny videos

## Related Documentation
- See [TOOLS.md](.github/TOOLS.md) for general tool system guide
- See [STICKY-NOTE-GUIDE.md](.github/STICKY-NOTE-GUIDE.md) for widget pattern reference
- See [ARCHITECTURE.md](ARCHITECTURE.md) for overall codebase structure
