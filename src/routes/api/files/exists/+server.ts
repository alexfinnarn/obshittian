/**
 * POST /api/files/exists
 * Check if a file or directory exists in the vault
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stat } from 'fs/promises';
import {
  validateAndResolvePath,
  createErrorResponse,
  validateRequestBody,
} from '$lib/server/pathUtils';
import type { ExistsRequest, ExistsResponse, ErrorResponse } from '$lib/server/fileTypes';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();

    // Validate request
    if (!validateRequestBody<ExistsRequest>(body, ['path'])) {
      return json({ error: 'Missing required field: path', code: 'BAD_REQUEST' } as ErrorResponse, { status: 400 });
    }

    const { path: requestedPath } = body as ExistsRequest;

    // Validate and resolve path
    const resolvedPath = validateAndResolvePath(requestedPath);

    try {
      const stats = await stat(resolvedPath);
      const kind = stats.isDirectory() ? 'directory' : 'file';
      return json({ exists: true, kind } as ExistsResponse);
    } catch {
      return json({ exists: false } as ExistsResponse);
    }
  } catch (err) {
    return createErrorResponse(err);
  }
};
