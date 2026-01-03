/**
 * POST /api/files/delete
 * Delete a file or directory in the vault
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rm, stat } from 'fs/promises';
import {
  validateAndResolvePath,
  createErrorResponse,
  validateRequestBody,
} from '$lib/server/pathUtils';
import type { DeleteRequest, DeleteResponse, ErrorResponse } from '$lib/server/fileTypes';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();

    // Validate request
    if (!validateRequestBody<DeleteRequest>(body, ['path'])) {
      return json({ error: 'Missing required field: path', code: 'BAD_REQUEST' } as ErrorResponse, { status: 400 });
    }

    const { path: requestedPath, recursive = false } = body as DeleteRequest;

    // Validate and resolve path
    const resolvedPath = validateAndResolvePath(requestedPath);

    // Check if it's a directory
    const stats = await stat(resolvedPath);

    if (stats.isDirectory() && !recursive) {
      // Try to remove directory, will fail if not empty
      await rm(resolvedPath);
    } else {
      // Remove file or directory recursively
      await rm(resolvedPath, { recursive });
    }

    return json({ success: true } as DeleteResponse);
  } catch (err) {
    return createErrorResponse(err);
  }
};
