/**
 * API Route Factory
 *
 * Extracts common boilerplate from API routes while keeping route logic clean.
 * Handles:
 * - JSON body parsing
 * - Required field validation
 * - Custom validation (optional)
 * - Error response formatting
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { validateRequestBody, createErrorResponse } from './pathUtils';
import type { ErrorResponse } from './fileTypes';

/**
 * Options for creating an API handler
 */
export interface ApiHandlerOptions<TRequest, TResponse> {
	/** Required fields that must be present in the request body */
	requiredFields: (keyof TRequest)[];
	/** Error message for missing fields (optional, auto-generated if not provided) */
	missingFieldsMessage?: string;
	/** Handler function that receives the validated request body */
	handler: (body: TRequest, request: Request) => Promise<TResponse>;
	/** Optional custom validation function. Throw or return ErrorResponse to fail. */
	validate?: (body: TRequest) => void | ErrorResponse | Promise<void | ErrorResponse>;
}

/**
 * Create a POST request handler with standard boilerplate
 *
 * @example
 * ```typescript
 * // Before: 25 lines
 * export const POST: RequestHandler = async ({ request }) => {
 *   try {
 *     const body = await request.json();
 *     if (!validateRequestBody<ReadRequest>(body, ['path'])) {
 *       return json({ error: '...', code: 'BAD_REQUEST' }, { status: 400 });
 *     }
 *     const { path: requestedPath } = body as ReadRequest;
 *     const resolvedPath = validateAndResolvePath(requestedPath);
 *     const content = await readFile(resolvedPath, 'utf-8');
 *     return json({ content });
 *   } catch (err) {
 *     return createErrorResponse(err);
 *   }
 * };
 *
 * // After: 8 lines
 * export const POST = createApiHandler<ReadRequest, ReadResponse>({
 *   requiredFields: ['path'],
 *   handler: async ({ path }) => {
 *     const resolvedPath = validateAndResolvePath(path);
 *     const content = await readFile(resolvedPath, 'utf-8');
 *     return { content };
 *   },
 * });
 * ```
 */
export function createApiHandler<TRequest, TResponse>(
	options: ApiHandlerOptions<TRequest, TResponse>
): RequestHandler {
	const { requiredFields, missingFieldsMessage, handler, validate } = options;

	const errorMessage =
		missingFieldsMessage ??
		`Missing required field${requiredFields.length > 1 ? 's' : ''}: ${requiredFields.join(', ')}`;

	return async ({ request }) => {
		try {
			const body = await request.json();

			// Validate required fields
			if (!validateRequestBody<TRequest>(body, requiredFields)) {
				return json({ error: errorMessage, code: 'BAD_REQUEST' } as ErrorResponse, { status: 400 });
			}

			const typedBody = body as TRequest;

			// Run custom validation if provided
			if (validate) {
				const validationResult = await validate(typedBody);
				if (validationResult && 'error' in validationResult) {
					return json(validationResult, { status: 400 });
				}
			}

			// Execute handler
			const result = await handler(typedBody, request);

			return json(result);
		} catch (err) {
			return createErrorResponse(err);
		}
	};
}

/**
 * Validator helpers for common patterns
 */
export const validators = {
	/**
	 * Validate that 'kind' field is either 'file' or 'directory'
	 */
	fileKind: (body: { kind: string }): void | ErrorResponse => {
		if (body.kind !== 'file' && body.kind !== 'directory') {
			return { error: 'Invalid kind: must be "file" or "directory"', code: 'BAD_REQUEST' };
		}
	}
};
