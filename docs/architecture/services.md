# Services

Services orchestrate complex operations that coordinate multiple stores, utilities, and side effects. They sit between components and the lower-level utilities/stores.

## Architecture Layer

```
┌─────────────────────────────────────────────┐
│  Components (UI + event handlers)           │
├─────────────────────────────────────────────┤
│  Services (orchestration, side effects)     │  ← You are here
├─────────────────────────────────────────────┤
│  Stores (reactive state)                    │
├─────────────────────────────────────────────┤
│  Utilities (pure functions)                 │
└─────────────────────────────────────────────┘
```

## When to Create a Service

Use this decision tree:

```
Is it a pure function with no side effects?
  └─ YES → Put in utils/
  └─ NO  → Continue...

Does it coordinate multiple stores or emit events?
  └─ YES → Put in services/
  └─ NO  → Continue...

Is the same logic duplicated across multiple components?
  └─ YES → Put in services/
  └─ NO  → Keep in component or utils/
```

### Service Characteristics

- **Async operations** with try/catch error handling
- **Coordinates multiple concerns** (stores, utilities, events)
- **Has side effects** (file I/O via fileService, events, persistence)
- **Stateless** - services don't hold state, they operate on stores

### Not a Service

- Pure functions that transform data → `utils/`
- Single-concern state management → `stores/`
- UI-specific logic → component

## Existing Services

### fileService

The core abstraction for all file system operations. Communicates with server-side API routes to perform file I/O on the actual filesystem.

**Location:** `src/lib/services/fileService.ts`

#### Interface

```typescript
interface FileService {
  // Configuration
  setVaultPath(path: string): void;
  getVaultPath(): string | null;

  // File operations
  readFile(relativePath: string): Promise<string>;
  writeFile(relativePath: string, content: string): Promise<void>;
  deleteFile(relativePath: string): Promise<void>;
  createFile(relativePath: string, content?: string): Promise<void>;

  // Directory operations
  listDirectory(relativePath: string): Promise<DirectoryEntry[]>;
  createDirectory(relativePath: string): Promise<void>;
  deleteDirectory(relativePath: string, recursive?: boolean): Promise<void>;

  // General operations
  exists(relativePath: string): Promise<{ exists: boolean; kind?: 'file' | 'directory' }>;
  rename(oldPath: string, newPath: string): Promise<void>;
  stat(relativePath: string): Promise<{ kind: 'file' | 'directory'; size: number; modified: string; created: string }>;
}
```

#### Usage

```typescript
import { fileService } from '$lib/services/fileService';

// Set the vault path (required before any file operations)
fileService.setVaultPath('/path/to/vault');

// Read a file
const content = await fileService.readFile('notes/todo.md');

// Write a file
await fileService.writeFile('notes/todo.md', '# Updated content');

// Check if file exists
const { exists, kind } = await fileService.exists('notes/todo.md');

// List directory contents
const entries = await fileService.listDirectory('notes');
// Returns: [{ name: 'todo.md', kind: 'file' }, { name: 'archive', kind: 'directory' }]
```

#### Architecture

```
Component/Store
      │
      ▼
  fileService (client-side singleton)
      │
      ▼
  fetch() to /api/files/*
      │
      ▼
  SvelteKit API Routes (server-side)
      │
      ▼
  Node.js fs module (actual filesystem)
```

#### Error Handling

The service throws `FileServiceError` with status code, message, and optional error code:

```typescript
import { fileService, FileServiceError } from '$lib/services/fileService';

try {
  await fileService.readFile('nonexistent.md');
} catch (err) {
  if (err instanceof FileServiceError) {
    console.error(`Error ${err.status}: ${err.message} (${err.code})`);
  }
}
```

#### Server API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/files/read` | POST | Read file content |
| `/api/files/write` | POST | Write file content |
| `/api/files/create` | POST | Create file or directory |
| `/api/files/delete` | POST | Delete file or directory |
| `/api/files/list` | POST | List directory contents |
| `/api/files/exists` | POST | Check if path exists |
| `/api/files/rename` | POST | Rename/move file or directory |
| `/api/files/stat` | POST | Get file/directory metadata |
| `/api/vault/validate` | POST | Validate vault path |

---

### fileOpen.ts

Handles loading and opening files in panes/tabs.

**Location:** `src/lib/services/fileOpen.ts`

#### Functions

| Function | Purpose |
|----------|---------|
| `loadFile(relativePath)` | Load file content via fileService |
| `openFileInTabs(path, openInNewTab)` | Open file in left pane tabs |

#### Dependencies

- **Services:** `fileService`, `activityLogger`
- **Stores:** `vault`, `tabs`
- **Types:** `Tab`

#### Usage

```typescript
import { openFileInTabs } from '$lib/services/fileOpen';

// Open file in tabs (left pane)
await openFileInTabs('notes/todo.md', true);  // new tab
await openFileInTabs('notes/todo.md', false); // replace current
```

#### Behavior Notes

- `openFileInTabs` checks for existing tabs before opening
- Logs activity via `activityLogger`

---

### fileSave.ts

Handles saving files with tag index updates.

**Location:** `src/lib/services/fileSave.ts`

#### Functions

| Function | Purpose |
|----------|---------|
| `saveFile()` | Save the active tab file |

#### Dependencies

- **Services:** `fileService`
- **Stores:** `editor`, `tabs`
- **Utilities:** `tags`

#### Usage

```typescript
import { saveFile } from '$lib/services/fileSave';

// Save focused pane
await saveFile('left');  // saves active tab
await saveFile('right'); // saves right pane file
```

#### Save Flow

```
saveFile(pane)
    │
    ├─ Get content from store (tabs or editor)
    │
    ├─ fileService.writeFile()
    │
    ├─ markClean() in store
    │
    └─ updateFileInIndex() → update tag index
```

---

### shortcutHandlers.ts

Handler functions for keyboard shortcuts.

**Location:** `src/lib/services/shortcutHandlers.ts`

#### Functions

| Function | Purpose |
|----------|---------|
| `handleSave()` | Save focused pane or both if none focused |
| `handleToggleView()` | Emit `pane:toggleView` event |
| `handleCloseTab()` | Close current tab (left pane focused) |
| `handleNextTab()` | Switch to next tab |
| `handlePrevTab()` | Switch to previous tab |

#### Dependencies

- **Stores:** `editor`, `tabs`
- **Services:** `fileSave`
- **Utilities:** `eventBus`

## Service Patterns

### Error Handling

Services use try/catch with console.error for debugging:

```typescript
export async function myService(): Promise<void> {
  try {
    // ... operations
  } catch (err) {
    console.error('Operation failed:', err);
  }
}
```

### Vault Guard

Always check for open vault before file operations:

```typescript
import { vault } from '$lib/stores/vault.svelte';

if (!vault.path) {
  console.error('No vault open');
  return;
}
```

### Event Emission

Emit events after successful operations for cross-component communication:

```typescript
import { emit } from '$lib/utils/eventBus';

// After creating a file
emit('file:created', { path: relativePath });
emit('tree:refresh', undefined as unknown as void);
```

### Store Updates

Services update stores but don't hold state themselves:

```typescript
// Good: Update store directly
markTabClean(tabsStore.activeTabIndex, content);

// Bad: Service holding state
let savedFiles = []; // Don't do this
```

### Using fileService

All file operations go through the fileService singleton:

```typescript
import { fileService } from '$lib/services/fileService';

// Read
const content = await fileService.readFile('notes/todo.md');

// Write
await fileService.writeFile('notes/todo.md', content);

// Check existence
const { exists } = await fileService.exists('notes/todo.md');
```

## Testing Services

Services that use fileService should mock it:

```typescript
import { vi } from 'vitest';
import { fileService } from '$lib/services/fileService';

vi.mock('$lib/services/fileService', () => ({
  fileService: {
    setVaultPath: vi.fn(),
    getVaultPath: vi.fn(() => '/mock/vault'),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    exists: vi.fn(),
    createFile: vi.fn(),
    createDirectory: vi.fn(),
    deleteFile: vi.fn(),
    deleteDirectory: vi.fn(),
    listDirectory: vi.fn(),
    rename: vi.fn(),
    stat: vi.fn(),
  },
}));

const mockFileService = vi.mocked(fileService);

beforeEach(() => {
  vi.clearAllMocks();
});

it('should read file content', async () => {
  mockFileService.readFile.mockResolvedValue('file content');

  const content = await loadFile('test.md');

  expect(mockFileService.readFile).toHaveBeenCalledWith('test.md');
  expect(content).toBe('file content');
});
```
