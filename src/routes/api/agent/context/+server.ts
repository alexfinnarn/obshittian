import { createApiHandler } from '$lib/server/apiFactory';
import {
	buildAgentContext,
	ensureVaultConfigured,
	validateAgentCommandId
} from '$lib/server/agentRuntime';
import type { AiSupportCommandId } from '$lib/services/aiSupport';

interface AgentContextRequest {
	date: string;
	commandId?: AiSupportCommandId;
	dailyNotesFolder?: string;
}

export const POST = createApiHandler<AgentContextRequest, Awaited<ReturnType<typeof buildAgentContext>>>({
	requiredFields: ['date'],
	validate: ({ commandId }) => {
		if (commandId && !validateAgentCommandId(commandId)) {
			return { error: 'Unknown commandId', code: 'BAD_REQUEST' };
		}
	},
	handler: async ({ date, commandId, dailyNotesFolder }) => {
		ensureVaultConfigured();
		return await buildAgentContext(date, commandId, dailyNotesFolder);
	}
});
