/**
 * POST /api/files/create
 * Create a file or directory in the vault
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFile, mkdir, access } from 'fs/promises';
import path from 'path';
import {
  validateAndResolvePath,
  createErrorResponse,
  validateRequestBody,
} from '$lib/server/pathUtils';
import type { CreateRequest, CreateResponse, ErrorResponse } from '$lib/server/fileTypes';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();

    // Validate request
    if (!validateRequestBody<CreateRequest>(body, ['path', 'kind'])) {
      return json({ error: 'Missing required fields: path, kind', code: 'BAD_REQUEST' } as ErrorResponse, { status: 400 });
    }

    const { path: requestedPath, kind, content = '' } = body as CreateRequest;

    // Validate kind
    if (kind !== 'file' && kind !== 'directory') {
      return json({ error: 'Invalid kind: must be "file" or "directory"', code: 'BAD_REQUEST' } as ErrorResponse, { status: 400 });
    }

    // Validate and resolve path
    const resolvedPath = validateAndResolvePath(requestedPath);

    // Check if path already exists
    try {
      await access(resolvedPath);
      return json({ error: 'File or directory already exists', code: 'ALREADY_EXISTS' } as ErrorResponse, { status: 409 });
    } catch {
      // Path doesn't exist, continue with creation
    }

    if (kind === 'directory') {
      // Create directory
      await mkdir(resolvedPath, { recursive: true });
    } else {
      // Create file
      // Ensure parent directory exists
      const parentDir = path.dirname(resolvedPath);
      await mkdir(parentDir, { recursive: true });

      // Write file with optional content
      await writeFile(resolvedPath, content, 'utf-8');
    }

    return json({ success: true } as CreateResponse);
  } catch (err) {
    return createErrorResponse(err);
  }
};
