/**
 * POST /api/files/list
 * List directory entries in the vault
 */
import { readdir, stat } from 'fs/promises';
import path from 'path';
import { createApiHandler } from '$lib/server/apiFactory';
import { validateAndResolvePath, isHiddenFile } from '$lib/server/pathUtils';
import type { ListRequest, ListResponse, DirectoryEntry } from '$lib/server/fileTypes';

export const POST = createApiHandler<ListRequest, ListResponse>({
	requiredFields: ['path'],
	handler: async ({ path: requestedPath }) => {
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
							modified: stats.mtime.toISOString()
						} as DirectoryEntry;
					} catch {
						// If stat fails, return basic info
						return {
							name: entry.name,
							kind
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

		return { entries };
	}
});
