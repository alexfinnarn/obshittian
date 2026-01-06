# Phase 02: Integration Hooks

**Status:** Pending
**Output:** Modified services with logging calls

## Objective

Add activity logging calls to existing file operation code.

## Tasks

- [ ] Add logging to `fileOpen.ts` - openFileInTabs(), openFileInSinglePane()
- [ ] Add logging to `fileOpen.ts` - openDailyNote()
- [ ] Add logging to `fileSave.ts` - saveFile()
- [ ] Add logging to `fileOperations.ts` - createFile(), createFolder()
- [ ] Add logging to `fileOperations.ts` - renameFile(), renameFolder()
- [ ] Add logging to `fileOperations.ts` - deleteEntry()
- [ ] Add logging to `+page.svelte` - vault opened event
- [ ] Test that all operations produce log entries

## Content Outline

### fileOpen.ts Changes

```typescript
// In openFileInTabs()
logActivity('file.opened', {
  path,
  pane: 'left',
  source: openInNewTab ? 'tree' : 'tab'
});

// In openFileInSinglePane()
logActivity('file.opened', { path, pane, source: 'tree' });

// In openDailyNote()
logActivity('dailynote.opened', {
  date: date.toISOString().split('T')[0],
  wasCreated
});
```

### fileSave.ts Changes

```typescript
// After successful save
logActivity('file.saved', { path, pane, sizeBytes: content.length });
```

### fileOperations.ts Changes

```typescript
// In createFile()
logActivity('file.created', { path: fullPath, kind: 'file' });

// In createFolder()
logActivity('file.created', { path: fullPath, kind: 'folder' });

// In renameFile()/renameFolder()
logActivity('file.renamed', { oldPath, newPath });

// In deleteEntry()
logActivity('file.deleted', { path, kind: isDirectory ? 'folder' : 'file' });
```

### +page.svelte Changes

```typescript
// When vault opens successfully
logActivity('vault.opened', {
  path: vaultPath,
  source: wasRestored ? 'restored' : 'manual'
});
```

## Dependencies

- Phase 01 complete (logger service exists)

## Acceptance Criteria

- [ ] Opening a file creates file.opened entry
- [ ] Saving a file creates file.saved entry
- [ ] Creating file/folder creates file.created entry
- [ ] Renaming creates file.renamed entry
- [ ] Deleting creates file.deleted entry
- [ ] Opening vault creates vault.opened entry
- [ ] Daily note open creates dailynote.opened entry
- [ ] All operations are non-blocking (fire and forget)
