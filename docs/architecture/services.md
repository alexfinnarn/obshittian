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
- **Has side effects** (file I/O, events, persistence)
- **Stateless** - services don't hold state, they operate on stores

### Not a Service

- Pure functions that transform data → `utils/`
- Single-concern state management → `stores/`
- UI-specific logic → component

## Existing Services

### fileOpen.ts

Handles loading and opening files in panes/tabs.

**Location:** `src/lib/services/fileOpen.ts`

#### Functions

| Function | Purpose |
|----------|---------|
| `loadFile(relativePath)` | Load file content and handles by path |
| `openFileInTabs(path, openInNewTab)` | Open file in left pane tabs |
| `openFileInSinglePane(path, pane)` | Open file in specified pane |
| `openDailyNote(date)` | Create/open daily note in right pane |

#### Dependencies

- **Stores:** `vault`, `editor`, `tabs`
- **Utilities:** `dailyNotes`, `eventBus`
- **Types:** `Tab`, `PaneId`

#### Usage

```typescript
import { openFileInTabs, openDailyNote } from '$lib/services/fileOpen';

// Open file in tabs (left pane)
await openFileInTabs('notes/todo.md', true);  // new tab
await openFileInTabs('notes/todo.md', false); // replace current

// Open daily note (right pane)
await openDailyNote(new Date());
```

#### Behavior Notes

- `openFileInTabs` checks for existing tabs before opening
- `openDailyNote` creates the file if it doesn't exist
- `openDailyNote` emits `file:created` and `tree:refresh` for new files

---

### fileSave.ts

Handles saving files with tag index updates.

**Location:** `src/lib/services/fileSave.ts`

#### Functions

| Function | Purpose |
|----------|---------|
| `saveFile(pane)` | Save file in specified pane ('left' or 'right') |

#### Internal Functions

| Function | Purpose |
|----------|---------|
| `saveLeftPane()` | Save active tab (tabs mode) |
| `saveRightPane()` | Save right pane file (single mode) |

#### Dependencies

- **Stores:** `editor`, `tabs`
- **Utilities:** `fileOperations`, `tags`

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
    ├─ writeToFile()
    │
    ├─ markClean() in store
    │
    └─ updateFileInIndex() → update tag index
```

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
if (!vault.rootDirHandle) {
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

## Future Service Candidates

These patterns in the codebase could benefit from service extraction:

| Service | Source | Rationale |
|---------|--------|-----------|
| `fileOperationsService` | FileTree.svelte | Create/rename/delete with events, path resolution |
| `keyboardService` | App.svelte | Shortcut matching and dispatch logic |
| `errorService` | Scattered | Centralized error handling and user feedback |
| `tagIndexService` | tags.ts + App.svelte | Coordinate index building, updates, persistence |

### fileOperationsService Example

Currently in FileTree.svelte (200+ lines of mixed UI/business logic):

```typescript
// Could become:
import { createFile, renameFile, deleteFile } from '$lib/services/fileOperations';

await createFile(parentDir, 'newfile.md');
await renameFile(dir, 'old.md', 'new.md');
await deleteFile(dir, 'file.md');
```

Each would handle:
- File system operation
- Path resolution
- Event emission (`file:created`, `file:renamed`, `file:deleted`)
- Error handling with user feedback
