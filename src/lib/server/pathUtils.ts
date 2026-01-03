/**
 * Path validation utilities for file system API routes
 */
import path from 'path';
import { json, error } from '@sveltejs/kit';
import type { ErrorResponse } from './fileTypes';

/**
 * Get the vault root path from environment or configuration
 * For now, uses VAULT_PATH environment variable
 * Phase 04 will add proper configuration management
 */
export function getVaultRoot(): string {
  const vaultPath = process.env.VAULT_PATH;
  if (!vaultPath) {
    throw new Error('VAULT_PATH environment variable not set');
  }
  return vaultPath;
}

/**
 * Validate that a requested path is within the allowed vault directory
 * Returns the resolved absolute path if valid
 * Throws an error if path traversal is detected
 */
export function validatePath(requestedPath: string, vaultRoot: string): string {
  // Normalize the vault root
  const normalizedRoot = path.resolve(vaultRoot);

  // Resolve the requested path relative to vault root
  const resolved = path.resolve(normalizedRoot, requestedPath);

  // Ensure the resolved path starts with the vault root
  // This prevents path traversal attacks like "../../../etc/passwd"
  if (!resolved.startsWith(normalizedRoot + path.sep) && resolved !== normalizedRoot) {
    throw new PathTraversalError('Path traversal detected');
  }

  return resolved;
}

/**
 * Validate a path and return the resolved path
 * Uses the configured vault root
 */
export function validateAndResolvePath(requestedPath: string): string {
  const vaultRoot = getVaultRoot();
  return validatePath(requestedPath, vaultRoot);
}

/**
 * Get the relative path from vault root
 */
export function getRelativePath(absolutePath: string): string {
  const vaultRoot = getVaultRoot();
  return path.relative(vaultRoot, absolutePath);
}

/**
 * Check if a filename should be hidden (starts with .)
 */
export function isHiddenFile(filename: string): boolean {
  return filename.startsWith('.');
}

/**
 * Custom error for path traversal attempts
 */
export class PathTraversalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathTraversalError';
  }
}

/**
 * Custom error for vault not configured
 */
export class VaultNotConfiguredError extends Error {
  constructor(message: string = 'Vault path not configured') {
    super(message);
    this.name = 'VaultNotConfiguredError';
  }
}

/**
 * Create a JSON error response with appropriate status code
 */
export function createErrorResponse(err: unknown): Response {
  if (err instanceof PathTraversalError) {
    return json({ error: 'Access denied', code: 'PATH_TRAVERSAL' } as ErrorResponse, { status: 403 });
  }

  if (err instanceof VaultNotConfiguredError) {
    return json({ error: 'Vault not configured', code: 'VAULT_NOT_CONFIGURED' } as ErrorResponse, { status: 503 });
  }

  if (err instanceof Error) {
    // Handle Node.js fs errors
    const nodeError = err as NodeJS.ErrnoException;

    if (nodeError.code === 'ENOENT') {
      return json({ error: 'File or directory not found', code: 'NOT_FOUND' } as ErrorResponse, { status: 404 });
    }

    if (nodeError.code === 'EACCES' || nodeError.code === 'EPERM') {
      return json({ error: 'Permission denied', code: 'PERMISSION_DENIED' } as ErrorResponse, { status: 403 });
    }

    if (nodeError.code === 'EEXIST') {
      return json({ error: 'File or directory already exists', code: 'ALREADY_EXISTS' } as ErrorResponse, { status: 409 });
    }

    if (nodeError.code === 'ENOTEMPTY') {
      return json({ error: 'Directory not empty', code: 'NOT_EMPTY' } as ErrorResponse, { status: 409 });
    }

    if (nodeError.code === 'EISDIR') {
      return json({ error: 'Path is a directory', code: 'IS_DIRECTORY' } as ErrorResponse, { status: 400 });
    }

    if (nodeError.code === 'ENOTDIR') {
      return json({ error: 'Path is not a directory', code: 'NOT_DIRECTORY' } as ErrorResponse, { status: 400 });
    }

    // Generic error
    return json({ error: err.message, code: 'INTERNAL_ERROR' } as ErrorResponse, { status: 500 });
  }

  return json({ error: 'Unknown error', code: 'UNKNOWN' } as ErrorResponse, { status: 500 });
}

/**
 * Validate request body has required fields
 */
export function validateRequestBody<T>(body: unknown, requiredFields: (keyof T)[]): body is T {
  if (!body || typeof body !== 'object') {
    return false;
  }

  for (const field of requiredFields) {
    if (!(field as string in body)) {
      return false;
    }
  }

  return true;
}
