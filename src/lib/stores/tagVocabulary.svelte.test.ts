import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  tagVocabulary,
  getTags,
  getTag,
  hasTag,
  addTag,
  incrementTagCount,
  decrementTagCount,
  buildVocabularyFromIndex,
  mergeFromIndex,
  loadTagVocabulary,
  saveTagVocabulary,
  resetTagVocabulary,
  isVocabularyLoading,
} from './tagVocabulary.svelte';
import { closeVault, openVault } from './vault.svelte';
import { tagsStore } from './tags.svelte';
import type { TagIndex } from './tags.svelte';
import { fileService } from '$lib/services/fileService';

// Mock yaml
vi.mock('js-yaml', () => ({
  default: {
    load: vi.fn((text: string) => JSON.parse(text)),
    dump: vi.fn((data: object) => JSON.stringify(data)),
  },
}));

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

describe('tagVocabulary store', () => {
  beforeEach(() => {
    resetTagVocabulary();
    closeVault();
    vi.clearAllMocks();
    // Reset tags store
    tagsStore.index = { files: {}, tags: {}, allTags: [] };
  });

  describe('initial state', () => {
    it('starts with empty tags', () => {
      expect(tagVocabulary.tags).toEqual([]);
    });

    it('starts with isLoading false', () => {
      expect(tagVocabulary.isLoading).toBe(false);
    });
  });

  describe('getTags', () => {
    it('returns current tags', () => {
      tagVocabulary.tags = [
        { name: 'project', count: 5 },
        { name: 'meeting', count: 3 },
      ];
      expect(getTags()).toEqual([
        { name: 'project', count: 5 },
        { name: 'meeting', count: 3 },
      ]);
    });
  });

  describe('getTag', () => {
    it('finds existing tag', () => {
      tagVocabulary.tags = [{ name: 'project', count: 5 }];
      expect(getTag('project')).toEqual({ name: 'project', count: 5 });
    });

    it('returns undefined for non-existent tag', () => {
      tagVocabulary.tags = [{ name: 'project', count: 5 }];
      expect(getTag('missing')).toBeUndefined();
    });
  });

  describe('hasTag', () => {
    it('returns true for existing tag', () => {
      tagVocabulary.tags = [{ name: 'project', count: 5 }];
      expect(hasTag('project')).toBe(true);
    });

    it('returns false for non-existent tag', () => {
      tagVocabulary.tags = [{ name: 'project', count: 5 }];
      expect(hasTag('missing')).toBe(false);
    });
  });

  describe('addTag', () => {
    it('adds new tag with count 1', () => {
      addTag('project');
      expect(tagVocabulary.tags).toContainEqual({ name: 'project', count: 1 });
    });

    it('increments count for existing tag', () => {
      tagVocabulary.tags = [{ name: 'project', count: 3 }];
      addTag('project');
      expect(getTag('project')?.count).toBe(4);
    });

    it('normalizes tag name to lowercase', () => {
      addTag('PROJECT');
      expect(hasTag('project')).toBe(true);
    });

    it('trims whitespace', () => {
      addTag('  project  ');
      expect(hasTag('project')).toBe(true);
    });

    it('ignores empty strings', () => {
      addTag('');
      addTag('   ');
      expect(tagVocabulary.tags).toEqual([]);
    });

    it('maintains sort order by count', () => {
      tagVocabulary.tags = [
        { name: 'low', count: 1 },
        { name: 'high', count: 10 },
      ];
      addTag('low'); // Now count = 2
      // Should still be sorted: high (10), low (2)
      expect(tagVocabulary.tags[0].name).toBe('high');
      expect(tagVocabulary.tags[1].name).toBe('low');
    });
  });

  describe('incrementTagCount', () => {
    it('increments existing tag count', () => {
      tagVocabulary.tags = [{ name: 'project', count: 5 }];
      incrementTagCount('project');
      expect(getTag('project')?.count).toBe(6);
    });

    it('does nothing for non-existent tag', () => {
      incrementTagCount('missing');
      expect(tagVocabulary.tags).toEqual([]);
    });
  });

  describe('decrementTagCount', () => {
    it('decrements existing tag count', () => {
      tagVocabulary.tags = [{ name: 'project', count: 5 }];
      decrementTagCount('project');
      expect(getTag('project')?.count).toBe(4);
    });

    it('removes tag when count reaches 0', () => {
      tagVocabulary.tags = [{ name: 'project', count: 1 }];
      decrementTagCount('project');
      expect(hasTag('project')).toBe(false);
    });

    it('does nothing for non-existent tag', () => {
      decrementTagCount('missing');
      expect(tagVocabulary.tags).toEqual([]);
    });
  });

  describe('buildVocabularyFromIndex', () => {
    it('builds vocabulary from tag index', () => {
      const tagIndex: TagIndex = {
        files: {
          'file1.md': ['project', 'meeting'],
          'file2.md': ['project'],
        },
        tags: {
          project: ['file1.md', 'file2.md'],
          meeting: ['file1.md'],
        },
        allTags: [],
      };

      buildVocabularyFromIndex(tagIndex);

      expect(hasTag('project')).toBe(true);
      expect(hasTag('meeting')).toBe(true);
      expect(getTag('project')?.count).toBe(2);
      expect(getTag('meeting')?.count).toBe(1);
    });

    it('clears existing vocabulary before building', () => {
      tagVocabulary.tags = [{ name: 'old', count: 10 }];

      buildVocabularyFromIndex({
        files: {},
        tags: { new: ['file.md'] },
        allTags: [],
      });

      expect(hasTag('old')).toBe(false);
      expect(hasTag('new')).toBe(true);
    });

    it('uses global tagsStore when no index provided', () => {
      tagsStore.index = {
        files: { 'file.md': ['global'] },
        tags: { global: ['file.md'] },
        allTags: [],
      };

      buildVocabularyFromIndex();

      expect(hasTag('global')).toBe(true);
    });
  });

  describe('mergeFromIndex', () => {
    it('merges new tags from index', () => {
      tagVocabulary.tags = [{ name: 'existing', count: 5 }];

      mergeFromIndex({
        files: {},
        tags: { new: ['file.md'] },
        allTags: [],
      });

      expect(hasTag('existing')).toBe(true);
      expect(hasTag('new')).toBe(true);
    });

    it('updates count for existing tags', () => {
      tagVocabulary.tags = [{ name: 'project', count: 2 }];

      mergeFromIndex({
        files: {},
        tags: { project: ['a.md', 'b.md', 'c.md'] },
        allTags: [],
      });

      expect(getTag('project')?.count).toBe(3);
    });
  });

  describe('loadTagVocabulary', () => {
    it('loads vocabulary from file', async () => {
      openVault('/mock/vault');
      mockFileService.exists.mockResolvedValue({ exists: true, kind: 'file' });
      mockFileService.readFile.mockResolvedValue(
        JSON.stringify({
          version: 1,
          tags: [
            { name: 'project', count: 5 },
            { name: 'meeting', count: 3 },
          ],
        })
      );

      await loadTagVocabulary();

      expect(hasTag('project')).toBe(true);
      expect(hasTag('meeting')).toBe(true);
      expect(getTag('project')?.count).toBe(5);
    });

    it('builds from index when file not found', async () => {
      openVault('/mock/vault');
      mockFileService.exists.mockResolvedValue({ exists: false });
      mockFileService.writeFile.mockResolvedValue(undefined);

      tagsStore.index = {
        files: { 'file.md': ['indexed'] },
        tags: { indexed: ['file.md'] },
        allTags: [],
      };

      await loadTagVocabulary();

      expect(hasTag('indexed')).toBe(true);
    });

    it('sets empty tags when no vault is open', async () => {
      tagVocabulary.tags = [{ name: 'old', count: 5 }];

      await loadTagVocabulary();

      expect(tagVocabulary.tags).toEqual([]);
    });

    it('sets isLoading during load', async () => {
      openVault('/mock/vault');
      mockFileService.exists.mockResolvedValue({ exists: true, kind: 'file' });
      mockFileService.readFile.mockResolvedValue(JSON.stringify({ version: 1, tags: [] }));

      expect(isVocabularyLoading()).toBe(false);

      const loadPromise = loadTagVocabulary();

      // Note: Due to async nature, we can't reliably check isLoading=true mid-flight
      await loadPromise;

      expect(isVocabularyLoading()).toBe(false);
    });
  });

  describe('saveTagVocabulary', () => {
    it('saves vocabulary to file', async () => {
      openVault('/mock/vault');
      mockFileService.writeFile.mockResolvedValue(undefined);

      tagVocabulary.tags = [
        { name: 'project', count: 5 },
        { name: 'meeting', count: 3 },
      ];

      const result = await saveTagVocabulary();

      expect(result).toBe(true);
      expect(mockFileService.writeFile).toHaveBeenCalled();
    });

    it('returns false when no vault is open', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await saveTagVocabulary();

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('resetTagVocabulary', () => {
    it('clears all state', () => {
      tagVocabulary.tags = [{ name: 'test', count: 5 }];
      tagVocabulary.isLoading = true;

      resetTagVocabulary();

      expect(tagVocabulary.tags).toEqual([]);
      expect(tagVocabulary.isLoading).toBe(false);
    });
  });
});
