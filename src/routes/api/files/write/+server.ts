/**
 * POST /api/files/write
 * Write content to a file in the vault
 */
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { createApiHandler } from '$lib/server/apiFactory';
import { validateAndResolvePath } from '$lib/server/pathUtils';
import type { WriteRequest, WriteResponse } from '$lib/server/fileTypes';

export const POST = createApiHandler<WriteRequest, WriteResponse>({
	requiredFields: ['path', 'content'],
	handler: async ({ path: requestedPath, content }) => {
		const resolvedPath = validateAndResolvePath(requestedPath);

		// Ensure parent directory exists
		const parentDir = path.dirname(resolvedPath);
		await mkdir(parentDir, { recursive: true });

		// Write file content
		await writeFile(resolvedPath, content, 'utf-8');

		return { success: true };
	}
});
