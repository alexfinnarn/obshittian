/**
 * Tests for file service (using mock implementation)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMockFileService } from './mockFileService';
import { FileServiceError } from './fileService';

describe('FileService', () => {
  let service: ReturnType<typeof createMockFileService>;

  beforeEach(() => {
    service = createMockFileService();
    service.setVaultPath('/vault');
  });

  describe('vault path configuration', () => {
    it('should store and return vault path', () => {
      expect(service.getVaultPath()).toBe('/vault');
      service.setVaultPath('/new/path');
      expect(service.getVaultPath()).toBe('/new/path');
    });

    it('should throw error when vault path not set', async () => {
      service.reset();
      await expect(service.readFile('test.md')).rejects.toThrow(FileServiceError);
      await expect(service.readFile('test.md')).rejects.toMatchObject({
        code: 'VAULT_NOT_SET',
      });
    });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      service = createMockFileService({ 'notes/test.md': '# Hello' });
      service.setVaultPath('/vault');

      const content = await service.readFile('notes/test.md');
      expect(content).toBe('# Hello');
    });

    it('should throw 404 for non-existent file', async () => {
      await expect(service.readFile('missing.md')).rejects.toThrow(FileServiceError);
      await expect(service.readFile('missing.md')).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    it('should throw error when reading directory', async () => {
      service = createMockFileService({ 'folder/file.md': 'content' });
      service.setVaultPath('/vault');

      await expect(service.readFile('folder')).rejects.toThrow(FileServiceError);
      await expect(service.readFile('folder')).rejects.toMatchObject({
        code: 'IS_DIRECTORY',
      });
    });
  });

  describe('writeFile', () => {
    it('should write new file', async () => {
      await service.writeFile('new.md', '# New File');

      const content = await service.readFile('new.md');
      expect(content).toBe('# New File');
    });

    it('should overwrite existing file', async () => {
      service = createMockFileService({ 'test.md': 'old content' });
      service.setVaultPath('/vault');

      await service.writeFile('test.md', 'new content');

      const content = await service.readFile('test.md');
      expect(content).toBe('new content');
    });

    it('should create parent directories', async () => {
      await service.writeFile('deep/nested/file.md', 'content');

      const content = await service.readFile('deep/nested/file.md');
      expect(content).toBe('content');

      const exists = await service.exists('deep/nested');
      expect(exists.exists).toBe(true);
      expect(exists.kind).toBe('directory');
    });
  });

  describe('deleteFile', () => {
    it('should delete file', async () => {
      service = createMockFileService({ 'test.md': 'content' });
      service.setVaultPath('/vault');

      await service.deleteFile('test.md');

      await expect(service.readFile('test.md')).rejects.toMatchObject({
        status: 404,
      });
    });

    it('should throw 404 for non-existent file', async () => {
      await expect(service.deleteFile('missing.md')).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });
  });

  describe('listDirectory', () => {
    it('should list directory entries', async () => {
      service = createMockFileService({
        'folder/a.md': 'a',
        'folder/b.md': 'b',
        'folder/sub/c.md': 'c',
      });
      service.setVaultPath('/vault');

      const entries = await service.listDirectory('folder');

      expect(entries).toHaveLength(3);
      expect(entries.find((e) => e.name === 'sub')?.kind).toBe('directory');
      expect(entries.find((e) => e.name === 'a.md')?.kind).toBe('file');
    });

    it('should sort directories before files', async () => {
      service = createMockFileService({
        'folder/zfile.md': 'z',
        'folder/afile.md': 'a',
        'folder/subdir/nested.md': 'n',
      });
      service.setVaultPath('/vault');

      const entries = await service.listDirectory('folder');

      expect(entries[0].kind).toBe('directory');
      expect(entries[0].name).toBe('subdir');
    });

    it('should throw 404 for non-existent directory', async () => {
      await expect(service.listDirectory('missing')).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });
  });

  describe('createDirectory', () => {
    it('should create directory', async () => {
      await service.createDirectory('new-folder');

      const exists = await service.exists('new-folder');
      expect(exists.exists).toBe(true);
      expect(exists.kind).toBe('directory');
    });

    it('should throw 409 if directory exists', async () => {
      await service.createDirectory('folder');

      await expect(service.createDirectory('folder')).rejects.toMatchObject({
        status: 409,
        code: 'ALREADY_EXISTS',
      });
    });
  });

  describe('deleteDirectory', () => {
    it('should delete empty directory', async () => {
      await service.createDirectory('empty');
      await service.deleteDirectory('empty');

      const exists = await service.exists('empty');
      expect(exists.exists).toBe(false);
    });

    it('should throw error for non-empty directory without recursive', async () => {
      service = createMockFileService({ 'folder/file.md': 'content' });
      service.setVaultPath('/vault');

      await expect(service.deleteDirectory('folder')).rejects.toMatchObject({
        status: 409,
        code: 'NOT_EMPTY',
      });
    });

    it('should delete non-empty directory with recursive=true', async () => {
      service = createMockFileService({
        'folder/file.md': 'content',
        'folder/sub/nested.md': 'nested',
      });
      service.setVaultPath('/vault');

      await service.deleteDirectory('folder', true);

      const exists = await service.exists('folder');
      expect(exists.exists).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return exists:true with kind for file', async () => {
      service = createMockFileService({ 'test.md': 'content' });
      service.setVaultPath('/vault');

      const result = await service.exists('test.md');
      expect(result.exists).toBe(true);
      expect(result.kind).toBe('file');
    });

    it('should return exists:true with kind for directory', async () => {
      await service.createDirectory('folder');

      const result = await service.exists('folder');
      expect(result.exists).toBe(true);
      expect(result.kind).toBe('directory');
    });

    it('should return exists:false for missing path', async () => {
      const result = await service.exists('missing');
      expect(result.exists).toBe(false);
      expect(result.kind).toBeUndefined();
    });
  });

  describe('rename', () => {
    it('should rename file', async () => {
      service = createMockFileService({ 'old.md': 'content' });
      service.setVaultPath('/vault');

      await service.rename('old.md', 'new.md');

      const oldExists = await service.exists('old.md');
      const newExists = await service.exists('new.md');
      expect(oldExists.exists).toBe(false);
      expect(newExists.exists).toBe(true);

      const content = await service.readFile('new.md');
      expect(content).toBe('content');
    });

    it('should throw 404 for non-existent source', async () => {
      await expect(service.rename('missing.md', 'new.md')).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    it('should throw 409 if destination exists', async () => {
      service = createMockFileService({
        'source.md': 'src',
        'dest.md': 'dst',
      });
      service.setVaultPath('/vault');

      await expect(service.rename('source.md', 'dest.md')).rejects.toMatchObject({
        status: 409,
        code: 'ALREADY_EXISTS',
      });
    });
  });

  describe('createFile', () => {
    it('should create empty file', async () => {
      await service.createFile('new.md');

      const content = await service.readFile('new.md');
      expect(content).toBe('');
    });

    it('should create file with content', async () => {
      await service.createFile('new.md', '# Hello');

      const content = await service.readFile('new.md');
      expect(content).toBe('# Hello');
    });

    it('should throw 409 if file exists', async () => {
      service = createMockFileService({ 'test.md': 'content' });
      service.setVaultPath('/vault');

      await expect(service.createFile('test.md')).rejects.toMatchObject({
        status: 409,
        code: 'ALREADY_EXISTS',
      });
    });
  });

  describe('stat', () => {
    it('should return file stats', async () => {
      service = createMockFileService({ 'test.md': 'hello' });
      service.setVaultPath('/vault');

      const stats = await service.stat('test.md');

      expect(stats.kind).toBe('file');
      expect(stats.size).toBe(5);
      expect(stats.modified).toBeDefined();
      expect(stats.created).toBeDefined();
    });

    it('should return directory stats', async () => {
      await service.createDirectory('folder');

      const stats = await service.stat('folder');

      expect(stats.kind).toBe('directory');
    });

    it('should throw 404 for non-existent path', async () => {
      await expect(service.stat('missing')).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });
  });

  describe('FileServiceError', () => {
    it('should have correct properties', () => {
      const error = new FileServiceError(404, 'Not found', 'NOT_FOUND');

      expect(error.status).toBe(404);
      expect(error.message).toBe('Not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('FileServiceError');
    });

    it('should work without code', () => {
      const error = new FileServiceError(500, 'Server error');

      expect(error.status).toBe(500);
      expect(error.code).toBeUndefined();
    });
  });
});
