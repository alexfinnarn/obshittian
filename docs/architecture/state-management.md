# State Management

Stores hold reactive state using Svelte 5 runes. They sit between services (which orchestrate operations) and utilities (pure functions).

## Architecture Layer

```
┌─────────────────────────────────────────────┐
│  Components (UI + event handlers)           │
├─────────────────────────────────────────────┤
│  Services (orchestration, side effects)     │
├─────────────────────────────────────────────┤
│  Stores (reactive state)                    │  ← You are here
├─────────────────────────────────────────────┤
│  Utilities (pure functions)                 │
└─────────────────────────────────────────────┘
```

## Svelte 5 Runes Pattern

Stores use module-level `$state()` in `.svelte.ts` files. This enables reactive state that can be imported and mutated from anywhere.

```typescript
// src/lib/stores/example.svelte.ts

// Export the $state object directly
export const myStore = $state<MyState>({ value: 0 });

// $derived CANNOT be exported - use getter functions instead
export function getDerivedValue(): number {
  return myStore.value * 2;
}

// Mutation functions for complex updates
export function increment(): void {
  myStore.value += 1;
}
```

### Why Getter Functions?

Svelte 5's `$derived` cannot be exported from modules. The workaround is getter functions that compute values on access:

```typescript
// Won't work - $derived can't be exported
export const isOpen = $derived(vault.rootDirHandle !== null);

// Works - getter function
export function getIsVaultOpen(): boolean {
  return vault.rootDirHandle !== null;
}
```

## Store Catalog

| Store | File | Purpose | Persistence |
|-------|------|---------|-------------|
| `vault` | [vault.svelte.ts](../../src/lib/stores/vault.svelte.ts) | Root directory handle, vault paths | IndexedDB |
| `settings` | [settings.svelte.ts](../../src/lib/stores/settings.svelte.ts) | User preferences, shortcuts | localStorage |
| `vaultConfig` | [vaultConfig.svelte.ts](../../src/lib/stores/vaultConfig.svelte.ts) | Quick links/files | `.editor-config.json` |
| `editor` | [editor.svelte.ts](../../src/lib/stores/editor.svelte.ts) | Dual-pane state, focus tracking | None (session) |
| `tabsStore` | [tabs.svelte.ts](../../src/lib/stores/tabs.svelte.ts) | Left pane tabs | localStorage |
| `tagsStore` | [tags.svelte.ts](../../src/lib/stores/tags.svelte.ts) | Tag index, search state | localStorage |
| `todosStore` | [todos.svelte.ts](../../src/lib/stores/todos.svelte.ts) | Global todo list | `data/todos.json` |
| `shortcutsStore` | [shortcuts.svelte.ts](../../src/lib/stores/shortcuts.svelte.ts) | Shortcut blocking contexts | None (session) |

## Store Reference

### vault

Tracks the root directory handle and vault-level paths. The directory handle requires IndexedDB because it's a non-serializable object.

**State Shape:**
```typescript
interface VaultState {
  rootDirHandle: FileSystemDirectoryHandle | null;
  dailyNotesFolder: string;
}
```

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `getIsVaultOpen()` | Check if vault is open |
| `openVault(handle)` | Set root directory handle |
| `closeVault()` | Clear vault state |
| `updateVaultConfig(config)` | Update paths (dailyNotesFolder) |

**Persistence:** Directory handle saved to IndexedDB via [filesystem.ts](../../src/lib/utils/filesystem.ts) `saveDirectoryHandle()`. Called by `VaultPicker.svelte` after successful open.

---

### settings

User preferences with defaults from [config.ts](../../src/lib/config.ts). Supports deep merge for keyboard shortcuts.

**State Shape:**
```typescript
interface Settings {
  autoOpenLastDirectory: boolean;
  autoOpenTodayNote: boolean;
  restoreLastOpenFile: boolean;
  restorePaneWidth: boolean;
  quickFilesLimit: number;
  shortcuts: KeyboardShortcuts;
  dailyNotesFolder: string;
  defaultQuickLinks: QuickLink[];
  defaultQuickFiles: QuickFile[];
}
```

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `updateSettings(partial)` | Merge new settings (deep merge for shortcuts) |
| `resetSettings()` | Reset to defaults |
| `loadSettings()` | Load from localStorage on init |
| `saveSettings()` | Persist to localStorage |
| `getShortcut(name)` | Get a specific shortcut binding |

**Persistence:** localStorage key `editorSettings`. Loaded in `App.svelte` `onMount`.

---

### vaultConfig

Vault-specific configuration stored in the vault itself. Allows settings to travel with the vault (useful for synced folders).

**State Shape:**
```typescript
interface VaultConfig {
  quickLinks: QuickLink[];  // { name, url }
  quickFiles: QuickFile[];  // { name, path }
}
```

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `getQuickLinks()` / `setQuickLinks(links)` | Get/set quick links |
| `getQuickFiles()` / `setQuickFiles(files)` | Get/set quick files |
| `loadVaultConfig(handle?, defaults?)` | Load from `.editor-config.json` |
| `saveVaultConfig()` | Save to `.editor-config.json` |
| `resetVaultConfig()` | Clear to empty arrays |

**Persistence:** JSON file `.editor-config.json` in vault root. Auto-saved on `setQuickLinks`/`setQuickFiles`.

---

### editor

Session-only state for the dual-pane editor. Tracks file handles, content, dirty state, and focus.

**State Shape:**
```typescript
interface EditorState {
  left: PaneState;
  right: PaneState;
  focusedPane: 'left' | 'right' | null;
}

interface PaneState {
  fileHandle: FileSystemFileHandle | null;
  dirHandle: FileSystemDirectoryHandle | null;
  content: string;
  isDirty: boolean;
  relativePath: string;
}
```

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `openFileInPane(pane, fileHandle, dirHandle, content, path)` | Open file in pane |
| `updatePaneContent(pane, content)` | Update content (marks dirty) |
| `markPaneDirty(pane)` / `markPaneClean(pane, content?)` | Dirty state |
| `closePaneFile(pane)` | Clear pane |
| `setFocusedPane(pane)` / `getFocusedPane()` | Focus tracking |
| `isPaneFileOpen(pane)` | Check if pane has file |

**Persistence:** None. The right pane (daily notes) is transient. Left pane uses `tabsStore` for persistence.

---

### tabsStore

Manages multiple open files in the left pane with tab switching and dirty state.

**State Shape:**
```typescript
interface TabsState {
  tabs: Tab[];
  activeTabIndex: number;  // -1 when no tabs
}

// Tab interface in src/lib/types/tabs.ts
interface Tab {
  relativePath: string;
  filename: string;
  fileHandle: FileSystemFileHandle;
  dirHandle: FileSystemDirectoryHandle;
  savedContent: string;
  editorContent: string;
  isDirty: boolean;
}
```

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `getActiveTab()` | Get current tab or null |
| `addTab(tab)` | Add tab (switches if already open) |
| `replaceCurrentTab(tab)` | Replace current tab (single-click behavior) |
| `removeTab(index, skipConfirmation?)` | Close tab (prompts if dirty) |
| `switchTab(index)` | Switch to tab |
| `updateTabContent(index, content)` | Update editor content |
| `markTabDirty(index)` / `markTabClean(index, content)` | Dirty state |
| `findTabByPath(path)` | Find tab index by path |

**Constants:** `TAB_LIMIT = 5`

**Persistence:** localStorage key `editorLeftPaneTabs`. Stores `{ tabs: [{relativePath, filename}], activeIndex }`. Content reloaded from disk on restore.

---

### tagsStore

Tag index with staleness tracking. Supports incremental updates on file save/delete.

**State Shape:**
```typescript
interface TagsState {
  index: TagIndex;
  isIndexing: boolean;
  selectedTag: string | null;
  meta: TagIndexMeta;
}

interface TagIndex {
  files: Record<string, string[]>;  // path -> [tags]
  tags: Record<string, string[]>;   // tag -> [paths]
  allTags: TagEntry[];              // for Fuse.js search
}

interface TagIndexMeta {
  fileCount: number;
  tagCount: number;
  lastIndexed: number;  // timestamp
}
```

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `isIndexBuilt()` | Check if index has entries |
| `getFilesForTag(tag)` | Get files containing tag |
| `setTagIndex(index)` | Update index (from utils/tags.ts) |
| `resetTagIndex()` | Clear index |
| `setIndexing(bool)` / `getIsIndexing()` | Indexing state |
| `setSelectedTag(tag)` / `getSelectedTag()` | Selected tag for UI |
| `saveTagIndexToStorage()` / `loadTagIndexFromStorage()` | Persistence |
| `isTagIndexStale(maxAge?)` | Check if index needs rebuild |

**Persistence:** localStorage key `editorTagIndex`. Includes staleness check (default 24 hours).

---

### todosStore

Global todo list with Kanban-like status workflow. Stored in vault as user content (not configuration).

**State Shape:**
```typescript
interface TodosState {
  todos: Todo[];
  isLoading: boolean;
  showCompleted: boolean;
}

// Todo interface in src/lib/types/todos.ts
interface Todo {
  id: string;
  text: string;
  status: TodoStatus;  // 'new' | 'backlog' | 'todo' | 'in-progress' | 'in-review' | 'complete'
  createdAt: string;   // ISO timestamp
  updatedAt: string;   // ISO timestamp
}
```

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `getTodos()` | Get all todos |
| `getTodosByStatus(status)` | Filter by status |
| `getActiveTodos()` / `getCompletedTodos()` | Filter by completion |
| `getVisibleTodos()` | Respects showCompleted setting |
| `addTodo(text, status?)` | Add todo (auto-saves) |
| `removeTodo(id)` | Remove todo (auto-saves) |
| `updateTodoText(id, text)` | Update text (auto-saves) |
| `updateTodoStatus(id, status)` | Update status (auto-saves) |
| `loadTodos()` / `saveTodos()` | File persistence |
| `setShowCompleted(show)` / `loadShowCompleted()` | UI preference |
| `resetTodos()` | Clear state (for testing) |

**Status Workflow:**
```
New → Backlog → Todo → In Progress → In Review → Complete
```

**Persistence:**
- Todos stored in vault file `data/todos.json` (JSON with version field)
- `showCompleted` UI preference in localStorage key `todosShowCompleted`

**Design Decision:** Todos are stored in `data/` folder rather than root because they are user content, not application configuration. This keeps them separate from config files like `.editor-config.json`.

---

### shortcutsStore

Session-only store for blocking keyboard shortcuts during modal dialogs.

**State Shape:**
```typescript
interface ShortcutsState {
  blockedBy: Set<string>;  // Reasons for blocking (e.g., 'modal', 'context-menu')
}
```

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `blockShortcuts(reason)` | Block shortcuts, returns unblock function |
| `areShortcutsBlocked()` | Check if any blockers active |
| `getBlockingReasons()` | Get list of blocking reasons |
| `clearAllBlocks()` | Remove all blockers (testing) |

**Persistence:** None. Session-only state cleared on page reload.

## Persistence Strategies

```
When should I use...

IndexedDB?
└── Non-serializable objects (FileSystemDirectoryHandle)
└── Large data that exceeds localStorage limits

localStorage?
└── Simple JSON-serializable state
└── User preferences, UI state, caches
└── Data under ~5MB

File-based (.json in vault)?
└── Settings that should travel with the vault
└── User-editable configuration
└── Vault-specific (not app-wide) settings
```

| Strategy | Pros | Cons | Used By |
|----------|------|------|---------|
| IndexedDB | Handles non-serializable objects, larger storage | Async API, more complex | `vault` |
| localStorage | Simple, synchronous, widely supported | 5MB limit, strings only | `settings`, `tabs`, `tags` |
| File-based (config) | Portable, user-editable, version-controllable | Requires vault open, async | `vaultConfig` |
| File-based (data) | Content travels with vault, auto-saves | Requires vault open, async | `todos` |

## Store Interaction Patterns

### Components Read Stores Directly

```svelte
<script>
  import { vault } from '$lib/stores/vault.svelte';
  import { getIsVaultOpen } from '$lib/stores/vault.svelte';
</script>

<!-- Direct property access (reactive) -->
{#if vault.rootDirHandle}
  <FileTree />
{/if}

<!-- Getter function (also reactive in Svelte 5) -->
{#if getIsVaultOpen()}
  <span>Vault open</span>
{/if}
```

### Components Update via Store Functions

```typescript
import { updateSettings, saveSettings } from '$lib/stores/settings.svelte';

function handleChange() {
  updateSettings({ autoOpenTodayNote: true });
  saveSettings();
}
```

### Services Coordinate Multiple Stores

Services update multiple stores as part of a single operation. Example from [fileSave.ts](../../src/lib/services/fileSave.ts):

```typescript
// Save involves: tabs store (mark clean) + tags utility (update index)
await writeToFile(fileHandle, content);
markTabClean(tabsStore.activeTabIndex, content);
updateFileInIndex(relativePath, content);
```

### Data Flow

```
User Action
    │
    ▼
Component (event handler)
    │
    ├─► Simple update ──► Store function ──► State changes ──► UI re-renders
    │
    └─► Complex operation ──► Service ──► Multiple stores + side effects
```

## Testing Notes

### File Extension

Tests that import stores must use `.svelte.test.ts` extension for runes to work:

```
src/lib/stores/vault.svelte.test.ts  ✓
src/lib/stores/vault.test.ts         ✗ (runes won't compile)
```

### Proxy Object Comparison

`$state` returns proxy objects. Use `toEqual` for deep comparison:

```typescript
// Won't work - different proxy instances
expect(vault).toBe({ rootDirHandle: null, ... });

// Works - compares values
expect(vault).toEqual({ rootDirHandle: null, ... });
```

### Reset Functions

Each store provides a reset function for test isolation:

```typescript
import { resetTabsStore } from '$lib/stores/tabs.svelte';
import { resetEditorState } from '$lib/stores/editor.svelte';
import { resetTagIndex } from '$lib/stores/tags.svelte';
import { resetTodos } from '$lib/stores/todos.svelte';

beforeEach(() => {
  resetTabsStore();
  resetEditorState();
  resetTagIndex();
  resetTodos();
});
```
