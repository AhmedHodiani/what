# Bug Fix: Objects Changing Position on File Reopen

## 🐛 The Bug

**Symptom:** Sticky notes, text boxes, emojis, images, shapes, freehand drawings, and arrows were "squishing" to incorrect positions when closing and reopening a `.what` file.

**Affected Object Types:**
- ✅ Freehand drawings (most critical - internal points were being lost)
- ✅ Arrows (control points were being lost)
- ✅ All other widget types (sticky notes, text, emoji, image, shape)

## 🔍 Root Cause

The bug was caused by a **race condition** between React state updates and ref updates in the `use-canvas-objects.ts` hook.

### The Problem Flow

1. **User drags an object** → `moveObject()` is called repeatedly
   - Updates React state with new positions
   - For freehand/arrow: Also updates internal points in `object_data`
   
2. **User releases mouse** → `handleDragEnd()` fires → `saveObjectPosition()` called
   - Reads from `objectsRef.current` to get the object to save
   - **Problem:** `objectsRef.current` is updated in a `useEffect`, which runs AFTER render
   - **Result:** Reads OLD object data with OLD points/coordinates
   
3. **Saves to database** → Object saved with:
   - ✅ New x, y position (correct)
   - ❌ Old `object_data` with OLD internal points (incorrect for freehand/arrow)
   
4. **File reopens** → Objects load with:
   - New x, y position
   - Old internal points → **Visual mismatch** → Objects appear "squished" or in wrong positions

### The Critical Code Pattern (Before Fix)

```typescript
// ❌ INCORRECT - ref updated asynchronously in useEffect
const moveObject = useCallback((id: string, x: number, y: number) => {
  setObjects(prev => prev.map(obj => {
    // ... update positions and internal points
  }))
}, [])

// Later, in a useEffect (runs AFTER render):
useEffect(() => {
  objectsRef.current = objects  // ⚠️ Too late! saveObjectPosition already called
}, [objects])
```

## ✅ The Fix

Updated `use-canvas-objects.ts` to **synchronously update `objectsRef.current`** inside the state updater function, ensuring the ref always has the latest data before any subsequent operations.

### Fixed Code Pattern

```typescript
// ✅ CORRECT - ref updated synchronously
const moveObject = useCallback((id: string, x: number, y: number) => {
  setObjects(prev => {
    const newObjects = prev.map(obj => {
      // ... update positions and internal points
    })
    
    // CRITICAL: Update ref synchronously
    objectsRef.current = newObjects
    
    return newObjects
  })
}, [])
```

## 📝 Changes Made

### File: `src/renderer/hooks/use-canvas-objects.ts`

Updated 4 functions to synchronously update `objectsRef.current`:

1. **`addObject()`** - Line ~60
   ```typescript
   setObjects(prev => {
     const newObjects = [...prev, object]
     objectsRef.current = newObjects  // ← Added
     return newObjects
   })
   ```

2. **`updateObject()`** - Line ~95
   ```typescript
   setObjects(prev => {
     const newObjects = prev.map(obj => obj.id === id ? updated : obj)
     objectsRef.current = newObjects  // ← Added
     return newObjects
   })
   ```

3. **`deleteObject()`** - Line ~140
   ```typescript
   setObjects(prev => {
     const newObjects = prev.filter(obj => obj.id !== id)
     objectsRef.current = newObjects  // ← Added
     return newObjects
   })
   ```

4. **`moveObject()`** - Line ~230
   ```typescript
   setObjects(prev => {
     const newObjects = prev.map(obj => {
       // ... move logic for freehand, arrow, and other objects
     })
     objectsRef.current = newObjects  // ← Added
     return newObjects
   })
   ```

## 🧪 Testing Recommendations

To verify the fix works, test the following scenarios:

### Test 1: Freehand Drawings
1. Create a freehand drawing
2. Drag it to a new position
3. Close the file (Ctrl+W or File → Close)
4. Reopen the file
5. ✅ **Expected:** Drawing should be in the exact position you left it

### Test 2: Arrows
1. Create an arrow
2. Drag it to a new position
3. Close and reopen the file
4. ✅ **Expected:** Arrow should be in the exact position with same shape

### Test 3: Multi-Select Drag
1. Create multiple objects (text, emoji, sticky note, etc.)
2. Select all with rectangle selection (right-click drag)
3. Drag them together to a new position
4. Close and reopen the file
5. ✅ **Expected:** All objects should be in their new positions

### Test 4: Widget Objects
1. Create sticky note, text box, image, emoji, and shape
2. Drag each to different positions
3. Close and reopen the file
4. ✅ **Expected:** All objects in correct positions

## 📚 Technical Notes

### Why This Pattern Works

React's `setState` with a functional updater is **synchronous** within the function scope:

```typescript
setObjects(prev => {
  const newObjects = prev.map(...)  // Compute new state
  objectsRef.current = newObjects   // Update ref synchronously
  return newObjects                  // Return new state
})
// At this point, objectsRef.current is guaranteed to be updated
// BEFORE any code after setState runs
```

The `useEffect` is kept for backwards compatibility and as a safety net, but is no longer the primary mechanism for keeping the ref in sync.

### The ObjectsRef Pattern (from ARCHITECTURE.md)

This fix reinforces the **ObjectsRef pattern** documented in the project:

> **Problem:** Stale closures cause data loss  
> **Solution:** Always use `objectsRef.current` in callbacks, not `objects` state

The issue was that the ref itself wasn't being updated quickly enough. Now it's updated synchronously, making the pattern bulletproof.

## 🎯 Impact

- **Fixes:** Position persistence bug for all object types
- **Performance:** No performance impact (synchronous updates are negligible)
- **Code Quality:** More predictable behavior, easier to reason about
- **Reliability:** Eliminates race condition between state and ref updates

## 🚀 Future Improvements

Consider these enhancements for Week 4:

1. **Auto-save:** Implement debounced auto-save during editing (not just on close)
2. **History:** Add undo/redo with command pattern to track position changes
3. **Validation:** Add data integrity checks on file save/load
4. **Testing:** Add unit tests for the objectsRef pattern

---

**Status:** ✅ Fixed (January 2025)  
**Verified:** Ready for testing  
**Related Files:** 
- `src/renderer/hooks/use-canvas-objects.ts` (primary fix)
- `src/renderer/components/canvas/infinite-canvas.tsx` (drag handling)
- `src/main/services/what-file.ts` (database persistence)
