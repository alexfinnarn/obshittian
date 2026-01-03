/**
 * POST /api/files/list
 * List directory entries in the vault
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readdir, stat } from 'fs/promises';
import path from 'path';
import {
  validateAndResolvePath,
  createErrorResponse,
  validateRequestBody,
  isHiddenFile,
} from '$lib/server/pathUtils';
import type { ListRequest, ListResponse, DirectoryEntry, ErrorResponse } from '$lib/server/fileTypes';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();

    // Validate request
    if (!validateRequestBody<ListRequest>(body, ['path'])) {
      return json({ error: 'Missing required field: path', code: 'BAD_REQUEST' } as ErrorResponse, { status: 400 });
    }

    const { path: requestedPath } = body as ListRequest;

    // Validate and resolve path
    const resolvedPath = validateAndResolvePath(requestedPath);

    // Read directory entries
    const dirEntries = await readdir(resolvedPath, { withFileTypes: true });

    // Build response with metadata
    const entries: DirectoryEntry[] = await Promise.all(
      dirEntries
        .filter((entry) => !isHiddenFile(entry.name))
        .map(async (entry) => {
          const entryPath = path.join(resolvedPath, entry.name);
          const kind = entry.isDirectory() ? 'directory' : 'file';

          try {
            const stats = await stat(entryPath);
            return {
              name: entry.name,
              kind,
              size: kind === 'file' ? stats.size : undefined,
              modified: stats.mtime.toISOString(),
            } as DirectoryEntry;
          } catch {
            // If stat fails, return basic info
            return {
              name: entry.name,
              kind,
            } as DirectoryEntry;
          }
        })
    );

    // Sort: directories first, then alphabetically
    entries.sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return json({ entries } as ListResponse);
  } catch (err) {
    return createErrorResponse(err);
  }
};
