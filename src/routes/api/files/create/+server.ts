/**
 * POST /api/files/create
 * Create a file or directory in the vault
 */
import { writeFile, mkdir, access } from 'fs/promises';
import path from 'path';
import { createApiHandler, validators } from '$lib/server/apiFactory';
import { validateAndResolvePath } from '$lib/server/pathUtils';
import type { CreateRequest, CreateResponse, ErrorResponse } from '$lib/server/fileTypes';

export const POST = createApiHandler<CreateRequest, CreateResponse>({
	requiredFields: ['path', 'kind'],
	validate: validators.fileKind,
	handler: async ({ path: requestedPath, kind, content = '' }) => {
		const resolvedPath = validateAndResolvePath(requestedPath);

		// Check if path already exists
		try {
			await access(resolvedPath);
			// If access succeeds, file exists - throw to trigger error response
			const err = new Error('File or directory already exists') as NodeJS.ErrnoException;
			err.code = 'EEXIST';
			throw err;
		} catch (e) {
			// If error is ENOENT, path doesn't exist - continue with creation
			// If error is EEXIST (our thrown error), re-throw it
			if ((e as NodeJS.ErrnoException).code === 'EEXIST') {
				throw e;
			}
			// Otherwise path doesn't exist, continue
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

		return { success: true };
	}
});
