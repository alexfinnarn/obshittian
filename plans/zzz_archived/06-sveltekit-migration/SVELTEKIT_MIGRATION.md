# SvelteKit Migration Plan

Migrate from plain Svelte + Vite to SvelteKit to gain server-side file operations, routing, and simplified testing.

## Goals

1. Replace File System Access API with server-side Node.js `fs` operations
2. Enable path-based vault selection (text input instead of OS picker)
3. Add routing infrastructure for future pages (settings, etc.)
4. Simplify testing by removing browser API mocking

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 01 | Project setup and SvelteKit initialization | Completed |
| 02 | File system API routes | Completed |
| 03 | File service abstraction layer | Completed |
| 04 | Vault picker and configuration | Pending |
| 05 | Component updates | Pending |
| 06 | Testing infrastructure | Pending |

## Background

The current app uses the browser's File System Access API (`showDirectoryPicker()`, `FileSystemDirectoryHandle`) to read/write files. This approach has limitations:

- **Testing complexity**: Requires complex mocking of browser APIs and OS dialogs
- **Browser support**: Only works in Chromium browsers (Chrome, Edge)
- **Permission UX**: Users must re-grant permission on each session
- **No server capabilities**: Can't add features requiring backend (sync, auth, etc.)

SvelteKit provides:
- Server routes with Node.js `fs` access via path strings
- File-based routing for multiple pages
- Adapter flexibility (node, static, vercel, etc.)
- Same Svelte 5 component model (minimal migration friction)

## Architecture Change

```
BEFORE (Browser File System Access API):
┌─────────────────────────────────────────────────┐
│ Browser                                         │
│  ┌─────────────┐    ┌─────────────────────────┐ │
│  │ Components  │───▶│ FileSystemDirectoryHandle│ │
│  └─────────────┘    └─────────────────────────┘ │
│                              │                   │
│                              ▼                   │
│                     OS File Picker               │
└─────────────────────────────────────────────────┘

AFTER (SvelteKit with Server Routes):
┌─────────────────────────────────────────────────┐
│ Browser                                         │
│  ┌─────────────┐    ┌─────────────────────────┐ │
│  │ Components  │───▶│ fileService (fetch)     │ │
│  └─────────────┘    └─────────────────────────┘ │
└───────────────────────────│─────────────────────┘
                            │ HTTP
┌───────────────────────────▼─────────────────────┐
│ SvelteKit Server                                │
│  ┌─────────────────────────┐    ┌────────────┐  │
│  │ /api/files/* routes     │───▶│ Node.js fs │  │
│  └─────────────────────────┘    └────────────┘  │
└─────────────────────────────────────────────────┘
```

## Deliverables

- SvelteKit project structure with adapter-node
- Server API routes for file operations (`/api/files/*`)
- `fileService` abstraction layer
- Path-based vault picker component
- Updated test infrastructure
- Routing for future pages

## Future Work (Out of Scope)

- Authentication/multi-user support
- Cloud sync features
- Mobile/PWA enhancements
- Database integration
