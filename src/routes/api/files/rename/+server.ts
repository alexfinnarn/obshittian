/**
 * POST /api/files/rename
 * Rename a file or directory in the vault
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rename, access, mkdir } from 'fs/promises';
import path from 'path';
import {
  validateAndResolvePath,
  createErrorResponse,
  validateRequestBody,
} from '$lib/server/pathUtils';
import type { RenameRequest, RenameResponse, ErrorResponse } from '$lib/server/fileTypes';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();

    // Validate request
    if (!validateRequestBody<RenameRequest>(body, ['oldPath', 'newPath'])) {
      return json({ error: 'Missing required fields: oldPath, newPath', code: 'BAD_REQUEST' } as ErrorResponse, { status: 400 });
    }

    const { oldPath, newPath } = body as RenameRequest;

    // Validate and resolve both paths
    const resolvedOldPath = validateAndResolvePath(oldPath);
    const resolvedNewPath = validateAndResolvePath(newPath);

    // Check if source exists
    await access(resolvedOldPath);

    // Check if destination already exists
    try {
      await access(resolvedNewPath);
      return json({ error: 'Destination already exists', code: 'ALREADY_EXISTS' } as ErrorResponse, { status: 409 });
    } catch {
      // Destination doesn't exist, continue with rename
    }

    // Ensure parent directory of destination exists
    const parentDir = path.dirname(resolvedNewPath);
    await mkdir(parentDir, { recursive: true });

    // Perform rename
    await rename(resolvedOldPath, resolvedNewPath);

    return json({ success: true } as RenameResponse);
  } catch (err) {
    return createErrorResponse(err);
  }
};
