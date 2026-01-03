# Phase 03: File Service Abstraction Layer

**Status:** Completed
**Output:** `fileService` that provides unified API for file operations

## Objective

Create a service layer that abstracts file operations, allowing components to call a simple API without knowing the underlying implementation (server API vs mock for tests).

## Tasks

- [x] Create `src/lib/services/fileService.ts` with typed methods
- [x] Implement methods that call `/api/files/*` routes
- [x] Add request/response error handling
- [x] Create `FileServiceError` class for typed errors
- [x] Add vault path configuration (stored in service state)
- [x] Create mock implementation for testing (`mockFileService.ts`)
- [ ] Add service initialization on app load (deferred to Phase 05)

## Service API

```typescript
// src/lib/services/fileService.ts

export interface FileEntry {
  name: string;
  kind: 'file' | 'directory';
  size?: number;
  modified?: string;
}

export interface FileService {
  // Configuration
  setVaultPath(path: string): void;
  getVaultPath(): string | null;

  // File operations
  readFile(relativePath: string): Promise<string>;
  writeFile(relativePath: string, content: string): Promise<void>;
  deleteFile(relativePath: string): Promise<void>;

  // Directory operations
  listDirectory(relativePath: string): Promise<FileEntry[]>;
  createDirectory(relativePath: string): Promise<void>;
  deleteDirectory(relativePath: string, recursive?: boolean): Promise<void>;

  // General operations
  exists(relativePath: string): Promise<{ exists: boolean; kind?: 'file' | 'directory' }>;
  rename(oldPath: string, newPath: string): Promise<void>;
  createFile(relativePath: string, content?: string): Promise<void>;
}

// Singleton instance
export const fileService: FileService;
```

## Implementation

```typescript
// src/lib/services/fileService.ts

class FileServiceImpl implements FileService {
  private vaultPath: string | null = null;

  setVaultPath(path: string): void {
    this.vaultPath = path;
  }

  getVaultPath(): string | null {
    return this.vaultPath;
  }

  async readFile(relativePath: string): Promise<string> {
    this.ensureVaultPath();

    const response = await fetch('/api/files/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: this.resolvePath(relativePath)
      })
    });

    if (!response.ok) {
      throw new FileServiceError(response.status, await response.text());
    }

    const data = await response.json();
    return data.content;
  }

  // ... other methods follow same pattern

  private ensureVaultPath(): void {
    if (!this.vaultPath) {
      throw new FileServiceError(400, 'No vault path configured');
    }
  }

  private resolvePath(relativePath: string): string {
    return `${this.vaultPath}/${relativePath}`;
  }
}

export const fileService = new FileServiceImpl();
```

## Mock Implementation

```typescript
// src/lib/services/mockFileService.ts

export function createMockFileService(initialFiles: Record<string, string> = {}): FileService {
  const files = new Map(Object.entries(initialFiles));
  let vaultPath: string | null = null;

  return {
    setVaultPath(path: string) { vaultPath = path; },
    getVaultPath() { return vaultPath; },

    async readFile(path: string) {
      const content = files.get(path);
      if (content === undefined) {
        throw new FileServiceError(404, 'File not found');
      }
      return content;
    },

    async writeFile(path: string, content: string) {
      files.set(path, content);
    },

    // ... etc
  };
}
```

## Dependencies

- Phase 02 complete (API routes exist)

## Acceptance Criteria

- [x] `fileService.readFile()` successfully reads files via API
- [x] `fileService.writeFile()` successfully writes files via API
- [x] `fileService.listDirectory()` returns proper DirectoryEntry array
- [x] Errors are properly typed with `FileServiceError`
- [x] Mock implementation passes same tests as real implementation
- [x] Vault path can be set and retrieved
- [x] Operations without vault path throw appropriate error
