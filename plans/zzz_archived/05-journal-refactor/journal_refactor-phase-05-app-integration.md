# Phase 05: App Integration

**Status:** Pending
**Output:** Updated `App.svelte`

## Objective

Integrate the JournalPane component into the main application, replacing the TodoList and right pane EditorPane.

## Tasks

- [ ] Remove TodoList import and component from App.svelte
- [ ] Remove todo-related imports (`loadTodos`, `loadShowCompleted`, `resetTodos`)
- [ ] Remove todo loading from `onVaultOpened()`
- [ ] Import JournalPane component
- [ ] Import journal store functions
- [ ] Replace right pane structure with JournalPane
- [ ] Update `handleDateSelect()` to load journal entries
- [ ] Add `scanDatesWithEntries()` call to `onVaultOpened()`
- [ ] Review/update keyboard shortcuts for daily navigation

## Content Outline

### Imports to Remove

```typescript
// Remove these:
import TodoList from '$lib/components/TodoList.svelte';
import { loadTodos, loadShowCompleted, resetTodos } from '$lib/stores/todos.svelte';
```

### Imports to Add

```typescript
import JournalPane from '$lib/components/JournalPane.svelte';
import {
  loadEntriesForDate,
  scanDatesWithEntries,
  setSelectedDate,
} from '$lib/stores/journal.svelte';
```

### onVaultOpened() Changes

```typescript
async function onVaultOpened() {
  isRestoringVault = false;
  if (!vault.rootDirHandle) return;

  // Load vault config
  await loadVaultConfig(vault.rootDirHandle, {
    quickLinks: settings.defaultQuickLinks,
    quickFiles: settings.defaultQuickFiles,
  });

  // REMOVE: Todo loading
  // loadShowCompleted();
  // await loadTodos();

  // ADD: Scan for journal files (for calendar indicators)
  await scanDatesWithEntries();

  // Initialize tag index
  await initializeTagIndex();

  // Restore tabs
  await restoreTabs();

  // Open today's journal if configured
  if (settings.autoOpenTodayNote) {
    await loadEntriesForDate(new Date());
  }
}
```

### handleDateSelect() Changes

```typescript
function handleDateSelect(date: Date) {
  // REMOVE: emit('dailynote:open', { date });

  // ADD: Load journal entries directly
  loadEntriesForDate(date);
}
```

### Template Changes

```svelte
<!-- BEFORE -->
<div class="pane right-pane" style="flex: {100 - leftPaneWidthPercent}">
  <TodoList />
  <div class="right-pane-editor">
    <EditorPane
      pane="right"
      mode="single"
      filename={editor.right.fileHandle?.name ?? ''}
      content={editor.right.content}
      isDirty={editor.right.isDirty}
      oncontentchange={handleRightContentChange}
    />
  </div>
</div>

<!-- AFTER -->
<div class="pane right-pane" style="flex: {100 - leftPaneWidthPercent}">
  <JournalPane />
</div>
```

### CSS Changes

```css
/* Remove .right-pane-editor styles if no longer needed */

/* Keep .right-pane styles as-is */
.right-pane {
  /* JournalPane will fill this space */
}
```

### Keyboard Shortcuts Review

The existing calendar navigation shortcuts should still work:
- `Cmd+ArrowLeft` - Previous day
- `Cmd+ArrowRight` - Next day
- `Cmd+ArrowUp` - Previous week
- `Cmd+ArrowDown` - Next week

These emit `calendar:navigate` events that the Calendar component handles, which then calls `onselect` with the new date. This flow should continue to work with the new `handleDateSelect()` implementation.

### Event Cleanup

Remove or update `dailynote:open` event handling:
- The event listener in `onMount` can be removed
- Or kept if other parts of the app might still emit it

## Dependencies

- Phase 02: Journal Store (all store functions)
- Phase 03: Journal Components (JournalPane)
- Phase 04: Calendar Integration (dates prop)

## Acceptance Criteria

- [ ] App compiles without errors after changes
- [ ] TodoList component no longer rendered
- [ ] JournalPane renders in right pane
- [ ] Clicking calendar date loads journal entries
- [ ] Keyboard navigation (Cmd+Arrow) works for dates
- [ ] Today's journal loads on vault open (if configured)
- [ ] Calendar shows indicators for dates with entries
- [ ] No references to todo imports remain in App.svelte
