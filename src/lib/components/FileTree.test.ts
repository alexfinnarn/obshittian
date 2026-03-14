import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/svelte';
import FileTree from './FileTree.svelte';
import { closeVault, openVault } from '$lib/stores/vault.svelte';
import { clear } from '$lib/utils/eventBus';
import { fileService } from '$lib/services/fileService';
import type { DirectoryEntry } from '$lib/server/fileTypes';

// Mock the fileService
vi.mock('$lib/services/fileService', () => ({
  fileService: {
    setVaultPath: vi.fn(),
    getVaultPath: vi.fn(() => '/mock/vault'),
    listDirectory: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    exists: vi.fn(),
    createFile: vi.fn(),
    createDirectory: vi.fn(),
    deleteFile: vi.fn(),
    deleteDirectory: vi.fn(),
    rename: vi.fn(),
    stat: vi.fn(),
    exportVault: vi.fn(),
  },
}));

const mockFileService = vi.mocked(fileService);

describe('FileTree', () => {
  beforeEach(() => {
    closeVault();
    clear();
    vi.clearAllMocks();
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: vi.fn(() => 'blob:mock-export'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: vi.fn(),
    });
    HTMLAnchorElement.prototype.click = vi.fn();
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

    it('does not render the export button', () => {
      render(FileTree);
      expect(screen.queryByTestId('export-files-button')).toBeNull();
    });
  });

  describe('when vault is open', () => {
    it('shows "No files" when directory is empty', async () => {
      mockFileService.listDirectory.mockResolvedValue([]);
      openVault('/mock/vault');

      render(FileTree);

      // Wait for async loading
      await new Promise((r) => setTimeout(r, 50));

      expect(screen.getByText('No files')).toBeTruthy();
    });

    it('renders files from the vault', async () => {
      const entries: DirectoryEntry[] = [
        { name: 'notes.md', kind: 'file' },
        { name: 'todo.md', kind: 'file' },
      ];
      mockFileService.listDirectory.mockResolvedValue(entries);
      openVault('/mock/vault');

      render(FileTree);

      // Wait for async loading
      await new Promise((r) => setTimeout(r, 50));

      expect(screen.getByTestId('file-item-notes.md')).toBeTruthy();
      expect(screen.getByTestId('file-item-todo.md')).toBeTruthy();
    });

    it('renders folders from the vault', async () => {
      const entries: DirectoryEntry[] = [{ name: 'documents', kind: 'directory' }];
      mockFileService.listDirectory.mockResolvedValue(entries);
      openVault('/mock/vault');

      render(FileTree);

      // Wait for async loading
      await new Promise((r) => setTimeout(r, 50));

      expect(screen.getByTestId('folder-summary-documents')).toBeTruthy();
    });

    it('hides hidden files', async () => {
      const entries: DirectoryEntry[] = [
        { name: 'notes.md', kind: 'file' },
        { name: '.hidden', kind: 'file' },
      ];
      mockFileService.listDirectory.mockResolvedValue(entries);
      openVault('/mock/vault');

      render(FileTree);

      // Wait for async loading
      await new Promise((r) => setTimeout(r, 50));

      expect(screen.getByTestId('file-item-notes.md')).toBeTruthy();
      expect(screen.queryByTestId('file-item-.hidden')).toBeNull();
    });

    it('sorts folders before files', async () => {
      const entries: DirectoryEntry[] = [
        { name: 'alpha.md', kind: 'file' },
        { name: 'zeta', kind: 'directory' },
      ];
      mockFileService.listDirectory.mockResolvedValue(entries);
      openVault('/mock/vault');

      render(FileTree);

      // Wait for async loading
      await new Promise((r) => setTimeout(r, 50));

      const tree = screen.getByTestId('file-tree-content');
      const items = tree.querySelectorAll(
        '[data-testid^="folder-summary-"], [data-testid^="file-item-"]'
      );

      // Folder should come first even though 'zeta' > 'alpha' alphabetically
      expect(items[0].getAttribute('data-testid')).toBe('folder-summary-zeta');
      expect(items[1].getAttribute('data-testid')).toBe('file-item-alpha.md');
    });

    it('renders the export button', async () => {
      mockFileService.listDirectory.mockResolvedValue([]);
      openVault('/mock/vault');

      render(FileTree);

      await waitFor(() => {
        expect(screen.getByTestId('export-files-button')).toBeTruthy();
      });
    });

    it('disables the export button while exporting', async () => {
      mockFileService.listDirectory.mockResolvedValue([]);
      openVault('/mock/vault');

      let resolveExport: ((value: { blob: Blob; filename: string }) => void) | null = null;
      mockFileService.exportVault.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveExport = resolve;
          })
      );

      render(FileTree);

      const button = await screen.findByTestId('export-files-button');
      await fireEvent.click(button);

      expect(button.hasAttribute('disabled')).toBe(true);
      expect(button.textContent).toBe('Exporting...');

      resolveExport?.({ blob: new Blob(['zip']), filename: 'mock.zip' });

      await waitFor(() => {
        expect(button.hasAttribute('disabled')).toBe(false);
        expect(button.textContent).toBe('Export Files');
      });
    });

    it('shows an alert when export fails', async () => {
      mockFileService.listDirectory.mockResolvedValue([]);
      mockFileService.exportVault.mockRejectedValue(new Error('Archive failed'));
      openVault('/mock/vault');

      const alertSpy = vi.spyOn(window, 'alert');
      render(FileTree);

      await fireEvent.click(await screen.findByTestId('export-files-button'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Export failed: Archive failed');
      });
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
