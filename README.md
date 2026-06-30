# Thirty-Minute Brain

Local-first desktop memory for the last 30 minutes of work.

Thirty-Minute Brain is a Tauri + React app that helps you find things you just copied, opened, saved, or manually added. It is designed as a short-term memory cache, not a long-term note app.

## Current Features

- Timeline for the last 30 minutes, with a 24 hour view.
- Full-text search across title, content, path, URL, and note.
- Manual context events for text, links, and file paths.
- Clipboard text capture when enabled.
- Screenshot folder monitoring for `png`, `jpg`, `jpeg`, and `webp`.
- Sensitive content filtering before save.
- Pin events so they are not removed by retention cleanup.
- Edit event title and note.
- Delete one event, batch-delete through the API, clear all, or clear a time window.
- Context pack export as Markdown with AI, teammate handoff, bug report, and meeting templates.
- Local privacy status in Settings.
- Tauri tray menu and `Ctrl+Shift+Space` global shortcut.

## Privacy Boundary

The app is local-only by default.

It does not automatically read:

- Browser history
- Terminal history
- Chat app content
- Whole-file-system activity

Browser, VS Code, and terminal integrations are future opt-in sources. They should send only explicit current context into the local ingestion API.

Sensitive-looking content is skipped before persistence. The app stores the event title `敏感内容已跳过` and a non-secret reason such as `secret-keyword`, `credit-card`, or `openai-key`.

## Local Development

Install JavaScript dependencies:

```powershell
npm.cmd install
```

Run the browser preview:

```powershell
npm.cmd run dev
```

Run tests:

```powershell
npm.cmd test
```

Build the frontend:

```powershell
npm.cmd run build
```

## Tauri Native Requirements on Windows

Tauri desktop builds require:

- WebView2
- Rust/rustup/Cargo
- Visual Studio Build Tools 2022 with the C++ workload
- Windows SDK

Rust can be installed with:

```powershell
winget install --id Rustlang.Rustup -e --silent --accept-package-agreements --accept-source-agreements
```

Visual Studio Build Tools usually requires an elevated or interactive install:

```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --accept-package-agreements --accept-source-agreements
```

During installation, include the Desktop development with C++ workload, MSVC, and Windows SDK.

Run Tauri diagnostics:

```powershell
npm.cmd run tauri -- info
```

Run the desktop app:

```powershell
npm.cmd run tauri -- dev
```

Create a Windows build:

```powershell
npm.cmd run tauri -- build
```

## Architecture

- Frontend: React, TypeScript, Tailwind CSS, Vite
- Desktop shell: Tauri 2
- Persistence: SQLite through Rust `rusqlite`
- File watching: Rust `notify`
- Search: SQLite FTS5 with LIKE fallback
- Privacy filter: local regex and Luhn checks

