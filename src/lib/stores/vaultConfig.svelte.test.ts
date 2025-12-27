import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  vaultConfig,
  getQuickLinks,
  setQuickLinks,
  getQuickFiles,
  setQuickFiles,
  loadVaultConfig,
  saveVaultConfig,
  resetVaultConfig,
  type QuickLink,
  type QuickFile,
} from './vaultConfig.svelte';
import { vault, closeVault } from './vault.svelte';

// Mock file handle and writable stream
function createMockWritable() {
  return {
    write: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockFileHandle(content: string) {
  const mockWritable = createMockWritable();
  return {
    getFile: vi.fn().mockResolvedValue({
      text: vi.fn().mockResolvedValue(content),
    }),
    createWritable: vi.fn().mockResolvedValue(mockWritable),
    mockWritable,
  };
}

function createMockDirHandle(fileHandle?: ReturnType<typeof createMockFileHandle>) {
  return {
    name: 'test-vault',
    getFileHandle: vi.fn().mockImplementation(async (name: string, options?: { create?: boolean }) => {
      if (fileHandle) {
        return fileHandle;
      }
      if (options?.create) {
        return createMockFileHandle('{}');
      }
      throw new DOMException('File not found', 'NotFoundError');
    }),
  } as unknown as FileSystemDirectoryHandle;
}

describe('vaultConfig store', () => {
  beforeEach(() => {
    resetVaultConfig();
    closeVault();
  });

  describe('initial state', () => {
    it('starts with empty quickLinks', () => {
      expect(vaultConfig.quickLinks).toEqual([]);
    });

    it('starts with empty quickFiles', () => {
      expect(vaultConfig.quickFiles).toEqual([]);
    });
  });

  describe('getQuickLinks / setQuickLinks', () => {
    it('getQuickLinks returns current links', () => {
      const links: QuickLink[] = [{ name: 'Test', url: 'https://test.com' }];
      vaultConfig.quickLinks = links;
      expect(getQuickLinks()).toEqual(links);
    });

    it('setQuickLinks updates links and saves', async () => {
      const mockFileHandle = createMockFileHandle('{}');
      const mockDirHandle = createMockDirHandle(mockFileHandle);
      vault.rootDirHandle = mockDirHandle;

      const links: QuickLink[] = [{ name: 'Google', url: 'https://google.com' }];
      const result = await setQuickLinks(links);

      expect(result).toBe(true);
      expect(vaultConfig.quickLinks).toEqual(links);
      expect(mockFileHandle.mockWritable.write).toHaveBeenCalled();
    });
  });

  describe('getQuickFiles / setQuickFiles', () => {
    it('getQuickFiles returns current files', () => {
      const files: QuickFile[] = [{ name: 'Todo', path: 'todo.md' }];
      vaultConfig.quickFiles = files;
      expect(getQuickFiles()).toEqual(files);
    });

    it('setQuickFiles updates files and saves', async () => {
      const mockFileHandle = createMockFileHandle('{}');
      const mockDirHandle = createMockDirHandle(mockFileHandle);
      vault.rootDirHandle = mockDirHandle;

      const files: QuickFile[] = [{ name: 'Notes', path: 'notes.md' }];
      const result = await setQuickFiles(files);

      expect(result).toBe(true);
      expect(vaultConfig.quickFiles).toEqual(files);
    });
  });

  describe('loadVaultConfig', () => {
    it('loads config from file', async () => {
      const configContent = JSON.stringify({
        quickLinks: [{ name: 'Test', url: 'https://test.com' }],
        quickFiles: [{ name: 'Todo', path: 'todo.md' }],
      });
      const mockFileHandle = createMockFileHandle(configContent);
      const mockDirHandle = createMockDirHandle(mockFileHandle);

      const result = await loadVaultConfig(mockDirHandle);

      expect(result.quickLinks).toEqual([{ name: 'Test', url: 'https://test.com' }]);
      expect(result.quickFiles).toEqual([{ name: 'Todo', path: 'todo.md' }]);
    });

    it('uses defaults when file not found', async () => {
      const mockDirHandle = createMockDirHandle(); // No file handle = NotFoundError

      const defaults = {
        quickLinks: [{ name: 'Default', url: 'https://default.com' }],
      };
      const result = await loadVaultConfig(mockDirHandle, defaults);

      expect(result.quickLinks).toEqual(defaults.quickLinks);
      expect(result.quickFiles).toEqual([]);
    });

    it('uses defaults when no vault is open', async () => {
      const defaults = {
        quickLinks: [{ name: 'Fallback', url: 'https://fallback.com' }],
      };
      const result = await loadVaultConfig(undefined, defaults);

      expect(result.quickLinks).toEqual(defaults.quickLinks);
    });
  });

  describe('saveVaultConfig', () => {
    it('saves config to file', async () => {
      const mockFileHandle = createMockFileHandle('{}');
      const mockDirHandle = createMockDirHandle(mockFileHandle);
      vault.rootDirHandle = mockDirHandle;

      vaultConfig.quickLinks = [{ name: 'Test', url: 'https://test.com' }];
      vaultConfig.quickFiles = [{ name: 'File', path: 'file.md' }];

      const result = await saveVaultConfig();

      expect(result).toBe(true);
      expect(mockFileHandle.mockWritable.write).toHaveBeenCalled();
      expect(mockFileHandle.mockWritable.close).toHaveBeenCalled();
    });

    it('returns false when no vault is open', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await saveVaultConfig();
      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('resetVaultConfig', () => {
    it('clears all config', () => {
      vaultConfig.quickLinks = [{ name: 'Test', url: 'https://test.com' }];
      vaultConfig.quickFiles = [{ name: 'File', path: 'file.md' }];

      resetVaultConfig();

      expect(vaultConfig.quickLinks).toEqual([]);
      expect(vaultConfig.quickFiles).toEqual([]);
    });
  });
});
