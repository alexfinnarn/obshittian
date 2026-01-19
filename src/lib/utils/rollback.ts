/**
 * Rollback utilities for optimistic updates with automatic reversion on failure
 *
 * These utilities handle the common pattern of:
 * 1. Capture current state
 * 2. Apply optimistic mutation
 * 3. Attempt to persist
 * 4. Rollback if persist fails
 */

/**
 * Options for withRollback
 */
export interface RollbackOptions<T> {
	/** Function to capture current state before mutation */
	capture: () => T;
	/** Function to apply the mutation (optimistic update) */
	mutate: () => void;
	/** Function to save/persist the change. Should return true on success. */
	save: () => Promise<boolean>;
	/** Function to restore the captured state on failure */
	rollback: (captured: T) => void;
	/** Optional callback after successful save */
	onSuccess?: () => void | Promise<void>;
	/** Optional callback after rollback */
	onRollback?: (captured: T) => void;
}

/**
 * Execute a mutation with automatic rollback on save failure
 *
 * @example
 * ```typescript
 * const result = await withRollback({
 *   capture: () => ({ text: entry.text, updatedAt: entry.updatedAt }),
 *   mutate: () => {
 *     entry.text = newText;
 *     entry.updatedAt = new Date().toISOString();
 *   },
 *   save: () => saveEntries(),
 *   rollback: (old) => {
 *     entry.text = old.text;
 *     entry.updatedAt = old.updatedAt;
 *   },
 * });
 * ```
 */
export async function withRollback<T>(options: RollbackOptions<T>): Promise<boolean> {
	const { capture, mutate, save, rollback, onSuccess, onRollback } = options;

	// 1. Capture current state
	const captured = capture();

	// 2. Apply optimistic mutation
	mutate();

	// 3. Attempt to persist
	const saved = await save();

	if (!saved) {
		// 4. Rollback on failure
		rollback(captured);
		onRollback?.(captured);
		return false;
	}

	// 5. Optional success callback
	await onSuccess?.();

	return true;
}

/**
 * Helper for creating rollback functions for object properties
 *
 * @example
 * ```typescript
 * const entry = { text: 'old', count: 5 };
 * const { capture, rollback } = createPropertyRollback(entry, ['text', 'count']);
 *
 * const old = capture();
 * entry.text = 'new';
 * rollback(old); // entry.text is now 'old' again
 * ```
 */
export function createPropertyRollback<T extends object, K extends keyof T>(
	target: T,
	keys: K[]
): {
	capture: () => Pick<T, K>;
	rollback: (captured: Pick<T, K>) => void;
} {
	return {
		capture: () => {
			const captured = {} as Pick<T, K>;
			for (const key of keys) {
				captured[key] = target[key];
			}
			return captured;
		},
		rollback: (captured: Pick<T, K>) => {
			for (const key of keys) {
				target[key] = captured[key];
			}
		}
	};
}

/**
 * Simplified helper for single-property mutations with optional additional updates
 *
 * @example
 * ```typescript
 * await withPropertyRollback(entry, 'text', newText, saveEntries, {
 *   additionalUpdates: { updatedAt: new Date().toISOString() },
 * });
 * ```
 */
export async function withPropertyRollback<T extends object, K extends keyof T>(
	target: T,
	key: K,
	newValue: T[K],
	save: () => Promise<boolean>,
	options?: {
		/** Additional keys to update alongside the main key */
		additionalUpdates?: Partial<T>;
		onSuccess?: () => void | Promise<void>;
	}
): Promise<boolean> {
	const oldValue = target[key];
	const oldAdditional: Partial<T> = {};

	// Capture additional values
	if (options?.additionalUpdates) {
		for (const k of Object.keys(options.additionalUpdates) as (keyof T)[]) {
			oldAdditional[k] = target[k];
		}
	}

	// Apply mutation
	target[key] = newValue;
	if (options?.additionalUpdates) {
		Object.assign(target, options.additionalUpdates);
	}

	// Save
	const saved = await save();

	if (!saved) {
		// Rollback
		target[key] = oldValue;
		if (options?.additionalUpdates) {
			Object.assign(target, oldAdditional);
		}
		return false;
	}

	await options?.onSuccess?.();
	return true;
}

/**
 * Helper for array mutations with rollback
 *
 * @example
 * ```typescript
 * await withArrayRollback(
 *   entries,
 *   (arr) => [...arr, newEntry],
 *   saveEntries,
 *   (arr) => { store.entries = arr; }
 * );
 * ```
 */
export async function withArrayRollback<T>(
	array: T[],
	mutate: (arr: T[]) => T[],
	save: () => Promise<boolean>,
	setArray: (arr: T[]) => void
): Promise<boolean> {
	const oldArray = [...array];

	// Apply mutation
	const newArray = mutate(array);
	setArray(newArray);

	// Save
	const saved = await save();

	if (!saved) {
		setArray(oldArray);
		return false;
	}

	return true;
}

/**
 * Helper for Set mutations with rollback
 *
 * @example
 * ```typescript
 * await withSetRollback(
 *   datesSet,
 *   (set) => { set.add('2025-01-15'); return set; },
 *   saveEntries,
 *   (set) => { store.dates = set; }
 * );
 * ```
 */
export async function withSetRollback<T>(
	set: Set<T>,
	mutate: (s: Set<T>) => Set<T>,
	save: () => Promise<boolean>,
	setSet: (s: Set<T>) => void
): Promise<boolean> {
	const oldSet = new Set(set);

	// Apply mutation
	const newSet = mutate(set);
	setSet(newSet);

	// Save
	const saved = await save();

	if (!saved) {
		setSet(oldSet);
		return false;
	}

	return true;
}
