# What

**What** is a local-first visual thinking app — part drawing board, part mind map.
Sketch, link, and organize your ideas on an infinite canvas. Everything is saved in a single `.what` file.

## Features

* Infinite, fast canvas for notes and drawings
* Local-first design — all data stays on your device
* `.what` file format powered by SQLite
* Lazy loading for media and assets
* Cross-platform support (Windows, macOS, Linux)

## File Format

A `.what` file is a custom container that includes:

* `main.db` — the SQLite database
* `/assets/` — raw images, videos, and other media
* `meta.json` — versioning and metadata