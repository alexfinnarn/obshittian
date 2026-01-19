/**
 * POST /api/files/stat
 * Get file or directory metadata from the vault
 */
import { stat } from 'fs/promises';
import { createApiHandler } from '$lib/server/apiFactory';
import { validateAndResolvePath } from '$lib/server/pathUtils';
import type { StatRequest, StatResponse } from '$lib/server/fileTypes';

export const POST = createApiHandler<StatRequest, StatResponse>({
	requiredFields: ['path'],
	handler: async ({ path: requestedPath }) => {
		const resolvedPath = validateAndResolvePath(requestedPath);

		// Get file stats
		const stats = await stat(resolvedPath);

		return {
			kind: stats.isDirectory() ? 'directory' : 'file',
			size: stats.size,
			modified: stats.mtime.toISOString(),
			created: stats.birthtime.toISOString()
		};
	}
});
