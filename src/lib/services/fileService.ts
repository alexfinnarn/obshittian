/**
 * File service abstraction layer
 * Provides unified API for file operations via server API routes
 */

import type { DirectoryEntry, ErrorResponse } from '$lib/server/fileTypes';

/**
 * Error class for file service operations
 */
export class FileServiceError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'FileServiceError';
  }
}

/**
 * File service interface
 */
export interface FileService {
  // Configuration
  setVaultPath(path: string): void;
  getVaultPath(): string | null;

  // File operations
  readFile(relativePath: string): Promise<string>;
  writeFile(relativePath: string, content: string): Promise<void>;
  deleteFile(relativePath: string): Promise<void>;

  // Directory operations
  listDirectory(relativePath: string): Promise<DirectoryEntry[]>;
  createDirectory(relativePath: string): Promise<void>;
  deleteDirectory(relativePath: string, recursive?: boolean): Promise<void>;

  // General operations
  exists(relativePath: string): Promise<{ exists: boolean; kind?: 'file' | 'directory' }>;
  rename(oldPath: string, newPath: string): Promise<void>;
  createFile(relativePath: string, content?: string): Promise<void>;
  stat(relativePath: string): Promise<{
    kind: 'file' | 'directory';
    size: number;
    modified: string;
    created: string;
  }>;
}

/**
 * File service implementation
 */
class FileServiceImpl implements FileService {
  private vaultPath: string | null = null;

  setVaultPath(path: string): void {
    this.vaultPath = path;
  }

  getVaultPath(): string | null {
    return this.vaultPath;
  }

  async readFile(relativePath: string): Promise<string> {
    const response = await fetch('/api/files/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: this.resolvePath(relativePath),
      }),
    });

    if (!response.ok) {
      throw await this.createError(response);
    }

    const data = await response.json();
    return data.content;
  }

  async writeFile(relativePath: string, content: string): Promise<void> {
    const response = await fetch('/api/files/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: this.resolvePath(relativePath),
        content,
      }),
    });

    if (!response.ok) {
      throw await this.createError(response);
    }
  }

  async deleteFile(relativePath: string): Promise<void> {
    const response = await fetch('/api/files/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: this.resolvePath(relativePath),
      }),
    });

    if (!response.ok) {
      throw await this.createError(response);
    }
  }

  async listDirectory(relativePath: string): Promise<DirectoryEntry[]> {
    const response = await fetch('/api/files/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: this.resolvePath(relativePath),
      }),
    });

    if (!response.ok) {
      throw await this.createError(response);
    }

    const data = await response.json();
    return data.entries;
  }

  async createDirectory(relativePath: string): Promise<void> {
    const response = await fetch('/api/files/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: this.resolvePath(relativePath),
        kind: 'directory',
      }),
    });

    if (!response.ok) {
      throw await this.createError(response);
    }
  }

  async deleteDirectory(relativePath: string, recursive = false): Promise<void> {
    const response = await fetch('/api/files/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: this.resolvePath(relativePath),
        recursive,
      }),
    });

    if (!response.ok) {
      throw await this.createError(response);
    }
  }

  async exists(relativePath: string): Promise<{ exists: boolean; kind?: 'file' | 'directory' }> {
    const response = await fetch('/api/files/exists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: this.resolvePath(relativePath),
      }),
    });

    if (!response.ok) {
      throw await this.createError(response);
    }

    return response.json();
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const response = await fetch('/api/files/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oldPath: this.resolvePath(oldPath),
        newPath: this.resolvePath(newPath),
      }),
    });

    if (!response.ok) {
      throw await this.createError(response);
    }
  }

  async createFile(relativePath: string, content = ''): Promise<void> {
    const response = await fetch('/api/files/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: this.resolvePath(relativePath),
        kind: 'file',
        content,
      }),
    });

    if (!response.ok) {
      throw await this.createError(response);
    }
  }

  async stat(relativePath: string): Promise<{
    kind: 'file' | 'directory';
    size: number;
    modified: string;
    created: string;
  }> {
    const response = await fetch('/api/files/stat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: this.resolvePath(relativePath),
      }),
    });

    if (!response.ok) {
      throw await this.createError(response);
    }

    return response.json();
  }

  private getRequiredVaultPath(): string {
    if (!this.vaultPath) {
      throw new FileServiceError(400, 'No vault path configured', 'VAULT_NOT_SET');
    }
    return this.vaultPath;
  }

  private resolvePath(relativePath: string): string {
    const vaultPath = this.getRequiredVaultPath();
    return `${vaultPath}/${relativePath}`;
  }

  private async createError(response: Response): Promise<FileServiceError> {
    try {
      const data: ErrorResponse = await response.json();
      return new FileServiceError(response.status, data.error, data.code);
    } catch {
      return new FileServiceError(response.status, response.statusText);
    }
  }
}

// Singleton instance
export const fileService: FileService = new FileServiceImpl();
