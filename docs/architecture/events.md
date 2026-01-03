# Events

The event bus provides decoupled communication between components using a typed publish/subscribe pattern. It's used when prop drilling would be cumbersome or when multiple unrelated components need to react to the same action.

## Architecture Layer

```
┌─────────────────────────────────────────────┐
│  Components (UI + event handlers)           │  ← Emit and subscribe
├─────────────────────────────────────────────┤
│  Services (orchestration, side effects)     │  ← Emit after operations
├─────────────────────────────────────────────┤
│  Stores (reactive state)                    │
├─────────────────────────────────────────────┤
│  Utilities (pure functions)                 │  ← Some emit (tags.ts)
└─────────────────────────────────────────────┘
```

## API

**Location:** [src/lib/utils/eventBus.ts](../../src/lib/utils/eventBus.ts)

```typescript
import { on, emit } from '$lib/utils/eventBus';

// Subscribe (returns unsubscribe function)
const unsubscribe = on('file:open', (data) => {
  console.log('Opening:', data.path);
});

// Emit
emit('file:open', { path: 'notes/todo.md', pane: 'left' });

// Cleanup
unsubscribe();
```

| Function | Purpose |
|----------|---------|
| `on(event, callback)` | Subscribe to event, returns unsubscribe function |
| `emit(event, data)` | Emit event with typed payload |
| `off(event, callback)` | Manually unsubscribe (prefer using returned function) |
| `clear()` | Remove all listeners (for testing) |

## Event Catalog

All events are defined in the `AppEvents` interface for type safety.

### File Events

| Event | Payload | Purpose |
|-------|---------|---------|
| `file:open` | `{ path, pane?, openInNewTab? }` | Request to open a file |
| `file:save` | `{ pane: 'left' \| 'right' }` | Request to save a pane |
| `file:created` | `{ path }` | Notification that file was created |
| `file:renamed` | `{ oldPath, newPath }` | Notification that file was renamed |
| `file:deleted` | `{ path }` | Notification that file was deleted |

### Pane Events

| Event | Payload | Purpose |
|-------|---------|---------|
| `pane:toggleView` | `{ pane: 'left' \| 'right' }` | Toggle view mode (edit/preview) for a pane |

### Journal Events

| Event | Payload | Purpose |
|-------|---------|---------|
| `dailynote:open` | `{ date: Date }` | Request to open daily note (deprecated, use journalStore) |
| `journal:scrollToEntry` | `{ date: string, entryId: string }` | Navigate to specific journal entry |

### Other Events

| Event | Payload | Purpose |
|-------|---------|---------|
| `tree:refresh` | `void` | Request FileTree to reload entries |
| `modal:open` | `{ id }` | Open modal by ID |
| `modal:close` | `{ id }` | Close modal by ID |
| `tags:reindex` | `ReindexEventData` | Notification of tag index changes |

## Event Sources and Handlers

### file:open

Opens a file in the specified pane.

```
Emitters                          Handler
─────────────────────────────────────────────────────
FileTreeItem.svelte          ─┐
FileTree.svelte               │
QuickFiles.svelte             ├──► +page.svelte (onMount)
TagSearch.svelte             ─┘
```

**Handler behavior:** Calls `openFileInTabs()` or `openFileInSinglePane()` service based on `pane` parameter.

### file:save

Saves the file in the specified pane.

```
Emitters                          Handler
─────────────────────────────────────────────────────
EditorPane.svelte            ─┐
shortcutHandlers.ts           ├──► +page.svelte (onMount)
                             ─┘
```

**Handler behavior:** Calls `saveFile(pane)` service.

### file:renamed / file:deleted

Notifies of file operations for tag index updates.

```
Emitters                          Handler
─────────────────────────────────────────────────────
FileTree.svelte (renamed)    ──► +page.svelte → renameFileInIndex()
FileTree.svelte (deleted)    ──► +page.svelte → removeFileFromIndex()
```

### tree:refresh

Tells FileTree to reload its entries.

```
Emitters                          Handler
─────────────────────────────────────────────────────
fileOpen.ts                  ───► FileTree.svelte
```

### tags:reindex

Notifies components that the tag index changed.

```
Emitters                          Subscribers
─────────────────────────────────────────────────────
tags.ts (updateFileInIndex,  ───► Components displaying tag data
         removeFileFromIndex,
         renameFileInIndex)
```

**Payload:** Includes `type` ('full' | 'update' | 'remove' | 'rename'), affected files/tags, and metadata.

### pane:toggleView

Toggles between edit and preview mode for a specific pane.

```
Emitters                          Handler
─────────────────────────────────────────────────────
shortcutHandlers.ts          ───► EditorPane.svelte
```

**Handler behavior:** EditorPane listens and toggles its internal view mode state.

### journal:scrollToEntry

Navigates to a specific journal entry from tag search results.

```
Emitters                          Handler
─────────────────────────────────────────────────────
TagSearch.svelte             ───► +page.svelte (onMount)
```

**Handler behavior:** Loads entries for the date, then scrolls to the specific entry element.

## Event Flow Diagrams

### File Open Flow

```
User clicks file in tree
         │
         ▼
FileTreeItem.svelte
         │
         ▼
emit('file:open', { path, pane: 'left' })
         │
         ▼
+page.svelte handler
         │
         ▼
openFileInTabs(path)
         │
         ├─► loadFile(path)
         │         │
         │         ▼
         │   fileService.readFile()
         │
         ├─► addTab()
         │
         └─► (if new file)
                   │
                   ▼
             emit('file:created')
                   │
                   ▼
             updateFileInIndex()
```

### File Save Flow

```
User presses Cmd+S
         │
         ▼
shortcut action → handleSave()
         │
         ▼
emit('file:save', { pane })
         │
         ▼
+page.svelte handler
         │
         ▼
saveFile(pane)  [fileSave.ts service]
         │
         ├─► Get content from store
         │
         ├─► fileService.writeFile()
         │
         ├─► markClean() in store
         │
         └─► updateFileInIndex()
                   │
                   ▼
             emit('tags:reindex', { type: 'update' })
```

### File Delete Flow

```
User selects Delete in context menu
         │
         ▼
FileTree.svelte
         │
         ▼
confirm() dialog
         │
         ▼
fileService.deleteFile()
         │
         ▼
emit('file:deleted', { path })
         │
         ▼
+page.svelte handler
         │
         ├─► removeFileFromIndex()
         │         │
         │         ▼
         │   emit('tags:reindex', { type: 'remove' })
         │
         └─► emit('tree:refresh')
                   │
                   ▼
             FileTree.svelte handler
                   │
                   ▼
             loadEntries()
```

### Journal Entry Navigation Flow

```
User clicks journal entry in TagSearch
         │
         ▼
TagSearch.svelte
         │
         ▼
emit('journal:scrollToEntry', { date, entryId })
         │
         ▼
+page.svelte handler
         │
         ├─► loadEntriesForDate(date)
         │
         └─► setTimeout → scrollIntoView()
```

## When to Use Events

```
Should I use an event?

Is this parent-child communication?
  └─ YES → Use props and callbacks
  └─ NO  → Continue...

Does the caller need an immediate result?
  └─ YES → Use direct function call
  └─ NO  → Continue...

Do multiple unrelated components need to react?
  └─ YES → Use events
  └─ NO  → Continue...

Should the emitter be decoupled from handlers?
  └─ YES → Use events
  └─ NO  → Use direct function call
```

### Use Events When

- **Cross-boundary communication**: FileTree notifying App.svelte of file operations
- **Multiple handlers**: `tags:reindex` can be consumed by any component showing tag data
- **Decoupling**: QuickFiles doesn't need to know how file opening works
- **Broadcast notifications**: `tree:refresh` tells FileTree to reload without caller knowing implementation

### Use Direct Calls When

- **Parent-child**: Pass callbacks via props
- **Service coordination**: Services call other services directly
- **Need return value**: `loadFile()` returns content, not via event
- **Single handler**: If only one place handles it, direct call is simpler

## Subscription Patterns

### Basic Pattern (Svelte Component)

```typescript
import { onMount } from 'svelte';
import { on } from '$lib/utils/eventBus';

onMount(() => {
  const unsubscribe = on('file:open', handleFileOpen);
  return unsubscribe; // Cleanup on unmount
});
```

### Multiple Subscriptions

```typescript
onMount(() => {
  const unsub1 = on('file:open', handleOpen);
  const unsub2 = on('file:save', handleSave);
  const unsub3 = on('file:deleted', handleDelete);

  return () => {
    unsub1();
    unsub2();
    unsub3();
  };
});
```

### With Typed Payload

```typescript
import type { AppEvents } from '$lib/utils/eventBus';

on('file:open', (data: AppEvents['file:open']) => {
  const { path, pane, openInNewTab } = data;
  // TypeScript knows the shape
});
```

## Type Safety

Events are typed via the `AppEvents` interface:

```typescript
// src/lib/utils/eventBus.ts
export interface AppEvents {
  'file:open': { path: string; pane?: 'left' | 'right'; openInNewTab?: boolean };
  'file:save': { pane: 'left' | 'right' };
  'file:created': { path: string };
  'file:renamed': { oldPath: string; newPath: string };
  'file:deleted': { path: string };
  'dailynote:open': { date: Date };
  'tree:refresh': void;
  'modal:open': { id: string };
  'modal:close': { id: string };
  'tags:reindex': ReindexEventData;
  'pane:toggleView': { pane: 'left' | 'right' };
  'journal:scrollToEntry': { date: string; entryId: string };
}
```

### Adding a New Event

1. Add the event type to `AppEvents` interface
2. Use `emit()` with the correct payload shape
3. Subscribe with `on()` - TypeScript will enforce the type

```typescript
// 1. Add to interface
interface AppEvents {
  // ... existing events
  'settings:changed': { key: string; value: unknown };
}

// 2. Emit
emit('settings:changed', { key: 'theme', value: 'dark' });

// 3. Subscribe (type-checked)
on('settings:changed', (data) => {
  console.log(data.key, data.value); // TypeScript knows the shape
});
```

## Testing

Use `clear()` to reset event bus state between tests:

```typescript
import { on, emit, clear } from '$lib/utils/eventBus';

beforeEach(() => {
  clear();
});

it('should emit file:open', () => {
  const callback = vi.fn();
  on('file:open', callback);

  emit('file:open', { path: 'test.md', pane: 'left' });

  expect(callback).toHaveBeenCalledWith({ path: 'test.md', pane: 'left' });
});
```
