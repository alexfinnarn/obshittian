/**
 * POST /api/files/exists
 * Check if a file or directory exists in the vault
 */
import { stat } from 'fs/promises';
import { createApiHandler } from '$lib/server/apiFactory';
import { validateAndResolvePath } from '$lib/server/pathUtils';
import type { ExistsRequest, ExistsResponse } from '$lib/server/fileTypes';

export const POST = createApiHandler<ExistsRequest, ExistsResponse>({
	requiredFields: ['path'],
	handler: async ({ path: requestedPath }) => {
		const resolvedPath = validateAndResolvePath(requestedPath);

		try {
			const stats = await stat(resolvedPath);
			const kind = stats.isDirectory() ? 'directory' : 'file';
			return { exists: true, kind };
		} catch {
			return { exists: false };
		}
	}
});
