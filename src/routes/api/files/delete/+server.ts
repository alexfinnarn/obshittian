/**
 * POST /api/files/delete
 * Delete a file or directory in the vault
 */
import { rm, stat } from 'fs/promises';
import { createApiHandler } from '$lib/server/apiFactory';
import { validateAndResolvePath } from '$lib/server/pathUtils';
import type { DeleteRequest, DeleteResponse } from '$lib/server/fileTypes';

export const POST = createApiHandler<DeleteRequest, DeleteResponse>({
	requiredFields: ['path'],
	handler: async ({ path: requestedPath, recursive = false }) => {
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

		return { success: true };
	}
});
