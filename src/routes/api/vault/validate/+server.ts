/**
 * POST /api/vault/validate
 * Validate a vault path and set it as the active vault
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stat, access, constants } from 'fs/promises';
import path from 'path';

export interface ValidateRequest {
  path: string;
}

export interface ValidateResponse {
  valid: boolean;
  path: string;
}

export interface ValidateErrorResponse {
  error: string;
  code?: string;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { path: vaultPath } = body as ValidateRequest;

    if (!vaultPath || typeof vaultPath !== 'string') {
      return json(
        { error: 'Path is required', code: 'BAD_REQUEST' } as ValidateErrorResponse,
        { status: 400 }
      );
    }

    // Resolve to absolute path
    const resolved = path.resolve(vaultPath.trim());

    // Check if path exists and is a directory
    try {
      const stats = await stat(resolved);

      if (!stats.isDirectory()) {
        return json(
          { error: 'Path is not a directory', code: 'NOT_DIRECTORY' } as ValidateErrorResponse,
          { status: 400 }
        );
      }
    } catch (err) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code === 'ENOENT') {
        return json(
          { error: 'Directory does not exist', code: 'NOT_FOUND' } as ValidateErrorResponse,
          { status: 404 }
        );
      }
      throw err;
    }

    // Check read/write permissions
    try {
      await access(resolved, constants.R_OK | constants.W_OK);
    } catch {
      return json(
        { error: 'No read/write permission for this directory', code: 'PERMISSION_DENIED' } as ValidateErrorResponse,
        { status: 403 }
      );
    }

    // Set the vault path as environment variable for other API routes
    process.env.VAULT_PATH = resolved;

    return json({ valid: true, path: resolved } as ValidateResponse);
  } catch (err) {
    console.error('Vault validation error:', err);
    return json(
      { error: 'Failed to validate path', code: 'INTERNAL_ERROR' } as ValidateErrorResponse,
      { status: 500 }
    );
  }
};
