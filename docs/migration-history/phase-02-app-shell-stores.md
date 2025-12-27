# Phase 2: App Shell & Stores

## Goal
Create the App.svelte layout shell with sidebar and main content areas. Implement global stores using Svelte 5 runes for vault state and settings. Port filesystem utilities.

## Prerequisites
- Phase 1 complete (Svelte 5 + TypeScript project set up)
- Node 22+ recommended, and was installed using `asdf` after phase 1. The `.tool-versions` file 
  in the root reflects the node version used, currently `22.21.1`

## Tasks

### 2.1 Create Layout Shell (App.svelte)

Replace placeholder App.svelte with the actual layout structure:

```svelte
<!-- App.svelte -->
<script lang="ts">
  // Layout with sidebar + dual-pane editor area
</script>

<div class="app" data-testid="app-container">
  <aside class="sidebar" data-testid="sidebar">
    <!-- Calendar, QuickLinks, QuickFiles, FileTree will go here -->
    <p>Sidebar placeholder</p>
  </aside>

  <main class="editor-area" data-testid="editor-area">
    <div class="pane left-pane" data-testid="left-pane">
      <p>Left pane (working documents)</p>
    </div>
    <div class="pane-divider" data-testid="pane-divider"></div>
    <div class="pane right-pane" data-testid="right-pane">
      <p>Right pane (daily notes)</p>
    </div>
  </main>
</div>
```

Add basic layout styles (flexbox, full height).

### 2.2 Create Vault Store

Create `src/lib/stores/vault.svelte.ts`:

```typescript
// Svelte 5 runes-based store for vault state
// Tracks: root directory handle, config, open state

export interface VaultState {
  rootDirHandle: FileSystemDirectoryHandle | null;
  dailyNotesFolder: string;
  syncDirectory: string;
}

// Using Svelte 5 runes ($state at module level)
export const vault = $state<VaultState>({
  rootDirHandle: null,
  dailyNotesFolder: 'zzz_Daily Notes',
  syncDirectory: 'zzzz_exports',
});

// Derived state
export const isVaultOpen = $derived(vault.rootDirHandle !== null);
```

**Note:** Module-level `$state` requires specific Svelte 5 syntax. Research current best practice.

### 2.3 Create Settings Store

Create `src/lib/stores/settings.svelte.ts`:

```typescript
// User preferences store
export interface Settings {
  autoOpenLastDirectory: boolean;
  autoOpenTodayNote: boolean;
  restoreLastOpenFile: boolean;
  restorePaneWidth: boolean;
  syncTempLimit: number;
  quickFilesLimit: number;
}

export const settings = $state<Settings>({
  autoOpenLastDirectory: true,
  autoOpenTodayNote: true,
  restoreLastOpenFile: true,
  restorePaneWidth: true,
  syncTempLimit: 7,
  quickFilesLimit: 5,
});
```

### 2.4 Port Filesystem Utilities

Create `src/lib/utils/filesystem.ts`:

Port from vanilla JS (`js/persistence.js` and file operation helpers):

```typescript
// IndexedDB helpers for directory handle persistence
export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void>
export async function getDirectoryHandle(): Promise<FileSystemDirectoryHandle | null>

// localStorage helpers
export function saveLastOpenFile(path: string): void
export function getLastOpenFile(): string | null
export function savePaneWidth(width: number): void
export function getPaneWidth(): number | null

// File operations
export async function getOrCreateDirectory(
  parent: FileSystemDirectoryHandle,
  name: string
): Promise<FileSystemDirectoryHandle>

export async function readFileContent(
  fileHandle: FileSystemFileHandle
): Promise<string>

export async function writeFileContent(
  fileHandle: FileSystemFileHandle,
  content: string
): Promise<void>
```

### 2.5 Port Frontmatter Utilities

Create `src/lib/utils/frontmatter.ts`:

Port from `js/frontmatter.js`:

```typescript
export interface FrontmatterResult {
  raw: string;
  endIndex: number;
}

export function extractFrontmatterRaw(content: string): FrontmatterResult | null
export function parseFrontmatter(content: string): Record<string, unknown>
export function splitFrontmatter(content: string): { frontmatter: string; body: string }
export function getFrontmatterValue(content: string, key: string): string | null
export function updateFrontmatterKey(content: string, key: string, value: string): string
```

### 2.6 Add Types for File System Access API

Create `src/lib/types/filesystem.d.ts` or add to existing types:

The File System Access API types may need declaration since they're not standard in all TypeScript configurations.

```typescript
// Check if @types/wicg-file-system-access is needed
// Or declare minimal types inline
```

### 2.7 Write Tests

Create tests for:
- `filesystem.ts` - IndexedDB mocking, localStorage operations
- `frontmatter.ts` - Port existing tests from `tests/frontmatter.test.js`
- Stores - Basic state updates

### 2.8 Verify Integration

- App renders with layout structure
- Stores update correctly
- Utilities work with mocked filesystem APIs
- All tests pass

## File Structure After Phase 2

```
src/
├── App.svelte              # Layout shell
├── main.ts
├── app.css
└── lib/
    ├── stores/
    │   ├── vault.svelte.ts
    │   └── settings.svelte.ts
    ├── components/         # Empty (Phase 3)
    ├── actions/            # Empty (Phase 3)
    └── utils/
        ├── filesystem.ts
        ├── frontmatter.ts
        └── example.test.ts # From Phase 1
```

## Success Criteria

- [x] App.svelte renders sidebar + dual-pane layout
- [x] Vault store tracks directory handle state
- [x] Settings store holds user preferences
- [x] Filesystem utilities ported and typed
- [x] Frontmatter utilities ported and typed
- [x] Unit tests pass for utilities (66 tests)
- [x] `npm run check` passes (no TypeScript errors)
- [x] `npm run dev` shows layout structure

## Research Findings

1. **Svelte 5 module-level runes**: `$state` works at module level in `.svelte.ts` files. Export the `$state` object directly (not the variable). `$derived` CANNOT be exported - use getter functions instead (e.g., `export function getIsVaultOpen() { return vault.rootDirHandle !== null; }`).

2. **File System Access API types**: Built into TypeScript's DOM types - no additional package needed. Works out of the box.

3. **IndexedDB mocking in happy-dom**: happy-dom includes an IndexedDB implementation. Tests work without additional mocking. localStorage also works automatically.

4. **Vitest config**: Use `import { defineConfig } from 'vitest/config'` instead of `vite` when including test configuration.

## Notes

- Svelte 5 runes in tests require `.svelte.test.ts` extension so the Svelte compiler processes them
- When testing `$state` objects, use `toEqual` instead of `toBe` for comparisons since $state returns proxies
- File structure matches the plan: `src/lib/stores/`, `src/lib/utils/`
- Total: 66 passing tests across 5 test files
