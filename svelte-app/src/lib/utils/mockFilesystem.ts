/**
 * Mock File System Access API for E2E testing
 *
 * Provides mock FileSystemDirectoryHandle and FileSystemFileHandle implementations
 * that work with an in-memory filesystem. Enabled via VITE_E2E_TEST=true environment variable.
 */

export interface MockFile {
  name: string;
  content: string;
}

export interface MockDirectory {
  name: string;
  entries: Map<string, MockFile | MockDirectory>;
}

/**
 * Check if we're in E2E test mode
 */
export function isTestMode(): boolean {
  return import.meta.env.VITE_E2E_TEST === 'true';
}

/**
 * Create an in-memory filesystem structure for testing
 */
export function createMockVault(): MockDirectory {
  const vault: MockDirectory = {
    name: 'test-vault',
    entries: new Map(),
  };

  // Add some sample files
  vault.entries.set('README.md', {
    name: 'README.md',
    content: `---
tags: welcome, getting-started
---

# Welcome to Test Vault

This is a test vault for E2E testing.
`,
  });

  vault.entries.set('notes.md', {
    name: 'notes.md',
    content: `---
tags: notes, ideas
---

# Notes

Some notes content here.

- Item 1
- Item 2
- Item 3
`,
  });

  vault.entries.set('todo.md', {
    name: 'todo.md',
    content: `---
tags: todo, tasks
---

# Todo List

- [ ] First task
- [ ] Second task
- [x] Completed task
`,
  });

  // Add a folder with files
  const docsFolder: MockDirectory = {
    name: 'docs',
    entries: new Map(),
  };

  docsFolder.entries.set('guide.md', {
    name: 'guide.md',
    content: `---
tags: docs, guide
---

# User Guide

This is a guide document.
`,
  });

  docsFolder.entries.set('api.md', {
    name: 'api.md',
    content: `---
tags: docs, api, reference
---

# API Reference

API documentation goes here.
`,
  });

  vault.entries.set('docs', docsFolder);

  // Add daily notes folder structure
  const dailyNotesFolder: MockDirectory = {
    name: 'zzz_Daily Notes',
    entries: new Map(),
  };

  const yearFolder: MockDirectory = {
    name: '2024',
    entries: new Map(),
  };

  const monthFolder: MockDirectory = {
    name: '12',
    entries: new Map(),
  };

  monthFolder.entries.set('2024-12-25.md', {
    name: '2024-12-25.md',
    content: `---
sync: temporary
tags: daily
---

# Wednesday, December 25, 2024

Today's notes...
`,
  });

  yearFolder.entries.set('12', monthFolder);
  dailyNotesFolder.entries.set('2024', yearFolder);
  vault.entries.set('zzz_Daily Notes', dailyNotesFolder);

  // Add .editor-config.json
  vault.entries.set('.editor-config.json', {
    name: '.editor-config.json',
    content: JSON.stringify({
      quickLinks: [
        { name: 'Test Link', url: 'https://example.com' },
      ],
      quickFiles: [
        { name: 'README', path: 'README.md' },
        { name: 'Notes', path: 'notes.md' },
      ],
    }, null, 2),
  });

  return vault;
}

/**
 * Helper to check if entry is a directory
 */
function isDirectory(entry: MockFile | MockDirectory): entry is MockDirectory {
  return 'entries' in entry;
}

/**
 * Create a mock FileSystemFileHandle
 */
export function createMockFileHandle(file: MockFile, parent: MockDirectory): FileSystemFileHandle {
  let currentContent = file.content;

  const handle: FileSystemFileHandle = {
    kind: 'file' as const,
    name: file.name,

    async getFile(): Promise<File> {
      return new File([currentContent], file.name, { type: 'text/markdown' });
    },

    async createWritable(): Promise<FileSystemWritableFileStream> {
      let buffer = '';

      const stream: FileSystemWritableFileStream = {
        async write(data: string | BufferSource | Blob | WriteParams): Promise<void> {
          if (typeof data === 'string') {
            buffer = data;
          } else if (data instanceof Blob) {
            buffer = await data.text();
          } else if ('data' in data && data.data !== undefined) {
            if (typeof data.data === 'string') {
              buffer = data.data;
            } else if (data.data instanceof Blob) {
              buffer = await data.data.text();
            }
          }
        },
        async close(): Promise<void> {
          currentContent = buffer;
          file.content = buffer;
        },
        async abort(): Promise<void> {
          buffer = '';
        },
        async seek(_position: number): Promise<void> {},
        async truncate(_size: number): Promise<void> {},
        locked: false,
        getWriter(): WritableStreamDefaultWriter<unknown> {
          throw new Error('Not implemented');
        },
      } as unknown as FileSystemWritableFileStream;

      return stream;
    },

    async isSameEntry(other: FileSystemHandle): Promise<boolean> {
      return other.name === file.name && other.kind === 'file';
    },

    async queryPermission(): Promise<PermissionState> {
      return 'granted';
    },

    async requestPermission(): Promise<PermissionState> {
      return 'granted';
    },
  };

  return handle;
}

/**
 * Create a mock FileSystemDirectoryHandle
 */
export function createMockDirectoryHandle(dir: MockDirectory): FileSystemDirectoryHandle {
  const handle: FileSystemDirectoryHandle = {
    kind: 'directory' as const,
    name: dir.name,

    async getDirectoryHandle(name: string, options?: FileSystemGetDirectoryOptions): Promise<FileSystemDirectoryHandle> {
      const entry = dir.entries.get(name);

      if (entry && isDirectory(entry)) {
        return createMockDirectoryHandle(entry);
      }

      if (options?.create) {
        const newDir: MockDirectory = { name, entries: new Map() };
        dir.entries.set(name, newDir);
        return createMockDirectoryHandle(newDir);
      }

      throw new DOMException(`Directory "${name}" not found`, 'NotFoundError');
    },

    async getFileHandle(name: string, options?: FileSystemGetFileOptions): Promise<FileSystemFileHandle> {
      const entry = dir.entries.get(name);

      if (entry && !isDirectory(entry)) {
        return createMockFileHandle(entry, dir);
      }

      if (options?.create) {
        const newFile: MockFile = { name, content: '' };
        dir.entries.set(name, newFile);
        return createMockFileHandle(newFile, dir);
      }

      throw new DOMException(`File "${name}" not found`, 'NotFoundError');
    },

    async removeEntry(name: string, _options?: FileSystemRemoveOptions): Promise<void> {
      if (!dir.entries.has(name)) {
        throw new DOMException(`Entry "${name}" not found`, 'NotFoundError');
      }
      dir.entries.delete(name);
    },

    async resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null> {
      // Simple implementation - just check direct children
      for (const [name, entry] of dir.entries) {
        if (!isDirectory(entry) && name === possibleDescendant.name) {
          return [name];
        }
      }
      return null;
    },

    async *keys(): AsyncIterableIterator<string> {
      for (const name of dir.entries.keys()) {
        yield name;
      }
    },

    async *values(): AsyncIterableIterator<FileSystemDirectoryHandle | FileSystemFileHandle> {
      for (const [name, entry] of dir.entries) {
        if (isDirectory(entry)) {
          yield createMockDirectoryHandle(entry);
        } else {
          yield createMockFileHandle(entry, dir);
        }
      }
    },

    async *entries(): AsyncIterableIterator<[string, FileSystemDirectoryHandle | FileSystemFileHandle]> {
      for (const [name, entry] of dir.entries) {
        if (isDirectory(entry)) {
          yield [name, createMockDirectoryHandle(entry)];
        } else {
          yield [name, createMockFileHandle(entry, dir)];
        }
      }
    },

    [Symbol.asyncIterator]() {
      return this.entries();
    },

    async isSameEntry(other: FileSystemHandle): Promise<boolean> {
      return other.name === dir.name && other.kind === 'directory';
    },

    async queryPermission(): Promise<PermissionState> {
      return 'granted';
    },

    async requestPermission(): Promise<PermissionState> {
      return 'granted';
    },
  };

  return handle;
}

/**
 * Get a mock vault handle for testing
 */
let mockVaultInstance: MockDirectory | null = null;

export function getMockVaultHandle(): FileSystemDirectoryHandle {
  if (!mockVaultInstance) {
    mockVaultInstance = createMockVault();
  }
  return createMockDirectoryHandle(mockVaultInstance);
}

/**
 * Reset the mock vault (for test isolation)
 */
export function resetMockVault(): void {
  mockVaultInstance = null;
}
