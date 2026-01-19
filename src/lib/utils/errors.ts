/**
 * Error handling utilities and conventions
 *
 * ## Error Handling Conventions
 *
 * ### Return Types by Layer
 * - Stores (persistence): Return `boolean` for success/failure, or `T | null`
 * - Services (fileService): Throw `FileServiceError` - caller handles
 * - Utils (pure functions): Return null or throw depending on criticality
 *
 * ### Error Logging
 * - User-facing errors: Log with console.warn (something went wrong but app continues)
 * - Developer errors (bugs): Log with console.error
 * - Expected failures (file not found on optional load): Silent
 */

export type ErrorLevel = 'silent' | 'warn' | 'error';

export interface ErrorConfig {
	level: ErrorLevel;
	message: string;
	context?: Record<string, unknown>;
}

/**
 * Log an error based on the specified level
 */
export function logError(config: ErrorConfig, error?: unknown): void {
	const { level, message, context } = config;

	if (level === 'silent') return;

	const logFn = level === 'error' ? console.error : console.warn;

	if (context) {
		logFn(message, context, error);
	} else if (error) {
		logFn(message, error);
	} else {
		logFn(message);
	}
}

/**
 * Result type for operations that can fail with error context
 */
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

/**
 * Create a success result
 */
export function ok<T>(value: T): Result<T, never> {
	return { ok: true, value };
}

/**
 * Create a failure result
 */
export function err<E>(error: E): Result<never, E> {
	return { ok: false, error };
}

/**
 * Execute an async function and return a Result
 */
export async function tryAsync<T>(
	fn: () => Promise<T>,
	errorLevel: ErrorLevel = 'silent'
): Promise<Result<T>> {
	try {
		const value = await fn();
		return { ok: true, value };
	} catch (error) {
		if (errorLevel !== 'silent') {
			logError({ level: errorLevel, message: 'Operation failed' }, error);
		}
		return { ok: false, error: error as Error };
	}
}

/**
 * Execute an async function and return value or null
 */
export async function tryOrNull<T>(
	fn: () => Promise<T>,
	errorLevel: ErrorLevel = 'silent'
): Promise<T | null> {
	try {
		return await fn();
	} catch (error) {
		if (errorLevel !== 'silent') {
			logError({ level: errorLevel, message: 'Operation failed' }, error);
		}
		return null;
	}
}

/**
 * Execute an async function and return success boolean
 */
export async function tryBoolean(
	fn: () => Promise<unknown>,
	errorLevel: ErrorLevel = 'warn'
): Promise<boolean> {
	try {
		await fn();
		return true;
	} catch (error) {
		if (errorLevel !== 'silent') {
			logError({ level: errorLevel, message: 'Operation failed' }, error);
		}
		return false;
	}
}

/**
 * Execute a sync function and return value or null
 */
export function trySyncOrNull<T>(fn: () => T, errorLevel: ErrorLevel = 'silent'): T | null {
	try {
		return fn();
	} catch (error) {
		if (errorLevel !== 'silent') {
			logError({ level: errorLevel, message: 'Operation failed' }, error);
		}
		return null;
	}
}
