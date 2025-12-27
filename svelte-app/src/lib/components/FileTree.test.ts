import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import FileTree from './FileTree.svelte';
import { vault, closeVault, openVault } from '$lib/stores/vault.svelte';
import { clear } from '$lib/utils/eventBus';

// Mock FileSystemHandle
function createMockFileHandle(name: string): FileSystemFileHandle {
  return {
    kind: 'file',
    name,
    getFile: vi.fn().mockResolvedValue({
      text: vi.fn().mockResolvedValue(''),
    }),
    createWritable: vi.fn().mockResolvedValue({
      write: vi.fn(),
      close: vi.fn(),
    }),
    isSameEntry: vi.fn(),
    queryPermission: vi.fn(),
    requestPermission: vi.fn(),
  } as unknown as FileSystemFileHandle;
}

function createMockDirHandle(
  name: string,
  entries: FileSystemHandle[] = []
): FileSystemDirectoryHandle {
  const handle: FileSystemDirectoryHandle = {
    kind: 'directory',
    name,
    getFileHandle: vi.fn().mockResolvedValue(createMockFileHandle('new-file.md')),
    getDirectoryHandle: vi.fn().mockImplementation((folderName: string) => {
      // Return a simple mock to avoid infinite recursion
      return Promise.resolve({
        kind: 'directory',
        name: folderName,
        getFileHandle: vi.fn(),
        getDirectoryHandle: vi.fn(),
        removeEntry: vi.fn(),
        resolve: vi.fn(),
        values: vi.fn().mockImplementation(async function* () {}),
        isSameEntry: vi.fn(),
        queryPermission: vi.fn(),
        requestPermission: vi.fn(),
        keys: vi.fn(),
        entries: vi.fn(),
      } as unknown as FileSystemDirectoryHandle);
    }),
    removeEntry: vi.fn(),
    resolve: vi.fn().mockResolvedValue([name]),
    values: vi.fn().mockImplementation(async function* () {
      for (const entry of entries) {
        yield entry;
      }
    }),
    isSameEntry: vi.fn(),
    queryPermission: vi.fn(),
    requestPermission: vi.fn(),
    keys: vi.fn(),
    entries: vi.fn(),
  } as unknown as FileSystemDirectoryHandle;
  return handle;
}

describe('FileTree', () => {
  beforeEach(() => {
    closeVault();
    clear();
  });

  afterEach(() => {
    cleanup();
    closeVault();
    clear();
  });

  describe('when no vault is open', () => {
    it('renders empty message', () => {
      render(FileTree);
      expect(screen.getByText('Open a folder to browse files')).toBeTruthy();
    });

    it('renders the tree container', () => {
      render(FileTree);
      expect(screen.getByTestId('file-tree-content')).toBeTruthy();
    });
  });

  describe('when vault is open', () => {
    it('shows "No files" when directory is empty', async () => {
      const rootDir = createMockDirHandle('root', []);
      openVault(rootDir);

      render(FileTree);

      // Wait for async loading
      await new Promise((r) => setTimeout(r, 50));

      expect(screen.getByText('No files')).toBeTruthy();
    });

    it('renders files from the vault', async () => {
      const file1 = createMockFileHandle('notes.md');
      const file2 = createMockFileHandle('todo.md');
      const rootDir = createMockDirHandle('root', [file1, file2]);
      openVault(rootDir);

      render(FileTree);

      // Wait for async loading
      await new Promise((r) => setTimeout(r, 50));

      expect(screen.getByTestId('file-item-notes.md')).toBeTruthy();
      expect(screen.getByTestId('file-item-todo.md')).toBeTruthy();
    });

    it('renders folders from the vault', async () => {
      const folder = createMockDirHandle('documents');
      const rootDir = createMockDirHandle('root', [folder]);
      openVault(rootDir);

      render(FileTree);

      // Wait for async loading
      await new Promise((r) => setTimeout(r, 50));

      expect(screen.getByTestId('folder-summary-documents')).toBeTruthy();
    });

    it('hides hidden files', async () => {
      const visible = createMockFileHandle('notes.md');
      const hidden = createMockFileHandle('.hidden');
      const rootDir = createMockDirHandle('root', [visible, hidden]);
      openVault(rootDir);

      render(FileTree);

      // Wait for async loading
      await new Promise((r) => setTimeout(r, 50));

      expect(screen.getByTestId('file-item-notes.md')).toBeTruthy();
      expect(screen.queryByTestId('file-item-.hidden')).toBeNull();
    });

    it('sorts folders before files', async () => {
      const file = createMockFileHandle('alpha.md');
      const folder = createMockDirHandle('zeta');
      const rootDir = createMockDirHandle('root', [file, folder]);
      openVault(rootDir);

      render(FileTree);

      // Wait for async loading
      await new Promise((r) => setTimeout(r, 50));

      const tree = screen.getByTestId('file-tree-content');
      const items = tree.querySelectorAll('[data-testid^="folder-summary-"], [data-testid^="file-item-"]');

      // Folder should come first even though 'zeta' > 'alpha' alphabetically
      expect(items[0].getAttribute('data-testid')).toBe('folder-summary-zeta');
      expect(items[1].getAttribute('data-testid')).toBe('file-item-alpha.md');
    });
  });

  describe('accessibility', () => {
    it('has role="tree"', () => {
      render(FileTree);
      const tree = screen.getByTestId('file-tree-content');
      expect(tree.getAttribute('role')).toBe('tree');
    });

    it('has tabindex', () => {
      render(FileTree);
      const tree = screen.getByTestId('file-tree-content');
      expect(tree.getAttribute('tabindex')).toBe('0');
    });
  });
});
