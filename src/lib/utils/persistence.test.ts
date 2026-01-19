import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	createStorage,
	createStringStorage,
	createNumberStorage,
	defaultErrorHandler,
	silentErrorHandler,
	STORAGE_KEYS
} from './persistence';

describe('persistence utilities', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	describe('createStorage', () => {
		it('saves and loads JSON data', () => {
			const storage = createStorage<{ name: string; count: number }>('test-key');
			storage.save({ name: 'test', count: 42 });
			expect(storage.load()).toEqual({ name: 'test', count: 42 });
		});

		it('returns null when key does not exist', () => {
			const storage = createStorage<{ name: string }>('missing-key');
			expect(storage.load()).toBeNull();
		});

		it('returns true on successful save', () => {
			const storage = createStorage<string>('test-key');
			expect(storage.save('value')).toBe(true);
		});

		it('clears stored data', () => {
			const storage = createStorage<string>('test-key');
			storage.save('value');
			expect(storage.exists()).toBe(true);
			expect(storage.clear()).toBe(true);
			expect(storage.exists()).toBe(false);
			expect(storage.load()).toBeNull();
		});

		it('reports existence correctly', () => {
			const storage = createStorage<string>('test-key');
			expect(storage.exists()).toBe(false);
			storage.save('value');
			expect(storage.exists()).toBe(true);
		});

		it('handles complex nested objects', () => {
			const storage = createStorage<{ nested: { deep: { value: number[] } } }>('complex-key');
			const data = { nested: { deep: { value: [1, 2, 3] } } };
			storage.save(data);
			expect(storage.load()).toEqual(data);
		});

		it('handles arrays', () => {
			const storage = createStorage<number[]>('array-key');
			storage.save([1, 2, 3]);
			expect(storage.load()).toEqual([1, 2, 3]);
		});

		it('calls error handler on parse failure', () => {
			const onError = vi.fn();
			localStorage.setItem('bad-json', 'not-valid-json');
			const storage = createStorage<object>('bad-json', { onError });
			const result = storage.load();
			expect(result).toBeNull();
			expect(onError).toHaveBeenCalledWith('load', 'bad-json', expect.any(Error));
		});

		it('uses default error handler when not specified', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			localStorage.setItem('bad-json', 'not-valid-json');
			const storage = createStorage<object>('bad-json');
			storage.load();
			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});
	});

	describe('createStringStorage', () => {
		it('saves and loads string values without JSON serialization', () => {
			const storage = createStringStorage('string-key');
			storage.save('hello world');
			expect(storage.load()).toBe('hello world');
		});

		it('returns null when key does not exist', () => {
			const storage = createStringStorage('missing-key');
			expect(storage.load()).toBeNull();
		});

		it('handles empty strings', () => {
			const storage = createStringStorage('empty-key');
			storage.save('');
			expect(storage.load()).toBe('');
			expect(storage.exists()).toBe(true);
		});

		it('clears stored data', () => {
			const storage = createStringStorage('string-key');
			storage.save('value');
			storage.clear();
			expect(storage.load()).toBeNull();
		});

		it('stores raw string without JSON quotes', () => {
			const storage = createStringStorage('raw-key');
			storage.save('test');
			expect(localStorage.getItem('raw-key')).toBe('test');
		});
	});

	describe('createNumberStorage', () => {
		it('saves and loads numeric values', () => {
			const storage = createNumberStorage('num-key');
			storage.save(42);
			expect(storage.load()).toBe(42);
		});

		it('handles decimal values', () => {
			const storage = createNumberStorage('decimal-key');
			storage.save(3.14159);
			expect(storage.load()).toBe(3.14159);
		});

		it('handles negative values', () => {
			const storage = createNumberStorage('negative-key');
			storage.save(-100);
			expect(storage.load()).toBe(-100);
		});

		it('handles zero', () => {
			const storage = createNumberStorage('zero-key');
			storage.save(0);
			expect(storage.load()).toBe(0);
			expect(storage.exists()).toBe(true);
		});

		it('returns null when key does not exist', () => {
			const storage = createNumberStorage('missing-key');
			expect(storage.load()).toBeNull();
		});

		it('returns null for non-numeric stored values', () => {
			localStorage.setItem('num-key', 'not-a-number');
			const storage = createNumberStorage('num-key');
			expect(storage.load()).toBeNull();
		});

		it('clears stored data', () => {
			const storage = createNumberStorage('num-key');
			storage.save(123);
			storage.clear();
			expect(storage.load()).toBeNull();
		});
	});

	describe('silentErrorHandler', () => {
		it('does not log errors', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			localStorage.setItem('bad', 'not-json');
			const storage = createStorage<object>('bad', { onError: silentErrorHandler });
			storage.load();
			expect(consoleSpy).not.toHaveBeenCalled();
			consoleSpy.mockRestore();
		});
	});

	describe('defaultErrorHandler', () => {
		it('logs errors to console.error', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const error = new Error('test error');
			defaultErrorHandler('save', 'test-key', error);
			expect(consoleSpy).toHaveBeenCalledWith(
				'Failed to save "test-key" in localStorage:',
				error
			);
			consoleSpy.mockRestore();
		});
	});

	describe('STORAGE_KEYS', () => {
		it('contains all expected keys', () => {
			expect(STORAGE_KEYS.TAG_INDEX).toBe('editorTagIndex');
			expect(STORAGE_KEYS.TABS).toBe('editorLeftPaneTabs');
			expect(STORAGE_KEYS.SETTINGS).toBe('editorSettings');
			expect(STORAGE_KEYS.VAULT_PATH).toBe('vaultPath');
			expect(STORAGE_KEYS.LAST_OPEN_FILE).toBe('editorLastOpenFile');
			expect(STORAGE_KEYS.PANE_WIDTH).toBe('editorPaneWidth');
		});
	});
});
