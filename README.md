# What

**What** is a local-first visual thinking app — part drawing board, part mind map.
Sketch, link, and organize your ideas on an infinite canvas. Everything is saved in a single `.what` file.

## 📖 Documentation
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design, patterns & file structure
- **[CHECKLIST.md](./CHECKLIST.md)** - Development roadmap & progress (29% complete)
- **[.github/copilot-instructions.md](./.github/copilot-instructions.md)** - Critical gotchas & debugging

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

## File Format

A `.what` file is a custom container that includes:

* `main.db` — the SQLite database
* `/assets/` — raw images, videos, and other media
* `meta.json` — versioning and metadata