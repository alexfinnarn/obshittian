import { createApiHandler } from '$lib/server/apiFactory';
import {
	applyJournalChanges,
	ensureConfirmed,
	ensureVaultConfigured,
	validateJournalChangeRequest,
	type JournalChangeRequest
} from '$lib/server/agentRuntime';

interface JournalApplyRequest extends JournalChangeRequest {
	confirm: boolean;
}

export const POST = createApiHandler<
	JournalApplyRequest,
	Awaited<ReturnType<typeof applyJournalChanges>> & { success: true }
>({
	requiredFields: ['date', 'confirm'],
	validate: (body) => {
		try {
			validateJournalChangeRequest(body);
			ensureConfirmed(body.confirm);
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : 'Invalid journal apply request',
				code: 'BAD_REQUEST'
			};
		}
	},
	handler: async (body) => {
		ensureVaultConfigured();
		const result = await applyJournalChanges(body);
		return {
			...result,
			success: true
		};
	}
});
