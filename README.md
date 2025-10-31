# What

**What** is a local-first visual thinking app — part drawing board, part mind map.
Sketch, link, and organize your ideas on an infinite canvas. Everything is saved in a single `.what` file.

## 📖 Documentation
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design, patterns & file structure
- **[CHECKLIST.md](./CHECKLIST.md)** - Development roadmap & progress (29% complete)

## Features

* Infinite, fast canvas for notes and drawings
* Local-first design — all data stays on your device
* `.what` file format powered by SQLite
* Lazy loading for media and assets
* Cross-platform support (Windows, macOS, Linux)

## Quick Start
```bash
pnpm install
pnpm dev
```

### Troubleshooting

If you encounter native module errors related to `better-sqlite3`:
```bash
# Rebuild native modules for Electron
pnpm run install:deps
```

This happens when switching Node.js versions or on first setup. The `predev` script now handles this automatically.

## File Format

A `.what` file is a custom container that includes:

* `main.db` — the SQLite database
* `/assets/` — raw images, videos, and other media
* `meta.json` — versioning and metadata