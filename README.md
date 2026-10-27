# Kamui Browser

A Chromium-based browser with a **fully customizable shell** — every part of the UI (tabs, toolbar, New Tab page, Settings, History, Bookmarks, Downloads) is built with Next.js + React, styled after a local-first design system (purple brand, Figtree type, light/dark/auto modes, accent palettes, spring ease motion).

Built on Electron (same Chromium rendering engine as Chrome), completely local data, no telemetry.

## Run it

```bash
npm install   # first time only
npm start     # builds the UI once (next build), then launches the browser
```

`npm run dev` runs `next dev` on port 3451 plus Electron with hot reload of the UI (changes reflect via webview reload).

## Features

- Tabs — click to switch, middle-click or ✕ to close, drag to reorder, Ctrl+T / Ctrl+W / Ctrl+Tab / Ctrl+Shift+Tab
- Incognito — ⌘/Ctrl+Shift+N (or File menu / profile menu / Settings → Privacy): separate non-persistent session, no history writes
- Secure DNS (DoH) — Settings → Privacy: Cloudflare / Google / Quad9 / AdGuard presets or a custom `https://` resolver, applied on relaunch via Chromium field trials (`main.js` → `configureDns()`)
- Omnibox — type a URL or search (DuckDuckGo / Google / Bing / Brave / Startpage), inline suggestions from history + bookmarks
- Navigation — back / forward / reload / stop / home, loading bar, favicon + title per tab, status-bar link preview
- Bookmarks — star button, bookmarks bar, middle-click to open in new tab, full manager page
- History — full history page with search + clear, grouped by day
- Downloads — Chromium download integration, progress toast + badge, Downloads manager page ("Show in Folder")
- Find in page — Ctrl+F bar with match counter
- Zoom per tab — Ctrl+= / Ctrl+- / Ctrl+0
- DevTools — Ctrl+Alt+I, Inspect Element in right-click menu
- Site features — right-click menus, spellcheck, permissions, HTML5 fullscreen, window-open links become new Kamui tabs
- Menu bar — macOS uses the native system menu bar; Windows/Linux show an in-app menu strip, hidden until you press `Alt` (Chrome-style). Every menu item is registry-driven (`lib/shortcuts.js`) with editable shortcuts: Settings → Keyboard
- Split view — toggle a second pane (⌘/Ctrl+Shift+S) with its own toolbar, omnibox and navigation
- Frameless window with custom window controls
- Appearance — Light / Dark / Auto mode + accent palette, applied instantly across the shell, New Tab and every internal page

## Architecture

The Electron main process starts an in-process Next.js production server on `http://127.0.0.1:3451` and loads the shell from it. The browser chrome (Shell.tsx) manages `<webview>` elements; internal pages are Next routes served to those webviews over the same origin.

| What | Files |
|---|---|
| Main process (window, Next server, IPC, downloads, context menus, permissions) | `main.js` |
| Secure bridge for the shell | `chrome-preload.js` |
| Bridge for internal pages — origin-gated, only exposed on `127.0.0.1:3451` | `internal-preload.js` |
| Browser shell (tabs, toolbar, omnibox, bookmarks bar, find bar, menus) | `components/Shell.tsx` |
| Shared theme tokens, primitives, motion | `styles/globals.css` |
| Shortcut registry (native menus + menu strip + Settings editor) | `lib/shortcuts.js`, `lib/menus.ts` |
| Bridges + settings (`applyTheme`, `readSettings`) | `lib/bridge.ts` |
| Internal page bootstrap hook | `lib/internal.ts` |
| Internal pages — New Tab, Settings, History, Bookmarks, Downloads | `app/newtab/`, `app/settings/`, `app/history/`, `app/bookmarks/`, `app/downloads/` |
| Browser data (settings, history, bookmarks, downloads) | JSON in `~/Library/Application Support/kamui-browser/` |

### Theming

Design tokens live in `styles/globals.css`: `--brand` and accents (`data-accent` on `<html>`), light/dark via `data-theme`, `--ease` motion, primitives (`.btn`, `.field`, `.card`, `.menu-c`…). Settings → Appearance switches mode + accent instantly; settings are sanitized against known values on load.

## Debug helpers

```bash
KAMUI_URL=https://example.com npx electron .          # open a URL on boot
KAMUI_CAPTURE=/tmp/shell.png npx electron .           # screenshot the shell, then quit
KAMUI_INTERNAL_PAGE=settings npx electron .           # open an internal page after boot
KAMUI_FORCE_STRIP=1 npx electron .                    # force-show the menu strip (debug; also allows Alt toggle on macOS)
```

(The page helper: `newtab` | `settings` | `history` | `bookmarks` | `downloads`.)

## Roadmap ideas

Session restore, tab history thumbnails, drag-out windows, per-site permissions UI, extension-like user scripts.
