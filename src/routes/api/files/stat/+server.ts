/**
 * POST /api/files/stat
 * Get file or directory metadata from the vault
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stat } from 'fs/promises';
import {
  validateAndResolvePath,
  createErrorResponse,
  validateRequestBody,
} from '$lib/server/pathUtils';
import type { StatRequest, StatResponse, ErrorResponse } from '$lib/server/fileTypes';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();

    // Validate request
    if (!validateRequestBody<StatRequest>(body, ['path'])) {
      return json({ error: 'Missing required field: path', code: 'BAD_REQUEST' } as ErrorResponse, { status: 400 });
    }

    const { path: requestedPath } = body as StatRequest;

    // Validate and resolve path
    const resolvedPath = validateAndResolvePath(requestedPath);

    // Get file stats
    const stats = await stat(resolvedPath);

    const response: StatResponse = {
      kind: stats.isDirectory() ? 'directory' : 'file',
      size: stats.size,
      modified: stats.mtime.toISOString(),
      created: stats.birthtime.toISOString(),
    };

    return json(response);
  } catch (err) {
    return createErrorResponse(err);
  }
};
