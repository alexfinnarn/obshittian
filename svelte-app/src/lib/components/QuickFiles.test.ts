import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import QuickFiles from './QuickFiles.svelte';
import { vaultConfig, resetVaultConfig } from '$lib/stores/vaultConfig.svelte';
import { vault } from '$lib/stores/vault.svelte';
import { settings } from '$lib/stores/settings.svelte';
import * as eventBus from '$lib/utils/eventBus';

// Mock setQuickFiles since it tries to write to filesystem
vi.mock('$lib/stores/vaultConfig.svelte', async () => {
  const actual = await vi.importActual('$lib/stores/vaultConfig.svelte');
  return {
    ...actual,
    setQuickFiles: vi.fn().mockResolvedValue(true),
  };
});

// Mock eventBus emit
vi.spyOn(eventBus, 'emit');

describe('QuickFiles', () => {
  beforeEach(() => {
    resetVaultConfig();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('display', () => {
    it('renders the section header', () => {
      render(QuickFiles);
      expect(screen.getByText('Quick Files')).toBeTruthy();
    });

    it('shows empty message when no files', () => {
      render(QuickFiles);
      expect(screen.getByText('No quick files configured')).toBeTruthy();
    });

    it('renders files from vaultConfig', () => {
      vaultConfig.quickFiles = [
        { name: 'Todo', path: 'todo.md' },
        { name: 'Notes', path: 'folder/notes.md' },
      ];

      render(QuickFiles);

      expect(screen.getByText('Todo')).toBeTruthy();
      expect(screen.getByText('Notes')).toBeTruthy();
    });

    it('file links have correct title showing path', () => {
      vaultConfig.quickFiles = [{ name: 'Test', path: 'folder/test.md' }];

      render(QuickFiles);

      const link = screen.getByTestId('quick-file-0');
      expect(link.getAttribute('title')).toBe('folder/test.md');
    });
  });

  describe('file click', () => {
    it('emits file:open event when file clicked', async () => {
      vaultConfig.quickFiles = [{ name: 'Test', path: 'test.md' }];

      render(QuickFiles);

      await fireEvent.click(screen.getByTestId('quick-file-0'));

      expect(eventBus.emit).toHaveBeenCalledWith('file:open', {
        path: 'test.md',
        pane: 'left',
      });
    });

    it('file buttons have correct type', () => {
      vaultConfig.quickFiles = [{ name: 'Test', path: 'test.md' }];

      render(QuickFiles);

      const button = screen.getByTestId('quick-file-0');
      expect(button.getAttribute('type')).toBe('button');
    });
  });

  describe('configure modal', () => {
    it('shows configure button', () => {
      render(QuickFiles);
      expect(screen.getByTestId('configure-quick-files')).toBeTruthy();
    });

    it('opens modal when configure clicked', async () => {
      render(QuickFiles);

      await fireEvent.click(screen.getByTestId('configure-quick-files'));

      expect(screen.getByText('Configure Quick Files')).toBeTruthy();
    });

    it('populates modal with existing files', async () => {
      vaultConfig.quickFiles = [{ name: 'Test', path: 'test.md' }];

      render(QuickFiles);
      await fireEvent.click(screen.getByTestId('configure-quick-files'));

      const nameInput = screen.getByTestId('file-name-0') as HTMLInputElement;
      const pathSpan = screen.getByTestId('file-path-0');

      expect(nameInput.value).toBe('Test');
      expect(pathSpan.textContent).toBe('test.md');
    });
  });

  describe('editing files', () => {
    it('adds new file row', async () => {
      render(QuickFiles);

      await fireEvent.click(screen.getByTestId('configure-quick-files'));
      await fireEvent.click(screen.getByTestId('add-file'));

      expect(screen.getByTestId('file-row-0')).toBeTruthy();
    });

    it('respects quickFilesLimit when adding', async () => {
      // Set limit to 2
      settings.quickFilesLimit = 2;
      vaultConfig.quickFiles = [
        { name: 'File1', path: 'file1.md' },
        { name: 'File2', path: 'file2.md' },
      ];

      // Mock alert
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(QuickFiles);
      await fireEvent.click(screen.getByTestId('configure-quick-files'));

      // Try to add when at limit
      await fireEvent.click(screen.getByTestId('add-file'));

      expect(alertMock).toHaveBeenCalledWith('Maximum 2 quick files allowed');
      alertMock.mockRestore();

      // Reset settings
      settings.quickFilesLimit = 5;
    });

    it('removes file row', async () => {
      vaultConfig.quickFiles = [{ name: 'Test', path: 'test.md' }];

      render(QuickFiles);
      await fireEvent.click(screen.getByTestId('configure-quick-files'));

      expect(screen.getByTestId('file-row-0')).toBeTruthy();

      await fireEvent.click(screen.getByTestId('file-delete-0'));

      expect(screen.queryByTestId('file-row-0')).toBeNull();
    });

    it('updates file name', async () => {
      render(QuickFiles);

      await fireEvent.click(screen.getByTestId('configure-quick-files'));
      await fireEvent.click(screen.getByTestId('add-file'));

      const nameInput = screen.getByTestId('file-name-0') as HTMLInputElement;
      await fireEvent.input(nameInput, { target: { value: 'New Name' } });

      expect(nameInput.value).toBe('New Name');
    });

    it('shows browse button for file picker', async () => {
      render(QuickFiles);

      await fireEvent.click(screen.getByTestId('configure-quick-files'));
      await fireEvent.click(screen.getByTestId('add-file'));

      expect(screen.getByTestId('file-browse-0')).toBeTruthy();
    });

    it('alerts when browse clicked without vault open', async () => {
      vault.rootDirHandle = null;
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(QuickFiles);
      await fireEvent.click(screen.getByTestId('configure-quick-files'));
      await fireEvent.click(screen.getByTestId('add-file'));
      await fireEvent.click(screen.getByTestId('file-browse-0'));

      expect(alertMock).toHaveBeenCalledWith('Please open a folder first');
      alertMock.mockRestore();
    });
  });

  describe('saving', () => {
    it('calls setQuickFiles on save', async () => {
      const { setQuickFiles } = await import('$lib/stores/vaultConfig.svelte');

      // Pre-populate with a file that has both name and path
      vaultConfig.quickFiles = [{ name: 'Existing', path: 'existing.md' }];

      render(QuickFiles);

      await fireEvent.click(screen.getByTestId('configure-quick-files'));

      // Update the name
      const nameInput = screen.getByTestId('file-name-0') as HTMLInputElement;
      await fireEvent.input(nameInput, { target: { value: 'Updated' } });

      await fireEvent.click(screen.getByTestId('save-files'));

      expect(setQuickFiles).toHaveBeenCalledWith([
        { name: 'Updated', path: 'existing.md' },
      ]);
    });

    it('filters out files without name or path on save', async () => {
      const { setQuickFiles } = await import('$lib/stores/vaultConfig.svelte');

      render(QuickFiles);

      await fireEvent.click(screen.getByTestId('configure-quick-files'));
      await fireEvent.click(screen.getByTestId('add-file'));

      // Only set name, not path
      const nameInput = screen.getByTestId('file-name-0') as HTMLInputElement;
      await fireEvent.input(nameInput, { target: { value: 'Only Name' } });

      await fireEvent.click(screen.getByTestId('save-files'));

      // Should save empty array since file has no path
      expect(setQuickFiles).toHaveBeenCalledWith([]);
    });
  });
});
