/**
 * POST /api/files/rename
 * Rename a file or directory in the vault
 */
import { rename, access, mkdir } from 'fs/promises';
import path from 'path';
import { createApiHandler } from '$lib/server/apiFactory';
import { validateAndResolvePath } from '$lib/server/pathUtils';
import type { RenameRequest, RenameResponse } from '$lib/server/fileTypes';

export const POST = createApiHandler<RenameRequest, RenameResponse>({
	requiredFields: ['oldPath', 'newPath'],
	handler: async ({ oldPath, newPath }) => {
		// Validate and resolve both paths
		const resolvedOldPath = validateAndResolvePath(oldPath);
		const resolvedNewPath = validateAndResolvePath(newPath);

		// Check if source exists
		await access(resolvedOldPath);

		// Check if destination already exists
		try {
			await access(resolvedNewPath);
			// If access succeeds, destination exists - throw to trigger error response
			const err = new Error('Destination already exists') as NodeJS.ErrnoException;
			err.code = 'EEXIST';
			throw err;
		} catch (e) {
			// If error is EEXIST (our thrown error), re-throw it
			if ((e as NodeJS.ErrnoException).code === 'EEXIST') {
				throw e;
			}
			// Otherwise destination doesn't exist, continue
		}

		// Ensure parent directory of destination exists
		const parentDir = path.dirname(resolvedNewPath);
		await mkdir(parentDir, { recursive: true });

		// Perform rename
		await rename(resolvedOldPath, resolvedNewPath);

		return { success: true };
	}
});
