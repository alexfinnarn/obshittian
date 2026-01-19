/**
 * Generic localStorage persistence utilities
 *
 * Provides type-safe save/load/clear functions with configurable error handling.
 * Consolidates the various localStorage patterns used across stores.
 */

export type ErrorHandler = (
	operation: 'save' | 'load' | 'clear',
	key: string,
	error: unknown
) => void;

/**
 * Default error handler - logs to console.error
 */
export const defaultErrorHandler: ErrorHandler = (operation, key, error) => {
	console.error(`Failed to ${operation} "${key}" in localStorage:`, error);
};

/**
 * Silent error handler - swallows errors
 */
export const silentErrorHandler: ErrorHandler = () => {};

/**
 * Options for persistence operations
 */
export interface PersistenceOptions {
	/** Error handler function. Defaults to logging errors. */
	onError?: ErrorHandler;
}

/**
 * Storage helper interface for type-safe localStorage operations
 */
export interface StorageHelper<T> {
	/** Save data to localStorage. Returns true on success. */
	save(data: T): boolean;
	/** Load data from localStorage. Returns null if not found or on error. */
	load(): T | null;
	/** Clear data from localStorage. Returns true on success. */
	clear(): boolean;
	/** Check if data exists in localStorage. */
	exists(): boolean;
}

/**
 * Create a storage helper for JSON-serializable data
 */
export function createStorage<T>(key: string, options: PersistenceOptions = {}): StorageHelper<T> {
	const onError = options.onError ?? defaultErrorHandler;

	return {
		save(data: T): boolean {
			try {
				localStorage.setItem(key, JSON.stringify(data));
				return true;
			} catch (err) {
				onError('save', key, err);
				return false;
			}
		},

		load(): T | null {
			try {
				const stored = localStorage.getItem(key);
				if (stored === null) return null;
				return JSON.parse(stored) as T;
			} catch (err) {
				onError('load', key, err);
				return null;
			}
		},

		clear(): boolean {
			try {
				localStorage.removeItem(key);
				return true;
			} catch (err) {
				onError('clear', key, err);
				return false;
			}
		},

		exists(): boolean {
			return localStorage.getItem(key) !== null;
		}
	};
}

/**
 * Create a storage helper for primitive string values (no JSON serialization)
 */
export function createStringStorage(
	key: string,
	options: PersistenceOptions = {}
): StorageHelper<string> {
	const onError = options.onError ?? defaultErrorHandler;

	return {
		save(data: string): boolean {
			try {
				localStorage.setItem(key, data);
				return true;
			} catch (err) {
				onError('save', key, err);
				return false;
			}
		},

		load(): string | null {
			try {
				return localStorage.getItem(key);
			} catch (err) {
				onError('load', key, err);
				return null;
			}
		},

		clear(): boolean {
			try {
				localStorage.removeItem(key);
				return true;
			} catch (err) {
				onError('clear', key, err);
				return false;
			}
		},

		exists(): boolean {
			return localStorage.getItem(key) !== null;
		}
	};
}

/**
 * Create a storage helper for numeric values
 */
export function createNumberStorage(
	key: string,
	options: PersistenceOptions = {}
): StorageHelper<number> {
	const onError = options.onError ?? defaultErrorHandler;

	return {
		save(data: number): boolean {
			try {
				localStorage.setItem(key, String(data));
				return true;
			} catch (err) {
				onError('save', key, err);
				return false;
			}
		},

		load(): number | null {
			try {
				const stored = localStorage.getItem(key);
				if (stored === null) return null;
				const num = Number(stored);
				return Number.isNaN(num) ? null : num;
			} catch (err) {
				onError('load', key, err);
				return null;
			}
		},

		clear(): boolean {
			try {
				localStorage.removeItem(key);
				return true;
			} catch (err) {
				onError('clear', key, err);
				return false;
			}
		},

		exists(): boolean {
			return localStorage.getItem(key) !== null;
		}
	};
}

/**
 * Pre-defined storage keys used across the application
 */
export const STORAGE_KEYS = {
	TAG_INDEX: 'editorTagIndex',
	TABS: 'editorLeftPaneTabs',
	SETTINGS: 'editorSettings',
	VAULT_PATH: 'vaultPath',
	LAST_OPEN_FILE: 'editorLastOpenFile',
	PANE_WIDTH: 'editorPaneWidth'
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
