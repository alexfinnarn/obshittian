/**
 * POST /api/files/write
 * Write content to a file in the vault
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import {
  validateAndResolvePath,
  createErrorResponse,
  validateRequestBody,
} from '$lib/server/pathUtils';
import type { WriteRequest, WriteResponse, ErrorResponse } from '$lib/server/fileTypes';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();

    // Validate request
    if (!validateRequestBody<WriteRequest>(body, ['path', 'content'])) {
      return json({ error: 'Missing required fields: path, content', code: 'BAD_REQUEST' } as ErrorResponse, { status: 400 });
    }

    const { path: requestedPath, content } = body as WriteRequest;

    // Validate and resolve path
    const resolvedPath = validateAndResolvePath(requestedPath);

    // Ensure parent directory exists
    const parentDir = path.dirname(resolvedPath);
    await mkdir(parentDir, { recursive: true });

    // Write file content
    await writeFile(resolvedPath, content, 'utf-8');

    return json({ success: true } as WriteResponse);
  } catch (err) {
    return createErrorResponse(err);
  }
};
