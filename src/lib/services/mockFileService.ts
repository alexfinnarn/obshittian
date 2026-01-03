/**
 * Mock file service for testing
 * Provides an in-memory implementation of FileService
 */

import type { DirectoryEntry } from '$lib/server/fileTypes';
import { FileServiceError, type FileService } from './fileService';

interface MockFileEntry {
  kind: 'file' | 'directory';
  content?: string;
  modified: string;
  created: string;
  size: number;
}

/**
 * Create a mock file service for testing
 * @param initialFiles - Optional initial file state: { 'path/to/file.md': 'content' }
 */
export function createMockFileService(
  initialFiles: Record<string, string> = {}
): FileService & {
  // Test helpers
  getFiles(): Map<string, MockFileEntry>;
  reset(): void;
} {
  const files = new Map<string, MockFileEntry>();
  let vaultPath: string | null = null;

  // Initialize with provided files
  const now = new Date().toISOString();
  for (const [path, content] of Object.entries(initialFiles)) {
    files.set(path, {
      kind: 'file',
      content,
      modified: now,
      created: now,
      size: content.length,
    });

    // Ensure parent directories exist
    ensureParentDirs(path);
  }

  function ensureParentDirs(filePath: string): void {
    const parts = filePath.split('/');
    let currentPath = '';
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
      if (!files.has(currentPath)) {
        files.set(currentPath, {
          kind: 'directory',
          modified: now,
          created: now,
          size: 0,
        });
      }
    }
  }

  function resolvePath(relativePath: string): string {
    if (!vaultPath) {
      throw new FileServiceError(400, 'No vault path configured', 'VAULT_NOT_SET');
    }
    // For mock, we just use relative paths internally
    return relativePath;
  }

  return {
    setVaultPath(path: string): void {
      vaultPath = path;
    },

    getVaultPath(): string | null {
      return vaultPath;
    },

    async readFile(relativePath: string): Promise<string> {
      const path = resolvePath(relativePath);
      const entry = files.get(path);

      if (!entry) {
        throw new FileServiceError(404, 'File not found', 'NOT_FOUND');
      }

      if (entry.kind !== 'file') {
        throw new FileServiceError(400, 'Path is a directory', 'IS_DIRECTORY');
      }

      return entry.content ?? '';
    },

    async writeFile(relativePath: string, content: string): Promise<void> {
      const path = resolvePath(relativePath);
      const now = new Date().toISOString();

      const existing = files.get(path);
      if (existing && existing.kind === 'directory') {
        throw new FileServiceError(400, 'Path is a directory', 'IS_DIRECTORY');
      }

      ensureParentDirs(path);
      files.set(path, {
        kind: 'file',
        content,
        modified: now,
        created: existing?.created ?? now,
        size: content.length,
      });
    },

    async deleteFile(relativePath: string): Promise<void> {
      const path = resolvePath(relativePath);
      const entry = files.get(path);

      if (!entry) {
        throw new FileServiceError(404, 'File not found', 'NOT_FOUND');
      }

      if (entry.kind !== 'file') {
        throw new FileServiceError(400, 'Path is a directory', 'IS_DIRECTORY');
      }

      files.delete(path);
    },

    async listDirectory(relativePath: string): Promise<DirectoryEntry[]> {
      const path = resolvePath(relativePath);

      // Handle root directory
      if (path === '' || path === '.') {
        const entries: DirectoryEntry[] = [];
        const seen = new Set<string>();

        for (const [filePath, entry] of files) {
          const parts = filePath.split('/');
          if (parts.length >= 1 && !seen.has(parts[0])) {
            seen.add(parts[0]);
            const childEntry = files.get(parts[0]);
            entries.push({
              name: parts[0],
              kind: childEntry?.kind ?? (parts.length > 1 ? 'directory' : 'file'),
              size: childEntry?.size,
              modified: childEntry?.modified,
            });
          }
        }

        return entries.sort((a, b) => {
          if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      }

      const entry = files.get(path);
      if (!entry || entry.kind !== 'directory') {
        // Check if any files exist under this path
        const prefix = path + '/';
        const hasChildren = Array.from(files.keys()).some((k) => k.startsWith(prefix));
        if (!hasChildren && !entry) {
          throw new FileServiceError(404, 'Directory not found', 'NOT_FOUND');
        }
        if (entry && entry.kind !== 'directory') {
          throw new FileServiceError(400, 'Path is not a directory', 'NOT_DIRECTORY');
        }
      }

      const entries: DirectoryEntry[] = [];
      const prefix = path + '/';
      const seen = new Set<string>();

      for (const [filePath, fileEntry] of files) {
        if (filePath.startsWith(prefix)) {
          const remainder = filePath.slice(prefix.length);
          const parts = remainder.split('/');
          const name = parts[0];

          if (!seen.has(name)) {
            seen.add(name);
            const childPath = `${path}/${name}`;
            const childEntry = files.get(childPath);
            entries.push({
              name,
              kind: childEntry?.kind ?? (parts.length > 1 ? 'directory' : 'file'),
              size: childEntry?.size,
              modified: childEntry?.modified,
            });
          }
        }
      }

      return entries.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    },

    async createDirectory(relativePath: string): Promise<void> {
      const path = resolvePath(relativePath);

      if (files.has(path)) {
        throw new FileServiceError(409, 'Path already exists', 'ALREADY_EXISTS');
      }

      const now = new Date().toISOString();
      ensureParentDirs(path);
      files.set(path, {
        kind: 'directory',
        modified: now,
        created: now,
        size: 0,
      });
    },

    async deleteDirectory(relativePath: string, recursive = false): Promise<void> {
      const path = resolvePath(relativePath);
      const entry = files.get(path);

      if (!entry) {
        throw new FileServiceError(404, 'Directory not found', 'NOT_FOUND');
      }

      if (entry.kind !== 'directory') {
        throw new FileServiceError(400, 'Path is not a directory', 'NOT_DIRECTORY');
      }

      const prefix = path + '/';
      const children = Array.from(files.keys()).filter((k) => k.startsWith(prefix));

      if (children.length > 0 && !recursive) {
        throw new FileServiceError(409, 'Directory not empty', 'NOT_EMPTY');
      }

      // Delete children first
      for (const childPath of children) {
        files.delete(childPath);
      }

      files.delete(path);
    },

    async exists(relativePath: string): Promise<{ exists: boolean; kind?: 'file' | 'directory' }> {
      const path = resolvePath(relativePath);
      const entry = files.get(path);

      if (!entry) {
        // Check for implicit directories
        const prefix = path + '/';
        const hasChildren = Array.from(files.keys()).some((k) => k.startsWith(prefix));
        if (hasChildren) {
          return { exists: true, kind: 'directory' };
        }
        return { exists: false };
      }

      return { exists: true, kind: entry.kind };
    },

    async rename(oldPath: string, newPath: string): Promise<void> {
      const resolvedOld = resolvePath(oldPath);
      const resolvedNew = resolvePath(newPath);

      const entry = files.get(resolvedOld);
      if (!entry) {
        throw new FileServiceError(404, 'Source not found', 'NOT_FOUND');
      }

      if (files.has(resolvedNew)) {
        throw new FileServiceError(409, 'Destination already exists', 'ALREADY_EXISTS');
      }

      // For directories, move all children too
      if (entry.kind === 'directory') {
        const prefix = resolvedOld + '/';
        const toMove: [string, MockFileEntry][] = [];

        for (const [path, e] of files) {
          if (path.startsWith(prefix)) {
            const newChildPath = resolvedNew + path.slice(resolvedOld.length);
            toMove.push([path, { ...e }]);
            files.delete(path);
            files.set(newChildPath, e);
          }
        }
      }

      files.delete(resolvedOld);
      ensureParentDirs(resolvedNew);
      files.set(resolvedNew, {
        ...entry,
        modified: new Date().toISOString(),
      });
    },

    async createFile(relativePath: string, content = ''): Promise<void> {
      const path = resolvePath(relativePath);

      if (files.has(path)) {
        throw new FileServiceError(409, 'File already exists', 'ALREADY_EXISTS');
      }

      const now = new Date().toISOString();
      ensureParentDirs(path);
      files.set(path, {
        kind: 'file',
        content,
        modified: now,
        created: now,
        size: content.length,
      });
    },

    async stat(relativePath: string): Promise<{
      kind: 'file' | 'directory';
      size: number;
      modified: string;
      created: string;
    }> {
      const path = resolvePath(relativePath);
      const entry = files.get(path);

      if (!entry) {
        throw new FileServiceError(404, 'File not found', 'NOT_FOUND');
      }

      return {
        kind: entry.kind,
        size: entry.size,
        modified: entry.modified,
        created: entry.created,
      };
    },

    // Test helpers
    getFiles(): Map<string, MockFileEntry> {
      return files;
    },

    reset(): void {
      files.clear();
      vaultPath = null;
    },
  };
}
