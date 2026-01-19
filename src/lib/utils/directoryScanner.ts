/**
 * Directory scanning utilities for traversing vault structures
 *
 * Consolidates the duplicate YYYY/MM/file traversal patterns used in
 * journal.svelte.ts and tags.ts.
 */

import { fileService } from '$lib/services/fileService';
import type { DirectoryEntry } from '$lib/server/fileTypes';

// Patterns for validating journal directory structure
const YEAR_PATTERN = /^\d{4}$/;
const MONTH_PATTERN = /^\d{2}$/;
const DATE_FILENAME_PATTERN = /^(\d{4}-\d{2}-\d{2})\.(yaml|md)$/;

/**
 * Result of scanning a journal file
 */
export interface JournalFileInfo {
	/** The date string extracted from filename (YYYY-MM-DD) */
	date: string;
	/** Full relative path to the file */
	path: string;
	/** File extension (yaml or md) */
	extension: 'yaml' | 'md';
	/** Year from the path */
	year: string;
	/** Month from the path (01-12) */
	month: string;
}

/**
 * Options for journal traversal
 */
export interface JournalTraversalOptions {
	/** File extension to filter by ('yaml' | 'md' | 'both'). Defaults to 'yaml'. */
	extension?: 'yaml' | 'md' | 'both';
	/** Optional callback invoked for each file. Return false to stop traversal. */
	onFile?: (info: JournalFileInfo) => Promise<boolean | void> | boolean | void;
	/** Optional callback for errors on individual directories (defaults to console.warn) */
	onError?: (path: string, error: unknown) => void;
}

/**
 * Extract date string from a journal filename
 * @returns The date string (YYYY-MM-DD) or null if filename doesn't match pattern
 */
export function extractDateFromFilename(filename: string): string | null {
	const match = filename.match(DATE_FILENAME_PATTERN);
	return match ? match[1] : null;
}

/**
 * Parse a date string into year, month, day components
 */
export function parseDateString(
	dateStr: string
): { year: string; month: string; day: string } | null {
	const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match) return null;
	return { year: match[1], month: match[2], day: match[3] };
}

/**
 * Check if a directory entry matches a year folder pattern (YYYY)
 */
export function isYearFolder(entry: DirectoryEntry): boolean {
	return entry.kind === 'directory' && YEAR_PATTERN.test(entry.name);
}

/**
 * Check if a directory entry matches a month folder pattern (01-12)
 */
export function isMonthFolder(entry: DirectoryEntry): boolean {
	return entry.kind === 'directory' && MONTH_PATTERN.test(entry.name);
}

/**
 * Traverse the journal directory structure (YYYY/MM/*.yaml or *.md)
 *
 * @param basePath - The daily notes folder path (e.g., 'zzz_Daily Notes')
 * @param options - Traversal options
 * @returns Array of JournalFileInfo for all matching files
 */
export async function traverseJournalDirectory(
	basePath: string,
	options: JournalTraversalOptions = {}
): Promise<JournalFileInfo[]> {
	const {
		extension = 'yaml',
		onFile,
		onError = (path, err) => console.warn(`Error scanning ${path}:`, err)
	} = options;

	const results: JournalFileInfo[] = [];

	// Check if base path exists
	const baseExists = await fileService.exists(basePath);
	if (!baseExists.exists) {
		return results;
	}

	try {
		// List year directories
		const yearEntries = await fileService.listDirectory(basePath);

		for (const yearEntry of yearEntries) {
			if (!isYearFolder(yearEntry)) continue;

			const yearPath = `${basePath}/${yearEntry.name}`;

			try {
				const monthEntries = await fileService.listDirectory(yearPath);

				for (const monthEntry of monthEntries) {
					if (!isMonthFolder(monthEntry)) continue;

					const monthPath = `${yearPath}/${monthEntry.name}`;

					try {
						const fileEntries = await fileService.listDirectory(monthPath);

						for (const fileEntry of fileEntries) {
							if (fileEntry.kind !== 'file') continue;

							// Check extension filter
							const isYaml = fileEntry.name.endsWith('.yaml');
							const isMd = fileEntry.name.endsWith('.md');

							if (extension === 'yaml' && !isYaml) continue;
							if (extension === 'md' && !isMd) continue;
							if (extension === 'both' && !isYaml && !isMd) continue;

							// Extract date from filename
							const dateStr = extractDateFromFilename(fileEntry.name);
							if (!dateStr) continue;

							const info: JournalFileInfo = {
								date: dateStr,
								path: `${monthPath}/${fileEntry.name}`,
								extension: isYaml ? 'yaml' : 'md',
								year: yearEntry.name,
								month: monthEntry.name
							};

							results.push(info);

							// Call onFile callback if provided
							if (onFile) {
								const shouldContinue = await onFile(info);
								if (shouldContinue === false) {
									return results;
								}
							}
						}
					} catch (err) {
						onError(monthPath, err);
					}
				}
			} catch (err) {
				onError(yearPath, err);
			}
		}
	} catch (err) {
		onError(basePath, err);
	}

	return results;
}

/**
 * Collect all dates that have journal files
 *
 * @param basePath - The daily notes folder path
 * @param extension - File extension to look for
 * @returns Set of date strings (YYYY-MM-DD)
 */
export async function collectJournalDates(
	basePath: string,
	extension: 'yaml' | 'md' | 'both' = 'yaml'
): Promise<Set<string>> {
	const dates = new Set<string>();

	await traverseJournalDirectory(basePath, {
		extension,
		onFile: (info) => {
			dates.add(info.date);
		}
	});

	return dates;
}

/**
 * Options for generic recursive directory scanning
 */
export interface ScanOptions {
	/** Filter function for entries. Return true to include. */
	filter?: (entry: DirectoryEntry, path: string) => boolean;
	/** Skip hidden files/directories (starting with .). Defaults to true. */
	skipHidden?: boolean;
	/** Maximum depth to traverse. 0 = base only, -1 = unlimited. Defaults to -1. */
	maxDepth?: number;
	/** Only include directories in results */
	directoriesOnly?: boolean;
	/** Only include files in results */
	filesOnly?: boolean;
	/** Optional error handler */
	onError?: (path: string, error: unknown) => void;
}

/**
 * Recursively scan a directory
 *
 * @param basePath - Starting directory path
 * @param options - Scan options
 * @returns Array of relative paths matching the filter
 */
export async function scanDirectory(
	basePath: string,
	options: ScanOptions = {}
): Promise<string[]> {
	const {
		filter,
		skipHidden = true,
		maxDepth = -1,
		directoriesOnly = false,
		filesOnly = false,
		onError = (path, err) => console.warn(`Error scanning directory ${path}:`, err)
	} = options;

	const results: string[] = [];

	async function scan(currentPath: string, depth: number): Promise<void> {
		if (maxDepth !== -1 && depth > maxDepth) return;

		try {
			const entries = await fileService.listDirectory(currentPath);

			for (const entry of entries) {
				// Skip hidden entries if configured
				if (skipHidden && entry.name.startsWith('.')) continue;

				const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

				// Apply kind filters
				if (directoriesOnly && entry.kind !== 'directory') continue;
				if (filesOnly && entry.kind !== 'file') continue;

				// Apply custom filter
				if (filter && !filter(entry, entryPath)) continue;

				results.push(entryPath);

				// Recurse into directories
				if (entry.kind === 'directory') {
					await scan(entryPath, depth + 1);
				}
			}
		} catch (err) {
			onError(currentPath, err);
		}
	}

	await scan(basePath, 0);
	return results;
}
