/**
 * POST /api/files/read
 * Read file content from the vault
 */
import { readFile } from 'fs/promises';
import { createApiHandler } from '$lib/server/apiFactory';
import { validateAndResolvePath } from '$lib/server/pathUtils';
import type { ReadRequest, ReadResponse } from '$lib/server/fileTypes';

export const POST = createApiHandler<ReadRequest, ReadResponse>({
	requiredFields: ['path'],
	handler: async ({ path }) => {
		const resolvedPath = validateAndResolvePath(path);
		const content = await readFile(resolvedPath, 'utf-8');
		return { content };
	}
});
