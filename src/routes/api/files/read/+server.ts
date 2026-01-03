/**
 * POST /api/files/read
 * Read file content from the vault
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile } from 'fs/promises';
import {
  validateAndResolvePath,
  createErrorResponse,
  validateRequestBody,
} from '$lib/server/pathUtils';
import type { ReadRequest, ReadResponse, ErrorResponse } from '$lib/server/fileTypes';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();

    // Validate request
    if (!validateRequestBody<ReadRequest>(body, ['path'])) {
      return json({ error: 'Missing required field: path', code: 'BAD_REQUEST' } as ErrorResponse, { status: 400 });
    }

    const { path: requestedPath } = body as ReadRequest;

    // Validate and resolve path
    const resolvedPath = validateAndResolvePath(requestedPath);

    // Read file content
    const content = await readFile(resolvedPath, 'utf-8');

    return json({ content } as ReadResponse);
  } catch (err) {
    return createErrorResponse(err);
  }
};
