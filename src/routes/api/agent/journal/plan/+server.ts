import { createApiHandler } from '$lib/server/apiFactory';
import {
	ensureVaultConfigured,
	planJournalChanges,
	validateJournalChangeRequest,
	type JournalChangeRequest
} from '$lib/server/agentRuntime';

export const POST = createApiHandler<JournalChangeRequest, Awaited<ReturnType<typeof planJournalChanges>>>({
	requiredFields: ['date'],
	validate: (body) => {
		try {
			validateJournalChangeRequest(body);
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : 'Invalid journal change request',
				code: 'BAD_REQUEST'
			};
		}
	},
	handler: async (body) => {
		ensureVaultConfigured();
		return await planJournalChanges(body);
	}
});
