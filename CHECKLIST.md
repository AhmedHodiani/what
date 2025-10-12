# CHECKLIST

## Week 1: Foundation ✅ COMPLETE
- [x] Fix stale closure bug in `use-canvas-objects.ts` (line 115: use tabId dependency)
- [x] Add IPC handler cleanup (18 handlers in `main/windows/main.ts`)
- [x] Create `renderer/hooks/use-widget-resize.ts` (8 resize handles)
- [x] Create `renderer/components/canvas/widgets/widget-wrapper.tsx`
- [x] Create `renderer/components/canvas/widgets/widget-interface.ts`
- [x] Create `lib/utils/id-generator.ts`
- [x] Refactor `image-widget.tsx` (200→40 lines using WidgetWrapper)
- [x] Add `renderer/components/error-boundary.tsx`
- [x] Wrap objects in ErrorBoundary in `infinite-canvas.tsx`
- [x] Update `hooks/index.ts` exports

## Week 2: Widget System
- [x] Create `sticky-note-widget.tsx` using WidgetWrapper
- [x] Create `canvas-toolbar.tsx` with tool selection
- [x] Add `use-canvas-tool.ts` for creation flow
- [x] Integrate toolbar into canvas with keyboard shortcuts
- [x] Add sticky note creation on canvas click
- [x] Create `canvas-properties-panel.tsx` for sticky note customization
- [x] Test sticky note (create, edit, resize, drag, colors, save/load)
- [ ] Create `text-widget.tsx` using WidgetWrapper
- [ ] Create `shape-widget.tsx` using WidgetWrapper (rect, circle, ellipse, triangle, star)

## Week 3: Undo/Redo
- [ ] Create `lib/commands/command-interface.ts`
- [ ] Create command classes: `move-object-command.ts`, `resize-object-command.ts`, `create-object-command.ts`, `delete-object-command.ts`, `update-object-command.ts`
- [ ] Create `use-command-history.ts` hook
- [ ] Integrate commands into `use-canvas-objects.ts`
- [ ] Add undo/redo UI (buttons + Ctrl+Z/Ctrl+Y)
- [ ] Test all operations with undo/redo

## Week 4: Plugins & Polish
- [ ] Create `lib/plugins/object-plugin-registry.ts`
- [ ] Create plugin files: `image-plugin.ts`, `sticky-note-plugin.ts`, `text-plugin.ts`, `shape-plugin.ts`
- [ ] Update `canvas-object.tsx` to use plugin registry
- [ ] Create `lib/factories/drawing-object-factory.ts`
- [ ] Add type guards in `canvas-validators.ts`
- [ ] Create `use-auto-save.ts` hook (5min interval)
- [ ] Add file validation with magic number check
- [ ] Performance optimization & polish

## Progress: 17/34 tasks (50%)
