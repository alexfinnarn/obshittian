import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fileService } from '$lib/services/fileService';
import {
	extractDateFromFilename,
	parseDateString,
	isYearFolder,
	isMonthFolder,
	traverseJournalDirectory,
	collectJournalDates,
	scanDirectory
} from './directoryScanner';
import type { DirectoryEntry } from '$lib/server/fileTypes';

// Mock the fileService
vi.mock('$lib/services/fileService', () => ({
	fileService: {
		setVaultPath: vi.fn(),
		getVaultPath: vi.fn(() => '/mock/vault'),
		readFile: vi.fn(),
		writeFile: vi.fn(),
		listDirectory: vi.fn(),
		createDirectory: vi.fn(),
		deleteDirectory: vi.fn(),
		exists: vi.fn(),
		rename: vi.fn(),
		createFile: vi.fn(),
		stat: vi.fn(),
		deleteFile: vi.fn()
	}
}));

const mockFileService = vi.mocked(fileService);

// Helper to create mock DirectoryEntry
function createFileEntry(name: string): DirectoryEntry {
	return { kind: 'file', name };
}

function createDirEntry(name: string): DirectoryEntry {
	return { kind: 'directory', name };
}

describe('directoryScanner utilities', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('extractDateFromFilename', () => {
		it('extracts date from yaml filename', () => {
			expect(extractDateFromFilename('2025-01-15.yaml')).toBe('2025-01-15');
		});

		it('extracts date from md filename', () => {
			expect(extractDateFromFilename('2025-01-15.md')).toBe('2025-01-15');
		});

		it('returns null for non-matching filenames', () => {
			expect(extractDateFromFilename('notes.md')).toBeNull();
			expect(extractDateFromFilename('2025-1-15.yaml')).toBeNull();
			expect(extractDateFromFilename('2025-01-5.yaml')).toBeNull();
			expect(extractDateFromFilename('25-01-15.yaml')).toBeNull();
		});

		it('returns null for other extensions', () => {
			expect(extractDateFromFilename('2025-01-15.txt')).toBeNull();
			expect(extractDateFromFilename('2025-01-15.json')).toBeNull();
		});
	});

	describe('parseDateString', () => {
		it('parses valid date string', () => {
			expect(parseDateString('2025-01-15')).toEqual({
				year: '2025',
				month: '01',
				day: '15'
			});
		});

		it('returns null for invalid formats', () => {
			expect(parseDateString('2025/01/15')).toBeNull();
			expect(parseDateString('2025-1-15')).toBeNull();
			expect(parseDateString('25-01-15')).toBeNull();
			expect(parseDateString('invalid')).toBeNull();
		});
	});

	describe('isYearFolder', () => {
		it('returns true for valid year folders', () => {
			expect(isYearFolder(createDirEntry('2025'))).toBe(true);
			expect(isYearFolder(createDirEntry('2024'))).toBe(true);
			expect(isYearFolder(createDirEntry('1999'))).toBe(true);
		});

		it('returns false for files', () => {
			expect(isYearFolder(createFileEntry('2025'))).toBe(false);
		});

		it('returns false for non-year names', () => {
			expect(isYearFolder(createDirEntry('202'))).toBe(false);
			expect(isYearFolder(createDirEntry('20255'))).toBe(false);
			expect(isYearFolder(createDirEntry('year'))).toBe(false);
		});
	});

	describe('isMonthFolder', () => {
		it('returns true for valid month folders', () => {
			expect(isMonthFolder(createDirEntry('01'))).toBe(true);
			expect(isMonthFolder(createDirEntry('12'))).toBe(true);
			expect(isMonthFolder(createDirEntry('06'))).toBe(true);
		});

		it('returns false for files', () => {
			expect(isMonthFolder(createFileEntry('01'))).toBe(false);
		});

		it('returns false for invalid month patterns', () => {
			expect(isMonthFolder(createDirEntry('1'))).toBe(false);
			expect(isMonthFolder(createDirEntry('001'))).toBe(false);
			expect(isMonthFolder(createDirEntry('jan'))).toBe(false);
		});
	});

	describe('traverseJournalDirectory', () => {
		it('returns empty array when base path does not exist', async () => {
			mockFileService.exists.mockResolvedValue({ exists: false });

			const results = await traverseJournalDirectory('zzz_Daily Notes');

			expect(results).toEqual([]);
		});

		it('traverses YYYY/MM/file.yaml structure', async () => {
			mockFileService.exists.mockResolvedValue({ exists: true });
			mockFileService.listDirectory
				.mockResolvedValueOnce([createDirEntry('2025')])
				.mockResolvedValueOnce([createDirEntry('01')])
				.mockResolvedValueOnce([createFileEntry('2025-01-15.yaml')]);

			const results = await traverseJournalDirectory('zzz_Daily Notes');

			expect(results).toHaveLength(1);
			expect(results[0]).toEqual({
				date: '2025-01-15',
				path: 'zzz_Daily Notes/2025/01/2025-01-15.yaml',
				extension: 'yaml',
				year: '2025',
				month: '01'
			});
		});

		it('filters by extension', async () => {
			mockFileService.exists.mockResolvedValue({ exists: true });
			mockFileService.listDirectory
				.mockResolvedValueOnce([createDirEntry('2025')])
				.mockResolvedValueOnce([createDirEntry('01')])
				.mockResolvedValueOnce([
					createFileEntry('2025-01-15.yaml'),
					createFileEntry('2025-01-15.md')
				]);

			// Only yaml (default)
			let results = await traverseJournalDirectory('zzz_Daily Notes');
			expect(results).toHaveLength(1);
			expect(results[0].extension).toBe('yaml');

			// Reset mocks
			mockFileService.listDirectory
				.mockResolvedValueOnce([createDirEntry('2025')])
				.mockResolvedValueOnce([createDirEntry('01')])
				.mockResolvedValueOnce([
					createFileEntry('2025-01-15.yaml'),
					createFileEntry('2025-01-15.md')
				]);

			// Only md
			results = await traverseJournalDirectory('zzz_Daily Notes', { extension: 'md' });
			expect(results).toHaveLength(1);
			expect(results[0].extension).toBe('md');

			// Reset mocks
			mockFileService.listDirectory
				.mockResolvedValueOnce([createDirEntry('2025')])
				.mockResolvedValueOnce([createDirEntry('01')])
				.mockResolvedValueOnce([
					createFileEntry('2025-01-15.yaml'),
					createFileEntry('2025-01-15.md')
				]);

			// Both
			results = await traverseJournalDirectory('zzz_Daily Notes', { extension: 'both' });
			expect(results).toHaveLength(2);
		});

		it('calls onFile callback for each file', async () => {
			mockFileService.exists.mockResolvedValue({ exists: true });
			mockFileService.listDirectory
				.mockResolvedValueOnce([createDirEntry('2025')])
				.mockResolvedValueOnce([createDirEntry('01')])
				.mockResolvedValueOnce([
					createFileEntry('2025-01-15.yaml'),
					createFileEntry('2025-01-16.yaml')
				]);

			const onFile = vi.fn();
			await traverseJournalDirectory('zzz_Daily Notes', { onFile });

			expect(onFile).toHaveBeenCalledTimes(2);
			expect(onFile).toHaveBeenCalledWith(
				expect.objectContaining({ date: '2025-01-15' })
			);
			expect(onFile).toHaveBeenCalledWith(
				expect.objectContaining({ date: '2025-01-16' })
			);
		});

		it('stops traversal when onFile returns false', async () => {
			mockFileService.exists.mockResolvedValue({ exists: true });
			mockFileService.listDirectory
				.mockResolvedValueOnce([createDirEntry('2025')])
				.mockResolvedValueOnce([createDirEntry('01')])
				.mockResolvedValueOnce([
					createFileEntry('2025-01-15.yaml'),
					createFileEntry('2025-01-16.yaml')
				]);

			const results = await traverseJournalDirectory('zzz_Daily Notes', {
				onFile: () => false
			});

			expect(results).toHaveLength(1);
		});

		it('skips non-year directories', async () => {
			mockFileService.exists.mockResolvedValue({ exists: true });
			mockFileService.listDirectory.mockResolvedValueOnce([
				createDirEntry('2025'),
				createDirEntry('notes'),
				createFileEntry('readme.md')
			]);
			mockFileService.listDirectory
				.mockResolvedValueOnce([createDirEntry('01')])
				.mockResolvedValueOnce([createFileEntry('2025-01-15.yaml')]);

			const results = await traverseJournalDirectory('zzz_Daily Notes');

			expect(results).toHaveLength(1);
			// Only called for base, year 2025, and month 01
			expect(mockFileService.listDirectory).toHaveBeenCalledTimes(3);
		});

		it('calls onError for directory errors', async () => {
			mockFileService.exists.mockResolvedValue({ exists: true });
			mockFileService.listDirectory.mockRejectedValue(new Error('Access denied'));

			const onError = vi.fn();
			const results = await traverseJournalDirectory('zzz_Daily Notes', { onError });

			expect(results).toEqual([]);
			expect(onError).toHaveBeenCalledWith('zzz_Daily Notes', expect.any(Error));
		});

		it('skips files with non-date filenames', async () => {
			mockFileService.exists.mockResolvedValue({ exists: true });
			mockFileService.listDirectory
				.mockResolvedValueOnce([createDirEntry('2025')])
				.mockResolvedValueOnce([createDirEntry('01')])
				.mockResolvedValueOnce([
					createFileEntry('2025-01-15.yaml'),
					createFileEntry('notes.yaml'),
					createFileEntry('template.yaml')
				]);

			const results = await traverseJournalDirectory('zzz_Daily Notes');

			expect(results).toHaveLength(1);
			expect(results[0].date).toBe('2025-01-15');
		});
	});

	describe('collectJournalDates', () => {
		it('returns set of date strings', async () => {
			mockFileService.exists.mockResolvedValue({ exists: true });
			mockFileService.listDirectory
				.mockResolvedValueOnce([createDirEntry('2025')])
				.mockResolvedValueOnce([createDirEntry('01')])
				.mockResolvedValueOnce([
					createFileEntry('2025-01-15.yaml'),
					createFileEntry('2025-01-16.yaml')
				]);

			const dates = await collectJournalDates('zzz_Daily Notes');

			expect(dates.has('2025-01-15')).toBe(true);
			expect(dates.has('2025-01-16')).toBe(true);
			expect(dates.size).toBe(2);
		});

		it('returns empty set when base path does not exist', async () => {
			mockFileService.exists.mockResolvedValue({ exists: false });

			const dates = await collectJournalDates('zzz_Daily Notes');

			expect(dates.size).toBe(0);
		});
	});

	describe('scanDirectory', () => {
		it('recursively scans directories', async () => {
			mockFileService.listDirectory
				.mockResolvedValueOnce([
					createDirEntry('folder1'),
					createFileEntry('file1.md')
				])
				.mockResolvedValueOnce([createFileEntry('file2.md')]);

			const results = await scanDirectory('root');

			expect(results).toContain('root/folder1');
			expect(results).toContain('root/file1.md');
			expect(results).toContain('root/folder1/file2.md');
		});

		it('skips hidden files by default', async () => {
			mockFileService.listDirectory.mockResolvedValueOnce([
				createFileEntry('.hidden'),
				createFileEntry('visible.md'),
				createDirEntry('.git')
			]);

			const results = await scanDirectory('root');

			expect(results).toContain('root/visible.md');
			expect(results).not.toContain('root/.hidden');
			expect(results).not.toContain('root/.git');
		});

		it('includes hidden files when skipHidden is false', async () => {
			mockFileService.listDirectory.mockResolvedValueOnce([
				createFileEntry('.hidden'),
				createFileEntry('visible.md')
			]);

			const results = await scanDirectory('root', { skipHidden: false });

			expect(results).toContain('root/.hidden');
			expect(results).toContain('root/visible.md');
		});

		it('respects maxDepth 0 option (base level only)', async () => {
			mockFileService.listDirectory.mockResolvedValueOnce([createDirEntry('level1')]);

			const results = await scanDirectory('root', { maxDepth: 0 });
			expect(results).toContain('root/level1');
			// With maxDepth 0, we should not recurse into level1
			expect(mockFileService.listDirectory).toHaveBeenCalledTimes(1);
		});

		it('respects maxDepth 1 option (one level deep)', async () => {
			mockFileService.listDirectory
				.mockResolvedValueOnce([createDirEntry('level1')])
				.mockResolvedValueOnce([createDirEntry('level2')]);

			const results = await scanDirectory('root', { maxDepth: 1 });
			expect(results).toContain('root/level1');
			expect(results).toContain('root/level1/level2');
			// With maxDepth 1, we should not recurse into level2
			expect(mockFileService.listDirectory).toHaveBeenCalledTimes(2);
		});

		it('filters with custom filter function', async () => {
			mockFileService.listDirectory.mockResolvedValueOnce([
				createFileEntry('test.md'),
				createFileEntry('test.txt'),
				createFileEntry('other.md')
			]);

			const results = await scanDirectory('root', {
				filter: (entry) => entry.name.endsWith('.md')
			});

			expect(results).toContain('root/test.md');
			expect(results).toContain('root/other.md');
			expect(results).not.toContain('root/test.txt');
		});

		it('returns only files when filesOnly is true', async () => {
			mockFileService.listDirectory.mockResolvedValueOnce([
				createDirEntry('folder'),
				createFileEntry('file.md')
			]);

			const results = await scanDirectory('root', { filesOnly: true });

			expect(results).toContain('root/file.md');
			expect(results).not.toContain('root/folder');
		});

		it('returns only directories when directoriesOnly is true', async () => {
			mockFileService.listDirectory.mockResolvedValueOnce([
				createDirEntry('folder'),
				createFileEntry('file.md')
			]);

			const results = await scanDirectory('root', { directoriesOnly: true });

			expect(results).toContain('root/folder');
			expect(results).not.toContain('root/file.md');
		});

		it('calls onError for directory errors', async () => {
			mockFileService.listDirectory.mockRejectedValue(new Error('Access denied'));

			const onError = vi.fn();
			const results = await scanDirectory('root', { onError });

			expect(results).toEqual([]);
			expect(onError).toHaveBeenCalledWith('root', expect.any(Error));
		});
	});
});
