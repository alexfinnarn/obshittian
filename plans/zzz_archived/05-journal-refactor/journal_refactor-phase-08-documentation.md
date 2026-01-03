# Phase 08: Documentation

**Status:** Pending
**Output:** Updated `CLAUDE.md`

## Objective

Update project documentation to reflect the new journal system and removal of todos.

## Tasks

- [ ] Update CLAUDE.md file structure section
- [ ] Update stores documentation
- [ ] Update components documentation
- [ ] Update persistence section
- [ ] Update key behaviors section
- [ ] Remove all todo references
- [ ] Add journal-specific documentation

## CLAUDE.md Sections to Update

### File Structure

Update the `src/lib/` tree:

```markdown
lib/
  stores/
    ...
    journal.svelte.ts    - Journal entries state with file persistence
    # REMOVE: todos.svelte.ts
  types/
    ...
    journal.ts           - Journal types and createJournalEntry helper
    # REMOVE: todos.ts
  components/
    ...
    JournalPane.svelte   - Main journal UI for right pane
    JournalEntry.svelte  - Individual journal entry component
    # REMOVE: TodoList.svelte
```

### Stores Section

Add new store documentation:

```markdown
**journal.svelte.ts** - Journal entries state management
- `journalStore` - Reactive state with selectedDate, entries, isLoading, datesWithEntries
- `getEntries()` - Get entries for selected date
- `getSelectedDate()` - Get currently selected date
- `getDatesWithEntries()` - Get array of date strings with entries
- `addEntry(text, type)` - Add new entry (auto-saves)
- `removeEntry(id)` - Remove entry by ID (auto-saves)
- `updateEntryText(id, text)` - Update entry text (auto-saves)
- `updateEntryType(id, type)` - Update entry type (auto-saves)
- `updateEntryOrder(id, order)` - Update entry order (auto-saves)
- `loadEntriesForDate(date)` - Load entries from YAML file
- `saveEntries()` - Save current entries to file
- `scanDatesWithEntries()` - Scan for all dates with journal files
```

Remove todos.svelte.ts documentation.

### Components Section

Add new component documentation:

```markdown
**JournalPane.svelte** - Main journal UI
- Displays selected date header
- Input row for new entries (text + type dropdown + add button)
- Entry list with view/edit modes
- Empty state when no entries

**JournalEntry.svelte** - Individual entry component
- Props: `entry`
- View mode: rendered markdown, type badge, timestamps
- Edit mode: textarea, type dropdown, order input
- Delete button with confirmation
```

Remove TodoList.svelte documentation.

### Persistence Section

Update to replace todos with journal:

```markdown
- **Journal entries**: Stored in vault as `{dailyNotesFolder}/YYYY/MM/YYYY-MM-DD.yaml`
```

Remove:
```markdown
- **Todos**: Stored in vault's `data/todos.json` file
- **Show completed toggle**: Stored in localStorage (`todosShowCompleted`)
```

### Key Behaviors Section

Update daily notes behavior:

```markdown
- Calendar date clicks load journal entries for that date
- Journal entries are stored as YAML with metadata (type, order, timestamps)
- Files only created when first entry is added (not on navigation)
- Calendar shows red dot indicator for dates with entries
```

Remove:
```markdown
- Todo list sits above right pane editor with Kanban-like status workflow
```

### Configuration Section

Add journal entry types:

```markdown
- **Journal entry types**: `journalEntryTypes` array in config, default: `['one', 'two', 'three']`
```

## Verification

After updates, verify:
1. No mentions of "todo" in CLAUDE.md (except if referencing external tools)
2. All new files/components documented
3. File structure tree is accurate
4. Store functions documented
5. Persistence paths correct

## Dependencies

- Phase 01-07: All implementation and testing complete

## Acceptance Criteria

- [ ] CLAUDE.md file structure updated
- [ ] Journal store documented
- [ ] Journal components documented
- [ ] Persistence section updated
- [ ] Key behaviors updated
- [ ] All todo references removed
- [ ] Documentation matches actual implementation
