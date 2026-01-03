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
import { vault, closeVault, openVault } from './vault.svelte';
import { fileService } from '$lib/services/fileService';

// Mock the fileService
vi.mock('$lib/services/fileService', () => ({
  fileService: {
    setVaultPath: vi.fn(),
    getVaultPath: vi.fn(() => '/mock/vault'),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    exists: vi.fn(),
    createFile: vi.fn(),
    createDirectory: vi.fn(),
    deleteFile: vi.fn(),
    deleteDirectory: vi.fn(),
    listDirectory: vi.fn(),
    rename: vi.fn(),
    stat: vi.fn(),
  },
}));

const mockFileService = vi.mocked(fileService);

describe('vaultConfig store', () => {
  beforeEach(() => {
    resetVaultConfig();
    closeVault();
    vi.clearAllMocks();
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
      openVault('/mock/vault');
      mockFileService.writeFile.mockResolvedValue(undefined);

      const links: QuickLink[] = [{ name: 'Google', url: 'https://google.com' }];
      const result = await setQuickLinks(links);

      expect(result).toBe(true);
      expect(vaultConfig.quickLinks).toEqual(links);
      expect(mockFileService.writeFile).toHaveBeenCalled();
    });
  });

  describe('getQuickFiles / setQuickFiles', () => {
    it('getQuickFiles returns current files', () => {
      const files: QuickFile[] = [{ name: 'Todo', path: 'todo.md' }];
      vaultConfig.quickFiles = files;
      expect(getQuickFiles()).toEqual(files);
    });

    it('setQuickFiles updates files and saves', async () => {
      openVault('/mock/vault');
      mockFileService.writeFile.mockResolvedValue(undefined);

      const files: QuickFile[] = [{ name: 'Notes', path: 'notes.md' }];
      const result = await setQuickFiles(files);

      expect(result).toBe(true);
      expect(vaultConfig.quickFiles).toEqual(files);
    });
  });

  describe('loadVaultConfig', () => {
    it('loads config from file', async () => {
      openVault('/mock/vault');
      mockFileService.exists.mockResolvedValue({ exists: true, kind: 'file' });
      mockFileService.readFile.mockResolvedValue(
        JSON.stringify({
          quickLinks: [{ name: 'Test', url: 'https://test.com' }],
          quickFiles: [{ name: 'Todo', path: 'todo.md' }],
        })
      );

      const result = await loadVaultConfig();

      expect(result.quickLinks).toEqual([{ name: 'Test', url: 'https://test.com' }]);
      expect(result.quickFiles).toEqual([{ name: 'Todo', path: 'todo.md' }]);
    });

    it('uses defaults when file not found', async () => {
      openVault('/mock/vault');
      mockFileService.exists.mockResolvedValue({ exists: false });

      const defaults = {
        quickLinks: [{ name: 'Default', url: 'https://default.com' }],
      };
      const result = await loadVaultConfig(defaults);

      expect(result.quickLinks).toEqual(defaults.quickLinks);
      expect(result.quickFiles).toEqual([]);
    });

    it('uses defaults when no vault is open', async () => {
      const defaults = {
        quickLinks: [{ name: 'Fallback', url: 'https://fallback.com' }],
      };
      const result = await loadVaultConfig(defaults);

      expect(result.quickLinks).toEqual(defaults.quickLinks);
    });
  });

  describe('saveVaultConfig', () => {
    it('saves config to file', async () => {
      openVault('/mock/vault');
      mockFileService.writeFile.mockResolvedValue(undefined);

      vaultConfig.quickLinks = [{ name: 'Test', url: 'https://test.com' }];
      vaultConfig.quickFiles = [{ name: 'File', path: 'file.md' }];

      const result = await saveVaultConfig();

      expect(result).toBe(true);
      expect(mockFileService.writeFile).toHaveBeenCalled();
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
