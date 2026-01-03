# Phase 05: Component Updates

**Status:** Pending
**Output:** All components updated to use `fileService` instead of File System Access API

## Objective

Update all components and stores that use `FileSystemDirectoryHandle` or `FileSystemFileHandle` to use the new `fileService`.

## Tasks

- [ ] Update `FileTree.svelte` to use `fileService.listDirectory()`
- [ ] Update `FileTreeItem.svelte` to use `fileService` for operations
- [ ] Update `EditorPane.svelte` / tabs to use `fileService.readFile()` / `writeFile()`
- [ ] Update `editor.svelte.ts` store to use paths instead of handles
- [ ] Update `tabs.svelte.ts` store to use paths instead of handles
- [ ] Update `fileOpen.ts` service to use `fileService`
- [ ] Update `fileSave.ts` service to use `fileService`
- [ ] Update `fileOperations.ts` utilities to use `fileService`
- [ ] Update `dailyNotes.ts` to use `fileService`
- [ ] Update `tags.ts` to use `fileService` for scanning
- [ ] Update `journal.svelte.ts` to use `fileService`
- [ ] Update `vaultConfig.svelte.ts` to use `fileService`
- [ ] Update `tagVocabulary.svelte.ts` to use `fileService`
- [ ] Remove all `FileSystemDirectoryHandle` / `FileSystemFileHandle` usage
- [ ] Remove `filesystem.ts` IndexedDB/handle code (keep localStorage helpers)

## Key Changes

### Editor Store

```typescript
// BEFORE
interface PaneState {
  fileHandle: FileSystemFileHandle | null;
  dirHandle: FileSystemDirectoryHandle | null;
  content: string;
  isDirty: boolean;
  relativePath: string | null;
}

// AFTER
interface PaneState {
  filePath: string | null;  // Relative path from vault root
  content: string;
  isDirty: boolean;
}
```

### Tabs Store

```typescript
// BEFORE
interface Tab {
  fileHandle: FileSystemFileHandle;
  dirHandle: FileSystemDirectoryHandle;
  content: string;
  isDirty: boolean;
  relativePath: string;
}

// AFTER
interface Tab {
  filePath: string;  // Relative path from vault root
  content: string;
  isDirty: boolean;
}
```

### FileTree Component

```typescript
// BEFORE
async function loadEntries() {
  const entries = [];
  for await (const entry of dirHandle.values()) {
    entries.push(entry);
  }
  // ...
}

// AFTER
async function loadEntries() {
  const entries = await fileService.listDirectory(relativePath);
  // ...
}
```

### File Operations

```typescript
// BEFORE (fileOperations.ts)
export async function createFile(
  parentDirHandle: FileSystemDirectoryHandle,
  filename: string
): Promise<FileSystemFileHandle> {
  return parentDirHandle.getFileHandle(filename, { create: true });
}

// AFTER
export async function createFile(
  parentPath: string,
  filename: string
): Promise<void> {
  await fileService.createFile(`${parentPath}/${filename}`);
}
```

## Files to Update

| File | Changes |
|------|---------|
| `src/lib/stores/vault.svelte.ts` | Replace handle with path |
| `src/lib/stores/editor.svelte.ts` | Remove handles, use paths |
| `src/lib/stores/tabs.svelte.ts` | Remove handles, use paths |
| `src/lib/stores/journal.svelte.ts` | Use fileService |
| `src/lib/stores/vaultConfig.svelte.ts` | Use fileService |
| `src/lib/stores/tagVocabulary.svelte.ts` | Use fileService |
| `src/lib/services/fileOpen.ts` | Use fileService |
| `src/lib/services/fileSave.ts` | Use fileService |
| `src/lib/utils/fileOperations.ts` | Use fileService |
| `src/lib/utils/dailyNotes.ts` | Use fileService |
| `src/lib/utils/tags.ts` | Use fileService |
| `src/lib/utils/filesystem.ts` | Remove handle code |
| `src/lib/components/FileTree.svelte` | Use fileService |
| `src/lib/components/FileTreeItem.svelte` | Use fileService |
| `src/lib/components/QuickFiles.svelte` | Use paths |
| `src/global.d.ts` | Delete (no longer needed) |

## Dependencies

- Phase 04 complete (vault picker uses fileService)

## Acceptance Criteria

- [ ] File tree loads and displays correctly
- [ ] Files can be opened in editor
- [ ] Files can be saved
- [ ] New files/folders can be created
- [ ] Files/folders can be renamed
- [ ] Files/folders can be deleted
- [ ] Daily notes work correctly
- [ ] Journal entries load and save
- [ ] Tag index builds correctly
- [ ] No `FileSystem*Handle` types remain in codebase
- [ ] App works end-to-end with server API
