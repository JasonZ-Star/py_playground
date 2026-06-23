# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**枫下代码** (Fengxia Code) — a purely static Python online playground built on **Pyodide** (WebAssembly Python runtime) and **Monaco Editor** (VS Code's editor component). No build system, no server-side code. Everything runs in the browser.

## Running Locally

```bash
python -m http.server 5500
# or
npm run start
```

Then open `http://localhost:5500/`. **Must use a local HTTP server** — file:// protocol won't work due to Web Worker and WASM requirements.

## Architecture

### Core Files

- **`index.html`** (~158K) — the entire application in a single HTML file: Monaco initialization, Pyodide management, Jedi autocomplete, auto-package installation, code sharing, settings modal, theme toggling. This is where most UI logic lives.
- **`py-worker.js`** (~37K) — Web Worker that loads Pyodide, executes Python code, handles Jedi completions, auto-installs missing packages via micropip, mounts `data/` directory into Pyodide's virtual filesystem. Main thread never loads Pyodide directly.
- **`templates.js`** — code template library (template selector in editor UI).
- **`styles.css`** — extracted design system styles (glassmorphism, theme variables, responsive layout).
- **`share.html`** — share landing page (LZString decompression → redirect to main page with code).
- **`sw.js`** — Service Worker for basic caching and offline support.
- **`404.html`** — 404 page with glassmorphism styling.

### Runtime Architecture

```
Browser Main Thread (index.html)
  ├── Monaco Editor (CDN loaded, injected dynamically via loadMonaco())
  ├── UI controls / Settings modal
  └── communicates via postMessage() ──→
        Web Worker (py-worker.js)
          ├── Pyodide runtime (WASM, loaded from local pyodide/ or CDN)
          ├── Jedi (autocomplete engine, 10s timeout)
          ├── micropip (auto package installer)
          └── mounts data/ directory for CSV datasets
```

### Key Mechanisms

- **Pyodide loading**: Worker loads Pyodide from local `pyodide/` directory (offline-first). Falls back to CDN if missing.
- **Monaco loading**: Dynamically injected `<script>` for Monaco loader, with fallback CDN sources (jsdelivr → bootcdn). CSP meta tag must allow all CDN domains used.
- **Auto package install**: Scans user code for `import`/`from ... import` statements, auto-installs missing non-stdlib packages via `loadPackage()` or `micropip.install()`.
- **Jedi autocomplete**: Runs inside Pyodide with relaxed 10s timeout. After package install, triggers a warmup request for faster subsequent completions.
- **Code sharing**: LZString-compressed long URLs (cross-device, default) or short IDs (same browser, localStorage, 7-day expiry). Long URLs auto-fallback to short when exceeding 7800 chars.
- **Execution timeout**: 30s hard limit. True interrupt requires SharedArrayBuffer (COOP/COEP headers); current fallback is Worker restart.
- **data/ directory**: Sample datasets (CSV) mounted into Pyodide's virtual filesystem at runtime.

## Important Constraints

- **CSP (Content-Security-Policy)** is set in a `<meta>` tag in `index.html` — any new CDN domain or external resource must be added there.
- **Security restrictions at runtime**: `subprocess`, `os.system`, `eval/exec` are blocked in Pyodide execution.
- **No test suite** exists — validation is manual browser testing.
- **Pyodide and Monaco directories are gitignored** — they're large runtime dependencies not stored in the repo. Monaco loads from CDN; Pyodide from local or CDN.
- **scripts/ directory** contains one-off CSS fix scripts (not part of the build pipeline).

## Versioning

Version is tracked in both `package.json` (field `version`) and the CSS cache-busting query parameter on the stylesheet link in `index.html` (e.g., `styles.css?v=1.0.5`). Keep these in sync when bumping.
